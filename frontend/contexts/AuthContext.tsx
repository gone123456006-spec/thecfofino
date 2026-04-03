import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import {
  deleteFirebaseUser,
  getIdToken,
  isFirebaseConfigured,
  signInWithEmail,
  signInWithGoogleIdToken,
  signOutFirebase,
  signUpWithEmail as firebaseSignUpWithEmail,
} from '@/lib/firebase';
import { useNotifications } from '@/contexts/NotificationsContext';

const AUTH_KEY = '@finovert_auth';
const TOKEN_KEY = '@finovert_token';
const WELCOME_KEY = '@finovert_welcome_seen';

/** Backend API base. Set EXPO_PUBLIC_API_URL in .env for physical device (e.g. http://192.168.1.5:4000/api). */
function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  if (fromExtra) return fromExtra;
  return 'https://finovert-backend.onrender.com/api';
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 25000, ...rest } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
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
  /** Sign in with Google using Firebase. */
  loginWithGoogle: (idToken: string) => Promise<void>;
  /** Sign in with email and password (requires prior sign-up in the app). */
  loginWithEmail: (email: string, password: string) => Promise<void>;
  /** Create account with name, mobile, Gmail, and password; then opens an app session. */
  signupWithEmail: (name: string, mobile: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Get current session token for API calls. */
  getToken: () => Promise<string | null>;
  /** Update user profile (name, mobile, email). */
  updateProfile: (updates: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasSeenWelcome, setHasSeenWelcomeState] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { addNotification } = useNotifications();

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        res = await fetch(`${getApiBase()}/otp/send-otp-dev`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: digits }),
          signal: controller.signal,
        });
      } catch (e: any) {
        if (e.name === 'AbortError') throw new Error('OTP request timed out. Please try again.');
        handleNetworkError(e);
      } finally {
        clearTimeout(timeoutId);
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        res = await fetch(`${getApiBase()}/otp/verify-otp-dev`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() || 'User', mobile: digits, code }),
          signal: controller.signal,
        });
      } catch (e: any) {
        if (e.name === 'AbortError') throw new Error('Verification request timed out. Please try again.');
        handleNetworkError(e);
      } finally {
        clearTimeout(timeoutId);
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

  const exchangeFirebaseTokenForAppSession = useCallback(
    async (idToken: string, fallbackEmail?: string) => {
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
      if (!res!.ok) {
        if (res!.status === 403) {
          await signOutFirebase().catch(() => {});
        }
        throw new Error(json.error || 'Sign-in failed.');
      }
      if (json.ok && json.token) {
        console.log('Backend: Session exchange successful.');
      } else {
        console.warn('Backend: Session exchange failed:', json.error);
        throw new Error(json.error || 'Sign-in failed.');
      }

      const u: User = {
        name: json.user?.name ?? '',
        mobile: json.user?.mobile ?? '',
        email: json.user?.email ?? fallbackEmail ?? '',
      };
      await persistUser(u, json.token);
    },
    [persistUser, handleNetworkError],
  );

  const signupWithEmail = useCallback(
    async (name: string, mobile: string, email: string, password: string) => {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to frontend/.env');
      }
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error('Enter your name.');
      const digits = mobile.replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
      const normEmail = email.toLowerCase().trim();
      const gmailOk = /@(gmail|googlemail)\.com$/i.test(normEmail);
      if (!gmailOk) throw new Error('Use a Gmail address (@gmail.com).');

      let firebaseCred: Awaited<ReturnType<typeof firebaseSignUpWithEmail>> | null = null;
      try {
        firebaseCred = await firebaseSignUpWithEmail(normEmail, password);
        const fbUser = firebaseCred?.user;
        if (!fbUser) throw new Error('Could not create Firebase user.');
        const firebaseUid = fbUser.uid;

        let res: Response;
        try {
          res = await fetchWithTimeout(`${getApiBase()}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: trimmedName,
              mobile: digits,
              email: normEmail,
              password,
              firebaseUid,
            }),
            timeoutMs: 25000,
          });
        } catch (e) {
          if ((e as any)?.name === 'AbortError') throw new Error('Server is taking too long. Please try again.');
          handleNetworkError(e);
        }

        const text = await (res!).text();
        let json: {
          ok?: boolean;
          error?: string;
          token?: string;
          user?: { name?: string; mobile?: string; email?: string };
        };
        try {
          json = text ? JSON.parse(text) : {};
        } catch {
          throw new Error((res!).status >= 500 ? 'Server error.' : 'Invalid response.');
        }
        if (!(res!).ok) throw new Error(json.error || 'Sign-up failed.');
        if (!json.ok || !json.token || !json.user) throw new Error(json.error || 'Sign-up failed.');

        const u: User = {
          name: json.user?.name ?? trimmedName,
          mobile: json.user?.mobile ?? digits,
          email: json.user?.email ?? normEmail,
        };
        await persistUser(u, json.token);
        
        // Action-based notification
        addNotification({
          title: 'Welcome to Finovert!',
          body: `Congratulations ${trimmedName}! Your account has been created successfully.`,
          read: true,
        });
      } catch (e: unknown) {
        if (firebaseCred?.user) {
          await deleteFirebaseUser(firebaseCred.user).catch(() => {});
        }
        await signOutFirebase().catch(() => {});

        const anyErr = e as { code?: string; message?: string };
        if (anyErr?.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered. Try signing in.');
        }
        if (anyErr?.code === 'auth/weak-password') {
          throw new Error('Password is too weak. Use at least 6 characters.');
        }
        if (anyErr?.code === 'auth/invalid-email') {
          throw new Error('Invalid email address.');
        }
        throw e instanceof Error ? e : new Error(anyErr?.message || 'Sign-up failed.');
      }
    },
    [persistUser, handleNetworkError],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to frontend/.env');
      }
      const firebaseUser = await signInWithGoogleIdToken(idToken);
      const fbUser = firebaseUser?.user;
      if (!fbUser) throw new Error('Failed to get Google user info.');
      const firebaseIdToken = await getIdToken(fbUser);
      await exchangeFirebaseTokenForAppSession(firebaseIdToken, fbUser.email ?? undefined);
    },
    [exchangeFirebaseTokenForAppSession],
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to frontend/.env');
      }
      try {
        const cred = await signInWithEmail(email.toLowerCase().trim(), password);
        const fbUser = cred?.user;
        if (!fbUser) throw new Error('Firebase sign-in failed.');
        const firebaseIdToken = await getIdToken(fbUser);
        await exchangeFirebaseTokenForAppSession(firebaseIdToken, fbUser.email ?? email);

        // Action-based notification
        addNotification({
          title: 'Login Successful',
          body: 'Welcome back! You have successfully signed in.',
          read: true,
        });
      } catch (e: any) {
        console.error('AuthContext: loginWithEmail error:', e);
        if (e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password') {
          throw new Error('Incorrect email or password.');
        }
        if (e?.code === 'auth/user-not-found') {
          throw new Error('No account found for this email. Sign up first.');
        }
        if (e?.code === 'auth/invalid-email') {
          throw new Error('Invalid email address.');
        }
        throw e;
      }
    },
    [exchangeFirebaseTokenForAppSession],
  );

  /** Exchange Firebase ID token for app JWT. Call after Firebase sign-in (email/password or Google). */
  const loginWithFirebase = useCallback(
    async (idToken: string) => {
      let res: Response;
      try {
        res = await fetchWithTimeout(`${getApiBase()}/auth/firebase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
          timeoutMs: 25000,
        });
      } catch (e) {
        if ((e as any)?.name === 'AbortError') throw new Error('Server is taking too long. Please try again.');
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
    // Keep notification history in AsyncStorage so the list survives logout / reinstall is not implied — only logout.
    await Promise.all([AsyncStorage.removeItem(AUTH_KEY), AsyncStorage.removeItem(TOKEN_KEY)]);
  }, []);

  const getToken = useCallback(async () => {
    return AsyncStorage.getItem(TOKEN_KEY);
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<User>) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated.');

      let res: Response;
      try {
        res = await fetch(`${getApiBase()}/users/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });
      } catch (e) {
        handleNetworkError(e);
      }

      const json = await (res!).json().catch(() => ({}));
      if (!res!.ok) throw new Error(json.error || 'Update failed.');

      // Always merge updates into local state so UI gates (needsProfile) clear immediately
      const updatedUser: User = {
        ...user!,
        ...(json.ok && json.user ? json.user : updates),
      };
      setUser(updatedUser);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
    },
    [user, getToken, handleNetworkError],
  );

  const value: AuthContextValue = {
    user,
    isReady,
    hasSeenWelcome,
    setHasSeenWelcome,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logout,
    getToken,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
