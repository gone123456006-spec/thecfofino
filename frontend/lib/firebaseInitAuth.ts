import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth'; // Required for Native path
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth'; // Explicitly get functions
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Force register top-level
import 'firebase/auth';

type RNativeAuthModule = typeof FirebaseAuth & {
  getReactNativePersistence: (storage: unknown) => Persistence;
};
export function initAuthForApp(firebaseApp: FirebaseApp): Auth {
  // Always try getAuth first (standard way to register/retrieve)
  try {
    const existing = getAuth(firebaseApp);
    if (existing) return existing;
  } catch (e) {
    /* Expected if not initialized yet */
  }

  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }

  // Native initialization with Persistence
  const nativeAuth = FirebaseAuth as RNativeAuthModule;
  const getPersistence = nativeAuth.getReactNativePersistence;
  
  if (typeof getPersistence !== 'function') {
    return getAuth(firebaseApp);
  }

  try {
    return initializeAuth(firebaseApp, {
      persistence: getPersistence(AsyncStorage),
    });
  } catch (e: any) {
    if (e?.code === 'auth/already-initialized' || e?.message?.includes('already registered')) {
      return getAuth(firebaseApp);
    }
    throw e;
  }
}
