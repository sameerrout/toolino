import { NextResponse } from 'next/server';
import { checkGoogleDriveHealth } from '@/lib/drive/googleDriveClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await checkGoogleDriveHealth();
  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
