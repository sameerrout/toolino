import { NextRequest, NextResponse } from 'next/server';
import { createContactMessage } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request payload.' },
        { status: 400 }
      );
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const category = typeof body.category === 'string'
      ? body.category.trim()
      : typeof body.topic === 'string'
      ? body.topic.trim()
      : 'General Inquiry';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    // Validation
    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: 'Please enter your name (at least 2 characters).' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be under 100 characters.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (email.length > 200) {
      return NextResponse.json(
        { error: 'Email address must be under 200 characters.' },
        { status: 400 }
      );
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: 'Please provide a detailed message (at least 10 characters).' },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { error: 'Message must be under 4000 characters.' },
        { status: 400 }
      );
    }

    const created = createContactMessage({
      name,
      email,
      category,
      message,
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      message: "Message sent successfully. We'll review your message and get back to you.",
    });
  } catch (error) {
    console.error('Contact API submission error:', error);
    return NextResponse.json(
      { error: "We couldn't send your message right now. Please try again." },
      { status: 500 }
    );
  }
}

// Disallow GET or other methods to prevent unauthorized listing or access
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed.' },
    { status: 405 }
  );
}
