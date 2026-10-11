import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  cleanEnv,
  getGoogleDriveConfig,
  getDriveEnvDiagnostics,
  TARGET_GOOGLE_ACCOUNT,
  DEFAULT_FOLDER_NAME,
} from '@/lib/drive/googleDriveClient';
import {
  sanitizeDatabase,
  isGoogleDriveConfigured,
} from '@/lib/drive/driveStore';
import { GET as connectGetHandler } from '@/app/api/admin/drive-oauth/connect/route';
import { GET as callbackGetHandler } from '@/app/api/admin/drive-oauth/callback/route';
import { GET as statusGetHandler } from '@/app/api/admin/drive-oauth/status/route';

describe('Google Drive Exclusive Storage & OAuth Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;
    delete process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    delete process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    delete process.env.GOOGLE_DRIVE_FOLDER_NAME;
  });

  describe('1. Environment Variable Sanitation & Validation', () => {
    it('cleanEnv trims whitespace and removes wrapping double or single quotes', () => {
      expect(cleanEnv('  abc  ')).toBe('abc');
      expect(cleanEnv('"my_secret_token"')).toBe('my_secret_token');
      expect(cleanEnv("'my_single_quote_token'")).toBe('my_single_quote_token');
      expect(cleanEnv('  "my_spaced_token"  ')).toBe('my_spaced_token');
      expect(cleanEnv('')).toBe('');
      expect(cleanEnv(null)).toBe('');
      expect(cleanEnv(undefined)).toBe('');
    });

    it('returns null from getGoogleDriveConfig when credentials are missing', () => {
      expect(getGoogleDriveConfig()).toBeNull();
      expect(isGoogleDriveConfigured()).toBe(false);
    });

    it('successfully resolves config when all variables are provided', () => {
      process.env.GOOGLE_DRIVE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
      process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'GOCSPX-secret123';
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN = '1//04test_refresh_token';

      const cfg = getGoogleDriveConfig();
      expect(cfg).not.toBeNull();
      expect(cfg?.clientId).toBe('test-client-id.apps.googleusercontent.com');
      expect(cfg?.clientSecret).toBe('GOCSPX-secret123');
      expect(cfg?.refreshToken).toBe('1//04test_refresh_token');
      expect(cfg?.folderName).toBe(DEFAULT_FOLDER_NAME);
      expect(cfg?.targetAccount).toBe(TARGET_GOOGLE_ACCOUNT);
      expect(isGoogleDriveConfigured()).toBe(true);
    });

    it('automatically detects and corrects accidentally swapped Client ID and Secret', () => {
      // Intentionally swapped: Secret in Client ID field, Client ID in Secret field
      process.env.GOOGLE_DRIVE_CLIENT_ID = 'GOCSPX-secret123';
      process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'test-client-id.apps.googleusercontent.com';
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN = '1//04test_refresh_token';

      const cfg = getGoogleDriveConfig();
      expect(cfg).not.toBeNull();
      expect(cfg?.clientId).toBe('test-client-id.apps.googleusercontent.com');
      expect(cfg?.clientSecret).toBe('GOCSPX-secret123');
    });

    it('returns accurate diagnostics without exposing secret values', () => {
      process.env.GOOGLE_DRIVE_CLIENT_ID = '12345.apps.googleusercontent.com';

      const diagnostics = getDriveEnvDiagnostics();
      expect(diagnostics.hasClientId).toBe(true);
      expect(diagnostics.hasClientSecret).toBe(false);
      expect(diagnostics.hasRefreshToken).toBe(false);
      expect(diagnostics.clientIdFormat).toBe('valid_google_client_id');
      expect(diagnostics.targetAccount).toBe(TARGET_GOOGLE_ACCOUNT);
    });
  });

  describe('2. Schema Sanitization & Defaults', () => {
    it('sanitizes empty or corrupted database input to default structure', () => {
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
        toolUsage: { 'merge-pdf': 5 },
        events: [],
        contactMessages: [],
        visits: [],
      };
      const sanitized = sanitizeDatabase(input);
      expect(sanitized.users.length).toBe(1);
      expect(sanitized.toolUsage['merge-pdf']).toBe(5);
    });
  });

  describe('3. OAuth Connect Endpoint (/api/admin/drive-oauth/connect)', () => {
    it('returns an informative diagnostic HTML page when Client ID is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/drive-oauth/connect');
      const res = await connectGetHandler(req);

      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('Missing GOOGLE_DRIVE_CLIENT_ID at Runtime');
      expect(html).toContain('sameerrout2004@gmail.com');
      expect(html).toContain('ToolForForever_Data');
      expect(html).toContain('https://www.toolforforever.com/api/admin/drive-oauth/callback');
    });

    it('redirects to Google Accounts OAuth with CSRF state cookie when Client ID is configured', async () => {
      process.env.GOOGLE_DRIVE_CLIENT_ID = '12345.apps.googleusercontent.com';
      process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'GOCSPX-secret123';

      const req = new NextRequest('http://localhost:3000/api/admin/drive-oauth/connect');
      const res = await connectGetHandler(req);

      expect(res.status).toBe(307); // Redirect to accounts.google.com
      const location = res.headers.get('location');
      expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(location).toContain('client_id=12345.apps.googleusercontent.com');
      expect(location).toContain('access_type=offline');
      expect(location).toContain('prompt=consent');
      expect(location).toContain('state=');

      // Check CSRF state cookie
      const cookies = res.cookies.get('tff_oauth_state');
      expect(cookies).toBeDefined();
      expect(cookies?.value.length).toBe(64); // 32 bytes hex
    });
  });

  describe('4. OAuth Callback Endpoint CSRF Protection', () => {
    it('rejects callback with 403 when OAuth state cookie does not match', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/admin/drive-oauth/callback?code=mock_code&state=forged_state',
        {
          headers: {
            cookie: 'tff_oauth_state=genuine_state',
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
        'http://localhost:3000/api/admin/drive-oauth/callback?error=access_denied'
      );
      const res = await callbackGetHandler(req);
      const html = await res.text();
      expect(html).toContain('Authorization Cancelled or Denied');
    });
  });

  describe('5. Drive Health Status Endpoint (/api/admin/drive-oauth/status)', () => {
    it('returns unconfigured status when credentials are not set', async () => {
      const res = await statusGetHandler();
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.configured).toBe(false);
      expect(json.connected).toBe(false);
      expect(json.folderName).toBe('ToolForForever_Data');
      expect(json.targetAccount).toBe('sameerrout2004@gmail.com');
      expect(json.hasClientId).toBe(false);
      expect(json.hasClientSecret).toBe(false);
      expect(json.hasRefreshToken).toBe(false);
    });
  });
});
