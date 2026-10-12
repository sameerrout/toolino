import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import {
  extractClientIp,
  hashVisitorIp,
  getMaskedIpIdentifier,
  isBotOrCrawler,
  sanitizePath,
} from '@/lib/analytics/visitor';
import { recordVisitorSessionHeartbeatAsync } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

const VISITOR_COOKIE_NAME = 'tff_vid';

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent');
    if (isBotOrCrawler(userAgent)) {
      return NextResponse.json({ ok: true, ignored: 'bot' });
    }

    const body = await request.json().catch(() => ({}));
    const rawPath = body?.path || '/';
    const path = sanitizePath(rawPath);
    if (!path) {
      return NextResponse.json({ ok: true, ignored: 'invalid_path' });
    }

    // Exclude manager dashboard internal paths
    if (path.startsWith('/manager') || path.startsWith('/admin')) {
      return NextResponse.json({ ok: true, ignored: 'manager_path' });
    }

    const clientIp = extractClientIp(request.headers);
    const visitorHash = hashVisitorIp(clientIp);
    const maskedIp = getMaskedIpIdentifier(clientIp, visitorHash);

    let visitorSessionId = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
    let isNewCookie = false;

    if (!visitorSessionId || !/^vid_[a-f0-9]{32}$/.test(visitorSessionId)) {
      visitorSessionId = `vid_${crypto.randomBytes(16).toString('hex')}`;
      isNewCookie = true;
    }

    const session = await getServerSession(request);

    // If authenticated user is a manager on manager path, ignore
    if (session?.isManager && (path.startsWith('/manager') || path.startsWith('/admin'))) {
      return NextResponse.json({ ok: true, ignored: 'manager_activity' });
    }

    await recordVisitorSessionHeartbeatAsync({
      sessionId: visitorSessionId,
      visitorHash,
      maskedIp,
      currentPath: path,
      userAgent: userAgent || undefined,
      userId: session?.id,
      userEmail: session?.email,
    });

    const response = NextResponse.json({ ok: true });
    if (isNewCookie) {
      response.cookies.set(VISITOR_COOKIE_NAME, visitorSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error('Visitor heartbeat error:', error);
    return NextResponse.json({ error: 'Failed to record heartbeat' }, { status: 500 });
  }
}
