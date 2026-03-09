# OTP login not working — checklist

The app uses **Fast2SMS** to send OTP and **backend** to verify. Use this checklist to fix “OTP not working”.

## 1. “Cannot reach server” / Network request failed

- **Physical device:** Set **EXPO_PUBLIC_API_URL** in **frontend/.env** to your computer’s IP and port:
  ```env
  EXPO_PUBLIC_API_URL=http://192.168.1.5:4000/api
  ```
  Replace `192.168.1.5` with your PC’s IP. Device and PC must be on the same Wi‑Fi.
- **Android emulator:** Leave **EXPO_PUBLIC_API_URL** empty (app uses `10.0.2.2:4000`).
- **iOS simulator:** Leave it empty (app uses `localhost:4000`).
- Ensure the **backend** is running: `cd backend && npm run dev`.

## 2. “Send OTP” fails (error alert after tapping Send OTP)

- **Backend .env:** Ensure **FAST2SMS_API_KEY** is set (from Fast2SMS dashboard).
- Check the **exact error message** in the alert (e.g. “Insufficient balance”, “Invalid credentials”, “DLT template required”). Fix in Fast2SMS dashboard or add balance.
- Use a valid **10-digit Indian mobile number**.
- In India, SMS often requires **DLT registration** and an approved template. In Fast2SMS, use an OTP template and the route/template they provide.

## 3. “Invalid or expired OTP” when verifying

- OTP expires in **5 minutes**. Request a new OTP and try again.
- Enter the **full 6-digit** code (no spaces).
- Ensure device time is roughly correct.

## 4. Backend not running or wrong port

- Start API: `cd d:\thecfo\backend && npm run dev`.
- You should see: `Finovert API running at http://localhost:4000`.
- If port 4000 is in use, stop the other process or run:
  ```powershell
  Get-NetTCPConnection -LocalPort 4000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```

## 5. Quick env summary

| Where         | Variable            | Purpose                          |
|---------------|---------------------|----------------------------------|
| frontend/.env | EXPO_PUBLIC_API_URL | Backend URL (required on device) |
| backend/.env  | FAST2SMS_API_KEY    | Fast2SMS API key for sending OTP |

Restart Expo after changing **frontend/.env**. Restart the backend after changing **backend/.env**.
