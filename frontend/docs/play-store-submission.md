# Google Play submission (Finovert)

Use this with the Play Console **Data safety**, **App content**, and **Testing** sections. Update any bracketed placeholders before you publish.

## App identity (must match the binary)

| Field | Value |
|--------|--------|
| Android application ID | `com.brandovert.finovert` (from `app.json` → `expo.android.package`) |
| iOS bundle ID | `com.brandovert.finovert` |
| Play Store listing URL | `https://play.google.com/store/apps/details?id=com.brandovert.finovert` |

Single source in code: `constants/publishing.ts`.

**Target SDK:** `app.json` sets `expo.android.targetSdkVersion` to **35** (keep aligned with Play requirements).

**Privacy policy URL:** Set `EXPO_PUBLIC_PRIVACY_POLICY_URL` (and optional `extra.privacyPolicyUrl` via `app.config.js`) to your **public HTTPS** policy page. The in-app `/privacy` screen can show an “Open official privacy policy (web)” link when this is set.

**Blocked permissions (merged manifest):** `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE`, `READ_MEDIA_VISUAL_USER_SELECTED`, `WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO` are listed under `expo.android.blockedPermissions` so dependencies cannot grant broad storage/mic access. Active grants should be minimal (e.g. `CAMERA`, `INTERNET`).

## Production build and install test

```bash
cd frontend
npm install
npx eas-cli build --platform android --profile production
```

After the AAB is built, install on a device (internal testing track or `bundletool`) and verify:

- Sign-in (email/password or Google, per your release config)
- Profile photo upload (gallery + camera)
- Company registration document upload (gallery, camera, PDF)
- Razorpay payment flow (WebView checkout)
- Google Sign-In

## Merged manifest check (READ_MEDIA / unexpected permissions)

After generating native projects:

```bash
cd frontend
npx expo prebuild --platform android
```

Then either:

- Android Studio: open `android` → **Merged Manifest** for `app`, search for `READ_MEDIA`, `READ_EXTERNAL`, `WRITE_EXTERNAL`, `QUERY_ALL`, `MANAGE_EXTERNAL`, or  
- Search from repo root:

```bash
rg "READ_MEDIA|READ_EXTERNAL|WRITE_EXTERNAL|QUERY_ALL_PACKAGES|ACCESS_FINE_LOCATION|ACCESS_BACKGROUND" android/app/src/main/AndroidManifest.xml android/**/AndroidManifest.xml
```

**What you should see:** Expo writes `android.blockedPermissions` as `<uses-permission … tools:node="remove"/>` entries so merged libraries **drop** those permissions. In **Merged Manifest** (release), `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` must **not** be present as active grants. If any permission still appears **without** `tools:node="remove"`, fix or upgrade that dependency.

**Splash asset:** `app.json` uses `./assets/images/FinoC.png` for splash so `npx expo prebuild` succeeds (do not reference a missing `splash.png`).

**Optional:** If `SYSTEM_ALERT_WINDOW` appears and you do not need overlays, track which dependency adds it (often dev tooling); release builds on EAS may omit some debug-only entries.

## Photo and video permissions (declaration)

State that the app:

- Does **not** require broad access to the user’s photo or video library
- Uses the **system picker** for user-selected images/videos only, after an explicit action
- Does **not** perform background gallery scanning or bulk reads

## Data safety (align answers with the real app)

Declare at least the following if your production app matches the current codebase:

**Data collected (examples—confirm against your backend and analytics):**

- **Personal info:** name, email, phone number (account, forms, bookings)
- **Financial info:** payment-related data processed via Razorpay (as exposed to your app); service fees / registration context
- **Photos or videos:** user-selected document images (PAN, Aadhaar, profile photo) uploaded for services
- **App activity:** registrations, bookings, notifications (if stored)
- **Device or other IDs:** Firebase / device identifiers if your SDKs collect them

**Data shared:** list processors you use (e.g. Firebase Authentication/Firestore or your API host, Google Sign-In, Razorpay, email provider). Mark whether data is **encrypted in transit** (HTTPS).

**Optional vs required:** mark fields required only where the UI blocks progress without them.

**Account deletion:** provide the same mechanism you describe in privacy text (e.g. support email process).

If you add analytics or ads later, update the form before shipping a build that includes them.

## App content questionnaires

- **Financial features:** answer honestly (consulting, registration services, payments).
- **Government / health:** usually “No” unless you add such features.
- **News / UGC:** “No” unless users can publish public content.
- **Target audience / Families:** mark **not** primarily child-directed unless you redesign for children.

## Privacy policy URL (store listing)

Play requires a **working HTTPS** privacy policy URL on the store listing. Your in-app screen is at route **`/privacy`**; the listing URL must be a **public** page (hosted website) with substantially the same commitments as in-app, or host the same text at a stable URL.

## Reviewer access (App access)

If sign-in is required for core flows, in **Play Console → Testing → (internal/closed) → App access** (or the review questionnaire), provide:

- Test email and password **or** steps to use Google test account  
- Note any OTP: use a **fixed test OTP** or disable OTP for the test backend user  
- Region: if services are India-only, say so  

**Do not commit real reviewer passwords to git.** Keep credentials only in Play Console (or your team’s secrets manager).

Example wording you can paste (replace brackets):

```text
Test account: [reviewer@yourdomain.com] / Password: [set in Play Console only]
Google Sign-In: use the same test account if Google login is enabled for [reviewer@yourdomain.com].
OTP: disabled for this user OR use code [000000] on staging API only.
Primary flows: Profile → upload photo; Company registration → upload docs → pay with test Razorpay key.
```

## Advertising ID

If you do **not** use the advertising ID, declare **No** in Data safety and avoid SDKs that require it unless you update the form.
