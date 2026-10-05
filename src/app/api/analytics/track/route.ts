import { NextRequest, NextResponse } from 'next/server';
import { recordToolUsage } from '@/lib/db';
import { getServerSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolSlug } = body;

    if (!toolSlug || typeof toolSlug !== 'string') {
      return NextResponse.json({ error: 'Valid toolSlug is required' }, { status: 400 });
    }

    const session = await getServerSession();
    recordToolUsage(toolSlug, session?.email);

    return NextResponse.json({ ok: true });
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 });
  }
}
