# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Android build: JAVA_HOME error on Windows

If you see **"JAVA_HOME is set to an invalid directory"** (often with a path ending in `\jdk-17`):

1. **Fix JAVA_HOME** – it must point to the **JDK root** (the folder that contains `bin`, `lib`), not a subfolder.
   - Wrong: `C:\Program Files\Microsoft\jdk-17.0.12.7-hotspot\jdk-17`
   - Right: `C:\Program Files\Microsoft\jdk-17.0.12.7-hotspot`

2. **Option A – current terminal (PowerShell):**
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.12.7-hotspot"
   npm run android
   ```

3. **Option B – run the helper script** (tries to find JDK and run Android):
   ```powershell
   .\scripts\android-windows.ps1
   ```

4. **Option C – set permanently:** Windows → Environment Variables → set `JAVA_HOME` to the JDK root (no `\jdk-17` at the end).

## Android emulator not in PATH (Windows)

If **"emulator is not recognized"** when you run `emulator -list-avds` or `emulator -avd "Pixel 7"`:

1. **Use the helper script** (finds SDK via `ANDROID_HOME` or `%LOCALAPPDATA%\Android\Sdk`):
   ```powershell
   cd frontend
   .\scripts\run-emulator.ps1              # list AVDs
   .\scripts\run-emulator.ps1 -Avd "Pixel 7"   # start an AVD
   ```

2. **Or add the emulator to PATH** – set `ANDROID_HOME` to your SDK root (e.g. `C:\Users\<You>\AppData\Local\Android\Sdk`), then add `%ANDROID_HOME%\emulator` and `%ANDROID_HOME%\platform-tools` to your PATH. Restart the terminal and run `emulator -list-avds` again.

3. **Or start from Android Studio** – Tools → Device Manager → click ▶ next to an AVD.

## ADB exited with code 255 (emulator-5554 / pm list packages)

If you see **"adb ... shell pm list packages ... com.brandovert.finoverts exited with non-zero code: 255"**:

1. **Wrong ADB path** – The error often uses `C:\Users\USER\.android\platform-tools\adb`, which is not the real Android SDK. Expo/Android need the **official SDK** `platform-tools`.

2. **Set ANDROID_HOME** to your Android SDK root (where `platform-tools` and `emulator` live), for example:
   - `C:\Users\USER\AppData\Local\Android\Sdk`
   - In PowerShell (current session):
     ```powershell
     $env:ANDROID_HOME = "C:\Users\USER\AppData\Local\Android\Sdk"
     ```
   - To set permanently: Windows → Environment Variables → User variables → New/Edit `ANDROID_HOME` → set to the path above.

3. **Restart ADB and emulator:**
   ```powershell
   # Use the SDK adb (replace with your ANDROID_HOME if different)
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" kill-server
   & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" start-server
   ```
   Then start the emulator again (Android Studio → Device Manager → ▶ or `emulator -avd "Your_AVD"`), wait until it’s fully booted, and run `npx expo run:android` from `frontend` again.

4. **Check device:** Run `adb devices`. You should see `emulator-5554 device`. If it says `offline` or nothing, the emulator isn’t ready or ADB is still using the wrong path.

## Images / icons not showing on Android emulator

If **local images or icons are invisible** on the Android emulator (but work on iOS or web):

1. **This project uses React Native’s `Image`** (from `react-native`) for all local assets (`require('./image.png')`). That avoids known issues with `expo-image` and local assets on Android.

2. **Clear Metro cache and rebuild:**
   ```powershell
   cd frontend
   npx expo start --clear
   ```
   In another terminal (with the emulator already running):
   ```powershell
   cd frontend
   npx expo run:android
   ```

3. **Confirm asset paths** – All image `require()` paths are relative to the file that requires them. Assets live in `frontend/assets/images/`. If you add new images, put them there and require with a path relative to your file (e.g. from `constants/assets.ts`: `require('../assets/images/icon.png')`).

4. **Give images explicit size** – On Android, `Image` often needs `width` and `height` in `style` (or a parent with fixed size). If an image has no dimensions, it can render at 0 size and look “invisible.” The app’s styles already set sizes for logo, hero, and service icons.

5. **Rebuild the dev client** – If you only ever ran `npx expo start` and pressed `a`, the native app may be old. Do a full run:
   ```powershell
   cd frontend
   npx expo run:android
   ```
   so the app is reinstalled with the latest JS bundle and assets.

## "No development build installed" on Android

This project uses **expo-dev-client** (a development build), not Expo Go. You must **build and install** the app on the emulator once:

1. Start the emulator (e.g. `.\scripts\run-emulator.ps1 -Avd "Pixel_7"`) and wait until it’s fully booted.
2. From `frontend`, run:
   ```powershell
   npx expo run:android
   ```
   (Use `.\scripts\android-windows.ps1` if you need JAVA_HOME set first.)

This compiles and installs the dev client on the emulator. After that, `npx expo start` and pressing **a** will open the installed app.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
