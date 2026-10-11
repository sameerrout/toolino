import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const clientId =
    process.env.GOOGLE_DRIVE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    '';
  const clientSecret =
    process.env.GOOGLE_DRIVE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    '';

  const host = request.headers.get('host') || 'www.toolforforever.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/admin/drive-oauth/callback`;

  if (error) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>Google Drive Authorization Failed</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b;">
          <h2 style="color: #b91c1c;">Authorization Cancelled or Failed</h2>
          <p>Google returned an error: <strong>${error}</strong></p>
          <a href="/manager" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Return to Manager Dashboard</a>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  }

  if (!code) {
    return new NextResponse('Authorization code missing in request.', { status: 400 });
  }

  try {
    // Exchange authorization code for refresh token and access token
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
        <html>
          <head><title>Token Exchange Failed</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b;">
            <h2 style="color: #b91c1c;">Token Exchange Failed</h2>
            <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto;">${errText}</pre>
            <p>Ensure that your <code>GOOGLE_DRIVE_CLIENT_SECRET</code> and redirect URI match Google Cloud Console.</p>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=UTF-8' }, status: 500 }
      );
    }

    const tokenData = await tokenRes.json();
    const refreshToken = tokenData.refresh_token as string;
    const _accessToken = tokenData.access_token as string;

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Google Drive Connected - ToolForForever</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 680px; margin: 40px auto; padding: 24px; color: #0f172a; line-height: 1.6; }
            .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .badge { display: inline-block; padding: 4px 10px; background: #ecfdf5; color: #065f46; border-radius: 999px; font-size: 13px; font-weight: 600; }
            .token-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; font-family: monospace; word-break: break-all; margin: 16px 0; font-size: 13px; }
            .copy-btn { background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }
            .step { margin: 16px 0; padding-left: 12px; border-left: 3px solid #3b82f6; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Google Drive OAuth Success</span>
            <h2 style="margin: 12px 0 8px;">Google Account Connected!</h2>
            <p style="color: #475569;">Target Account: <strong>sameerrout2004@gmail.com</strong></p>
            <p style="color: #475569;">Target Folder: <strong>ToolForForever_Data</strong></p>

            ${
              refreshToken
                ? `<div class="step">
                    <strong>Step 1: Copy your Permanent Refresh Token</strong>
                    <div class="token-box" id="tokenBox">${refreshToken}</div>
                    <button class="copy-btn" onclick="navigator.clipboard.writeText('${refreshToken}'); alert('Refresh token copied to clipboard!');">Copy Refresh Token</button>
                  </div>
                  <div class="step">
                    <strong>Step 2: Add to Vercel Environment Variables</strong>
                    <p style="margin: 8px 0; font-size: 14px;">Key: <code>GOOGLE_DRIVE_REFRESH_TOKEN</code></p>
                    <p style="margin: 8px 0; font-size: 14px;">Value: <em>(The copied refresh token above)</em></p>
                  </div>`
                : `<div style="background: #fef3c7; border: 1px solid #fde68a; padding: 14px; border-radius: 8px; margin: 16px 0;">
                    <strong>Notice:</strong> Google did not return a new refresh token because this account was previously authorized. To re-issue a refresh token, visit <a href="https://myaccount.google.com/permissions" target="_blank">Google Account Permissions</a>, revoke access for your app, and click Connect Drive again.
                  </div>`
            }

            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <a href="/manager" style="display: inline-block; padding: 10px 18px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px;">Go to Manager Dashboard</a>
            </div>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  } catch (err) {
    return new NextResponse(`Error processing OAuth callback: ${err}`, { status: 500 });
  }
}
