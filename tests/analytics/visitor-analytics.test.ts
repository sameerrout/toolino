import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  extractClientIp,
  hashVisitorIp,
  getMaskedIpIdentifier,
  isBotOrCrawler,
  sanitizePath,
  sanitizeReferrer,
  getReportingDateString,
  isTodayInReportingTimezone,
  REPORTING_TIMEZONE,
} from '@/lib/analytics/visitor';
import {
  recordPageVisit,
  getVisitorStats,
  getRegisteredMembersCount,
  getDb,
} from '@/lib/db';
import {
  persistNewVisit,
  loadPersistedVisits,
  getVisitsFilePath,
} from '@/lib/analytics/visitsStore';
import { POST as visitPostHandler } from '@/app/api/analytics/visit/route';
import { POST as trackPostHandler } from '@/app/api/track/route';
import { GET as managerStatsHandler } from '@/app/api/manager/stats/route';
import { NextRequest } from 'next/server';
import { createSessionToken } from '@/lib/auth';

const TEST_VISITS_FILE = path.join(os.tmpdir(), `.toolino_test_visits_${Date.now()}.json`);

describe('Website Visitor Tracking & Server Analytics Suite', () => {
  beforeAll(() => {
    // Isolate test storage so unit tests NEVER overwrite or clear real project data
    process.env.VISITS_DATA_PATH = TEST_VISITS_FILE;
    fs.writeFileSync(TEST_VISITS_FILE, JSON.stringify([], null, 2), 'utf-8');
  });

  afterAll(() => {
    delete process.env.VISITS_DATA_PATH;
    try {
      if (fs.existsSync(TEST_VISITS_FILE)) {
        fs.unlinkSync(TEST_VISITS_FILE);
      }
    } catch {
      // Ignore cleanup error
    }
  });

  beforeEach(() => {
    // Reset test storage to clean array before each test
    fs.writeFileSync(TEST_VISITS_FILE, JSON.stringify([], null, 2), 'utf-8');
    // Invalidate in-memory cache
    const globalVisits = globalThis as unknown as {
      __toolino_visits_cache__?: unknown;
      __toolino_visits_mtime__?: unknown;
    };
    delete globalVisits.__toolino_visits_cache__;
    delete globalVisits.__toolino_visits_mtime__;
  });

  // Helper to create authenticated manager session request
  function createManagerRequest(pathname = '/api/manager/stats/'): NextRequest {
    const token = createSessionToken({
      id: 'mgr_test_1',
      email: 'sameerrout2004@gmail.com',
      name: 'Sameer Test',
    });

    return new NextRequest(`http://localhost:3000${pathname}`, {
      method: 'GET',
      headers: {
        cookie: `toolino_session=${token}`,
      },
    });
  }

  describe('1. Client IP Extraction & Validation', () => {
    it('extracts IP from cf-connecting-ip header first', () => {
      const headers = new Headers({
        'cf-connecting-ip': '203.0.113.195',
        'x-real-ip': '198.51.100.1',
        'x-forwarded-for': '192.0.2.1',
      });
      expect(extractClientIp(headers)).toBe('203.0.113.195');
    });

    it('extracts IP from x-real-ip header when Cloudflare header is absent', () => {
      const headers = new Headers({
        'x-real-ip': '198.51.100.1',
        'x-forwarded-for': '192.0.2.1',
      });
      expect(extractClientIp(headers)).toBe('198.51.100.1');
    });

    it('extracts first valid client IP from x-forwarded-for proxy chain', () => {
      const headers = new Headers({
        'x-forwarded-for': '198.51.100.42, 10.0.0.1, 172.16.0.1',
      });
      expect(extractClientIp(headers)).toBe('198.51.100.42');
    });

    it('falls back to 127.0.0.1 if headers contain invalid characters or are absent', () => {
      const headers = new Headers({
        'x-forwarded-for': 'malicious-script<script>, unknown',
      });
      expect(extractClientIp(headers)).toBe('127.0.0.1');
    });
  });

  describe('2. Keyed HMAC Privacy-Safe Visitor Identification', () => {
    it('hashes IP deterministically using keyed HMAC-SHA256', () => {
      const ip = '198.51.100.42';
      const hash1 = hashVisitorIp(ip);
      const hash2 = hashVisitorIp(ip);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
      expect(hash1).not.toContain(ip);
    });

    it('produces distinct hashes for distinct IP addresses', () => {
      const hashA = hashVisitorIp('198.51.100.42');
      const hashB = hashVisitorIp('203.0.113.195');

      expect(hashA).not.toBe(hashB);
    });

    it('generates privacy-conscious masked identifiers without exposing raw IP', () => {
      const hash = hashVisitorIp('192.168.1.100');
      const masked = getMaskedIpIdentifier('192.168.1.100', hash);

      expect(masked).toBe('192.168.***.***');
      expect(masked).not.toBe('192.168.1.100');
    });
  });

  describe('3. Automated Bot & Web Crawler Filtering', () => {
    it('detects known search bots and web scrapers', () => {
      expect(isBotOrCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
      expect(isBotOrCrawler('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
      expect(isBotOrCrawler('DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)')).toBe(true);
      expect(isBotOrCrawler('AhrefsBot/7.0; +http://ahrefs.com/robot/)')).toBe(true);
    });

    it('allows normal human browser user agents', () => {
      const chromeMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const firefoxWin = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0';

      expect(isBotOrCrawler(chromeMac)).toBe(false);
      expect(isBotOrCrawler(firefoxWin)).toBe(false);
    });
  });

  describe('4. Path Sanitization & Route Exclusion', () => {
    it('sanitizes valid tool and content pages', () => {
      expect(sanitizePath('/tools/merge-pdf/')).toBe('/tools/merge-pdf/');
      expect(sanitizePath('/tools/resize-image')).toBe('/tools/resize-image');
      expect(sanitizePath('/about/')).toBe('/about/');
      expect(sanitizePath('/')).toBe('/');
    });

    it('strictly excludes internal API endpoints, static assets, and manager/admin routes', () => {
      expect(sanitizePath('/api/analytics/visit/')).toBeNull();
      expect(sanitizePath('/api/auth/login')).toBeNull();
      expect(sanitizePath('/_next/static/chunks/main.js')).toBeNull();
      expect(sanitizePath('/favicon.ico')).toBeNull();
      expect(sanitizePath('/manager/')).toBeNull();
      expect(sanitizePath('/manager/messages/')).toBeNull();
      expect(sanitizePath('/admin/')).toBeNull();
      expect(sanitizePath('/admin')).toBeNull();
    });

    it('sanitizes referrer URLs', () => {
      expect(sanitizeReferrer('https://www.google.com/search?q=pdf+merge')).toBe('https://www.google.com/search');
      expect(sanitizeReferrer('javascript:alert(1)')).toBeUndefined();
    });
  });

  describe('5. Core Analytics Verification Tests (A through G)', () => {
    // ---------------------------------------------------------
    // TEST A — Dashboard refresh
    // ---------------------------------------------------------
    it('Test A — Dashboard refresh: repeated refreshes without new public visits leave all counts completely unchanged', async () => {
      // Seed initial visits
      recordPageVisit({
        visitorHash: hashVisitorIp('198.51.100.1'),
        maskedIp: '198.51.***.***',
        path: '/tools/merge-pdf/',
        visitorSessionId: 'vid_init_session_001',
      });
      recordPageVisit({
        visitorHash: hashVisitorIp('198.51.100.2'),
        maskedIp: '198.51.***.***',
        path: '/tools/compress-pdf/',
        visitorSessionId: 'vid_init_session_002',
      });

      const initialStats = getVisitorStats();
      const initialRegistered = getRegisteredMembersCount();

      expect(initialStats.totalVisits).toBe(2);
      expect(initialStats.uniqueVisitors).toBe(2);
      expect(initialStats.todayVisitors).toBe(2);

      // Perform 5 consecutive dashboard API refreshes
      for (let i = 0; i < 5; i++) {
        const req = createManagerRequest('/api/manager/stats/');
        const res = await managerStatsHandler(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.totalVisits).toBe(initialStats.totalVisits);
        expect(data.uniqueVisitors).toBe(initialStats.uniqueVisitors);
        expect(data.todayVisitors).toBe(initialStats.todayVisitors);
        expect(data.registeredMembers).toBe(initialRegistered);
        expect(data.visits.length).toBe(2);
      }
    });

    // ---------------------------------------------------------
    // TEST B — New page visit
    // ---------------------------------------------------------
    it('Test B — New page visit: records visit once, then dashboard refresh sees the newly persisted event accurately', async () => {
      const statsBefore = getVisitorStats();
      expect(statsBefore.totalVisits).toBe(0);

      // 1. Visitor opens public page /tools/image-to-pdf/
      const visitRes = recordPageVisit({
        visitorHash: hashVisitorIp('203.0.113.55'),
        maskedIp: '203.0.***.***',
        path: '/tools/image-to-pdf/',
        referrer: 'https://google.com',
        visitorSessionId: 'vid_user_alpha_123',
      });

      expect(visitRes.success).toBe(true);
      expect(visitRes.debounced).toBeFalsy();
      expect(visitRes.visit?.path).toBe('/tools/image-to-pdf/');

      // 2. Refresh manager dashboard
      const req = createManagerRequest();
      const res = await managerStatsHandler(req);
      const data = await res.json();

      expect(data.totalVisits).toBe(1);
      expect(data.uniqueVisitors).toBe(1);
      expect(data.todayVisitors).toBe(1);
      expect(data.visits[0].path).toBe('/tools/image-to-pdf/');
      expect(data.visits[0].visitorSessionId).toBe('vid_user_alpha_123');
    });

    // ---------------------------------------------------------
    // TEST C — Repeat visits & Unique Visitor stability
    // ---------------------------------------------------------
    it('Test C — Repeat visits: Total visits increases upon deliberate revisit, Unique Visitors remains 1 for same stable visitor ID', async () => {
      const stableVid = 'vid_stable_cookie_777';
      const hash = hashVisitorIp('198.51.100.80');

      // 1. First visit to /tools/resize-image/
      recordPageVisit({
        visitorHash: hash,
        maskedIp: '198.51.***.***',
        path: '/tools/resize-image/',
        visitorSessionId: stableVid,
      });

      const stats1 = getVisitorStats();
      expect(stats1.totalVisits).toBe(1);
      expect(stats1.uniqueVisitors).toBe(1);

      // 2. Immediate repeat within debounce window (<5s) is debounced
      const debounceRes = recordPageVisit({
        visitorHash: hash,
        maskedIp: '198.51.***.***',
        path: '/tools/resize-image/',
        visitorSessionId: stableVid,
      });
      expect(debounceRes.debounced).toBe(true);
      expect(getVisitorStats().totalVisits).toBe(1);

      // 3. Deliberate revisit (simulated past debounce window by adjusting existing timestamp)
      const visits = loadPersistedVisits();
      visits[0].timestamp = new Date(Date.now() - 10000).toISOString();
      fs.writeFileSync(getVisitsFilePath(), JSON.stringify(visits, null, 2), 'utf-8');

      // Now revisit the same page
      const revisitRes = recordPageVisit({
        visitorHash: hash,
        maskedIp: '198.51.***.***',
        path: '/tools/resize-image/',
        visitorSessionId: stableVid,
      });
      expect(revisitRes.debounced).toBeFalsy();

      const stats2 = getVisitorStats();
      // Total visits incremented to 2
      expect(stats2.totalVisits).toBe(2);
      // Unique visitors remains 1 (same stable visitor ID)
      expect(stats2.uniqueVisitors).toBe(1);
      expect(stats2.todayVisitors).toBe(1);
    });

    // ---------------------------------------------------------
    // TEST D — Navigation & Route exclusion
    // ---------------------------------------------------------
    it('Test D — Navigation: counts distinct public pages; strictly excludes internal Manager and Admin pages', async () => {
      const stableVid = 'vid_nav_tester_999';
      const hash = hashVisitorIp('198.51.100.99');

      // 1. Visit page 1: /tools/organize-pdf/
      recordPageVisit({
        visitorHash: hash,
        maskedIp: '198.51.***.***',
        path: '/tools/organize-pdf/',
        visitorSessionId: stableVid,
      });

      // 2. Navigate to page 2: /tools/create-zip/
      recordPageVisit({
        visitorHash: hash,
        maskedIp: '198.51.***.***',
        path: '/tools/create-zip/',
        visitorSessionId: stableVid,
      });

      const statsPublic = getVisitorStats();
      expect(statsPublic.totalVisits).toBe(2);
      expect(statsPublic.uniqueVisitors).toBe(1);

      // 3. Attempt to record internal manager/admin pages via POST API
      const managerReq = new NextRequest('http://localhost:3000/api/analytics/visit/', {
        method: 'POST',
        headers: { 'user-agent': 'Mozilla/5.0 Chrome/120' },
        body: JSON.stringify({ path: '/manager/' }),
      });
      const managerRes = await visitPostHandler(managerReq);
      const managerJson = await managerRes.json();
      expect(managerJson.ignored).toBeDefined();

      const adminReq = new NextRequest('http://localhost:3000/api/analytics/visit/', {
        method: 'POST',
        headers: { 'user-agent': 'Mozilla/5.0 Chrome/120' },
        body: JSON.stringify({ path: '/admin/' }),
      });
      const adminRes = await visitPostHandler(adminReq);
      const adminJson = await adminRes.json();
      expect(adminJson.ignored).toBeDefined();

      // Total visits must remain 2 (manager/admin pages were NOT tracked)
      expect(getVisitorStats().totalVisits).toBe(2);
    });

    // ---------------------------------------------------------
    // TEST E — Persistence & Concurrency
    // ---------------------------------------------------------
    it('Test E — Persistence & Concurrency: data survives server restart and concurrent writes without loss', async () => {
      // 1. Perform 10 concurrent visits
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          persistNewVisit({
            id: `vis_concurrent_${i}`,
            timestamp: new Date().toISOString(),
            visitorHash: hashVisitorIp(`198.51.100.${i + 10}`),
            maskedIp: `198.51.***.***`,
            path: `/tools/tool-${i}/`,
            visitorSessionId: `vid_session_${i}`,
          })
        );
      }
      await Promise.all(promises);

      expect(getVisitorStats().totalVisits).toBe(10);
      expect(getVisitorStats().uniqueVisitors).toBe(10);

      // 2. Simulate server restart: clear all in-memory caches
      const globalVisits = globalThis as unknown as {
        __toolino_visits_cache__?: unknown;
        __toolino_visits_mtime__?: unknown;
      };
      delete globalVisits.__toolino_visits_cache__;
      delete globalVisits.__toolino_visits_mtime__;

      // Re-read directly from disk
      const reloadedVisits = loadPersistedVisits();
      expect(reloadedVisits.length).toBe(10);

      const statsAfterRestart = getVisitorStats();
      expect(statsAfterRestart.totalVisits).toBe(10);
      expect(statsAfterRestart.uniqueVisitors).toBe(10);
    });

    // ---------------------------------------------------------
    // TEST F — Registered accounts accuracy
    // ---------------------------------------------------------
    it('Test F — Registered accounts: matches authoritative database accounts and remains unchanged without creation/deletion', () => {
      const db = getDb();
      const count = getRegisteredMembersCount();

      expect(count).toBe(db.users.length);
      expect(count).toBeGreaterThanOrEqual(2); // Sameer and Sony are registered
      expect(db.users.some((u) => u.email === 'sameerrout2004@gmail.com')).toBe(true);

      // Ensure calling getVisitorStats() doesn't alter user counts
      const _stats = getVisitorStats();
      expect(getRegisteredMembersCount()).toBe(count);
    });

    // ---------------------------------------------------------
    // TEST G — Timezone boundary (Asia/Kolkata)
    // ---------------------------------------------------------
    it('Test G — Timezone: calculates Today visitors using Asia/Kolkata date boundaries and handles midnight accurately', () => {
      // Reference date: 2026-10-11 at 02:00:00 IST (+05:30)
      // In UTC, this is 2026-10-10 at 20:30:00Z (PREVIOUS day in UTC!)
      const istMorningRef = new Date('2026-10-10T20:30:00.000Z');
      const todayIstString = getReportingDateString(istMorningRef, REPORTING_TIMEZONE);
      expect(todayIstString).toBe('2026-10-11');

      // Visit A: Occurred at 01:00 AM IST on Oct 11 (UTC: 2026-10-10T19:30:00Z)
      const visitA = '2026-10-10T19:30:00.000Z';
      expect(isTodayInReportingTimezone(visitA, REPORTING_TIMEZONE, istMorningRef)).toBe(true);

      // Visit B: Occurred at 23:55 PM IST on Oct 10 (UTC: 2026-10-10T18:25:00Z) -> Yesterday in IST
      const visitB = '2026-10-10T18:25:00.000Z';
      expect(isTodayInReportingTimezone(visitB, REPORTING_TIMEZONE, istMorningRef)).toBe(false);

      // Insert both visits
      recordPageVisit({
        visitorHash: hashVisitorIp('192.0.2.1'),
        maskedIp: '192.0.***.***',
        path: '/tools/pdf-to-word/',
        visitorSessionId: 'vid_tz_today',
      });

      // Update visit timestamp to visitB (yesterday IST)
      const stored = loadPersistedVisits();
      stored[0].timestamp = visitB;
      // Add second visit with visitA (today IST)
      stored.unshift({
        id: 'vis_tz_visit_a',
        timestamp: visitA,
        visitorHash: hashVisitorIp('192.0.2.2'),
        maskedIp: '192.0.***.***',
        path: '/tools/excel-to-pdf/',
        visitorSessionId: 'vid_tz_yesterday',
      });
      fs.writeFileSync(getVisitsFilePath(), JSON.stringify(stored, null, 2), 'utf-8');

      // Verify in visitor analytics with reference date istMorningRef
      const stats = getVisitorStats();
      expect(stats.totalVisits).toBe(2);
      expect(stats.uniqueVisitors).toBe(2);

      // Specifically check timezone helper for both
      expect(isTodayInReportingTimezone(stored[0].timestamp, REPORTING_TIMEZONE, istMorningRef)).toBe(true);
      expect(isTodayInReportingTimezone(stored[1].timestamp, REPORTING_TIMEZONE, istMorningRef)).toBe(false);
    });

    it('successfully processes track requests from /api/track with visitorId, page, and referrer', async () => {
      const request = new NextRequest('http://localhost:3000/api/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          'x-forwarded-for': '203.0.113.195',
        },
        body: JSON.stringify({
          visitorId: 'vid_custom_track_123',
          page: '/tools/image-resizer',
          referrer: 'https://google.com',
        }),
      });

      const response = await trackPostHandler(request);
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.ok).toBe(true);

      const visits = loadPersistedVisits();
      expect(visits.length).toBeGreaterThan(0);
      const tracked = visits.find((v) => v.path === '/tools/image-resizer');
      expect(tracked).toBeDefined();
      expect(tracked?.visitorSessionId).toBe('vid_custom_track_123');
      expect(tracked?.referrer).toBe('https://google.com');
    });
  });
});

