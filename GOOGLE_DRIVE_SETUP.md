# ToolForForever — Google Drive Exclusive Data Storage Setup

This guide documents the architecture and exact setup steps to store all ToolForForever application data exclusively in **Google Drive** under the Google account **sameerrout2004@gmail.com** in the dedicated folder **`ToolForForever_Data`**.

---

## Architecture Overview

- **Storage Target:** Google Drive (Account: `sameerrout2004@gmail.com`)
- **Root Folder:** `ToolForForever_Data`
- **Main Database File:** `database.json` (contains all `users`, `toolUsage`, `events`, `contactMessages`, and `visits`)
- **Automated Backups:** Subfolder `ToolForForever_Data/backups/` (rolling timestamped snapshots)
- **Protocol:** Official Google Drive REST API v3 over HTTPS (zero runtime dependencies, optimal Vercel serverless performance)
- **PostgreSQL / Neon:** Completely removed. No database fallback or secondary storage is used.

---

## Step 1: Google Cloud Console Configuration

1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with **`sameerrout2004@gmail.com`**.
3. Create a new project (e.g., named **ToolForForever**).
4. In the search bar, search for **Google Drive API** and click **Enable**.
5. Configure the **OAuth Consent Screen**:
   - **User Type:** External
   - **App Name:** `ToolForForever`
   - **User Support Email:** `sameerrout2004@gmail.com`
   - **Developer Contact Email:** `sameerrout2004@gmail.com`
   - **Scopes:** Add `https://www.googleapis.com/auth/drive.file` and `https://www.googleapis.com/auth/userinfo.email`.
   - **Test Users:** Add `sameerrout2004@gmail.com`.
6. Go to **Credentials** -> **Create Credentials** -> **OAuth Client ID**:
   - **Application Type:** Web application
   - **Name:** `ToolForForever Web Client`
   - **Authorized JavaScript Origins:**
     - `https://www.toolforforever.com`
     - `http://localhost:3000`
   - **Authorized Redirect URIs (CRITICAL):**
     - `https://www.toolforforever.com/api/admin/drive-oauth/callback`
     - `http://localhost:3000/api/admin/drive-oauth/callback`
7. Click **Create** and copy your:
   - **Client ID**
   - **Client Secret**

---

## Step 2: Obtain your Permanent Google Drive Refresh Token

Once you have your `Client ID` and `Client Secret`, you can generate your offline refresh token through the built-in OAuth helper:

### Option A (In Production):
1. In your **Vercel Project Settings** -> **Environment Variables**, add:
   - `GOOGLE_DRIVE_CLIENT_ID` = *(Your Google Cloud Client ID)*
   - `GOOGLE_DRIVE_CLIENT_SECRET` = *(Your Google Cloud Client Secret)*
2. Deploy or redeploy your site.
3. In your browser, open:
   ```
   https://www.toolforforever.com/api/admin/drive-oauth/connect
   ```
4. Sign in with **`sameerrout2004@gmail.com`** and grant access to manage files created by the app.
5. The page will immediately display your **Permanent Refresh Token**. Copy it!

### Option B (Locally):
1. Add `GOOGLE_DRIVE_CLIENT_ID` and `GOOGLE_DRIVE_CLIENT_SECRET` into `.env.local`.
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000/api/admin/drive-oauth/connect` in your browser.
4. Authorize with `sameerrout2004@gmail.com` and copy the generated Refresh Token.

---

## Step 3: Configure Environment Variables in Vercel

In your [Vercel Dashboard](https://vercel.com/) -> **Project Settings** -> **Environment Variables**, add the following 4 variables (for Production, Preview, and Development):

| Environment Variable | Description | Example / Default |
|---|---|---|
| `GOOGLE_DRIVE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud | `123456...apps.googleusercontent.com` |
| `GOOGLE_DRIVE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud | `GOCSPX-...` |
| `GOOGLE_DRIVE_REFRESH_TOKEN` | Permanent Offline Refresh Token obtained from Step 2 | `1//04...` |
| `GOOGLE_DRIVE_FOLDER_NAME` | Dedicated folder name in Google Drive | `ToolForForever_Data` |

> **Note:** Also remove any old `DATABASE_URL`, `POSTGRES_PRISMA_URL`, or `POSTGRES_URL` variables from Vercel to confirm that PostgreSQL is completely detached.

---

## Step 4: Run Data Migration & Verification

### 1. Migrate Existing Records:
To upload all existing visitors, registered members, tool usage, events, and contact messages into Google Drive:
```bash
npm run migrate:drive
```
This script:
- Creates the `ToolForForever_Data` folder and `backups/` subfolder in Drive.
- Uploads all records to `database.json`.
- Downloads and verifies 100% data integrity before reporting success.

### 2. Live Verification Test:
To test creating a visitor record, persisting it in Google Drive, and reading it back:
```bash
npm run verify:drive
```

---

## Verification & Manager Dashboard

Once configured, visit `/manager` on your live site:
- The top status badge will display **Google Drive Connected**.
- The info banner will display:
  `Google Drive Persistent Storage Active: All visitor analytics, member accounts, contact messages, and activity events are stored exclusively in Google Drive folder ToolForForever_Data (sameerrout2004@gmail.com).`
- All 4 metric cards (Total Visits, Unique Visitors, Today's Visitors, Registered Members) will show the **Google Drive** badge.
