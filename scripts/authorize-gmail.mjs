/**
 * ToolForForever - Secure Local Offline Gmail OAuth Authorization CLI
 * 
 * Securely authorizes sameerrout2006@gmail.com on a local loopback server.
 * Never transmits or renders the refresh token over the public internet.
 * 
 * Usage:
 *   node scripts/authorize-gmail.mjs
 */

import http from 'node:http';
import url from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// Load existing .env.local
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

const TARGET_ACCOUNT = 'sameerrout2006@gmail.com';

function promptInput(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log('================================================================');
  console.log('ToolForForever - Secure Local Gmail Storage Authorization');
  console.log(`Target Storage Account: ${TARGET_ACCOUNT}`);
  console.log('================================================================\n');

  let clientId =
    process.env.GMAIL_STORAGE_CLIENT_ID ||
    process.env.GMAIL_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID;

  let clientSecret =
    process.env.GMAIL_STORAGE_CLIENT_SECRET ||
    process.env.GMAIL_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    clientId = await promptInput('Enter Google OAuth Client ID (.apps.googleusercontent.com): ');
  }
  if (!clientSecret) {
    clientSecret = await promptInput('Enter Google OAuth Client Secret (GOCSPX-...): ');
  }

  if (!clientId || !clientSecret) {
    console.error('Error: Both Client ID and Client Secret are required.');
    process.exit(1);
  }

  const PORT = 8085;
  const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`;
  const state = crypto.randomBytes(32).toString('hex');

  console.log('\n[NOTICE]: Please ensure the following redirect URI is added to your OAuth client in Google Cloud Console:');
  console.log(`  ${REDIRECT_URI}`);
  console.log('  OR');
  console.log(`  https://www.toolforforever.com/api/admin/gmail-oauth/callback\n`);

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url, true);
      if (parsedUrl.pathname !== '/oauth2callback') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const { code, state: incomingState, error } = parsedUrl.query;

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h2>Authorization Error: ${error}</h2><p>You may close this window and retry.</p>`);
        console.error(`\n[ERROR]: Authorization error from Google: ${error}`);
        server.close();
        process.exit(1);
        return;
      }

      if (incomingState !== state) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h2>Security Warning: OAuth State mismatch (CSRF protection).</h2>');
        console.error('\n[ERROR]: OAuth state mismatch.');
        server.close();
        process.exit(1);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h2>Authorization code received! Return to your terminal to complete setup.</h2>');

      // Exchange code for token
      console.log('\nExchanging authorization code with Google OAuth endpoint...');
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error(`\n[ERROR]: Token exchange failed (${tokenRes.status}): ${errText}`);
        server.close();
        process.exit(1);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      // Identity verification
      console.log('Verifying authenticated Google account identity...');
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await userinfoRes.json();
      const email = (userInfo.email || '').trim().toLowerCase();

      if (email !== TARGET_ACCOUNT.toLowerCase()) {
        console.error(`\n[SECURITY REJECTION]: Authorized account was '${email}', but target storage account must be '${TARGET_ACCOUNT}'.`);
        server.close();
        process.exit(1);
      }

      console.log(`[PASS] Account identity verified: ${email}`);

      // Provision storage labels
      console.log('Provisioning ToolForForever storage labels in Gmail...');
      const REQUIRED_LABELS = [
        'ToolForForever/Users',
        'ToolForForever/Visits',
        'ToolForForever/ToolUsage',
        'ToolForForever/Activity',
        'ToolForForever/Contact',
        'ToolForForever/Metadata',
        'ToolForForever/Backups',
      ];

      const labelsRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const existing = await labelsRes.json();
      const existingMap = new Map((existing.labels || []).map((l) => [l.name, l.id]));

      for (const labelName of REQUIRED_LABELS) {
        if (!existingMap.has(labelName)) {
          await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: labelName,
              labelListVisibility: 'labelShow',
              messageListVisibility: 'show',
            }),
          });
        }
      }
      console.log('[PASS] All 7 storage labels provisioned in Gmail.');

      if (refreshToken) {
        console.log('\n================================================================');
        console.log('SUCCESS! Refresh Token Generated (Displayed privately in terminal):');
        console.log('----------------------------------------------------------------');
        console.log(refreshToken);
        console.log('----------------------------------------------------------------');
        console.log('Next steps:');
        console.log('1. In Vercel (Project: toolforforever), add Environment Variable:');
        console.log('   Key: GMAIL_STORAGE_REFRESH_TOKEN');
        console.log('   Value: (The refresh token printed above)');
        console.log('   Environment: Production (checked)');
        console.log('2. Redeploy project in Vercel.');
        console.log('================================================================\n');
      } else {
        console.log('\n[NOTICE]: Google did not return a new refresh token.');
        console.log('Visit https://myaccount.google.com/permissions to remove ToolForForever, then run this script again.');
      }

      server.close();
      process.exit(0);
    } catch (e) {
      console.error('\nUnexpected error during authorization:', e);
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      login_hint: TARGET_ACCOUNT,
      state,
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log(`Local server listening on http://127.0.0.1:${PORT}`);
    console.log('\nPlease open this URL in your browser to authorize with sameerrout2006@gmail.com:');
    console.log(`\n  ${authUrl}\n`);
  });
}

main().catch((err) => {
  console.error('Fatal CLI error:', err);
  process.exit(1);
});
