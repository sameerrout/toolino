import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { cleanEnv } from '@/lib/drive/googleDriveClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'www.toolforforever.com';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';

  // Always use the canonical www domain in production to avoid redirect URI mismatches
  const canonicalHost = isLocal ? host : 'www.toolforforever.com';
  const redirectUri = `${protocol}://${canonicalHost}/api/admin/drive-oauth/callback`;

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

  // If Client ID is missing, provide a safe and helpful diagnostic panel
  if (!clientId) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Google Drive Setup Diagnostic — ToolForForever</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 680px; margin: 40px auto; padding: 24px; color: #0f172a; line-height: 1.6; background: #f8fafc; }
            .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .badge-warn { display: inline-block; padding: 4px 10px; background: #fef3c7; color: #92400e; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
            .table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
            .table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .table th { background: #f1f5f9; font-weight: 600; }
            .status-ok { color: #15803d; font-weight: 600; }
            .status-miss { color: #b91c1c; font-weight: 600; }
            .step { margin: 16px 0; padding-left: 14px; border-left: 3px solid #3b82f6; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
            .notice-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 14px; color: #1e40af; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge-warn">Vercel Environment Check</span>
            <h2 style="margin: 0 0 8px; color: #0f172a;">Missing GOOGLE_DRIVE_CLIENT_ID at Runtime</h2>
            <p style="color: #475569; margin-top: 0;">
              The serverless function did not receive <code>GOOGLE_DRIVE_CLIENT_ID</code>.
            </p>

            <table class="table">
              <thead>
                <tr>
                  <th>Environment Variable</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>GOOGLE_DRIVE_CLIENT_ID</code></td>
                  <td><span class="status-miss">NOT DETECTED</span></td>
                </tr>
                <tr>
                  <td><code>GOOGLE_DRIVE_CLIENT_SECRET</code></td>
                  <td>${clientSecret ? '<span class="status-ok">DETECTED (Server Secret)</span>' : '<span class="status-miss">NOT DETECTED</span>'}</td>
                </tr>
                <tr>
                  <td><code>Target Account</code></td>
                  <td><strong>sameerrout2004@gmail.com</strong></td>
                </tr>
                <tr>
                  <td><code>Target Drive Folder</code></td>
                  <td><strong>ToolForForever_Data</strong></td>
                </tr>
                <tr>
                  <td><code>Authorized Redirect URI</code></td>
                  <td><code>${redirectUri}</code></td>
                </tr>
              </tbody>
            </table>

            <div class="notice-box">
              <strong>Why this happens if you already added the variable in Vercel:</strong><br />
              In Vercel, adding an environment variable does <em>not</em> apply to existing running deployments automatically. Vercel bakes variables in during deployment build time.
            </div>

            <div class="step">
              <strong>How to activate it in Vercel:</strong>
              <ol style="margin: 8px 0; padding-left: 20px;">
                <li>Confirm in <strong>Vercel &rarr; Settings &rarr; Environment Variables</strong> that <code>GOOGLE_DRIVE_CLIENT_ID</code> has the <strong>Production</strong> checkbox enabled.</li>
                <li>Go to the <strong>Deployments</strong> tab in Vercel.</li>
                <li>Click the three dots (<code>...</code>) on the latest deployment &rarr; click <strong>Redeploy</strong>.</li>
                <li>Once the redeploy finishes, refresh this page to begin Google OAuth.</li>
              </ol>
            </div>

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; gap: 12px;">
              <a href="/manager" style="padding: 10px 18px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Go to Manager Dashboard</a>
              <button onclick="location.reload()" style="padding: 10px 18px; background: #e2e8f0; color: #0f172a; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">Recheck Status</button>
            </div>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }

  // Generate cryptographically secure OAuth CSRF state
  const state = crypto.randomBytes(32).toString('hex');

  // Google OAuth Authorization URL requesting offline access to retrieve a permanent Refresh Token
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  const response = NextResponse.redirect(redirectUrl);

  // Store state in an httpOnly, secure, SameSite=Lax cookie for 10 minutes
  response.cookies.set('tff_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return response;
}
