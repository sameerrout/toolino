import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientId =
    process.env.GOOGLE_DRIVE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    '';

  const host = request.headers.get('host') || 'www.toolforforever.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/admin/drive-oauth/callback`;

  if (!clientId) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>Google Drive Setup</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: system-ui, sans-serif; max-width: 650px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #1e293b;">
          <h2 style="color: #b91c1c;">Missing GOOGLE_DRIVE_CLIENT_ID</h2>
          <p>Please configure <code>GOOGLE_DRIVE_CLIENT_ID</code> and <code>GOOGLE_DRIVE_CLIENT_SECRET</code> in your Vercel or local <code>.env.local</code> first.</p>
          <p><strong>Configured Redirect URI:</strong> <code>${redirectUri}</code></p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  }

  // Google OAuth Authorization URL with offline access to retrieve a permanent Refresh Token
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
