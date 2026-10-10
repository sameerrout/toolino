import crypto from 'node:crypto';

/**
 * Known bot / web crawler user agent signatures to filter out automated noise.
 */
const BOT_PATTERNS = [
  /bot\b/i,
  /spider/i,
  /crawler/i,
  /crawl/i,
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,
  /facebot/i,
  /facebookexternalhit/i,
  /ia_archiver/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /pinterest/i,
  /twitterbot/i,
  /linkedinbot/i,
  /applebot/i,
  /headlesschrome/i,
  /lighthouse/i,
  /bytespider/i,
];

/**
 * Identifies known search engine and automated web crawlers.
 */
export function isBotOrCrawler(userAgent?: string | null): boolean {
  if (!userAgent || typeof userAgent !== 'string') return false;
  const trimmed = userAgent.trim();
  return BOT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Validates whether a string is a standard IPv4 or IPv6 address.
 */
function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  // IPv4 pattern
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 pattern
  const ipv6 = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:){1,7}:|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/i;
  return ipv4.test(trimmed) || ipv6.test(trimmed) || trimmed === '127.0.0.1' || trimmed === '::1';
}

/**
 * Safely extracts client IP address from trusted hosting proxy headers.
 * Resolves headers in priority:
 * 1. cf-connecting-ip (Cloudflare)
 * 2. x-real-ip (Nginx / App Runner / Reverse Proxy)
 * 3. x-forwarded-for (First valid client IP from proxy chain)
 */
export function extractClientIp(headers: Headers): string {
  // 1. Cloudflare header
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp)) {
    return cfIp.trim();
  }

  // 2. Real-IP header
  const realIp = headers.get('x-real-ip');
  if (realIp && isValidIp(realIp)) {
    return realIp.trim();
  }

  // 3. X-Forwarded-For header chain
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const parts = forwardedFor.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (isValidIp(part)) {
        return part;
      }
    }
  }

  return '127.0.0.1';
}

/**
 * Obtains server-side cryptographic secret for HMAC hashing.
 * Secret is never exposed to the frontend browser.
 */
function getHmacSecret(): string {
  return (
    process.env.ANALYTICS_HMAC_SECRET ||
    process.env.SESSION_SECRET ||
    'toolforforever_privacy_hmac_secret_d4e8c1b9f0a23456789'
  );
}

/**
 * Creates a keyed HMAC-SHA256 hash of the normalized IP address.
 * Never stores or exposes raw IP addresses to ensure user privacy.
 */
export function hashVisitorIp(ip: string): string {
  const normalized = ip.trim().toLowerCase();
  const secret = getHmacSecret();
  return crypto.createHmac('sha256', secret).update(normalized).digest('hex');
}

/**
 * Produces a privacy-safe, human-readable masked identifier for dashboard display.
 * E.g., IPv4 "192.168.1.10" -> "192.168.***.***" or "vis_a1b2c3d4e5"
 */
export function getMaskedIpIdentifier(ip: string, visitorHash: string): string {
  const trimmed = ip.trim();
  // IPv4 masking: keep first two octets
  const ipv4Parts = trimmed.split('.');
  if (ipv4Parts.length === 4) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.***.***`;
  }
  // Fallback / IPv6: use visitor prefix
  return `vis_${visitorHash.slice(0, 10)}`;
}

/**
 * Sanitizes and validates incoming page path.
 * Excludes internal API endpoints, static assets, and manager routes.
 */
export function sanitizePath(rawPath: unknown): string | null {
  if (typeof rawPath !== 'string' || !rawPath) return null;
  const trimmed = rawPath.trim();

  // Must begin with a leading forward slash
  if (!trimmed.startsWith('/')) return null;

  // Max length check
  if (trimmed.length > 255) return null;

  // Exclude internal technical paths and management dashboards
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('/api/') ||
    lower.startsWith('/_next/') ||
    lower === '/favicon.ico' ||
    lower === '/robots.txt' ||
    lower === '/sitemap.xml' ||
    lower === '/manifest.webmanifest' ||
    lower.startsWith('/manager') || // Manager dashboard paths are excluded from visitor analytics
    lower.startsWith('/admin') // Admin dashboard paths are excluded from visitor analytics
  ) {
    return null;
  }

  // Strip harmful script or control characters
  const sanitized = trimmed.replace(/[<>"'`;]/g, '');
  return sanitized || null;
}

/**
 * Reporting timezone for visitor analytics (default: Asia/Kolkata).
 */
export const REPORTING_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns formatted calendar date 'YYYY-MM-DD' in the reporting timezone.
 */
export function getReportingDateString(
  date: Date | string | number,
  timeZone = REPORTING_TIMEZONE
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Checks whether a given timestamp occurred today according to reporting timezone boundaries.
 */
export function isTodayInReportingTimezone(
  date: Date | string | number,
  timeZone = REPORTING_TIMEZONE,
  referenceDate = new Date()
): boolean {
  const dateStr = getReportingDateString(date, timeZone);
  const todayStr = getReportingDateString(referenceDate, timeZone);
  return Boolean(dateStr && todayStr && dateStr === todayStr);
}

/**
 * Computes start and end Date boundaries (in UTC) for the calendar day in the given timezone.
 * For Asia/Kolkata (+05:30), 2026-10-11 00:00:00 IST corresponds to 2026-10-10 18:30:00 UTC.
 */
export function getReportingDayBounds(
  timeZone = REPORTING_TIMEZONE,
  referenceDate = new Date()
): { start: Date; end: Date; dateStr: string } {
  const dateStr = getReportingDateString(referenceDate, timeZone);
  let start: Date;
  let end: Date;

  if (timeZone === 'Asia/Kolkata') {
    start = new Date(`${dateStr}T00:00:00+05:30`);
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  } else {
    start = new Date(`${dateStr}T00:00:00Z`);
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  }

  return { start, end, dateStr };
}

/**
 * Sanitizes optional referrer URL.
 */
export function sanitizeReferrer(rawReferrer: unknown): string | undefined {
  if (typeof rawReferrer !== 'string' || !rawReferrer) return undefined;
  const trimmed = rawReferrer.trim();

  if (trimmed.length > 500) return undefined;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
    }
  } catch {
    // If not a full URL, ignore
  }

  return undefined;
}
