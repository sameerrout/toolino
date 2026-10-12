import { NextRequest, NextResponse } from 'next/server';
import { requireManagerSession } from '@/lib/auth';
import { getToolAnalyticsAsync } from '@/lib/db';

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
    const search = searchParams.get('search') || undefined;
    const range = searchParams.get('range') || 'all';
    const customStart = searchParams.get('customStart') || undefined;
    const customEnd = searchParams.get('customEnd') || undefined;

    const result = await getToolAnalyticsAsync({
      search,
      range,
      customStart,
      customEnd,
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    console.error('Failed to get tool analytics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve tool analytics' },
      { status: 500 }
    );
  }
}
