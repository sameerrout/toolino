# ToolForForever — Gmail API Storage Architecture & Setup Guide

## Overview
ToolForForever uses **Gmail API** as its primary persistent cloud storage layer. All application records are securely formatted as versioned JSON documents inside Gmail messages in Google account **`sameerrout2006@gmail.com`**.

---

## 1. Gmail Storage Labels
The storage engine automatically provisions and manages records under these dedicated Gmail labels:

| Label | Purpose | Message Subject Pattern |
| :--- | :--- | :--- |
| `ToolForForever/Metadata` | Authoritative `database.json` snapshot | `[ToolForForever:METADATA] authoritative_database_snapshot` |
| `ToolForForever/Users` | Registered user profiles & credentials | `[ToolForForever:USER] <user_id>` |
| `ToolForForever/Visits` | Page visit & analytics records | `[ToolForForever:VISIT] <visit_id>` |
| `ToolForForever/ToolUsage` | Aggregate tool usage events | `[ToolForForever:TOOL_USAGE] <tool_slug>` |
| `ToolForForever/Activity` | Manager audit & security events | `[ToolForForever:ACTIVITY] <activity_id>` |
| `ToolForForever/Contact` | Contact form inquiries | `[ToolForForever:CONTACT] <message_id>` |
| `ToolForForever/Backups` | Hourly automated rolling backups | `[ToolForForever:BACKUP] <backup_id>` |

Messages are inserted directly into these labels via the Gmail API `users.messages.insert` method, completely bypassing the user's primary `INBOX` so no application records clutter your personal mail.

---

## 2. Google Cloud Console Setup

1. Open **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Select your project (or create `ToolForForever Storage`).
3. Enable the **Gmail API** (under **APIs & Services &rarr; Enabled APIs & Services**).
4. Go to **APIs & Services &rarr; Credentials**:
   - Create **OAuth 2.0 Client ID** (Application type: *Web application*).
   - Name: `ToolForForever Gmail Storage`
   - **Authorized JavaScript origins:**
     - `https://www.toolforforever.com`
     - `http://localhost:3000`
   - **Authorized redirect URIs:**
     - `https://www.toolforforever.com/api/admin/gmail-oauth/callback`
     - `http://localhost:3000/api/admin/gmail-oauth/callback`
5. Save your **Client ID** and **Client Secret**.

---

## 3. Vercel Environment Variables

In your Vercel Project (**`toolforforever`** &rarr; **Settings** &rarr; **Environment Variables**):

| Variable Name | Description | Environment |
| :--- | :--- | :--- |
| `GMAIL_STORAGE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console | Production, Preview, Development |
| `GMAIL_STORAGE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console | Production, Preview, Development |
| `GMAIL_STORAGE_REFRESH_TOKEN` | Permanent Offline Refresh Token (obtained from Step 4) | Production, Preview, Development |

---

## 4. One-Time Authorization Flow

1. Deploy the project to Vercel.
2. Visit **`https://www.toolforforever.com/api/admin/gmail-oauth/connect`**.
3. Sign in and grant permission to **`sameerrout2006@gmail.com`**.
4. The callback endpoint will automatically:
   - Exchange the authorization code for a permanent `refresh_token`.
   - Provision all 7 `ToolForForever/*` labels in your Gmail account.
   - Display the refresh token with a 1-click **Copy Refresh Token** button.
5. Paste the token into Vercel as `GMAIL_STORAGE_REFRESH_TOKEN` and trigger a **Redeploy**.

---

## 5. Verification & Migration Commands

```bash
# Verify live Gmail API connectivity, label provisioning, and read/write persistence
npm run verify:gmail

# Migrate local/backup records into Gmail storage
npm run migrate:gmail
```
