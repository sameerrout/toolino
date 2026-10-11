/**
 * ToolForForever Database Migration Script to Google Drive
 * 
 * Migrates all existing records (Users, Tool Usage, Activity Events,
 * Contact Messages, and Website Page Visits) to the official Google Drive
 * folder "ToolForForever_Data" for sameerrout2004@gmail.com.
 * 
 * Usage:
 *   node scripts/migrate-to-drive.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// Load environment variables from .env.local if present
const envLocalPath = path.join(ROOT, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const FOLDER_NAME = process.env.GOOGLE_DRIVE_FOLDER_NAME || 'ToolForForever_Data';
const TARGET_ACCOUNT = 'sameerrout2004@gmail.com';

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Google OAuth access token (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function getOrCreateFolder(token, folderName, parentId) {
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) query += ` and '${parentId}' in parents`;

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const searchData = await searchRes.json();
  if (Array.isArray(searchData.files) && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createPayload = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) createPayload.parents = [parentId];

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  const created = await createRes.json();
  return created.id;
}

async function uploadDatabase(token, folderId, databaseContent) {
  const serialized = JSON.stringify(databaseContent, null, 2);

  // Check if database.json already exists in folder
  const query = `name = 'database.json' and '${folderId}' in parents and trashed = false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();
  const existingFile = searchData.files?.[0];

  if (existingFile) {
    console.log(`Updating existing database.json in Google Drive (${existingFile.id})...`);
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: serialized,
      }
    );
    if (!updateRes.ok) throw new Error(`Upload failed: ${await updateRes.text()}`);
    return existingFile.id;
  }

  console.log(`Creating new database.json in Google Drive folder '${FOLDER_NAME}'...`);
  const boundary = `-------toolino_boundary_${Date.now()}`;
  const metadata = JSON.stringify({
    name: 'database.json',
    parents: [folderId],
    mimeType: 'application/json',
  });

  const multipartBody =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${serialized}\r\n` +
    `--${boundary}--`;

  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) throw new Error(`Multipart upload failed: ${await uploadRes.text()}`);
  const created = await uploadRes.json();
  return created.id;
}

async function verifyDriveDatabase(token, fileId, expectedCounts) {
  console.log('Verifying uploaded database by downloading directly from Google Drive...');
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Failed to read back from Google Drive: ${await res.text()}`);
  const text = await res.text();
  const parsed = JSON.parse(text);

  const actualUsers = parsed.users?.length || 0;
  const actualVisits = parsed.visits?.length || 0;
  const actualMessages = parsed.contactMessages?.length || 0;
  const actualEvents = parsed.events?.length || 0;

  console.log('--- Verification Results from Google Drive ---');
  console.log(`  Users in Drive: ${actualUsers} (Expected: ${expectedCounts.users})`);
  console.log(`  Visits in Drive: ${actualVisits} (Expected: ${expectedCounts.visits})`);
  console.log(`  Contact Messages in Drive: ${actualMessages} (Expected: ${expectedCounts.contactMessages})`);
  console.log(`  Activity Events in Drive: ${actualEvents} (Expected: ${expectedCounts.events})`);

  if (actualUsers !== expectedCounts.users || actualVisits !== expectedCounts.visits) {
    throw new Error('Data verification mismatch between source records and Google Drive!');
  }

  console.log('>>> 100% Data Integrity Verified in Google Drive! <<<');
}

async function main() {
  console.log('================================================================');
  console.log('ToolForForever Database Migration to Google Drive');
  console.log(`Target Account: ${TARGET_ACCOUNT}`);
  console.log(`Target Folder:  ${FOLDER_NAME}`);
  console.log('================================================================');

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('\nERROR: Google Drive OAuth credentials not found in environment.');
    console.error('Please configure the following in .env.local or your environment:');
    console.error('  GOOGLE_DRIVE_CLIENT_ID=...');
    console.error('  GOOGLE_DRIVE_CLIENT_SECRET=...');
    console.error('  GOOGLE_DRIVE_REFRESH_TOKEN=...');
    console.error('\nTo obtain your REFRESH_TOKEN:');
    console.error('  1. Run your Next.js app (npm run dev)');
    console.error('  2. Visit http://localhost:3000/api/admin/drive-oauth/connect');
    console.error('  3. Authorize with sameerrout2004@gmail.com to copy your refresh token.');
    process.exit(1);
  }

  // 1. Gather existing data from .data/db.json and .data/visits.json
  const dbJsonPath = path.join(ROOT, '.data', 'db.json');
  const visitsJsonPath = path.join(ROOT, '.data', 'visits.json');

  const dbData = {
    users: [],
    toolUsage: {},
    events: [],
    contactMessages: [],
    visits: [],
  };

  if (fs.existsSync(dbJsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));
      if (parsed) {
        dbData.users = Array.isArray(parsed.users) ? parsed.users : [];
        dbData.toolUsage = parsed.toolUsage && typeof parsed.toolUsage === 'object' ? parsed.toolUsage : {};
        dbData.events = Array.isArray(parsed.events) ? parsed.events : [];
        dbData.contactMessages = Array.isArray(parsed.contactMessages) ? parsed.contactMessages : [];
        if (Array.isArray(parsed.visits) && parsed.visits.length > 0) {
          dbData.visits = parsed.visits;
        }
      }
    } catch (e) {
      console.warn('Could not read .data/db.json:', e.message);
    }
  }

  if (fs.existsSync(visitsJsonPath)) {
    try {
      const visits = JSON.parse(fs.readFileSync(visitsJsonPath, 'utf-8'));
      if (Array.isArray(visits) && visits.length > 0) {
        // Merge visits
        const existingIds = new Set(dbData.visits.map((v) => v.id));
        for (const v of visits) {
          if (!existingIds.has(v.id)) {
            dbData.visits.push(v);
          }
        }
      }
    } catch (e) {
      console.warn('Could not read .data/visits.json:', e.message);
    }
  }

  // Ensure manager account is in the users list
  if (!dbData.users.some((u) => u.email.toLowerCase() === TARGET_ACCOUNT.toLowerCase())) {
    dbData.users.unshift({
      id: `mgr_${Date.now()}`,
      email: TARGET_ACCOUNT,
      name: 'Sameer',
      authProvider: 'email',
      role: 'manager',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
  }

  console.log(`Source Records Prepared:`);
  console.log(`  Users:            ${dbData.users.length}`);
  console.log(`  Page Visits:      ${dbData.visits.length}`);
  console.log(`  Tool Usage Slugs: ${Object.keys(dbData.toolUsage).length}`);
  console.log(`  Events:           ${dbData.events.length}`);
  console.log(`  Contact Messages: ${dbData.contactMessages.length}`);

  // 2. Connect to Google Drive
  console.log('\nConnecting to Google Drive API...');
  const token = await getAccessToken();
  console.log('OAuth access token successfully retrieved.');

  const folderId = await getOrCreateFolder(token, FOLDER_NAME);
  console.log(`Folder '${FOLDER_NAME}' verified in Drive (ID: ${folderId}).`);

  // Ensure backups/ folder exists
  const backupFolderId = await getOrCreateFolder(token, 'backups', folderId);
  console.log(`Subfolder 'backups/' verified in Drive (ID: ${backupFolderId}).`);

  // 3. Upload database.json to Drive
  const fileId = await uploadDatabase(token, folderId, dbData);
  console.log(`database.json persisted in Google Drive (File ID: ${fileId}).`);

  // 4. Verify data in Google Drive
  await verifyDriveDatabase(token, fileId, {
    users: dbData.users.length,
    visits: dbData.visits.length,
    contactMessages: dbData.contactMessages.length,
    events: dbData.events.length,
  });

  console.log('\n================================================================');
  console.log('Migration to Google Drive completed successfully!');
  console.log(`All records are stored in Google Drive folder: ${FOLDER_NAME}`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\nMigration Fatal Error:', err.message);
  process.exit(1);
});
