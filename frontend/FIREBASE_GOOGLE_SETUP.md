# Firebase Google Sign-In Setup Guide for Finovert

Complete step-by-step setup to enable Google Sign-In in the Finovert Expo app.

---

## Part 1: Firebase Console Setup

### Step 1: Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name (e.g., "Finovert")
4. Continue through setup, enable Analytics if desired
5. Click **"Create project"**

### Step 2: Get Firebase Configuration
1. In Firebase Console, go to **Project Settings** (gear icon, top-left)
2. Click **"Service accounts"** tab
3. Copy the entire `firebaseConfig` object or note the values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

### Step 3: Enable Google Authentication
1. Go to **Authentication** (left sidebar)
2. Click **"Get started"** if first time
3. Click **"Sign-in method"** tab
4. Click **"Google"**
5. Toggle it **ON**
6. Add your email as the Support email
7. Click **"Save"**

---

## Part 2: Google Cloud Console Setup

### Step 4: Create OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the **same project** as Firebase
3. Go to **APIs & Services** → **OAuth consent screen**
4. Choose **External** user type
5. Click **"Create"**
6. Fill in:
   - **App name**: "Finovert"
   - **User support email**: Your email
   - **Developer contact**: Your email
7. Click **"Save and Continue"**
8. Skip scopes, click **"Save and Continue"**
9. Click **"Back to Dashboard"**

### Step 5: Create OAuth Credentials for Web
1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Choose **"Web application"**
4. Name it "Finovert Web Client"
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - `http://localhost:8081`
   - `http://localhost:19006`
   - `http://127.0.0.1`
6. **Copy the `Client ID`** (you'll use this in `.env`)
7. Click **"Create"**

### Step 6: Get expoClientId for Expo Auth Session
1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Find the Web OAuth client you just created
3. Click the download icon to get JSON
4. The `client_id` value is your **expoClientId**

---

## Part 3: Environment Variables Setup

### Step 7: Add Firebase Config to `.env`

In your `frontend/.env` file, add:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google OAuth (from Step 6)
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your_google_client_id_here
```

### Step 8: Update Backend Environment

The backend already has an endpoint `/api/auth/google` that handles Firebase ID tokens.

Make sure your `backend/.env` has:
```env
DEMO_OTP_ENABLED=0
```

---

## Part 4: Backend Setup (if using custom auth endpoint)

The backend endpoint `/api/auth/google` expects:
- **Method**: POST
- **Path**: `/api/auth/google`
- **Body**: `{ idToken: "firebase_id_token" }`
- **Returns**: `{ ok: true, token: "app_jwt", user: { name, email, mobile } }`

This is already implemented in `backend/src/routes/auth.js`.

---

## Part 5: Test in Expo Go

### On Simulator/Emulator:
```bash
cd frontend
npx expo start
# Press 'i' for iOS or 'a' for Android
```

### On Physical Device:
```bash
cd frontend
npx expo start --tunnel
# Scan QR code with Expo Go app
```

### Test Google Sign-In:
1. Tap **"Sign in with Google"** button
2. You should be redirected to Google login
3. After login, you'll be redirected back to the app
4. User data (name, email) should appear
5. You should be logged into the app

---

## Part 6: Troubleshooting

### "Google Sign-In failed" error
- Check that `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` is set in `.env`
- Verify the OAuth client is created in Google Cloud Console
- Make sure Google Sign-In is enabled in Firebase

### "Cannot reach server"
- Make sure backend is running: `npm start` in `backend/`
- If using physical device, set `EXPO_PUBLIC_API_URL` to your computer's IP

### "Invalid ID token"
- Make sure Firebase project ID matches in `.env`
- Verify Google OAuth consent screen is configured

### OAuth redirect fails
- Check that authorized JavaScript origins include `localhost` variants
- For physical device, add your device's IP to authorized origins

---

## Part 7: Code Changes Summary

✅ **LoginScreen.tsx**: Replaced OTP with `expo-auth-session` Google Sign-In
✅ **AuthContext.tsx**: Updated to use `loginWithGoogle()` method
✅ **firebase.ts**: Enhanced with proper error handling for Google Sign-In
✅ **app.json**: Updated app name to "finovert"
✅ **.env**: Add Firebase + Google OAuth credentials

---

## Quick Reference: Environment Variables

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=AIza***
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=finovert-xxx.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=finovert-xxx
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=finovert-xxx.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=123456-abc123.apps.googleusercontent.com
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api  # For physical device only
```

---

## File Locations
- **LoginScreen**: `frontend/components/LoginScreen.tsx`
- **AuthContext**: `frontend/contexts/AuthContext.tsx`  
- **Firebase Config**: `frontend/lib/firebase.ts`
- **Backend Auth**: `backend/src/routes/auth.js`

---

## Next Steps
1. Complete all steps above
2. Add credentials to `.env`
3. Run `npx expo start` in frontend
4. Test Google Sign-In
5. Deploy when ready

Happy coding! 🚀
