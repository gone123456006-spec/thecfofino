/**
 * Firebase (client) — init and auth helpers.
 * Set EXPO_PUBLIC_FIREBASE_* in .env (from Firebase Console → Project settings).
 * Only initializes when apiKey and projectId are set to avoid uncaught errors.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const hasValidConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
if (!getApps().length && hasValidConfig) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.warn('Firebase init failed:', e);
  }
} else if (getApps().length) {
  app = getApp();
}

export const auth: Auth | null = app ? getAuth(app) : null;

export function isFirebaseConfigured(): boolean {
  return !!auth;
}

export async function signUpWithEmail(email: string, password: string): Promise<UserCredential> {
  if (!auth) throw new Error('Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to .env');
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  if (!auth) throw new Error('Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to .env');
  return signInWithEmailAndPassword(auth, email, password);
}

/** Sign in to Firebase with Google id token (e.g. from expo-auth-session). */
export async function signInWithGoogleIdToken(idToken: string): Promise<UserCredential> {
  if (!auth) throw new Error('Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to .env');
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function getIdToken(user: User): Promise<string> {
  return user.getIdToken();
}
