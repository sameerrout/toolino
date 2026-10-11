import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import {
  extractClientIp,
  hashVisitorIp,
  getMaskedIpIdentifier,
  isBotOrCrawler,
  sanitizePath,
  sanitizeReferrer,
} from '@/lib/analytics/visitor';
import { recordPageVisitAsync } from '@/lib/db';

const VISITOR_COOKIE_NAME = 'tff_vid';

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent');

    // 1. Ignore bots and crawlers
    if (isBotOrCrawler(userAgent)) {
      return NextResponse.json({ ok: true, ignored: 'bot' });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Valid JSON payload required' }, { status: 400 });
    }

    // Support both { page, visitorId, referrer } and { path, referrer }
    const rawPath = body.page || body.path || '/';
    const rawReferrer = body.referrer;
    const directVisitorId = body.visitorId;

    const path = sanitizePath(rawPath);
    if (!path) {
      return NextResponse.json({ ok: true, ignored: 'invalid_path' });
    }

    // Exclude manager / admin internal paths
    if (path.startsWith('/manager') || path.startsWith('/admin')) {
      return NextResponse.json({ ok: true, ignored: 'admin_path' });
    }

    const clientIp = extractClientIp(request.headers);
    const visitorHash = hashVisitorIp(clientIp);

    // Resolve stable visitor ID from body, cookie, or generate new
    let visitorSessionId =
      directVisitorId ||
      request.cookies.get(VISITOR_COOKIE_NAME)?.value;
    let isNewCookie = false;

    if (!visitorSessionId || typeof visitorSessionId !== 'string') {
      visitorSessionId = `vid_${crypto.randomBytes(16).toString('hex')}`;
      isNewCookie = true;
    }

    const maskedIp = getMaskedIpIdentifier(clientIp, visitorHash);
    const referrer = sanitizeReferrer(rawReferrer);

    // Record visit to Google Drive storage
    const result = await recordPageVisitAsync({
      visitorHash,
      maskedIp,
      path,
      referrer,
      userAgent: userAgent || undefined,
      visitorSessionId,
    });

    const response = NextResponse.json({
      ok: true,
      debounced: result.debounced,
    });

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
    console.error('Track API error:', error);
    return NextResponse.json({ error: 'Internal tracking error' }, { status: 500 });
  }
}
