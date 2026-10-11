import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  cleanEnv,
  resolveServerEnv,
  getGmailStorageConfig,
  getGmailEnvDiagnostics,
  buildRfc2822Message,
  TARGET_GMAIL_ACCOUNT,
  GMAIL_STORAGE_LABELS,
} from '@/lib/gmail/gmailClient';
import {
  sanitizeDatabase,
  isGmailStorageConfigured,
} from '@/lib/gmail/gmailStore';
import {
  registerEmailUser,
  authenticateEmailUser,
  hashPassword,
  verifyPassword,
} from '@/lib/db';
import { GET as connectGetHandler } from '@/app/api/admin/gmail-oauth/connect/route';
import { GET as callbackGetHandler } from '@/app/api/admin/gmail-oauth/callback/route';
import { GET as statusGetHandler } from '@/app/api/admin/gmail-oauth/status/route';

describe('ToolForForever - Gmail API Storage & Auth Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GMAIL_STORAGE_CLIENT_ID;
    delete process.env['GMAIL_STORAGE_CLIENT_ID '];
    delete process.env.GMAIL_STORAGE_CLIENT_SECRET;
    delete process.env.GMAIL_STORAGE_REFRESH_TOKEN;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;
    delete process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    delete process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  });

  describe('1. Environment Variable Sanitation & Resilient Resolution', () => {
    it('cleanEnv trims whitespace and removes wrapping double or single quotes', () => {
      expect(cleanEnv('  abc  ')).toBe('abc');
      expect(cleanEnv('"my_secret_token"')).toBe('my_secret_token');
      expect(cleanEnv("'my_single_quote_token'")).toBe('my_single_quote_token');
      expect(cleanEnv('  "my_spaced_token"  ')).toBe('my_spaced_token');
      expect(cleanEnv('')).toBe('');
      expect(cleanEnv(null)).toBe('');
      expect(cleanEnv(undefined)).toBe('');
    });

    it('resolveServerEnv resiliently handles trailing whitespace in key names', () => {
      process.env['GMAIL_STORAGE_CLIENT_ID '] = 'test-id.apps.googleusercontent.com';
      const resolved = resolveServerEnv(['GMAIL_STORAGE_CLIENT_ID']);
      expect(resolved).not.toBeNull();
      expect(resolved?.value).toBe('test-id.apps.googleusercontent.com');
    });

    it('returns null from getGmailStorageConfig when credentials are missing', () => {
      expect(getGmailStorageConfig()).toBeNull();
      expect(isGmailStorageConfigured()).toBe(false);
    });

    it('successfully resolves config when all variables are validly provided', () => {
      process.env.GMAIL_STORAGE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
      process.env.GMAIL_STORAGE_CLIENT_SECRET = 'GOCSPX-secret1234567890123456';
      process.env.GMAIL_STORAGE_REFRESH_TOKEN = '1//04test_refresh_token';

      const cfg = getGmailStorageConfig();
      expect(cfg).not.toBeNull();
      expect(cfg?.clientId).toBe('test-client-id.apps.googleusercontent.com');
      expect(cfg?.clientSecret).toBe('GOCSPX-secret1234567890123456');
      expect(cfg?.refreshToken).toBe('1//04test_refresh_token');
      expect(cfg?.targetAccount).toBe(TARGET_GMAIL_ACCOUNT);
      expect(isGmailStorageConfigured()).toBe(true);
    });

    it('validates swapped credentials safely without auto-modifying them', () => {
      // Swapped format: secret in client ID field, client ID in secret field
      process.env.GMAIL_STORAGE_CLIENT_ID = 'GOCSPX-secret123';
      process.env.GMAIL_STORAGE_CLIENT_SECRET = 'test-client-id.apps.googleusercontent.com';
      process.env.GMAIL_STORAGE_REFRESH_TOKEN = '1//04test_refresh_token';

      const cfg = getGmailStorageConfig();
      expect(cfg).toBeNull(); // Should NOT use swapped credentials

      const diagnostics = getGmailEnvDiagnostics();
      expect(diagnostics.validationPassed).toBe(false);
      expect(diagnostics.clientIdFormat).toBe('looks_like_secret');
      expect(diagnostics.clientSecretFormat).toBe('looks_like_client_id');
      expect(diagnostics.validationErrors.length).toBeGreaterThan(0);
      expect(diagnostics.validationErrors[0]).toContain('GOCSPX-');
    });

    it('returns accurate diagnostics without exposing secret values', () => {
      process.env.GMAIL_STORAGE_CLIENT_ID = '12345.apps.googleusercontent.com';

      const diagnostics = getGmailEnvDiagnostics();
      expect(diagnostics.hasClientId).toBe(true);
      expect(diagnostics.hasClientSecret).toBe(false);
      expect(diagnostics.hasRefreshToken).toBe(false);
      expect(diagnostics.clientIdFormat).toBe('valid_google_client_id');
      expect(diagnostics.targetAccount).toBe(TARGET_GMAIL_ACCOUNT);
      expect(diagnostics.deployment).toBeDefined();
    });
  });

  describe('2. RFC 2822 Message & Label Specifications', () => {
    it('builds RFC 2822 message with safe CRLF headers and base64url encoding', () => {
      const encoded = buildRfc2822Message({
        to: TARGET_GMAIL_ACCOUNT,
        from: 'ToolForForever <noreply@toolforforever.com>',
        subject: '[ToolForForever:User] test_123',
        body: JSON.stringify({ hello: 'world' }),
        customHeaders: {
          'X-TFF-Record-Type': 'user',
        },
      });

      expect(typeof encoded).toBe('string');
      const decoded = Buffer.from(encoded, 'base64url').toString('utf-8');
      expect(decoded).toContain(`To: ${TARGET_GMAIL_ACCOUNT}`);
      expect(decoded).toContain('Subject: [ToolForForever:User] test_123');
      expect(decoded).toContain('X-TFF-Record-Type: user');
      expect(decoded).toContain('{"hello":"world"}');
    });

    it('all 7 required ToolForForever labels are defined', () => {
      expect(GMAIL_STORAGE_LABELS.USERS).toBe('ToolForForever/Users');
      expect(GMAIL_STORAGE_LABELS.VISITS).toBe('ToolForForever/Visits');
      expect(GMAIL_STORAGE_LABELS.TOOL_USAGE).toBe('ToolForForever/ToolUsage');
      expect(GMAIL_STORAGE_LABELS.ACTIVITY).toBe('ToolForForever/Activity');
      expect(GMAIL_STORAGE_LABELS.CONTACT).toBe('ToolForForever/Contact');
      expect(GMAIL_STORAGE_LABELS.METADATA).toBe('ToolForForever/Metadata');
      expect(GMAIL_STORAGE_LABELS.BACKUPS).toBe('ToolForForever/Backups');
    });
  });

  describe('3. Schema Sanitization & Defaults', () => {
    it('sanitizes null or empty input to valid INITIAL_DATABASE schema', () => {
      const sanitized = sanitizeDatabase(null);
      expect(sanitized.users).toEqual([]);
      expect(sanitized.visits).toEqual([]);
      expect(sanitized.contactMessages).toEqual([]);
      expect(sanitized.events).toEqual([]);
      expect(sanitized.toolUsage).toEqual({});
    });

    it('preserves valid database arrays and tool usage objects', () => {
      const input = {
        users: [{ id: 'u1', email: 'test@example.com', name: 'Test', role: 'user' as const, authProvider: 'email' as const, createdAt: '', lastLoginAt: '' }],
        toolUsage: { 'merge-pdf': 10 },
        events: [],
        contactMessages: [],
        visits: [],
      };
      const sanitized = sanitizeDatabase(input);
      expect(sanitized.users.length).toBe(1);
      expect(sanitized.toolUsage['merge-pdf']).toBe(10);
    });
  });

  describe('4. User Registration, Authentication & Hashing', () => {
    it('hashes passwords securely and verifies them accurately', () => {
      const password = 'StrongPassword123!';
      const hash = hashPassword(password);
      expect(hash).toContain(':');
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword('WrongPassword', hash)).toBe(false);
    });

    it('validates and normalizes email during user registration', () => {
      const result = registerEmailUser('  TEST.USER@example.COM  ', 'ValidPass123', 'Test User');
      if (result.user) {
        expect(result.user.email).toBe('test.user@example.com');
      } else {
        // If user already exists in test db, rejection is expected
        expect(result.error).toContain('already exists');
      }
    });

    it('rejects duplicate email registrations', () => {
      const first = registerEmailUser('duplicate@example.com', 'Pass123456');
      if (first.user) {
        const second = registerEmailUser('duplicate@example.com', 'AnotherPass');
        expect(second.error).toContain('already exists');
      }
    });

    it('authenticates valid email users and rejects incorrect passwords', () => {
      registerEmailUser('auth_test@example.com', 'SecurePass123');
      const validAuth = authenticateEmailUser('auth_test@example.com', 'SecurePass123');
      expect(validAuth.user).toBeDefined();

      const invalidAuth = authenticateEmailUser('auth_test@example.com', 'WrongPass');
      expect(invalidAuth.user).toBeUndefined();
      expect(invalidAuth.error).toContain('Invalid');
    });
  });

  describe('5. Gmail OAuth Connect Endpoint (/api/admin/gmail-oauth/connect)', () => {
    it('returns an informative diagnostic HTML page when Client ID is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/gmail-oauth/connect');
      const res = await connectGetHandler(req);

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Gmail API Storage Credentials Check');
      expect(html).toContain(TARGET_GMAIL_ACCOUNT);
      expect(html).toContain('ToolForForever/*');
      expect(html).toContain('https://www.toolforforever.com/api/admin/gmail-oauth/callback');
      expect(html).toContain('Active Production Deployment Metadata');
    });

    it('redirects to Google Accounts OAuth with CSRF state cookie when Client ID is configured', async () => {
      process.env.GMAIL_STORAGE_CLIENT_ID = '12345.apps.googleusercontent.com';
      process.env.GMAIL_STORAGE_CLIENT_SECRET = 'GOCSPX-secret1234567890';

      const req = new NextRequest('http://localhost:3000/api/admin/gmail-oauth/connect');
      const res = await connectGetHandler(req);

      expect(res.status).toBe(307); // Redirect to accounts.google.com
      const location = res.headers.get('location');
      expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(location).toContain('client_id=12345.apps.googleusercontent.com');
      expect(location).toContain('access_type=offline');
      expect(location).toContain('prompt=consent');
      expect(location).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.modify');
      expect(location).toContain(`login_hint=${encodeURIComponent(TARGET_GMAIL_ACCOUNT)}`);

      // Check CSRF state cookie
      const cookies = res.cookies.get('tff_gmail_oauth_state');
      expect(cookies).toBeDefined();
      expect(cookies?.value.length).toBe(64); // 32 bytes hex
    });
  });

  describe('6. Gmail OAuth Callback Endpoint CSRF Protection', () => {
    it('rejects callback with 403 when OAuth state cookie does not match', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/gmail-oauth/callback?code=mock_code&state=forged_state',
        {
          headers: {
            cookie: 'tff_gmail_oauth_state=genuine_state',
          },
        }
      );

      const envRecord = process.env as Record<string, string | undefined>;
      const prevNodeEnv = envRecord.NODE_ENV;
      envRecord.NODE_ENV = 'production';
      try {
        const res = await callbackGetHandler(req);
        expect(res.status).toBe(403);
        const html = await res.text();
        expect(html).toContain('OAuth State Validation Failed');
      } finally {
        envRecord.NODE_ENV = prevNodeEnv;
      }
    });

    it('handles Google authorization denial gracefully', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/gmail-oauth/callback?error=access_denied'
      );
      const res = await callbackGetHandler(req);
      const html = await res.text();
      expect(html).toContain('Authorization Cancelled or Denied');
    });
  });

  describe('7. Gmail Storage Security Protection & Identity Verification', () => {
    it('rejects callback with 403 when authenticated Google account does not match sameerrout2006@gmail.com', async () => {
      const originalFetch = global.fetch;
      // Mock Google token exchange returning tokens
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return {
            ok: true,
            json: async () => ({
              access_token: 'mock_access_token',
              refresh_token: 'mock_refresh_token',
            }),
          };
        }
        if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
          // Returning wrong email
          return {
            ok: true,
            json: async () => ({
              email: 'attacker@evil.com',
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      }) as unknown as typeof fetch;

      try {
        const req = new NextRequest(
          'http://localhost:3000/api/admin/gmail-oauth/callback?code=mock_code&state=valid_state',
          {
            headers: {
              cookie: 'tff_gmail_oauth_state=valid_state',
            },
          }
        );
        const res = await callbackGetHandler(req);
        expect(res.status).toBe(403);
        const html = await res.text();
        expect(html).toContain('Access Denied: Account Mismatch');
        expect(html).toContain(TARGET_GMAIL_ACCOUNT);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('masks refresh token and prompts for Manager Dashboard when not manager-authenticated', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return {
            ok: true,
            json: async () => ({
              access_token: 'mock_access_token',
              refresh_token: 'mock_sensitive_refresh_token_123',
            }),
          };
        }
        if (url.includes('googleapis.com/oauth2/v2/userinfo')) {
          return {
            ok: true,
            json: async () => ({
              email: TARGET_GMAIL_ACCOUNT,
            }),
          };
        }
        if (url.includes('labels')) {
          return {
            ok: true,
            json: async () => ({ labels: [] }),
          };
        }
        return { ok: true, json: async () => ({}) };
      }) as unknown as typeof fetch;

      try {
        const req = new NextRequest(
          'http://localhost:3000/api/admin/gmail-oauth/callback?code=mock_code&state=valid_state',
          {
            headers: {
              cookie: 'tff_gmail_oauth_state=valid_state',
            },
          }
        );
        const res = await callbackGetHandler(req);
        expect(res.status).toBe(200);
        const html = await res.text();
        // Sensitive token must NOT be directly exposed to unauthorized callers
        expect(html).not.toContain('mock_sensitive_refresh_token_123');
        expect(html).toContain('Security Notice:');
        expect(html).toContain('Manager Dashboard');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('8. Gmail Storage Health Status Endpoint (/api/admin/gmail-oauth/status)', () => {
    it('returns unconfigured status when credentials are not set', async () => {
      const res = await statusGetHandler();
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.configured).toBe(false);
      expect(json.connected).toBe(false);
      expect(json.targetAccount).toBe(TARGET_GMAIL_ACCOUNT);
      expect(json.hasClientId).toBe(false);
      expect(json.hasClientSecret).toBe(false);
      expect(json.hasRefreshToken).toBe(false);
      expect(json.deployment).toBeDefined();
    });
  });
});
