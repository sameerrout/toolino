import { NextRequest, NextResponse } from 'next/server';
import { cleanEnv } from '@/lib/drive/googleDriveClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const incomingState = searchParams.get('state');
  const error = searchParams.get('error');

  const clientId = cleanEnv(
    process.env.GOOGLE_DRIVE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  );

  const clientSecret = cleanEnv(
    process.env.GOOGLE_DRIVE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET
  );

  const host = request.headers.get('host') || 'www.toolforforever.com';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';
  const canonicalHost = isLocal ? host : 'www.toolforforever.com';
  const redirectUri = `${protocol}://${canonicalHost}/api/admin/drive-oauth/callback`;

  // 1. Handle error response from Google
  if (error) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head><title>Google Drive Authorization Failed</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b;">
          <h2 style="color: #b91c1c;">Authorization Cancelled or Denied</h2>
          <p>Google returned an error: <strong>${error}</strong></p>
          <a href="/api/admin/drive-oauth/connect" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Retry Authorization</a>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  }

  // 2. CSRF State Validation
  const storedState = request.cookies.get('tff_oauth_state')?.value;
  if (!incomingState || !storedState || incomingState !== storedState) {
    // Only bypass state check in isolated test environments
    if (process.env.NODE_ENV !== 'test') {
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
          <head><title>OAuth Security Check Failed</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b;">
            <h2 style="color: #b91c1c;">OAuth State Validation Failed</h2>
            <p>The authorization request could not be validated or has expired (CSRF protection).</p>
            <p>Please restart the authorization process by clicking below:</p>
            <a href="/api/admin/drive-oauth/connect" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Restart Authorization</a>
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
          <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b;">
            <h2 style="color: #b91c1c;">Google Token Exchange Failed</h2>
            <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto;">${errText}</pre>
            <p>Please confirm that <code>GOOGLE_DRIVE_CLIENT_SECRET</code> matches your Google Cloud Console Client Secret exactly.</p>
            <a href="/api/admin/drive-oauth/connect" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Try Again</a>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=UTF-8' }, status: 500 }
      );
    }

    const tokenData = await tokenRes.json();
    const refreshToken = (tokenData.refresh_token as string) || '';

    const htmlResponse = new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Google Drive Connected — ToolForForever</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 680px; margin: 40px auto; padding: 24px; color: #0f172a; line-height: 1.6; background: #f8fafc; }
            .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .badge-success { display: inline-block; padding: 4px 10px; background: #ecfdf5; color: #065f46; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
            .token-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; font-family: monospace; word-break: break-all; margin: 12px 0; font-size: 13px; user-select: all; }
            .copy-btn { background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
            .step { margin: 20px 0; padding-left: 14px; border-left: 3px solid #3b82f6; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge-success">OAuth Authorization Successful</span>
            <h2 style="margin: 0 0 8px; color: #0f172a;">Google Drive Connected!</h2>
            <p style="color: #475569; margin-top: 0;">
              Account: <strong>sameerrout2004@gmail.com</strong> | Dedicated Folder: <strong>ToolForForever_Data</strong>
            </p>

            ${
              refreshToken
                ? `<div class="step">
                    <strong>Step 1: Copy your Permanent Refresh Token</strong>
                    <div class="token-box" id="tokenBox">${refreshToken}</div>
                    <button class="copy-btn" onclick="navigator.clipboard.writeText('${refreshToken}'); alert('Refresh token copied to clipboard!');">Copy Refresh Token</button>
                  </div>
                  <div class="step">
                    <strong>Step 2: Save in Vercel Environment Variables</strong>
                    <p style="margin: 6px 0; font-size: 14px;">Key: <code>GOOGLE_DRIVE_REFRESH_TOKEN</code></p>
                    <p style="margin: 6px 0; font-size: 14px;">Value: <em>(The copied refresh token above)</em></p>
                    <p style="margin: 6px 0; font-size: 13px; color: #64748b;">Ensure <strong>Production</strong> is checked, then trigger a <strong>Redeploy</strong> in Vercel.</p>
                  </div>`
                : `<div style="background: #fef3c7; border: 1px solid #fde68a; padding: 14px; border-radius: 8px; margin: 16px 0;">
                    <strong>Notice:</strong> Google did not return a new refresh token because this application was authorized previously without full token revocation. To force Google to issue a new refresh token:
                    <br /><br />
                    1. Visit <a href="https://myaccount.google.com/permissions" target="_blank" style="color: #b45309; font-weight: 600;">Google Account Permissions</a> &rarr; remove <strong>ToolForForever</strong>.
                    <br />
                    2. <a href="/api/admin/drive-oauth/connect" style="color: #2563eb; font-weight: 600;">Click here to reconnect and generate a new token</a>.
                  </div>`
            }

            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; gap: 12px;">
              <a href="/manager" style="display: inline-block; padding: 10px 18px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Go to Manager Dashboard</a>
              <a href="/api/admin/drive-oauth/status" target="_blank" style="display: inline-block; padding: 10px 18px; background: #e2e8f0; color: #0f172a; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Check Live Storage Status</a>
            </div>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );

    // Clear state cookie
    htmlResponse.cookies.delete('tff_oauth_state');
    return htmlResponse;
  } catch (err) {
    return new NextResponse(`Error processing OAuth callback: ${err}`, { status: 500 });
  }
}
