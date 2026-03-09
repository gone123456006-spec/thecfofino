# MongoDB Atlas – Fix "IP not whitelisted" connection error

If the backend shows:

```
❌ MongoDB connection failed: Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted.
```

your current IP is not in the project’s **IP Access List**. Add it in Atlas:

## Steps

1. Go to **https://cloud.mongodb.com** and sign in.
2. Select your **organization** and **project** (the one used by this app).
3. In the left sidebar, open **Network Access** (under **Security**).
4. Open the **IP Access List** tab.
5. Click **Add IP Address**.
6. Enter your IP:
   - **Single IP:** `223.228.255.185`  
   - Or use **Add Current IP Address** if that’s your machine.
   - For dev only (allow anywhere): `0.0.0.0/0` (use strong DB password; not for production).
7. Optional: add a **Comment** (e.g. `My dev machine`).
8. Click **Confirm**.
9. Wait until the new entry shows status **Active** (can take a minute).
10. Restart your backend (`npm run dev` in `backend/`).

After your IP is active in the list, the MongoDB connection error should be resolved.
