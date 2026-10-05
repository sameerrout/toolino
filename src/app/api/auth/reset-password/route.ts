import { NextRequest, NextResponse } from 'next/server';
import { verifyResetToken, resetPasswordWithToken } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Reset token is required.' },
        { status: 400 }
      );
    }

    const verification = verifyResetToken(token);
    if (!verification.valid) {
      return NextResponse.json(
        { valid: false, error: verification.error || 'Invalid or expired token.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: verification.email,
    });
  } catch (error) {
    console.error('Reset token verification error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to verify reset token.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is missing or invalid.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Please enter a new password.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      );
    }

    const result = resetPasswordWithToken(token, password);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Your password has been reset successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting password.' },
      { status: 500 }
    );
  }
}
