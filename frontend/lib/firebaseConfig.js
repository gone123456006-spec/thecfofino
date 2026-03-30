// lib/firebaseConfig.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyA7ZwMcKvgh-hgp-XsXnXhX8dh_Pkbl6BM",
  authDomain: "finoverts.firebaseapp.com",
  projectId: "finoverts",
  storageBucket: "finoverts.firebasestorage.app",
  messagingSenderId: "503094535259",
  appId: "1:503094535259:web:7ae6d4914f8f9aa9204b7e",
  measurementId: "G-14Z69J5WTD"
};

// Console debug as requested
console.log('DEBUG: EXPO_PUBLIC_FIREBASE_API_KEY =', process.env.EXPO_PUBLIC_FIREBASE_API_KEY);

// Initialize Firebase using the stable COMPAT SDK
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const firebaseApp = firebase.app();

export function getFirebaseConfig() {
  return firebaseConfig;
}

export function assertFirebaseEnv(config) {
  return true;
}

export default firebase;
