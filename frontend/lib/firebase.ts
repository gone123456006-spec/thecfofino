// lib/firebase.ts
import { auth, firebaseApp } from './firebaseConfig';
import firebase from 'firebase/compat/app';

// Re-export for convenience
export const firebaseAuth = auth;
export { firebaseApp };

export function isFirebaseConfigured(): boolean {
  // Hardcoded in config, so it's always true
  return true;
}

export async function signUpWithEmail(email: string, password: string) {
  return auth.createUserWithEmailAndPassword(email, password);
}

export async function deleteFirebaseUser(user: any) {
  return (user as firebase.User).delete();
}

export async function signInWithEmail(email: string, password: string) {
  console.log('Firebase: Attempting sign-in for:', email);
  return auth.signInWithEmailAndPassword(email, password);
}

/** Sign in to Firebase with Google id token (e.g. from expo-auth-session). */
export async function signInWithGoogleIdToken(idToken: string) {
  try {
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    return auth.signInWithCredential(credential);
  } catch (error: any) {
    console.error('Firebase Google Sign-In Error:', error.code, error.message);
    throw new Error(
      error.code === 'auth/invalid-credential'
        ? 'Invalid Google ID token. Please try again.'
        : error.message || 'Failed to sign in with Google',
    );
  }
}

export async function getIdToken(user: any): Promise<string> {
  return (user as firebase.User).getIdToken();
}

export async function getUserEmail(user: any): Promise<string | null> {
  return (user as firebase.User).email || null;
}

export async function getUserName(user: any): Promise<string | null> {
  return (user as firebase.User).displayName || null;
}

export function signOutFirebase(): Promise<void> {
  return auth.signOut();
}
