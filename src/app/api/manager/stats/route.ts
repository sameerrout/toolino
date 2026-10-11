import { NextRequest, NextResponse } from 'next/server';
import { requireManagerSession } from '@/lib/auth';
import {
  getDbAsync,
  getVisitorStats,
  getVisitorStatsAsync,
} from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request?: NextRequest) {
  try {
    // 1. Server-side manager authentication and authorization check
    const session = await requireManagerSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Manager credentials required.' },
        { status: 403 }
      );
    }

    // 2. Compute reliable visitor analytics from Google Drive
    const visitorStats = await getVisitorStatsAsync();

    // 3. Load registered members, messages, and events from Google Drive
    const db = await getDbAsync();

    const registeredMembers = Array.isArray(db.users) ? db.users.length : 0;
    const usersList = (db.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isManager: u.role === 'manager' || u.email.toLowerCase() === session.email.toLowerCase(),
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));

    const rawMessages = Array.isArray(db.contactMessages) ? db.contactMessages : [];
    const messages = rawMessages.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      category: m.category,
      message: m.message,
      status: m.status,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    const events = Array.isArray(db.events) ? db.events.slice(0, 50) : [];
    const unreadMessages = messages.filter((m) => m.status === 'unread').length;

    return NextResponse.json(
      {
        // Core Website Visitor Analytics metrics from Google Drive
        totalVisits: visitorStats.totalVisits,
        uniqueVisitors: visitorStats.uniqueVisitors,
        todayVisitors: visitorStats.todayVisitors,
        registeredMembers,
        totalUsers: registeredMembers,

        // Visitor history logs (most recent 500 visits)
        visits: visitorStats.visits.slice(0, 500),

        // Registered members
        users: usersList,

        // Platform events & contact inquiries
        recentEvents: events,
        totalMessages: messages.length,
        unreadMessages,
        authenticatedAs: session.email,

        // Google Drive Storage Status
        isDatabaseConnected: visitorStats.isDriveConnected,
        databaseStatus: visitorStats.databaseStatus,
        databaseError: visitorStats.errorMessage,
        storageProvider: 'Google Drive',
        folderName: visitorStats.folderName,
        targetAccount: visitorStats.targetAccount,
        databaseProvider: visitorStats.isDriveConnected
          ? `Google Drive (${visitorStats.folderName})`
          : visitorStats.databaseStatus === 'query_failed'
          ? 'Google Drive API Connection Error'
          : 'Google Drive Awaiting Setup',
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
    console.error('Failed to aggregate manager analytics:', error);
    const fallbackStats = getVisitorStats();

    return NextResponse.json(
      {
        totalVisits: fallbackStats.totalVisits,
        uniqueVisitors: fallbackStats.uniqueVisitors,
        todayVisitors: fallbackStats.todayVisitors,
        registeredMembers: 0,
        totalUsers: 0,
        visits: fallbackStats.visits.slice(0, 100),
        users: [],
        recentEvents: [],
        totalMessages: 0,
        unreadMessages: 0,
        authenticatedAs: 'manager',
        isDatabaseConnected: false,
        databaseStatus: 'query_failed',
        storageProvider: 'Google Drive',
        folderName: 'ToolForForever_Data',
        targetAccount: 'sameerrout2004@gmail.com',
        databaseProvider: 'Google Drive Connection Error',
        databaseError: error instanceof Error ? error.message : 'Storage initialization failure',
      },
      { status: 200 }
    );
  }
}
