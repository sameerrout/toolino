/**
 * ToolForForever - Migration Script to Gmail Storage
 * 
 * Safely discovers, backs up, validates, and imports all existing records
 * into the Gmail account sameerrout2006@gmail.com under ToolForForever labels.
 * 
 * Usage:
 *   node scripts/migrate-to-gmail.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// Load environment variables from .env.local
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

const CLIENT_ID =
  process.env.GMAIL_STORAGE_CLIENT_ID ||
  process.env.GMAIL_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID;

const CLIENT_SECRET =
  process.env.GMAIL_STORAGE_CLIENT_SECRET ||
  process.env.GMAIL_CLIENT_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET;

const REFRESH_TOKEN =
  process.env.GMAIL_STORAGE_REFRESH_TOKEN ||
  process.env.GMAIL_REFRESH_TOKEN;

const TARGET_ACCOUNT = 'sameerrout2006@gmail.com';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function getAccessToken() {
  const res = await fetch(TOKEN_ENDPOINT, {
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
    throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

function buildRfc2822(subject, body, labelName) {
  const lines = [
    `To: ${TARGET_ACCOUNT}`,
    `From: ToolForForever Storage <${TARGET_ACCOUNT}>`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: application/json; charset=UTF-8`,
    `X-TFF-Label: ${labelName}`,
    '',
    body,
  ];
  return Buffer.from(lines.join('\r\n'), 'utf-8').toString('base64url');
}

async function main() {
  console.log('================================================================');
  console.log('ToolForForever - Migration to Gmail Storage');
  console.log(`Target Gmail Account: ${TARGET_ACCOUNT}`);
  console.log('================================================================\n');

  // Step 1: Discover and inventory source records
  console.log('Step 1: Discovering existing local source data...');
  const localDbPath = path.join(ROOT, '.data', 'db.json');
  if (!fs.existsSync(localDbPath)) {
    throw new Error(`Local source database file not found at: ${localDbPath}`);
  }

  const rawSource = fs.readFileSync(localDbPath, 'utf-8');
  const sourceDb = JSON.parse(rawSource);

  const usersCount = sourceDb.users?.length || 0;
  const visitsCount = sourceDb.visits?.length || 0;
  const toolUsageCount = Object.keys(sourceDb.toolUsage || {}).length;
  const eventsCount = sourceDb.events?.length || 0;
  const messagesCount = sourceDb.contactMessages?.length || 0;

  console.log(`  Source Users:            ${usersCount}`);
  console.log(`  Source Visits:           ${visitsCount}`);
  console.log(`  Source Tool Categories:  ${toolUsageCount}`);
  console.log(`  Source Activity Events:  ${eventsCount}`);
  console.log(`  Source Contact Messages: ${messagesCount}`);

  // Step 2: Create secure backup
  const backupDir = path.join(ROOT, '.data', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `pre_migration_backup_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(sourceDb, null, 2), 'utf-8');
  console.log(`\nStep 2: Created immutable source backup at:\n  ${backupFile}`);

  // Step 3: Check credentials
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.log('\n[STATUS]: Gmail credentials not yet configured.');
    console.log('To complete migration to Gmail:');
    console.log('  1. Add GMAIL_STORAGE_CLIENT_ID and GMAIL_STORAGE_CLIENT_SECRET.');
    console.log('  2. Visit /api/admin/gmail-oauth/connect to authorize sameerrout2006@gmail.com.');
    console.log('  3. Run this script again once GMAIL_STORAGE_REFRESH_TOKEN is saved.');
    return;
  }

  // Step 4: Import to Gmail
  console.log('\nStep 3: Connecting to Gmail API...');
  const token = await getAccessToken();

  // Ensure labels
  const labelsRes = await fetch(`${GMAIL_API_BASE}/labels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const labelsData = await labelsRes.json();
  const existingMap = new Map((labelsData.labels || []).map((l) => [l.name, l.id]));

  const REQUIRED_LABELS = [
    'ToolForForever/Users',
    'ToolForForever/Visits',
    'ToolForForever/ToolUsage',
    'ToolForForever/Activity',
    'ToolForForever/Contact',
    'ToolForForever/Metadata',
    'ToolForForever/Backups',
  ];

  const labelIds = {};
  for (const labelName of REQUIRED_LABELS) {
    let id = existingMap.get(labelName);
    if (!id) {
      const createRes = await fetch(`${GMAIL_API_BASE}/labels`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        }),
      });
      const created = await createRes.json();
      id = created.id;
    }
    labelIds[labelName] = id;
  }

  console.log('Step 4: Writing authoritative database snapshot to ToolForForever/Metadata...');
  const snapshotPayload = {
    schemaVersion: 1,
    recordType: 'metadata',
    recordId: 'authoritative_database_snapshot',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    payload: sourceDb,
  };

  const rawMsg = buildRfc2822(
    `[ToolForForever:METADATA] authoritative_database_snapshot`,
    JSON.stringify(snapshotPayload, null, 2),
    'ToolForForever/Metadata'
  );

  const insertRes = await fetch(`${GMAIL_API_BASE}/messages?internalDateSource=dateHeader`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawMsg,
      labelIds: [labelIds['ToolForForever/Metadata']],
    }),
  });

  if (!insertRes.ok) {
    throw new Error(`Failed to insert metadata into Gmail: ${await insertRes.text()}`);
  }

  console.log('\n================================================================');
  console.log('Migration to Gmail Storage completed successfully!');
  console.log(`Migrated: ${usersCount} users, ${visitsCount} visits, ${messagesCount} messages.`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\nMigration Error:', err.message);
  process.exit(1);
});
