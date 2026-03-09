import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { clearCompanyRegistrationState } from '@/utils/company-registration-draft';

const AUTH_KEY = '@finoverts_auth';
const TOKEN_KEY = '@finoverts_token';
const WELCOME_KEY = '@finoverts_welcome_seen';

/** Backend API base. Set EXPO_PUBLIC_API_URL in .env for physical device (e.g. http://192.168.1.5:4000/api). */
function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000/api';
  return 'http://localhost:4000/api';
}

type User = {
  name: string;
  mobile: string;
  email?: string;
};

type AuthContextValue = {
  user: User | null;
  isReady: boolean;
  hasSeenWelcome: boolean;
  setHasSeenWelcome: () => Promise<void>;
  /** Login or sign up with demo mode. */
  loginWithMobile: (name: string, mobile: string) => Promise<void>;
  /** Send OTP via OTP.dev. */
  sendOtpWithDev: (mobile: string) => Promise<string>;
  /** Verify OTP via OTP.dev. */
  verifyWithDev: (name: string, mobile: string, code: string) => Promise<void>;
  /** Sign in with Google (idToken). */
  loginWithGoogle: (idToken: string) => Promise<void>;
  /** Exchange Firebase ID token for app session. Use after Firebase sign-in (email or Google). */
  loginWithFirebase: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Get current session token for API calls (e.g. linking registration to user). */
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasSeenWelcome, setHasSeenWelcomeState] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const loadStoredAuth = useCallback(async () => {
    try {
      const [authRaw, welcomeRaw] = await Promise.all([
        AsyncStorage.getItem(AUTH_KEY),
        AsyncStorage.getItem(WELCOME_KEY),
      ]);
      if (authRaw) {
        const parsed = JSON.parse(authRaw) as User;
        setUser(parsed);
      }
      setHasSeenWelcomeState(welcomeRaw === 'true');
    } catch {
      setUser(null);
    } finally {
      setIsReady(true);
    }
  }, []);

  const setHasSeenWelcome = useCallback(async () => {
    setHasSeenWelcomeState(true);
    await AsyncStorage.setItem(WELCOME_KEY, 'true');
  }, []);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  const persistUser = useCallback(async (u: User, token: string) => {
    setUser(u);
    await Promise.all([
      AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u)),
      AsyncStorage.setItem(TOKEN_KEY, token),
    ]);
  }, []);

  const handleNetworkError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Network error';
    throw new Error(
      msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')
        ? 'Cannot reach server. Set EXPO_PUBLIC_API_URL to your computer IP when using a physical device.'
        : msg,
    );
  }, []);

  /** Login or sign up with name + mobile. Calls POST /api/otp/login. */
  const loginWithMobile = useCallback(
    async (name: string, mobile: string) => {
      const digits = mobile.replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
      let res: Response;
      try {
        res = await fetch(`${getApiBase()}/otp/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() || 'User', mobile: digits }),
        });
      } catch (e) {
        handleNetworkError(e);
      }
      const text = await (res!).text();
      let json: { ok?: boolean; error?: string; token?: string; user?: { name?: string; mobile?: string } };
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        const msg = res!.status >= 500 ? 'Server error. Try again later.' : (text?.slice(0, 100) || 'Invalid response.');
        throw new Error(msg);
      }
      if (!res!.ok) throw new Error(json.error || 'Login failed.');
      if (!json.ok || !json.token) throw new Error(json.error || 'Login failed.');
      const u: User = {
        name: json.user?.name ?? (name.trim() || 'User'),
        mobile: json.user?.mobile ?? digits,
      };
      await persistUser(u, json.token);
    },
    [persistUser, handleNetworkError],
  );

  const sendOtpWithDev = useCallback(
    async (mobile: string) => {
      const digits = mobile.replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
      let res: Response;
      try {
        res = await fetch(`${getApiBase()}/otp/send-otp-dev`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: `91${digits}` }),
        });
      } catch (e) {
        handleNetworkError(e);
      }
      const json = await (res!).json().catch(() => ({}));
      if (!res!.ok || !json.ok) {
        throw new Error(json.error || 'Failed to send OTP.');
      }
      return json.message_id;
    },
    [handleNetworkError],
  );

  const verifyWithDev = useCallback(
    async (name: string, mobile: string, code: string) => {
      const digits = mobile.replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
      let res: Response;
      try {
        res = await fetch(`${getApiBase()}/otp/verify-otp-dev`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() || 'User', mobile: `91${digits}`, code }),
        });
      } catch (e) {
        handleNetworkError(e);
      }
      const json = await (res!).json().catch(() => ({}));
      if (!res!.ok || !json.ok || !json.token) throw new Error(json.error || 'Invalid OTP.');

      const u: User = {
        name: json.user?.name ?? (name.trim() || 'User'),
        mobile: json.user?.mobile ?? digits,
      };
      await persistUser(u, json.token);
    },
    [persistUser, handleNetworkError],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      let res: Response;
      try {
        res = await fetch(`${getApiBase()}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      } catch (e) {
        handleNetworkError(e);
      }
      const text = await (res!).text();
      let json: { ok?: boolean; error?: string; token?: string; user?: { name?: string; mobile?: string; email?: string } };
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(res!.status >= 500 ? 'Server error.' : 'Invalid response.');
      }
      if (!res!.ok) throw new Error(json.error || 'Google sign-in failed.');
      if (!json.ok || !json.token) throw new Error(json.error || 'Google sign-in failed.');
      const u: User = {
        name: json.user?.name ?? '',
        mobile: json.user?.mobile ?? '',
        email: json.user?.email ?? '',
      };
      await persistUser(u, json.token);
    },
    [persistUser, handleNetworkError],
  );

  /** Exchange Firebase ID token for app JWT. Call after Firebase sign-in (email/password or Google). */
  const loginWithFirebase = useCallback(
    async (idToken: string) => {
      let res: Response;
      try {
        res = await fetch(`${getApiBase()}/auth/firebase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      } catch (e) {
        handleNetworkError(e);
      }
      const text = await (res!).text();
      let json: { ok?: boolean; error?: string; token?: string; user?: { name?: string; mobile?: string; email?: string } };
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(res!.status >= 500 ? 'Server error.' : 'Invalid response.');
      }
      if (!res!.ok) throw new Error(json.error || 'Sign-in failed.');
      if (!json.ok || !json.token) throw new Error(json.error || 'Sign-in failed.');
      const u: User = {
        name: json.user?.name ?? '',
        mobile: json.user?.mobile ?? '',
        email: json.user?.email ?? '',
      };
      await persistUser(u, json.token);
    },
    [persistUser, handleNetworkError],
  );


  const logout = useCallback(async () => {
    setUser(null);
    await Promise.all([
      AsyncStorage.removeItem(AUTH_KEY),
      AsyncStorage.removeItem(TOKEN_KEY),
      clearCompanyRegistrationState(),
    ]);
  }, []);

  const getToken = useCallback(async () => {
    return AsyncStorage.getItem(TOKEN_KEY);
  }, []);

  const value: AuthContextValue = {
    user,
    isReady,
    hasSeenWelcome,
    setHasSeenWelcome,
    loginWithMobile,
    sendOtpWithDev,
    verifyWithDev,
    loginWithGoogle,
    loginWithFirebase,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
