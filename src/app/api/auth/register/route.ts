import { NextRequest, NextResponse } from 'next/server';
import { registerEmailUser } from '@/lib/db';
import { createSessionToken, isManagerEmail, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Please enter valid registration details.' }, { status: 400 });
    }
    const { email, password, confirmPassword, name } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password cannot be empty.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const result = registerEmailUser(email, password, name);
    if (result.error || !result.user) {
      return NextResponse.json({ error: result.error || 'Registration failed.' }, { status: 400 });
    }

    const user = result.user;
    const isManager = isManagerEmail(user.email);
    const token = createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
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
    console.error('[AUTH_REGISTER_ERROR]:', error);
    const message = error instanceof Error ? error.message : '';
    let userMessage = 'Registration failed. Please try again.';
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
