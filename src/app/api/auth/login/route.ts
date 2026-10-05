import { NextRequest, NextResponse } from 'next/server';
import { authenticateEmailUser } from '@/lib/db';
import { createSessionToken, isManagerEmail, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const result = authenticateEmailUser(email, password);
    if (result.error || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const user = result.user;
    const isManager = isManagerEmail(user.email);
    const token = createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        isManager,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[AUTH_LOGIN_ERROR]:', error);
    const message = error instanceof Error ? error.message : '';
    let userMessage = 'Login failed. Please try again.';
    if (message.includes('database') || message.includes('EACCES') || message.includes('EROFS')) {
      userMessage = 'Unable to connect to the database. Please try again later.';
    } else if (message.includes('SESSION_SECRET') || message.includes('secret')) {
      userMessage = 'Authentication service is temporarily unavailable. Please try again.';
    }
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}
