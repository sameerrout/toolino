import { describe, it, expect, beforeEach } from 'vitest';
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
import { readDb, writeDb, clearDb } from '@/lib/db';

describe('Website Visitor Tracking & Client Analytics Suite', () => {
  beforeEach(() => {
    clearDb();
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
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

    it('strictly excludes internal API endpoints, static assets, and manager routes', () => {
      expect(sanitizePath('/api/analytics/visit/')).toBeNull();
      expect(sanitizePath('/api/auth/login')).toBeNull();
      expect(sanitizePath('/_next/static/chunks/main.js')).toBeNull();
      expect(sanitizePath('/favicon.ico')).toBeNull();
      expect(sanitizePath('/manager/')).toBeNull();
      expect(sanitizePath('/manager/messages/')).toBeNull();
    });

    it('sanitizes referrer URLs', () => {
      expect(sanitizeReferrer('https://www.google.com/search?q=pdf+merge')).toBe('https://www.google.com/search');
      expect(sanitizeReferrer('javascript:alert(1)')).toBeUndefined();
    });
  });

  describe('5. Timezone boundary (Asia/Kolkata)', () => {
    it('calculates Today visitors using Asia/Kolkata date boundaries and handles midnight accurately', () => {
      const istMorningRef = new Date('2026-10-10T20:30:00.000Z');
      const todayIstString = getReportingDateString(istMorningRef, REPORTING_TIMEZONE);
      expect(todayIstString).toBe('2026-10-11');

      const visitA = '2026-10-10T19:30:00.000Z'; // 01:00 AM IST Oct 11
      expect(isTodayInReportingTimezone(visitA, REPORTING_TIMEZONE, istMorningRef)).toBe(true);

      const visitB = '2026-10-10T18:25:00.000Z'; // 23:55 PM IST Oct 10
      expect(isTodayInReportingTimezone(visitB, REPORTING_TIMEZONE, istMorningRef)).toBe(false);
    });
  });

  describe('6. Client-Side Page Visit Persistence in writeDb', () => {
    it('records pageviews into writeDb and computes unique visitors accurately', () => {
      writeDb((draft) => {
        draft.pageviews.push({
          path: '/tools/merge-pdf/',
          timestamp: new Date().toISOString(),
          visitorId: 'vid_1',
        });
        draft.pageviews.push({
          path: '/tools/compress-pdf/',
          timestamp: new Date().toISOString(),
          visitorId: 'vid_1',
        });
        draft.pageviews.push({
          path: '/tools/create-zip/',
          timestamp: new Date().toISOString(),
          visitorId: 'vid_2',
        });
      });

      const db = readDb();
      expect(db.pageviews.length).toBe(3);
      const unique = new Set(db.pageviews.map((p) => p.visitorId)).size;
      expect(unique).toBe(2);
    });
  });
});
