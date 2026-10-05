import { NextRequest, NextResponse } from 'next/server';
import { recordUserLogin } from '@/lib/db';
import { createSessionToken, isManagerEmail, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, testEmail, testName } = body;

    let email = '';
    let name = '';
    let picture: string | undefined = undefined;
    let googleSub = '';

    // 1. If Google ID Token is provided:
    if (credential) {
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (!googleRes.ok) {
        return NextResponse.json(
          { error: 'Google authentication failed. Invalid token.' },
          { status: 401 }
        );
      }
      const tokenInfo = await googleRes.json();
      
      const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (expectedClientId && tokenInfo.aud !== expectedClientId) {
        return NextResponse.json(
          { error: 'Google token audience mismatch.' },
          { status: 401 }
        );
      }

      email = tokenInfo.email;
      name = tokenInfo.name || tokenInfo.email.split('@')[0];
      picture = tokenInfo.picture;
      googleSub = tokenInfo.sub;

      if (!email) {
        return NextResponse.json(
          { error: 'Unable to retrieve email from Google account.' },
          { status: 400 }
        );
      }
    } else if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_TEST_AUTH === 'true' && testEmail) {
      // Programmatic automated testing only (requires ALLOW_DEV_TEST_AUTH=true in dev)
      email = testEmail.trim().toLowerCase();
      name = testName || email.split('@')[0];
      googleSub = `test_${Buffer.from(email).toString('hex').slice(0, 12)}`;
    } else {
      return NextResponse.json(
        { error: 'Google authentication credential is required.' },
        { status: 400 }
      );
    }

    // Record login/signup in DB
    const { user, isNewUser } = recordUserLogin({
      id: googleSub || `usr_${Date.now()}`,
      email,
      name,
      picture,
    });

    const isManager = isManagerEmail(user.email);
    const token = createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    });

    const response = NextResponse.json({
      ok: true,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isManager,
      },
    });

    // Set secure HTTP-only session cookie
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed. Please try again later.' },
      { status: 500 }
    );
  }
}
