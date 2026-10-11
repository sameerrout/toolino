import { NextRequest, NextResponse } from 'next/server';
import {
  resolveServerEnv,
  ensureGmailLabels,
  TARGET_GMAIL_ACCOUNT,
} from '@/lib/gmail/gmailClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const incomingState = searchParams.get('state');
  const error = searchParams.get('error');

  const clientIdMatch = resolveServerEnv([
    'GMAIL_STORAGE_CLIENT_ID',
    'GMAIL_CLIENT_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_DRIVE_CLIENT_ID',
    'NEXT_PUBLIC_GMAIL_STORAGE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  ]);

  const clientSecretMatch = resolveServerEnv([
    'GMAIL_STORAGE_CLIENT_SECRET',
    'GMAIL_CLIENT_SECRET',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_DRIVE_CLIENT_SECRET',
  ]);

  const clientId = clientIdMatch?.value || '';
  const clientSecret = clientSecretMatch?.value || '';

  const host = request.headers.get('host') || 'www.toolforforever.com';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';
  const canonicalHost = isLocal ? host : 'www.toolforforever.com';
  const redirectUri = `${protocol}://${canonicalHost}/api/admin/gmail-oauth/callback`;

  // 1. Handle error response from Google
  if (error) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head><title>Gmail Storage Authorization Failed</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b; background: #f8fafc;">
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
            <h2 style="color: #b91c1c; margin-top: 0;">Authorization Cancelled or Denied</h2>
            <p>Google returned an error: <strong>${error}</strong></p>
            <a href="/api/admin/gmail-oauth/connect" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Retry Authorization</a>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  }

  // 2. CSRF State Validation
  const storedState = request.cookies.get('tff_gmail_oauth_state')?.value;
  if (!incomingState || !storedState || incomingState !== storedState) {
    if (process.env.NODE_ENV !== 'test') {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
          <head><title>OAuth Security Check Failed</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b; background: #f8fafc;">
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
              <h2 style="color: #b91c1c; margin-top: 0;">OAuth State Validation Failed</h2>
              <p>The authorization request could not be validated or has expired (CSRF protection).</p>
              <a href="/api/admin/gmail-oauth/connect" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Restart Authorization</a>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=UTF-8' }, status: 403 }
      );
    }
  }

  if (!code) {
    return new NextResponse('Authorization code missing in request.', { status: 400 });
  }

  try {
    // 3. Exchange authorization code for refresh token and access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
          <head><title>Token Exchange Failed</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b; background: #f8fafc;">
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
              <h2 style="color: #b91c1c; margin-top: 0;">Google Token Exchange Failed</h2>
              <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto;">${errText}</pre>
              <a href="/api/admin/gmail-oauth/connect" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Try Again</a>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=UTF-8' }, status: 500 }
      );
    }

    const tokenData = await tokenRes.json();
    const refreshToken = (tokenData.refresh_token as string) || '';
    const accessToken = (tokenData.access_token as string) || '';

    // 4. Identity Verification: Verify that the authenticated account is strictly sameerrout2006@gmail.com
    if (accessToken) {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userinfoRes.ok) {
        const userInfo = await userinfoRes.json();
        const authenticatedEmail = (userInfo.email || '').trim().toLowerCase();
        if (authenticatedEmail !== TARGET_GMAIL_ACCOUNT.toLowerCase()) {
          return new NextResponse(
            `<!DOCTYPE html>
            <html lang="en">
              <head><title>Unauthorized Google Account — ToolForForever</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
              <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b; background: #f8fafc;">
                <div style="background: white; border: 1px solid #fca5a5; border-radius: 12px; padding: 24px;">
                  <h2 style="color: #b91c1c; margin-top: 0;">Access Denied: Account Mismatch</h2>
                  <p>You completed Google sign-in with: <strong>${authenticatedEmail}</strong></p>
                  <p>ToolForForever storage strictly requires authorization for: <strong>${TARGET_GMAIL_ACCOUNT}</strong>.</p>
                  <a href="/api/admin/gmail-oauth/connect" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Retry with ${TARGET_GMAIL_ACCOUNT}</a>
                </div>
              </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html; charset=UTF-8' }, status: 403 }
          );
        }
      }
    }

    // 5. Provision Gmail labels immediately with access token
    let labelProvisionStatus = '';
    if (accessToken) {
      try {
        const labelMap = await ensureGmailLabels(accessToken);
        const labelCount = Object.keys(labelMap).length;
        labelProvisionStatus = `Successfully provisioned ${labelCount} storage labels under 'ToolForForever/*' in ${TARGET_GMAIL_ACCOUNT}.`;
      } catch (lErr) {
        labelProvisionStatus = `Labels will be provisioned once refresh token is saved (${lErr instanceof Error ? lErr.message : String(lErr)}).`;
      }
    }

    // 6. Security Protection: Check Manager session before revealing the sensitive refresh token
    const { requireManagerSession } = await import('@/lib/auth');
    const managerSession = await requireManagerSession(request);
    const isManager = Boolean(managerSession);

    const htmlResponse = new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Gmail Storage Connected — ToolForForever</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 680px; margin: 40px auto; padding: 24px; color: #0f172a; line-height: 1.6; background: #f8fafc; }
            .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .badge-success { display: inline-block; padding: 4px 10px; background: #ecfdf5; color: #065f46; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
            .token-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; font-family: monospace; word-break: break-all; margin: 12px 0; font-size: 13px; user-select: all; }
            .copy-btn { background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
            .step { margin: 20px 0; padding-left: 14px; border-left: 3px solid #3b82f6; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
            .security-alert { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin: 14px 0; font-size: 14px; color: #1e40af; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge-success">&#10004; Account Verified: ${TARGET_GMAIL_ACCOUNT}</span>
            <h2 style="margin: 0 0 8px; color: #0f172a;">Gmail Storage Authorized!</h2>
            <p style="color: #475569; margin-top: 0;">
              Target Account: <strong>${TARGET_GMAIL_ACCOUNT}</strong> | Labels: <strong>ToolForForever/*</strong>
            </p>
            ${labelProvisionStatus ? `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; color: #166534; font-size: 13px; margin: 12px 0;">&#10004; ${labelProvisionStatus}</div>` : ''}

            ${
              refreshToken
                ? isManager
                  ? `<div class="step">
                      <strong>Step 1: Authorized Manager Token Access</strong>
                      <p style="margin: 6px 0; font-size: 13px; color: #64748b;">Authenticated Manager: <code>${managerSession?.email || ''}</code></p>
                      <div class="token-box" id="tokenBox">${refreshToken}</div>
                      <button class="copy-btn" onclick="navigator.clipboard.writeText('${refreshToken}'); alert('Refresh token copied to clipboard!');">Copy Refresh Token</button>
                    </div>
                    <div class="step">
                      <strong>Step 2: Save in Vercel Environment Variables</strong>
                      <p style="margin: 6px 0; font-size: 14px;">Key: <code>GMAIL_STORAGE_REFRESH_TOKEN</code></p>
                      <p style="margin: 6px 0; font-size: 14px;">Value: <em>(The copied refresh token above)</em></p>
                      <p style="margin: 6px 0; font-size: 13px; color: #64748b;">Ensure <strong>Production</strong> is checked, then trigger a <strong>Redeploy</strong> in Vercel.</p>
                    </div>`
                  : `<div class="security-alert">
                      <strong>Security Notice:</strong> Authorization with Google was successful. To view or copy the generated refresh token, sign in to the <a href="/manager" style="color: #1d4ed8; font-weight: 600;">Manager Dashboard</a> with authorized manager credentials, or use the local offline tool: <code>node scripts/authorize-gmail.mjs</code>.
                    </div>
                    <div style="margin-top: 16px;">
                      <a href="/manager" style="display: inline-block; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Sign in to Manager Dashboard</a>
                    </div>`
                : `<div style="background: #fef3c7; border: 1px solid #fde68a; padding: 14px; border-radius: 8px; margin: 16px 0;">
                    <strong>Notice:</strong> Google did not return a new refresh token because this application was authorized previously without full token revocation. To force Google to issue a new refresh token:
                    <br /><br />
                    1. Visit <a href="https://myaccount.google.com/permissions" target="_blank" style="color: #b45309; font-weight: 600;">Google Account Permissions</a> &rarr; remove <strong>ToolForForever</strong>.
                    <br />
                    2. <a href="/api/admin/gmail-oauth/connect" style="color: #2563eb; font-weight: 600;">Click here to reconnect and generate a new token</a>.
                  </div>`
            }

            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; gap: 12px;">
              <a href="/manager" style="display: inline-block; padding: 10px 18px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Go to Manager Dashboard</a>
              <a href="/api/admin/gmail-oauth/status" target="_blank" style="display: inline-block; padding: 10px 18px; background: #e2e8f0; color: #0f172a; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Check Live Storage Status</a>
            </div>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );

    htmlResponse.cookies.delete('tff_gmail_oauth_state');
    return htmlResponse;
  } catch (err) {
    return new NextResponse(`Error processing OAuth callback: ${err}`, { status: 500 });
  }
}
