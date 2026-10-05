import { NextResponse } from 'next/server';
import { getServerSession, isManagerEmail, SESSION_COOKIE_NAME } from '@/lib/auth';
import { findUserByEmail } from '@/lib/db';

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  // Ensure user still exists in the database
  const user = findUserByEmail(session.email);
  const isManager = isManagerEmail(session.email);

  if (!user && !isManager) {
    const res = NextResponse.json({ authenticated: false, user: null });
    res.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return res;
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.id,
      email: session.email,
      name: user?.name || session.name,
      picture: user?.picture || session.picture,
      isManager: session.isManager,
    },
  });
}

