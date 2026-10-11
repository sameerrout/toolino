import { NextResponse } from 'next/server';
import { checkGoogleDriveHealth } from '@/lib/drive/googleDriveClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await checkGoogleDriveHealth();
  return NextResponse.json(status);
}
