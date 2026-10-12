import { NextRequest, NextResponse } from 'next/server';
import { requireManagerSession, getAuthorizedManagerEmails } from '@/lib/auth';
import {
  getDbAsync,
  getVisitorStatsAsync,
  getOverviewAnalyticsAsync,
  getToolAnalyticsAsync,
  getPageViewAnalyticsAsync,
  getRegisteredUsersListAsync,
  getLoginEventsAsync,
  getActiveVisitorSessionsAsync,
} from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // 1. Server-side manager authentication and authorization check
    const session = await requireManagerSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Manager credentials required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'all';
    const customStart = searchParams.get('customStart') || undefined;
    const customEnd = searchParams.get('customEnd') || undefined;
    const search = searchParams.get('search') || undefined;

    // 2. Fetch analytics in parallel from persistent store
    const [
      overview,
      visitorStats,
      toolAnalytics,
      pageViewAnalytics,
      usersResult,
      loginEventsResult,
      activeSessionsResult,
      db,
    ] = await Promise.all([
      getOverviewAnalyticsAsync({ range, customStart, customEnd }),
      getVisitorStatsAsync(),
      getToolAnalyticsAsync({ range, customStart, customEnd, search }),
      getPageViewAnalyticsAsync({ range, customStart, customEnd, search }),
      getRegisteredUsersListAsync({ range, customStart, customEnd, search, page: 1, pageSize: 50 }),
      getLoginEventsAsync({ range, customStart, customEnd, search, page: 1, pageSize: 50 }),
      getActiveVisitorSessionsAsync(),
      getDbAsync(),
    ]);

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
    const unreadMessages = messages.filter((m) => m.status === 'unread').length;

    return NextResponse.json(
      {
        // 1. Real database-derived overview metrics
        overview,

        // 2. Live visitor metrics
        liveVisitors: {
          totalActive: activeSessionsResult.totalActive,
          anonymousActive: activeSessionsResult.anonymousActive,
          authenticatedActive: activeSessionsResult.authenticatedActive,
          sessions: activeSessionsResult.sessions,
        },

        // 3. Registered members
        registeredUsers: {
          totalCount: usersResult.totalCount,
          users: usersResult.users,
        },

        // 4. Login history
        loginHistory: {
          totalCount: loginEventsResult.totalCount,
          events: loginEventsResult.events,
        },

        // 5. Tool usage analytics
        toolUsage: {
          summary: toolAnalytics.summary,
          tools: toolAnalytics.tools,
          recentExecutions: toolAnalytics.recentExecutions,
        },

        // 6. Page view analytics
        pageViews: {
          totalViews: pageViewAnalytics.totalViews,
          uniqueSessionsCount: pageViewAnalytics.uniqueSessionsCount,
          pages: pageViewAnalytics.pages,
          dailyTrends: pageViewAnalytics.dailyTrends,
          recentVisits: pageViewAnalytics.recentVisits,
        },

        // 7. Contact inquiries
        contactMessages: {
          total: messages.length,
          unread: unreadMessages,
          messages: messages.slice(0, 50),
        },

        // 8. Security & System status
        systemStatus: {
          isDatabaseConnected: visitorStats.isDriveConnected,
          databaseStatus: visitorStats.databaseStatus,
          databaseError: visitorStats.errorMessage,
          storageProvider: visitorStats.storageProvider,
          folderName: visitorStats.folderName,
          targetAccount: visitorStats.targetAccount,
          authorizedManagers: getAuthorizedManagerEmails(),
          authenticatedAs: session.email,
          serverTimestamp: new Date().toISOString(),
          nodeEnv: process.env.NODE_ENV || 'production',
        },

        // Backwards compatibility keys for any existing consumers
        totalVisits: visitorStats.totalVisits,
        uniqueVisitors: visitorStats.uniqueVisitors,
        todayVisitors: visitorStats.todayVisitors,
        registeredMembers: usersResult.totalCount,
        totalUsers: usersResult.totalCount,
        visits: visitorStats.visits.slice(0, 500),
        users: usersResult.users,
        recentEvents: Array.isArray(db.events) ? db.events.slice(0, 50) : [],
        totalMessages: messages.length,
        unreadMessages,
        authenticatedAs: session.email,
        isDatabaseConnected: visitorStats.isDriveConnected,
        databaseStatus: visitorStats.databaseStatus,
        databaseError: visitorStats.errorMessage,
        storageProvider: visitorStats.storageProvider,
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Database query failed',
      },
      { status: 500 }
    );
  }
}
