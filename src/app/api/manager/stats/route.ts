import { NextRequest, NextResponse } from 'next/server';
import { requireManagerSession } from '@/lib/auth';
import { getDb, getVisitorStats, getVisitorStatsAsync, prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request?: NextRequest) {
  try {
    // 1. Server-side authentication and authorization check
    const session = await requireManagerSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Manager credentials required.' },
        { status: 403 }
      );
    }

    // 2. Compute reliable visitor analytics from persistent storage
    const visitorStats = await getVisitorStatsAsync();

    // 3. Registered members, messages, and events
    let registeredMembers = 0;
    let usersList: {
      id: string;
      email: string;
      name: string;
      role: string;
      isManager: boolean;
      createdAt: string;
      lastLoginAt: string;
    }[] = [];
    let messages: {
      id: string;
      name: string;
      email: string;
      category: string;
      message: string;
      status: string;
      createdAt: string;
      updatedAt: string;
    }[] = [];
    let events: {
      timestamp: string;
      type: string;
      email?: string;
      toolSlug?: string;
    }[] = [];

    let fetchedFromPrisma = false;
    if (prisma && process.env.DATABASE_URL) {
      try {
        const [users, dbMessages, dbEvents] = await Promise.all([
          prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
          prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } }),
          prisma.activityEvent.findMany({ take: 50, orderBy: { timestamp: 'desc' } }),
        ]);

        registeredMembers = users.length;
        usersList = users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          isManager: u.role === 'manager' || u.email.toLowerCase() === session.email.toLowerCase(),
          createdAt: u.createdAt.toISOString(),
          lastLoginAt: u.lastLoginAt.toISOString(),
        }));

        messages = dbMessages.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          category: m.category,
          message: m.message,
          status: m.status,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        }));

        events = dbEvents.map((e) => ({
          timestamp: e.timestamp.toISOString(),
          type: e.type,
          email: e.email || undefined,
          toolSlug: e.toolSlug || undefined,
        }));

        fetchedFromPrisma = true;
      } catch (err) {
        console.warn('Prisma query for users/messages failed; falling back to local store:', err instanceof Error ? err.message : err);
      }
    }

    if (!fetchedFromPrisma) {
      const db = getDb();
      registeredMembers = Array.isArray(db.users) ? db.users.length : 0;
      usersList = (db.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isManager: u.role === 'manager' || u.email.toLowerCase() === session.email.toLowerCase(),
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      }));

      const rawMessages = Array.isArray(db.contactMessages) ? db.contactMessages : [];
      messages = rawMessages.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        category: m.category,
        message: m.message,
        status: m.status,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));

      events = Array.isArray(db.events) ? db.events.slice(0, 50) : [];
    }

    const unreadMessages = messages.filter((m) => m.status === 'unread').length;

    return NextResponse.json(
      {
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
        recentEvents: events,
        totalMessages: messages.length,
        unreadMessages,
        authenticatedAs: session.email,
        isDatabaseConnected: visitorStats.isPostgresConnected,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Failed to load manager analytics stats:', error);
    const db = getDb();
    const fallbackStats = getVisitorStats();
    return NextResponse.json(
      {
        totalVisits: fallbackStats.totalVisits,
        uniqueVisitors: fallbackStats.uniqueVisitors,
        todayVisitors: fallbackStats.todayVisitors,
        registeredMembers: Array.isArray(db.users) ? db.users.length : 0,
        totalUsers: Array.isArray(db.users) ? db.users.length : 0,
        visits: fallbackStats.visits.slice(0, 500),
        users: (db.users || []).map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          isManager: u.role === 'manager',
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
        })),
        recentEvents: Array.isArray(db.events) ? db.events.slice(0, 50) : [],
        totalMessages: Array.isArray(db.contactMessages) ? db.contactMessages.length : 0,
        unreadMessages: (db.contactMessages || []).filter((m) => m.status === 'unread').length,
        authenticatedAs: 'manager',
        isDatabaseConnected: false,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
