import { NextResponse } from 'next/server';
import { checkGmailStorageHealth } from '@/lib/gmail/gmailClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await checkGmailStorageHealth();
  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
