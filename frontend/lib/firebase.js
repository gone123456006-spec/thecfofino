import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA7ZwMcKvgh-hgp-XsXnXhX8dh_Pkbl6BM",
  authDomain: "finoverts.firebaseapp.com",
  projectId: "finoverts",
  storageBucket: "finoverts.firebasestorage.app",
  messagingSenderId: "503094535259",
  appId: "1:503094535259:web:7ae6d4914f8f9aa9204b7e",
  measurementId: "G-14Z69J5WTD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
