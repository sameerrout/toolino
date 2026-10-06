import { NextRequest, NextResponse } from 'next/server';
import { requireManagerSession, isManagerEmail } from '@/lib/auth';
import {
  getContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
  type ContactMessageStatus,
} from '@/lib/db';

async function verifyManager() {
  const session = await requireManagerSession();
  if (!session || !isManagerEmail(session.email)) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await verifyManager();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized: Manager credentials required.' },
      { status: 403 }
    );
  }

  const messages = getContactMessages();
  const unreadCount = messages.filter((m) => m.status === 'unread').length;

  return NextResponse.json({
    ok: true,
    messages,
    total: messages.length,
    unreadCount,
    authenticatedAs: session.email,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await verifyManager();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized: Manager credentials required.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const { id, status } = body;
  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { error: 'Message ID is required.' },
      { status: 400 }
    );
  }

  const validStatuses: ContactMessageStatus[] = ['unread', 'read', 'replied', 'resolved'];
  if (!status || !validStatuses.includes(status as ContactMessageStatus)) {
    return NextResponse.json(
      { error: 'Invalid status. Must be unread, read, replied, or resolved.' },
      { status: 400 }
    );
  }

  const result = updateContactMessageStatus(id, status as ContactMessageStatus);
  if (!result.success || !result.message) {
    return NextResponse.json(
      { error: result.error || 'Message not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: result.message,
  });
}

export async function DELETE(request: NextRequest) {
  const session = await verifyManager();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized: Manager credentials required.' },
      { status: 403 }
    );
  }

  // Parse ID from URL query param or request body
  const { searchParams } = new URL(request.url);
  let id = searchParams.get('id');

  if (!id) {
    const body = await request.json().catch(() => null);
    if (body && typeof body.id === 'string') {
      id = body.id;
    }
  }

  if (!id) {
    return NextResponse.json(
      { error: 'Message ID is required.' },
      { status: 400 }
    );
  }

  const result = deleteContactMessage(id);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Message not found.' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Contact message deleted permanently.',
  });
}
