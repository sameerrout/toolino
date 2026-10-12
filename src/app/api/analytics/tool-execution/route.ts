import { NextRequest, NextResponse } from 'next/server';
import { recordToolExecutionAsync, resolveToolDisplayName } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { isToolSlug } from '@/lib/tools';

const VISITOR_COOKIE_NAME = 'tff_vid';

// Rate limiting for client tool execution reports: max 120 per minute per session
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, limit = 120, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Valid JSON payload required' }, { status: 400 });
    }

    const { toolSlug, toolName, status = 'initiated', durationMs, errorMessage } = body;

    if (!toolSlug || typeof toolSlug !== 'string' || !isToolSlug(toolSlug)) {
      return NextResponse.json({ error: 'Valid toolSlug required' }, { status: 400 });
    }

    const validStatuses = ['initiated', 'completed', 'failed'] as const;
    const finalStatus = validStatuses.includes(status) ? status : 'initiated';

    const visitorSessionId = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
    const rateKey = visitorSessionId || toolSlug;
    if (!checkRateLimit(rateKey)) {
      return NextResponse.json({ ok: true, rateLimited: true });
    }

    const session = await getServerSession(request);
    const resolvedName = typeof toolName === 'string' && toolName.trim()
      ? toolName.trim()
      : resolveToolDisplayName(toolSlug);

    const safeDuration = typeof durationMs === 'number' && durationMs >= 0 ? Math.round(durationMs) : undefined;
    const safeError = typeof errorMessage === 'string' ? errorMessage.slice(0, 200) : undefined;

    const execution = await recordToolExecutionAsync({
      toolSlug,
      toolName: resolvedName,
      userId: session?.id,
      visitorSessionId,
      status: finalStatus,
      durationMs: safeDuration,
      errorMessage: safeError,
    });

    return NextResponse.json({
      ok: true,
      eventId: execution.id,
      status: execution.status,
    });
  } catch (error) {
    console.error('Tool execution tracking error:', error);
    return NextResponse.json({ error: 'Failed to record tool execution' }, { status: 500 });
  }
}
