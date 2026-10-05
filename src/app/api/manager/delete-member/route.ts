import { NextRequest, NextResponse } from 'next/server';
import { requireManagerSession, isManagerEmail } from '@/lib/auth';
import { deleteUserById, deleteUserByEmail } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // 1. Strict server-side manager authorization check
    const session = await requireManagerSession();
    if (!session || !isManagerEmail(session.email)) {
      return NextResponse.json(
        { error: 'Unauthorized: Manager credentials required.' },
        { status: 403 }
      );
    }

    // 2. Parse request payload
    const body = await request.json().catch(() => ({}));
    const { userId, email } = body;

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Member identifier (userId or email) is required.' },
        { status: 400 }
      );
    }

    // 3. Perform deletion with manager protection check
    const result = userId
      ? deleteUserById(userId)
      : deleteUserByEmail(email);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Unable to delete member. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Member deleted successfully.',
      deletedUser: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });
  } catch (error) {
    console.error('Delete member API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while deleting member.' },
      { status: 500 }
    );
  }
}
