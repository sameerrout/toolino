import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import {
  getGmailEnvDiagnostics,
  resolveServerEnv,
  probeGoogleClientCredentials,
  TARGET_GMAIL_ACCOUNT,
} from '@/lib/gmail/gmailClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'www.toolforforever.com';
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const protocol = isLocal ? 'http' : 'https';

  // Canonical host to avoid redirect URI mismatch in production
  const canonicalHost = isLocal ? host : 'www.toolforforever.com';
  const redirectUri = `${protocol}://${canonicalHost}/api/admin/gmail-oauth/callback`;

  const diagnostics = getGmailEnvDiagnostics();
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

  const rawClientId = clientIdMatch?.value || '';
  const rawClientSecret = clientSecretMatch?.value || '';

  // If Client ID is missing or validation fails, display diagnostic panel
  if (
    !rawClientId ||
    diagnostics.clientIdFormat === 'looks_like_secret' ||
    diagnostics.clientSecretFormat === 'looks_like_client_id'
  ) {
    let probeMessage = '';
    if (rawClientId && rawClientSecret) {
      const probe = await probeGoogleClientCredentials(rawClientId, rawClientSecret);
      probeMessage = probe.message;
    }

    const detectedKeysHtml =
      diagnostics.detectedGoogleEnvKeys.length > 0
        ? diagnostics.detectedGoogleEnvKeys
            .map((item) => `<li><code>${item.key}</code> (${item.length} characters)</li>`)
            .join('')
        : '<li style="color: #64748b;"><em>None detected in this serverless execution context</em></li>';

    const validationAlertsHtml =
      diagnostics.validationErrors.length > 0
        ? diagnostics.validationErrors
            .map(
              (err) =>
                `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin: 10px 0; color: #991b1b; font-size: 14px;"><strong>Configuration Notice:</strong> ${err}</div>`
            )
            .join('')
        : '';

    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Gmail Storage Setup Diagnostic — ToolForForever</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 720px; margin: 30px auto; padding: 20px; color: #0f172a; line-height: 1.6; background: #f8fafc; }
            .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .badge-warn { display: inline-block; padding: 4px 10px; background: #fef3c7; color: #92400e; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
            .badge-info { display: inline-block; padding: 3px 8px; background: #e0f2fe; color: #0369a1; border-radius: 6px; font-size: 12px; font-family: monospace; }
            .table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
            .table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .table th { background: #f1f5f9; font-weight: 600; }
            .status-ok { color: #15803d; font-weight: 600; }
            .status-miss { color: #b91c1c; font-weight: 600; }
            .status-pending { color: #b45309; font-weight: 600; }
            .step { margin: 16px 0; padding-left: 14px; border-left: 3px solid #3b82f6; }
            code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
            .notice-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 14px; color: #1e40af; }
            .deploy-meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 13px; margin: 16px 0; }
            .deploy-meta table { width: 100%; }
            .deploy-meta td { padding: 4px 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge-warn">Vercel Environment & Deployment Diagnostic</span>
            <h2 style="margin: 0 0 8px; color: #0f172a;">Gmail API Storage Credentials Check</h2>
            <p style="color: #475569; margin-top: 0;">
              Production persistence uses Gmail API messages in <strong>${TARGET_GMAIL_ACCOUNT}</strong>.
            </p>

            ${validationAlertsHtml}

            <table class="table">
              <thead>
                <tr>
                  <th>Environment Variable</th>
                  <th>Detection Status</th>
                  <th>Format / Matched Key</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>GMAIL_STORAGE_CLIENT_ID</code></td>
                  <td>${rawClientId ? '<span class="status-ok">DETECTED</span>' : '<span class="status-miss">NOT DETECTED</span>'}</td>
                  <td>${rawClientId ? `<span class="badge-info">${clientIdMatch?.key} (${rawClientId.length} chars)</span>` : '<span style="color: #64748b;">Missing in runtime</span>'}</td>
                </tr>
                <tr>
                  <td><code>GMAIL_STORAGE_CLIENT_SECRET</code></td>
                  <td>${rawClientSecret ? '<span class="status-ok">DETECTED</span>' : '<span class="status-miss">NOT DETECTED</span>'}</td>
                  <td>${rawClientSecret ? `<span class="badge-info">${clientSecretMatch?.key} (${rawClientSecret.length} chars)</span>` : '<span style="color: #64748b;">Missing in runtime</span>'}</td>
                </tr>
                <tr>
                  <td><code>GMAIL_STORAGE_REFRESH_TOKEN</code></td>
                  <td>${diagnostics.hasRefreshToken ? '<span class="status-ok">DETECTED</span>' : '<span class="status-pending">AWAITING AUTHORIZATION</span>'}</td>
                  <td>${diagnostics.hasRefreshToken ? '<span class="badge-info">Configured</span>' : '<span style="color: #64748b;">Generated via OAuth Flow</span>'}</td>
                </tr>
                <tr>
                  <td><code>Target Account</code></td>
                  <td colspan="2"><strong>${TARGET_GMAIL_ACCOUNT}</strong></td>
                </tr>
                <tr>
                  <td><code>Dedicated Storage Labels</code></td>
                  <td colspan="2"><code>ToolForForever/*</code> (Users, Visits, ToolUsage, Activity, Contact, Metadata, Backups)</td>
                </tr>
                <tr>
                  <td><code>Authorized Redirect URI</code></td>
                  <td colspan="2"><code>${redirectUri}</code></td>
                </tr>
              </tbody>
            </table>

            ${probeMessage ? `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 14px; color: #166534;"><strong>Google Token Endpoint Test:</strong> ${probeMessage}</div>` : ''}

            <div class="deploy-meta">
              <strong>Active Production Deployment Metadata:</strong>
              <table style="margin-top: 6px;">
                <tr>
                  <td style="color: #64748b; width: 180px;">Serving Git Commit:</td>
                  <td><code>${diagnostics.deployment.commitSha}</code></td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Vercel Environment:</td>
                  <td><strong>${diagnostics.deployment.vercelEnv}</strong></td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Vercel Host:</td>
                  <td><code>${diagnostics.deployment.vercelUrl}</code></td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Server Execution Time:</td>
                  <td><code>${diagnostics.deployment.serverTime}</code></td>
                </tr>
              </table>
              <div style="margin-top: 8px;">
                <span style="color: #64748b;">Google-related Environment Keys visible in this runtime container:</span>
                <ul style="margin: 4px 0 0; padding-left: 20px;">
                  ${detectedKeysHtml}
                </ul>
              </div>
            </div>

            <div class="notice-box">
              <strong>Vercel Project Configuration:</strong><br />
              Ensure environment variables are configured in the <strong>toolforforever</strong> project in Vercel with the <strong>Production</strong> checkbox enabled.
            </div>

            <div class="step">
              <strong>How to connect Gmail Storage:</strong>
              <ol style="margin: 8px 0; padding-left: 20px;">
                <li>In Google Cloud Console, ensure Authorized Redirect URI includes:
                  <br /><code>${redirectUri}</code>
                </li>
                <li>Add <code>GMAIL_STORAGE_CLIENT_ID</code> and <code>GMAIL_STORAGE_CLIENT_SECRET</code> to Vercel (Project: <strong>toolforforever</strong>, scope: <strong>Production</strong>).</li>
                <li>Redeploy on Vercel, then refresh this page to begin authorization with <strong>${TARGET_GMAIL_ACCOUNT}</strong>.</li>
              </ol>
            </div>

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; gap: 12px;">
              <a href="/manager" style="padding: 10px 18px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Go to Manager Dashboard</a>
              <button onclick="location.reload()" style="padding: 10px 18px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">Recheck Status</button>
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

  // Google OAuth Authorization URL requesting offline access to retrieve permanent Refresh Token
  // Scope: https://www.googleapis.com/auth/gmail.modify allows creating labels and structured record messages without inbox clutter
  const params = new URLSearchParams({
    client_id: rawClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    login_hint: TARGET_GMAIL_ACCOUNT,
    state,
  });

  const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set('tff_gmail_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return response;
}
