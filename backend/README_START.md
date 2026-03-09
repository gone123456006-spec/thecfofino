# Backend – do not run Expo from here

This folder is the **Node/Express API server only**.

- **Start the API:** `npm run dev` (from this folder)
- **Start the mobile app (Expo):** run from the **frontend** folder:

  ```bash
  cd ..\frontend
  npx expo start
  ```

  Or from repo root: `npm start`

If you run `npx expo start` from the **backend** folder by mistake, Metro will try to bundle backend code and you’ll see errors about `dotenv` / Node modules. Always run Expo from **frontend**.
