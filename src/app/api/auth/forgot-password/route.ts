import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetToken } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    // Generic safe response to prevent user/email enumeration
    const genericSuccessResponse = {
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.',
    };

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const result = createPasswordResetToken(trimmedEmail);

    // If user exists and token was generated, deliver the email with the raw token link
    if (result.success && result.token) {
      // Asynchronously send the password reset email via official transporter
      await sendPasswordResetEmail({
        to: trimmedEmail,
        resetToken: result.token,
      });
    }

    // Always return generic response to prevent account enumeration
    // Never leak resetToken or resetUrl in the HTTP response
    return NextResponse.json(genericSuccessResponse);
  } catch (error) {
    console.error('Forgot password processing error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
