import { NextRequest, NextResponse } from 'next/server';
import { requireManagerSession } from '@/lib/auth';
import { getLoginEventsAsync } from '@/lib/db';

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
    const method = (searchParams.get('method') as 'all' | 'google' | 'email') || 'all';
    const status = (searchParams.get('status') as 'all' | 'success' | 'failure') || 'all';
    const range = searchParams.get('range') || 'all';
    const customStart = searchParams.get('customStart') || undefined;
    const customEnd = searchParams.get('customEnd') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await getLoginEventsAsync({
      search,
      method,
      status,
      range,
      customStart,
      customEnd,
      page,
      pageSize,
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    console.error('Failed to get login events:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve login history' },
      { status: 500 }
    );
  }
}
