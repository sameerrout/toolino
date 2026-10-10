import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
  extractClientIp,
  hashVisitorIp,
  getMaskedIpIdentifier,
  isBotOrCrawler,
  sanitizePath,
  sanitizeReferrer,
} from '@/lib/analytics/visitor';
import {
  recordPageVisit,
  getVisitorStats,
  getRegisteredMembersCount,
  getDb,
  saveDb,
} from '@/lib/db';
import { POST as visitPostHandler } from '@/app/api/analytics/visit/route';
import { GET as managerStatsHandler } from '@/app/api/manager/stats/route';
import { NextRequest } from 'next/server';

describe('Website Visitor Tracking & Server Analytics', () => {
  beforeEach(() => {
    // Clear test visit state
    const db = getDb();
    db.visits = [];
    saveDb(db);
  });

  afterAll(() => {
    // Clean up test visits after test suite
    const db = getDb();
    db.visits = [];
    saveDb(db);
  });

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
      expect(hash1.length).toBe(64); // SHA-256 hex string length
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
      expect(isBotOrCrawler('SemrushBot/7~bl; +http://www.semrush.com/bot.html')).toBe(true);
      expect(isBotOrCrawler('Python-urllib/3.9')).toBe(false);
      expect(isBotOrCrawler('SimpleCrawler/1.0')).toBe(true);
    });

    it('allows normal human browser user agents', () => {
      const chromeMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const firefoxWin = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0';
      const safariIPhone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';

      expect(isBotOrCrawler(chromeMac)).toBe(false);
      expect(isBotOrCrawler(firefoxWin)).toBe(false);
      expect(isBotOrCrawler(safariIPhone)).toBe(false);
    });
  });

  describe('4. Path Sanitization & Internal Route Exclusion', () => {
    it('sanitizes valid tool and content pages', () => {
      expect(sanitizePath('/tools/merge-pdf/')).toBe('/tools/merge-pdf/');
      expect(sanitizePath('/tools/resize-image')).toBe('/tools/resize-image');
      expect(sanitizePath('/about/')).toBe('/about/');
      expect(sanitizePath('/')).toBe('/');
    });

    it('excludes internal API endpoints, build assets, and manager routes', () => {
      expect(sanitizePath('/api/analytics/track/')).toBeNull();
      expect(sanitizePath('/api/auth/login')).toBeNull();
      expect(sanitizePath('/_next/static/chunks/main.js')).toBeNull();
      expect(sanitizePath('/favicon.ico')).toBeNull();
      expect(sanitizePath('/manager/')).toBeNull();
      expect(sanitizePath('/manager/messages/')).toBeNull();
    });

    it('rejects invalid or unsafe path formats', () => {
      expect(sanitizePath('relative/path')).toBeNull();
      expect(sanitizePath('')).toBeNull();
      expect(sanitizePath(null)).toBeNull();
    });

    it('sanitizes referrer URLs', () => {
      expect(sanitizeReferrer('https://www.google.com/search?q=pdf+merge')).toBe('https://www.google.com/search');
      expect(sanitizeReferrer('javascript:alert(1)')).toBeUndefined();
    });
  });

  describe('5. Database Record Insertion, Debounce & Metrics Calculation', () => {
    it('records page visits with server timestamp and generates persistent record', () => {
      const hash = hashVisitorIp('203.0.113.10');
      const res = recordPageVisit({
        visitorHash: hash,
        maskedIp: '203.0.***.***',
        path: '/tools/merge-pdf/',
        referrer: 'https://google.com',
      });

      expect(res.success).toBe(true);
      expect(res.visit).toBeDefined();
      expect(res.visit?.id.startsWith('vis_')).toBe(true);
      expect(res.visit?.path).toBe('/tools/merge-pdf/');
      expect(res.visit?.timestamp).toBeDefined();

      const stats = getVisitorStats();
      expect(stats.totalVisits).toBe(1);
      expect(stats.uniqueVisitors).toBe(1);
      expect(stats.todayVisitors).toBe(1);
    });

    it('debounces rapid duplicate visits from the same visitor to the same path within 5 seconds', () => {
      const hash = hashVisitorIp('203.0.113.20');

      // First visit
      const res1 = recordPageVisit({
        visitorHash: hash,
        maskedIp: '203.0.***.***',
        path: '/tools/organize-pdf/',
      });
      expect(res1.debounced).toBeFalsy();

      // Immediate duplicate visit (e.g. React Strict Mode or double trigger)
      const res2 = recordPageVisit({
        visitorHash: hash,
        maskedIp: '203.0.***.***',
        path: '/tools/organize-pdf/',
      });
      expect(res2.debounced).toBe(true);

      const stats = getVisitorStats();
      // Should count only once
      expect(stats.totalVisits).toBe(1);
    });

    it('counts visits separately from unique visitors across multiple pages', () => {
      const hashA = hashVisitorIp('203.0.113.30');
      const hashB = hashVisitorIp('203.0.113.40');

      // Visitor A visits Page 1
      recordPageVisit({ visitorHash: hashA, maskedIp: '203.0.***.***', path: '/tools/image-to-pdf/' });
      // Visitor A visits Page 2
      recordPageVisit({ visitorHash: hashA, maskedIp: '203.0.***.***', path: '/tools/resize-image/' });
      // Visitor B visits Page 1
      recordPageVisit({ visitorHash: hashB, maskedIp: '203.0.***.***', path: '/tools/image-to-pdf/' });

      const stats = getVisitorStats();
      expect(stats.totalVisits).toBe(3);
      expect(stats.uniqueVisitors).toBe(2);
      expect(stats.todayVisitors).toBe(2);

      // Verify individual visit count per visitor
      const visitA = stats.visits.find((v) => v.visitorHash === hashA);
      expect(visitA?.visitCount).toBe(2);
    });
  });

  describe('6. Registered Members Count Accuracy', () => {
    it('accurately counts registered member accounts from database', () => {
      const count = getRegisteredMembersCount();
      // Both Sameer and Sony are registered in db.json
      expect(count).toBe(2);

      const db = getDb();
      expect(db.users.length).toBe(2);
      expect(db.users.some((u) => u.email === 'sameerrout2004@gmail.com')).toBe(true);
      expect(db.users.some((u) => u.email === 'sonysampangi9@gmail.com')).toBe(true);
    });
  });

  describe('7. API Route Endpoints & Authorization Security', () => {
    it('POST /api/analytics/visit tracks valid page requests and ignores bots', async () => {
      // 1. Human visit request
      const humanReq = new NextRequest('http://localhost:3000/api/analytics/visit/', {
        method: 'POST',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          'x-forwarded-for': '198.51.100.99',
        },
        body: JSON.stringify({
          path: '/tools/compress-pdf/',
          referrer: 'https://toolforforever.com/',
        }),
      });

      const humanRes = await visitPostHandler(humanReq);
      expect(humanRes.status).toBe(200);
      const humanJson = await humanRes.json();
      expect(humanJson.ok).toBe(true);

      // Verify persisted in DB
      const statsAfter = getVisitorStats();
      expect(statsAfter.totalVisits).toBe(1);
      expect(statsAfter.visits[0].path).toBe('/tools/compress-pdf/');

      // 2. Automated bot request
      const botReq = new NextRequest('http://localhost:3000/api/analytics/visit/', {
        method: 'POST',
        headers: {
          'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
          'x-forwarded-for': '66.249.66.1',
        },
        body: JSON.stringify({
          path: '/tools/compress-pdf/',
        }),
      });

      const botRes = await visitPostHandler(botReq);
      expect(botRes.status).toBe(200);
      const botJson = await botRes.json();
      expect(botJson.ignored).toBe('bot');

      // Bot visit must NOT be counted in human analytics
      expect(getVisitorStats().totalVisits).toBe(1);
    });

    it('GET /api/manager/stats strictly requires authorized manager session (rejects with 403)', async () => {
      // Request without session cookie
      const res = await managerStatsHandler();
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toContain('Unauthorized');
    });
  });
});
