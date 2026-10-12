import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { recordLoginEvent } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(request);
    if (session) {
      recordLoginEvent({
        userId: session.id,
        email: session.email,
        method: 'email',
        eventType: 'logout',
        status: 'success',
        sessionId: request.cookies.get('tff_vid')?.value,
      });
    }
  } catch {
    // Non-blocking logout event tracking
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
  });
  return response;
}
