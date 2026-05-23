import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  getIdToken,
  isFirebaseConfigured,
  signInWithGoogleIdToken,
  signOutFirebase,
} from '@/lib/firebase';
import { useNotifications } from '@/contexts/NotificationsContext';
import { clearUserSessionStorage } from '@/utils/clear-user-session';
import { getApiBase } from '@/constants/api';

const AUTH_KEY = '@finovert_auth';
const TOKEN_KEY = '@finovert_token';
const WELCOME_KEY = '@finovert_welcome_seen';

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
  id?: string;
  name: string;
  mobile: string;
  email?: string;
};

type ApiUserPayload = {
  id?: string;
  name?: string;
  mobile?: string;
  email?: string;
};

export type EmailOtpVerifyResult =
  | { profileComplete: true }
  | { profileComplete: false; verificationToken: string };

function mapApiUser(apiUser: ApiUserPayload | undefined, fallback: Partial<User>): User {
  return {
    id: apiUser?.id != null ? String(apiUser.id) : fallback.id,
    name: apiUser?.name ?? fallback.name ?? '',
    mobile: apiUser?.mobile ?? fallback.mobile ?? '',
    email: apiUser?.email ?? fallback.email,
  };
}

type AuthContextValue = {
  user: User | null;
  /** Bumps on every login/logout so screens refetch user-specific data. */
  sessionGeneration: number;
  isReady: boolean;
  hasSeenWelcome: boolean;
  setHasSeenWelcome: () => Promise<void>;
  /** Sign in with Google using Firebase. */
  loginWithGoogle: (idToken: string) => Promise<void>;
  /** Step 1: Send a unique 6-digit OTP to the Gmail inbox (SMTP). */
  sendEmailOtp: (email: string) => Promise<void>;
  /** Step 2: Verify OTP — returning users sign in; new users get verificationToken for step 3. */
  verifyEmailOtpCode: (email: string, code: string) => Promise<EmailOtpVerifyResult>;
  /** Step 3: Complete sign-in with name + mobile after OTP verified. */
  completeEmailLogin: (email: string, verificationToken: string, name: string, mobile: string) => Promise<void>;
  /** Sign in with email and password (legacy). */
  loginWithEmail: (email: string, password: string) => Promise<void>;
  /** Create account with name, mobile, Gmail, and password (legacy). */
  signupWithEmail: (name: string, mobile: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Get current session token for API calls. */
  getToken: () => Promise<string | null>;
  /** Update user profile (name, mobile, email). */
  updateProfile: (updates: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { addNotification } = useNotifications();
  const [user, setUser] = useState<User | null>(null);
  const [sessionGeneration, setSessionGeneration] = useState(0);
  const [hasSeenWelcome, setHasSeenWelcomeState] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const clearSessionOnLogout = useCallback(async () => {
    await clearUserSessionStorage();
  }, []);

  const bumpSession = useCallback(() => {
    setSessionGeneration(g => g + 1);
  }, []);

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

  useEffect(() => {
    // Warm backend once so first auth action feels faster.
    fetchWithTimeout(`${getApiBase()}/health`, { timeoutMs: 4000 }).catch(() => {});
  }, []);

  const persistUser = useCallback(
    async (u: User, token: string) => {
      setUser(u);
      await Promise.all([
        AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u)),
        AsyncStorage.setItem(TOKEN_KEY, token),
      ]);
      bumpSession();
    },
    [bumpSession],
  );

  const handleNetworkError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Network error';
    const lower = msg.toLowerCase();
    const api = getApiBase();
    if (
      lower.includes('fetch') ||
      lower.includes('network') ||
      lower.includes('failed') ||
      lower.includes('aborted')
    ) {
      throw new Error(
        `Cannot reach server at ${api}. ` +
          (api.startsWith('http://')
            ? 'On a phone: use the same Wi‑Fi as your PC, run ipconfig for your IPv4, set EXPO_PUBLIC_API_URL=http://YOUR_IP:4000/api in frontend/.env, restart Expo. Or use https://thecfofino-3.onrender.com/api for production.'
            : 'Check internet connection and that the backend is deployed on Render with SMTP configured.'),
      );
    }
    throw new Error(msg);
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
      let json: { ok?: boolean; error?: string; token?: string; user?: ApiUserPayload };
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        const msg = res!.status >= 500 ? 'Server error. Try again later.' : (text?.slice(0, 100) || 'Invalid response.');
        throw new Error(msg);
      }
      if (!res!.ok) throw new Error(json.error || 'Login failed.');
      if (!json.ok || !json.token) throw new Error(json.error || 'Login failed.');
      const u = mapApiUser(json.user, {
        name: name.trim() || 'User',
        mobile: digits,
      });
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

      const u = mapApiUser(json.user, {
        name: name.trim() || 'User',
        mobile: digits,
      });
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
      let json: { ok?: boolean; error?: string; token?: string; user?: ApiUserPayload };
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

      const u = mapApiUser(json.user, {
        email: fallbackEmail ?? '',
      });
      await persistUser(u, json.token);
    },
    [persistUser, handleNetworkError],
  );

  const signupWithEmail = useCallback(
    async (name: string, mobile: string, email: string, password: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error('Enter your name.');
      const digits = mobile.replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
      const normEmail = email.toLowerCase().trim();
      const gmailOk = /@(gmail|googlemail)\.com$/i.test(normEmail);
      if (!gmailOk) throw new Error('Use a Gmail address (@gmail.com).');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');

      try {
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
            }),
            timeoutMs: 10000,
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

        const u = mapApiUser(json.user, {
          name: trimmedName,
          mobile: digits,
          email: normEmail,
        });
        await persistUser(u, json.token);
        
        // Action-based notification
        addNotification({
          title: 'Welcome to Finovert!',
          body: `Congratulations ${trimmedName}! Your account has been created successfully.`,
          read: true,
        });
      } catch (e: unknown) {
        const anyErr = e as { code?: string; message?: string };
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

  const sendEmailOtp = useCallback(
    async (email: string) => {
      const normEmail = email.toLowerCase().trim();
      const gmailOk = /@(gmail|googlemail)\.com$/i.test(normEmail);
      if (!gmailOk) throw new Error('Use a Gmail address (@gmail.com).');

      let res: Response;
      try {
        res = await fetchWithTimeout(`${getApiBase()}/auth/email-otp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normEmail }),
          timeoutMs: 90000,
        });
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') {
          const api = getApiBase();
          throw new Error(
            api.includes('onrender.com')
              ? 'Server timed out. Render Gmail SMTP is slow — use local API (frontend/.env) or add RESEND_API_KEY on Render.'
              : 'Request timed out. Check backend is running (npm run dev) and EXPO_PUBLIC_API_URL matches ipconfig IPv4.',
          );
        }
        handleNetworkError(e);
      }

      const text = await (res!).text();
      let json: { ok?: boolean; error?: string } = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        if (res!.status === 404) {
          throw new Error(
            'OTP service not found on server. Restart the backend (npm start) or deploy the latest code to Render.',
          );
        }
        throw new Error(res!.status >= 500 ? 'Server error.' : 'Invalid response from server.');
      }
      if (!res!.ok || !json.ok) {
        throw new Error(json.error || `Failed to send OTP (HTTP ${res!.status}).`);
      }
    },
    [handleNetworkError],
  );

  const verifyEmailOtpCode = useCallback(
    async (email: string, code: string) => {
      const normEmail = email.toLowerCase().trim();
      const gmailOk = /@(gmail|googlemail)\.com$/i.test(normEmail);
      if (!gmailOk) throw new Error('Use a Gmail address (@gmail.com).');
      const digits = code.replace(/\D/g, '');
      if (digits.length !== 6) throw new Error('Enter the 6-digit code from your email.');

      let res: Response;
      try {
        res = await fetchWithTimeout(`${getApiBase()}/auth/email-otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normEmail, code: digits }),
          timeoutMs: 30000,
        });
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') {
          throw new Error('Verification timed out. Please try again.');
        }
        handleNetworkError(e);
      }

      const json = (await (res!).json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        profileComplete?: boolean;
        verificationToken?: string;
        token?: string;
        user?: ApiUserPayload;
      };
      if (!res!.ok || !json.ok) {
        throw new Error(json.error || 'Invalid OTP for this Gmail.');
      }

      if (json.profileComplete && json.token) {
        const u = mapApiUser(json.user, { email: normEmail });
        await persistUser(u, json.token);
        addNotification({
          title: 'Welcome back',
          body: `Signed in as ${u.name || normEmail}`,
          read: true,
        });
        return { profileComplete: true };
      }

      if (!json.verificationToken) {
        throw new Error(json.error || 'Invalid OTP for this Gmail.');
      }
      return { profileComplete: false, verificationToken: json.verificationToken };
    },
    [handleNetworkError, persistUser, addNotification],
  );

  const completeEmailLogin = useCallback(
    async (email: string, verificationToken: string, name: string, mobile: string) => {
      const normEmail = email.toLowerCase().trim();
      const gmailOk = /@(gmail|googlemail)\.com$/i.test(normEmail);
      if (!gmailOk) throw new Error('Use a Gmail address (@gmail.com).');
      if (!name.trim()) throw new Error('Enter your name.');
      const digits = mobile.replace(/\D/g, '').slice(-10);
      if (digits.length !== 10) throw new Error('Enter a valid 10-digit mobile number.');
      if (!verificationToken) throw new Error('Verify your Gmail OTP first.');

      let res: Response;
      try {
        res = await fetchWithTimeout(`${getApiBase()}/auth/email-otp/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normEmail,
            verificationToken,
            name: name.trim(),
            mobile: digits,
          }),
          timeoutMs: 30000,
        });
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
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
        throw new Error(res!.status >= 500 ? 'Server error.' : 'Invalid response.');
      }
      if (!res!.ok || !json.ok || !json.token) {
        throw new Error(json.error || 'Sign-in failed.');
      }

      const u = mapApiUser(json.user, {
        name: name.trim(),
        mobile: digits,
        email: normEmail,
      });
      await persistUser(u, json.token);

      addNotification({
        title: 'Login Successful',
        body: 'Welcome! Your Gmail has been verified.',
        read: true,
      });
    },
    [persistUser, handleNetworkError, addNotification],
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const normEmail = email.toLowerCase().trim();
      const gmailOk = /@(gmail|googlemail)\.com$/i.test(normEmail);
      if (!gmailOk) throw new Error('Use a Gmail address (@gmail.com).');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');

      try {
        let res: Response;
        try {
          res = await fetchWithTimeout(`${getApiBase()}/auth/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normEmail, password }),
            timeoutMs: 10000,
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
        if (!(res!).ok) throw new Error(json.error || 'Sign-in failed.');
        if (!json.ok || !json.token) throw new Error(json.error || 'Sign-in failed.');

        const u = mapApiUser(json.user, { email: normEmail });
        await persistUser(u, json.token);

        addNotification({
          title: 'Login Successful',
          body: 'Welcome back! You have successfully signed in.',
          read: true,
        });
      } catch (e: any) {
        console.error('AuthContext: loginWithEmail error:', e);
        throw e;
      }
    },
    [handleNetworkError, persistUser],
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
      let json: { ok?: boolean; error?: string; token?: string; user?: ApiUserPayload };
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(res!.status >= 500 ? 'Server error.' : 'Invalid response.');
      }
      if (!res!.ok) throw new Error(json.error || 'Sign-in failed.');
      if (!json.ok || !json.token) throw new Error(json.error || 'Sign-in failed.');
      const u = mapApiUser(json.user, {});
      await persistUser(u, json.token);
    },
    [persistUser, handleNetworkError],
  );

  const logout = useCallback(async () => {
    setUser(null);
    await clearSessionOnLogout();
    await signOutFirebase().catch(() => {});
    bumpSession();
  }, [clearSessionOnLogout, bumpSession]);

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
      const updatedUser = mapApiUser(json.ok ? (json.user as ApiUserPayload) : undefined, {
        ...user!,
        ...updates,
      });
      setUser(updatedUser);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
    },
    [user, getToken, handleNetworkError],
  );

  const value: AuthContextValue = {
    user,
    sessionGeneration,
    isReady,
    hasSeenWelcome,
    setHasSeenWelcome,
    loginWithGoogle,
    sendEmailOtp,
    verifyEmailOtpCode,
    completeEmailLogin,
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
