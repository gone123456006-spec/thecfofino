/**
 * Ensures Firebase (and other) env is available at runtime via Constants.expoConfig.extra,
 * even when Metro does not inline EXPO_PUBLIC_* into the bundle.
 * Base config is still maintained in app.json.
 */
const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (_) {
  /* dotenv optional if Expo CLI already injected env */
}

const appJson = require('./app.json');

/** Play Store / release APK must use this (not a PC LAN IP). */
const PRODUCTION_API = 'https://thecfofino-3.onrender.com/api';

/** Local dev only: EXPO_USE_LOCAL_API=1 + EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api */
const useLocalApi = process.env.EXPO_USE_LOCAL_API === '1';
const apiBaseUrl =
  useLocalApi && process.env.EXPO_PUBLIC_API_URL?.trim()
    ? process.env.EXPO_PUBLIC_API_URL.trim()
    : PRODUCTION_API;

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL,
      apiBaseUrl,
      firebase: {
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      },
    },
  },
};
