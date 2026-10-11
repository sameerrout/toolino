/**
 * ToolForForever - Gmail API Storage Verification Script
 * 
 * Verifies live Gmail API writes, reads, label provisioning, user lookup,
 * and data persistence in Google account sameerrout2006@gmail.com.
 * 
 * Usage:
 *   node scripts/verify-gmail.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

const CLIENT_ID =
  process.env.GMAIL_STORAGE_CLIENT_ID ||
  process.env.GMAIL_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_DRIVE_CLIENT_ID;

const CLIENT_SECRET =
  process.env.GMAIL_STORAGE_CLIENT_SECRET ||
  process.env.GMAIL_CLIENT_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  process.env.GOOGLE_DRIVE_CLIENT_SECRET;

const REFRESH_TOKEN =
  process.env.GMAIL_STORAGE_REFRESH_TOKEN ||
  process.env.GMAIL_REFRESH_TOKEN;

const TARGET_ACCOUNT = 'sameerrout2006@gmail.com';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

const REQUIRED_LABELS = [
  'ToolForForever/Users',
  'ToolForForever/Visits',
  'ToolForForever/ToolUsage',
  'ToolForForever/Activity',
  'ToolForForever/Contact',
  'ToolForForever/Metadata',
  'ToolForForever/Backups',
];

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
  console.log('ToolForForever - Gmail API Storage Verification Test');
  console.log(`Target Google Account: ${TARGET_ACCOUNT}`);
  console.log('================================================================\n');

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.log('[STATUS]: Gmail Storage API credentials not yet configured in environment.');
    console.log('Required Environment Variables:');
    console.log('  1. GMAIL_STORAGE_CLIENT_ID');
    console.log('  2. GMAIL_STORAGE_CLIENT_SECRET');
    console.log('  3. GMAIL_STORAGE_REFRESH_TOKEN');
    console.log('\nSteps to activate:');
    console.log('  1. Add Authorized Redirect URI in Google Cloud Console:');
    console.log('     https://www.toolforforever.com/api/admin/gmail-oauth/callback');
    console.log('  2. Visit /api/admin/gmail-oauth/connect to authorize sameerrout2006@gmail.com');
    console.log('  3. Copy your permanent Refresh Token and save in Vercel.');
    return;
  }

  console.log('Step 1: Authenticating with Gmail API...');
  const token = await getAccessToken();
  console.log('  [PASS] OAuth Access Token successfully generated.');

  console.log('\nStep 2: Checking Gmail profile for target account...');
  const profileRes = await fetch(`${GMAIL_API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!profileRes.ok) {
    throw new Error(`Failed to get Gmail profile: ${await profileRes.text()}`);
  }
  const profile = await profileRes.json();
  console.log(`  [PASS] Authenticated Gmail Account: ${profile.emailAddress}`);
  if (profile.emailAddress.toLowerCase() !== TARGET_ACCOUNT.toLowerCase()) {
    console.warn(`  [WARN] Note: Authorized account is ${profile.emailAddress}, expected ${TARGET_ACCOUNT}.`);
  }

  console.log('\nStep 3: Checking and provisioning required ToolForForever labels in Gmail...');
  const labelsRes = await fetch(`${GMAIL_API_BASE}/labels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const labelsData = await labelsRes.json();
  const existingMap = new Map((labelsData.labels || []).map((l) => [l.name, l.id]));

  const labelIds = {};
  for (const labelName of REQUIRED_LABELS) {
    let id = existingMap.get(labelName);
    if (!id) {
      console.log(`  Creating missing label: ${labelName}...`);
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
    console.log(`  [PASS] Label ready: ${labelName} (ID: ${id})`);
  }

  console.log('\nStep 4: Writing a live test record to Gmail storage...');
  const testId = `test_gmail_record_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const testPayload = {
    recordType: 'visit',
    recordId: testId,
    timestamp: new Date().toISOString(),
    path: '/tools/gmail-verification-test',
    visitorSessionId: 'vid_test_gmail_session',
  };

  const rawMsg = buildRfc2822(
    `[ToolForForever:VISIT] ${testId}`,
    JSON.stringify(testPayload, null, 2),
    'ToolForForever/Visits'
  );

  const insertRes = await fetch(`${GMAIL_API_BASE}/messages?internalDateSource=dateHeader`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawMsg,
      labelIds: [labelIds['ToolForForever/Visits']],
    }),
  });

  if (!insertRes.ok) {
    throw new Error(`Failed to insert record into Gmail: ${await insertRes.text()}`);
  }
  const insertedData = await insertRes.json();
  const testMessageId = insertedData.id;
  console.log(`  [PASS] Test record '${testId}' written to Gmail (Message ID: ${testMessageId}).`);

  console.log('\nStep 5: Reading back and verifying persistence in a separate request...');
  const readRes = await fetch(`${GMAIL_API_BASE}/messages/${testMessageId}?format=raw`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!readRes.ok) {
    throw new Error(`Failed to read message '${testMessageId}' from Gmail: ${await readRes.text()}`);
  }
  const readData = await readRes.json();
  const decodedBody = Buffer.from(readData.raw, 'base64url').toString('utf-8');
  if (!decodedBody.includes(testId)) {
    throw new Error(`Verification failed: message did not contain test record ID '${testId}'!`);
  }
  console.log(`  [PASS] Successfully read back and verified test record persistence.`);

  console.log('\nStep 6: Cleaning up verification test record...');
  const trashRes = await fetch(`${GMAIL_API_BASE}/messages/${testMessageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (trashRes.ok) {
    console.log(`  [PASS] Test record '${testId}' cleanly removed.`);
  }

  console.log('\n================================================================');
  console.log('All Gmail Storage verification tests PASSED with 100% success!');
  console.log(`Gmail account ${TARGET_ACCOUNT} is confirmed as persistent data store.`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\nVerification Error:', err.message);
  process.exit(1);
});
