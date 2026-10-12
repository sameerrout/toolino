import { NextRequest, NextResponse } from 'next/server';
import { requireManagerSession } from '@/lib/auth';
import { getActiveVisitorSessionsAsync } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await requireManagerSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Manager credentials required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const thresholdSec = parseInt(searchParams.get('thresholdSec') || '120', 10);
    const thresholdMs = Math.max(30000, Math.min(600000, thresholdSec * 1000));

    const activeData = await getActiveVisitorSessionsAsync(thresholdMs);

    return NextResponse.json(activeData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    console.error('Failed to get active visitor sessions:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve active visitors' },
      { status: 500 }
    );
  }
}
