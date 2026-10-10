import { NextResponse } from 'next/server';
import { requireManagerSession } from '@/lib/auth';
import { getDb, getVisitorStats } from '@/lib/db';

export async function GET() {
  try {
    // 1. Server-side authentication and authorization check
    const session = await requireManagerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Manager credentials required.' },
        { status: 403 }
      );
    }

    const db = getDb();
    if (!db || !Array.isArray(db.users)) {
      return NextResponse.json(
        { error: 'Database connection failed. Unable to retrieve storage records.' },
        { status: 500 }
      );
    }

    // 2. Compute reliable visitor analytics from persistent storage
    const visitorStats = getVisitorStats();

    // 3. Registered members information
    const registeredMembers = db.users.length;
    const usersList = db.users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isManager: u.role === 'manager' || u.email.toLowerCase() === session.email.toLowerCase(),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));

    // 4. Contact messages summary
    const messages = Array.isArray(db.contactMessages) ? db.contactMessages : [];
    const unreadMessages = messages.filter((m) => m.status === 'unread').length;

    return NextResponse.json({
      // Core Website Visitor Analytics metrics
      totalVisits: visitorStats.totalVisits,
      uniqueVisitors: visitorStats.uniqueVisitors,
      todayVisitors: visitorStats.todayVisitors,
      registeredMembers,
      totalUsers: registeredMembers,

      // Visitor history logs (most recent 500 visits)
      visits: visitorStats.visits.slice(0, 500),

      // Registered members
      users: usersList,

      // Recent platform activity & messages
      recentEvents: Array.isArray(db.events) ? db.events.slice(0, 50) : [],
      totalMessages: messages.length,
      unreadMessages,
      authenticatedAs: session.email,
    });
  } catch (error) {
    console.error('Failed to load manager analytics stats:', error);
    return NextResponse.json(
      { error: 'An unexpected database error occurred while loading analytics.' },
      { status: 500 }
    );
  }
}
