import { describe, it, expect, beforeEach } from 'vitest';
import { readDb, writeDb, clearDb } from '@/lib/db';
import {
  generateSalt,
  hashPasswordPBKDF2,
  registerClientUser,
  loginClientUser,
  setSession,
  getSession,
  clearSession,
  isManagerEmail,
} from '@/lib/auth';

describe('Hardened Client Authentication & Web Crypto DB Suite', () => {
  beforeEach(() => {
    clearDb();
    // Clear localStorage mock
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  it('generates random hex salt and hashes password with PBKDF2 (100,000 iterations)', async () => {
    const salt = generateSalt();
    expect(salt).toBeDefined();
    expect(typeof salt).toBe('string');
    expect(salt.length).toBe(32); // 16 bytes = 32 hex chars

    const pass = 'MySuperSecurePass123!';
    const hash1 = await hashPasswordPBKDF2(pass, salt);
    const hash2 = await hashPasswordPBKDF2(pass, salt);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // 256 bits = 64 hex chars

    // Different salt yields different hash
    const otherSalt = generateSalt();
    const otherHash = await hashPasswordPBKDF2(pass, otherSalt);
    expect(otherHash).not.toBe(hash1);
  });

  it('registers a new client user and establishes active session', async () => {
    const res = await registerClientUser({
      name: 'Test Member',
      email: 'member@test.com',
      password: 'StrongPassword123!',
    });

    expect(res.ok).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.email).toBe('member@test.com');
    expect(res.user?.name).toBe('Test Member');
    expect(res.user?.role).toBe('user');

    // Verify session was set
    const session = getSession();
    expect(session).toBeDefined();
    expect(session?.email).toBe('member@test.com');

    // Duplicate registration should fail
    const dup = await registerClientUser({
      name: 'Duplicate',
      email: 'member@test.com',
      password: 'StrongPassword123!',
    });
    expect(dup.ok).toBe(false);
    expect(dup.error).toContain('already exists');
  });

  it('authenticates valid credentials and rejects incorrect passwords', async () => {
    await registerClientUser({
      name: 'Login User',
      email: 'login@test.com',
      password: 'CorrectPassword123!',
    });

    // Valid login
    const valid = await loginClientUser('login@test.com', 'CorrectPassword123!');
    expect(valid.ok).toBe(true);
    expect(valid.user?.email).toBe('login@test.com');

    // Invalid password
    const invalid = await loginClientUser('login@test.com', 'WrongPassword!');
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toBe('Invalid email or password.');

    // Non-existent user
    const nonExistent = await loginClientUser('ghost@test.com', 'AnyPassword123!');
    expect(nonExistent.ok).toBe(false);
    expect(nonExistent.error).toBe('Invalid email or password.');
  });

  it('correctly sets, retrieves, and clears local session state', () => {
    const mockUser = {
      id: 'usr_abc',
      name: 'Session Guy',
      email: 'guy@test.com',
      role: 'user' as const,
      createdAt: new Date().toISOString(),
    };

    setSession(mockUser);
    const active = getSession();
    expect(active?.id).toBe('usr_abc');
    expect(active?.email).toBe('guy@test.com');

    clearSession();
    expect(getSession()).toBeNull();
  });

  it('assigns manager role for authorized manager emails', async () => {
    expect(isManagerEmail('sameerrout2004@gmail.com')).toBe(true);
    expect(isManagerEmail('someoneelse@gmail.com')).toBe(false);

    const mgr = await registerClientUser({
      name: 'Sameer Manager',
      email: 'sameerrout2004@gmail.com',
      password: 'ManagerPassword123!',
    });

    expect(mgr.ok).toBe(true);
    expect(mgr.user?.role).toBe('manager');
  });

  it('defensively caps writeDb logs to prevent localStorage quota overflow', () => {
    // Fill pageviews with more than 500 items
    writeDb((draft) => {
      for (let i = 0; i < 600; i++) {
        draft.pageviews.push({
          path: `/tool-${i}`,
          timestamp: new Date().toISOString(),
          visitorId: `vid_${i}`,
        });
      }
    });

    const db = readDb();
    expect(db.pageviews.length).toBeLessThanOrEqual(500);
  });
});
