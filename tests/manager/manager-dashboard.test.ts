import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { isManagerEmail, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import {
  recordVisitorSessionHeartbeat,
  getActiveVisitorSessions,
  recordLoginEvent,
  getLoginEvents,
  recordToolExecution,
  getToolAnalytics,
  getUserDetailsWithActivity,
  deleteUserByEmail,
  getDb,
  saveDb,
} from '@/lib/db';
import { GET as managerStatsHandler } from '@/app/api/manager/stats/route';

describe('ToolForForever Manager Dashboard & Analytics Suite', () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = 'manager-dashboard-test-session-secret-32-chars!!';
  });

  beforeEach(() => {
    const db = getDb();
    // Clean test records while preserving structure
    db.visitorSessions = [];
    db.loginEvents = [];
    db.toolExecutions = [];
    db.toolUsage = {};
    saveDb(db);
  });

  describe('1. Manager Access Control & Authorization', () => {
    it('authorizes only sameerrout2004@gmail.com and sonysampangi9@gmail.com', () => {
      expect(isManagerEmail('sameerrout2004@gmail.com')).toBe(true);
      expect(isManagerEmail('SameerRout2004@Gmail.Com')).toBe(true);
      expect(isManagerEmail('sonysampangi9@gmail.com')).toBe(true);
      expect(isManagerEmail('SONYSAMPANGI9@GMAIL.COM')).toBe(true);

      // Unauthorized accounts must fail
      expect(isManagerEmail('attacker@evil.com')).toBe(false);
      expect(isManagerEmail('user@toolforforever.com')).toBe(false);
      expect(isManagerEmail('random.visitor@gmail.com')).toBe(false);
      expect(isManagerEmail('')).toBe(false);
    });

    it('rejects unauthenticated requests to /api/manager/stats with 401 or 403', async () => {
      const request = new NextRequest('http://localhost:3000/api/manager/stats');
      const response = await managerStatsHandler(request);
      expect([401, 403]).toContain(response.status);
    });

    it('rejects unauthorized user sessions with 403', async () => {
      const unauthorizedToken = createSessionToken({
        id: 'usr_normal',
        email: 'normal.user@example.com',
        name: 'Normal User',
      });

      const request = new NextRequest('http://localhost:3000/api/manager/stats', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${unauthorizedToken}`,
        },
      });

      const response = await managerStatsHandler(request);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.error).toContain('Manager credentials required');
    });

    it('allows authorized manager sonysampangi9@gmail.com to access /api/manager/stats', async () => {
      const managerToken = createSessionToken({
        id: 'usr_mgr_sony',
        email: 'sonysampangi9@gmail.com',
        name: 'Sony Sampangi',
      });

      const request = new NextRequest('http://localhost:3000/api/manager/stats', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${managerToken}`,
        },
      });

      const response = await managerStatsHandler(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.overview).toBeDefined();
      expect(json.authenticatedAs).toBe('sonysampangi9@gmail.com');
    });

    it('allows authorized manager sameerrout2004@gmail.com to access /api/manager/stats', async () => {
      const managerToken = createSessionToken({
        id: 'usr_mgr_sameer',
        email: 'sameerrout2004@gmail.com',
        name: 'Sameer Rout',
      });

      const request = new NextRequest('http://localhost:3000/api/manager/stats', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${managerToken}`,
        },
      });

      const response = await managerStatsHandler(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.overview).toBeDefined();
      expect(json.authenticatedAs).toBe('sameerrout2004@gmail.com');
    });

    it('strictly prohibits deleting authorized manager accounts', () => {
      const res1 = deleteUserByEmail('sameerrout2004@gmail.com');
      expect(res1.success).toBe(false);
      expect(res1.error).toContain('Cannot delete an authorized manager account');

      const res2 = deleteUserByEmail('sonysampangi9@gmail.com');
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('Cannot delete an authorized manager account');
    });
  });

  describe('2. Live Visitor Tracking & Activity Heartbeat', () => {
    it('records and updates visitor sessions without creating duplicate session IDs', () => {
      const sessionId = 'test_sess_001';
      const now = new Date().toISOString();

      recordVisitorSessionHeartbeat({
        sessionId,
        visitorHash: 'hash_abc',
        maskedIp: '203.0.***.***',
        currentPath: '/tools/pdf-to-word',
        isAuthenticated: false,
        lastActivityTime: now,
      });

      let activeResult = getActiveVisitorSessions(2 * 60 * 1000);
      expect(activeResult.totalActive).toBe(1);
      expect(activeResult.sessions[0].sessionId).toBe(sessionId);
      expect(activeResult.sessions[0].currentPath).toBe('/tools/pdf-to-word');
      expect(activeResult.sessions[0].isAuthenticated).toBe(false);

      // Send second heartbeat for same session (e.g. navigated to /tools/merge-pdf)
      recordVisitorSessionHeartbeat({
        sessionId,
        visitorHash: 'hash_abc',
        maskedIp: '203.0.***.***',
        currentPath: '/tools/merge-pdf',
        isAuthenticated: false,
        lastActivityTime: new Date(Date.now() + 10000).toISOString(),
      });

      activeResult = getActiveVisitorSessions(2 * 60 * 1000);
      expect(activeResult.totalActive).toBe(1);
      expect(activeResult.sessions[0].currentPath).toBe('/tools/merge-pdf');
    });

    it('distinguishes between active and expired sessions based on inactivity threshold', () => {
      const activeSession = 'active_sess_1';
      const expiredSession = 'expired_sess_2';

      const recentTime = new Date().toISOString();
      const expiredTime = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago

      recordVisitorSessionHeartbeat({
        sessionId: activeSession,
        visitorHash: 'hash_1',
        maskedIp: '203.0.***.***',
        currentPath: '/',
        isAuthenticated: false,
        lastActivityTime: recentTime,
      });

      recordVisitorSessionHeartbeat({
        sessionId: expiredSession,
        visitorHash: 'hash_2',
        maskedIp: '203.0.***.***',
        currentPath: '/tools/image-resizer',
        isAuthenticated: false,
        lastActivityTime: expiredTime,
      });

      // 2-minute active threshold: only activeSession should be returned
      const activeResult = getActiveVisitorSessions(2 * 60 * 1000);
      expect(activeResult.totalActive).toBe(1);
      expect(activeResult.sessions[0].sessionId).toBe(activeSession);
    });

    it('tracks authenticated vs anonymous active visitors accurately', () => {
      recordVisitorSessionHeartbeat({
        sessionId: 'sess_anon',
        visitorHash: 'h_anon',
        maskedIp: '203.0.***.***',
        currentPath: '/',
        isAuthenticated: false,
        lastActivityTime: new Date().toISOString(),
      });

      recordVisitorSessionHeartbeat({
        sessionId: 'sess_auth',
        visitorHash: 'h_auth',
        maskedIp: '203.0.***.***',
        currentPath: '/account',
        isAuthenticated: true,
        userId: 'usr_123',
        userEmail: 'member@example.com',
        lastActivityTime: new Date().toISOString(),
      });

      const activeResult = getActiveVisitorSessions(2 * 60 * 1000);
      expect(activeResult.totalActive).toBe(2);
      expect(activeResult.anonymousActive).toBe(1);
      expect(activeResult.authenticatedActive).toBe(1);
      const auth = activeResult.sessions.filter((s) => s.isAuthenticated);
      expect(auth[0].userEmail).toBe('member@example.com');
    });
  });

  describe('3. Login History & Authentication Event Tracking', () => {
    it('records successful login events without logging password or secrets', () => {
      recordLoginEvent({
        userId: 'usr_user_1',
        email: 'user1@example.com',
        method: 'email',
        eventType: 'login',
        status: 'success',
        sessionId: 'sess_login_1',
        maskedIp: '198.51.***.***',
      });

      const result = getLoginEvents();
      expect(result.totalCount).toBe(1);
      const ev = result.events[0];
      expect(ev.email).toBe('user1@example.com');
      expect(ev.method).toBe('email');
      expect(ev.status).toBe('success');
      // Passwords or tokens must NOT exist on login record
      expect(((ev as unknown) as Record<string, unknown>).password).toBeUndefined();
      expect(((ev as unknown) as Record<string, unknown>).token).toBeUndefined();
    });

    it('records failed login events with a safe category and without raw passwords', () => {
      recordLoginEvent({
        email: 'victim@example.com',
        method: 'email',
        eventType: 'failed_login',
        status: 'failure',
        failureReason: 'Invalid credentials',
        maskedIp: '198.51.***.***',
      });

      const result = getLoginEvents();
      expect(result.totalCount).toBe(1);
      const ev = result.events[0];
      expect(ev.email).toBe('victim@example.com');
      expect(ev.status).toBe('failure');
      expect(ev.failureReason).toBe('Invalid credentials');
      expect(((ev as unknown) as Record<string, unknown>).submittedPassword).toBeUndefined();
    });

    it('records Google OAuth authentication events accurately', () => {
      recordLoginEvent({
        userId: 'usr_google_1',
        email: 'googleuser@gmail.com',
        method: 'google',
        eventType: 'login',
        status: 'success',
        maskedIp: '203.0.***.***',
      });

      const result = getLoginEvents();
      expect(result.totalCount).toBe(1);
      expect(result.events[0].method).toBe('google');
      expect(result.events[0].email).toBe('googleuser@gmail.com');
    });
  });

  describe('4. Tool Usage Analytics & Operation Lifecycle', () => {
    it('records granular tool operation initiation, completion, and failure', () => {
      recordToolExecution({
        toolSlug: 'merge-pdf',
        toolName: 'Merge PDF',
        status: 'initiated',
        visitorSessionId: 'sess_tool_1',
      });

      recordToolExecution({
        toolSlug: 'merge-pdf',
        toolName: 'Merge PDF',
        status: 'completed',
        durationMs: 840,
        visitorSessionId: 'sess_tool_1',
      });

      recordToolExecution({
        toolSlug: 'compress-image',
        toolName: 'Compress Image',
        status: 'failed',
        errorMessage: 'Invalid file format',
        visitorSessionId: 'sess_tool_2',
      });

      const analytics = getToolAnalytics('all');
      expect(analytics.summary.totalExecutions).toBe(2);
      expect(analytics.summary.completedExecutions).toBe(1);
      expect(analytics.summary.failedExecutions).toBe(1);
      expect(analytics.summary.distinctToolsUsed).toBe(2);

      // Verify Merge PDF aggregated metrics
      const mergePdf = analytics.tools.find((t) => t.toolSlug === 'merge-pdf');
      expect(mergePdf).toBeDefined();
      expect(mergePdf?.totalExecutions).toBe(1);
      expect(mergePdf?.completedCount).toBe(1);

      // Verify Compress Image metrics
      const compress = analytics.tools.find((t) => t.toolSlug === 'compress-image');
      expect(compress).toBeDefined();
      expect(compress?.failedCount).toBe(1);
    });

    it('ranks tools by total executions and calculates usage percentage', () => {
      // 3 executions for word-counter, 1 for merge-pdf
      for (let i = 0; i < 3; i++) {
        recordToolExecution({
          toolSlug: 'word-counter',
          toolName: 'Word Counter',
          status: 'completed',
          visitorSessionId: `sess_wc_${i}`,
        });
      }

      recordToolExecution({
        toolSlug: 'merge-pdf',
        toolName: 'Merge PDF',
        status: 'completed',
        visitorSessionId: 'sess_mp_1',
      });

      const analytics = getToolAnalytics('all');
      expect(analytics.summary.mostPopularTool?.toolSlug).toBe('word-counter');
      expect(analytics.tools[0].toolSlug).toBe('word-counter');
      expect(analytics.tools[0].percentage).toBe(75);
      expect(analytics.tools[1].toolSlug).toBe('merge-pdf');
      expect(analytics.tools[1].percentage).toBe(25);
    });

    it('filters tool executions by date range (today vs all time)', () => {
      const now = new Date().toISOString();
      const pastWeek = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

      recordToolExecution({
        toolSlug: 'calculator',
        toolName: 'Calculator',
        status: 'completed',
        timestamp: now,
      });

      recordToolExecution({
        toolSlug: 'calculator',
        toolName: 'Calculator',
        status: 'completed',
        timestamp: pastWeek,
      });

      const todayStats = getToolAnalytics('today');
      const allStats = getToolAnalytics('all');

      expect(todayStats.summary.totalExecutions).toBe(1);
      expect(allStats.summary.totalExecutions).toBe(2);
    });
  });

  describe('5. Individual User Activity Details', () => {
    it('retrieves recorded tool activity and login history for a specific registered user', () => {
      const userId = 'usr_target_inspect';
      const userEmail = 'target@example.com';

      // Insert target user record into database
      const db = getDb();
      db.users.push({
        id: userId,
        email: userEmail,
        name: 'Target User',
        authProvider: 'email',
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        loginCount: 1,
        emailVerified: true,
        status: 'active',
      });
      saveDb(db);

      recordLoginEvent({
        userId,
        email: userEmail,
        method: 'email',
        eventType: 'login',
        status: 'success',
      });

      recordToolExecution({
        toolSlug: 'pdf-to-word',
        toolName: 'PDF to Word',
        userId,
        status: 'completed',
        durationMs: 1200,
      });

      const details = getUserDetailsWithActivity(userId);
      expect(details).not.toBeNull();
      expect(details?.recentLoginEvents.length).toBe(1);
      expect(details?.recentLoginEvents[0].email).toBe(userEmail);
      expect(details?.recentToolExecutions.length).toBe(1);
      expect(details?.recentToolExecutions[0].toolSlug).toBe('pdf-to-word');
      expect(details?.toolUsageSummary.length).toBe(1);
      expect(details?.toolUsageSummary[0].toolSlug).toBe('pdf-to-word');
      expect(details?.toolUsageSummary[0].count).toBe(1);
    });
  });
});
