import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  registerEmailUser,
  authenticateEmailUser,
  createPasswordResetToken,
  verifyResetToken,
  resetPasswordWithToken,
  deleteUserById,
  deleteUserByEmail,
  getDb,
  saveDb,
} from '@/lib/db';
import { createSessionToken, verifySessionToken } from '@/lib/auth';

describe('Authentication & Password Hashing', () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = 'test-session-secret-for-vitest-32-chars-long!!';
  });

  beforeEach(() => {
    // Clear test state
    const db = getDb();
    db.users = db.users.filter((u) => !u.email.endsWith('@test-auth.com'));
    saveDb(db);
  });

  afterAll(() => {
    // Clean up test users and events after test suite completes
    const db = getDb();
    db.users = db.users.filter((u) => !u.email.endsWith('@test-auth.com'));
    db.events = db.events.filter((e) => !e.email || !e.email.endsWith('@test-auth.com'));
    saveDb(db);
  });

  it('securely hashes passwords with salt and verifies correctly', () => {
    const password = 'SuperSecretPassword123!';
    const hash = hashPassword(password);

    expect(hash).toContain(':');
    expect(hash).not.toBe(password);

    // Verify true for matching password
    expect(verifyPassword(password, hash)).toBe(true);

    // Verify false for incorrect password
    expect(verifyPassword('WrongPassword123!', hash)).toBe(false);
  });

  it('registers new users and prevents duplicate email registration', () => {
    const testEmail = 'john.doe@test-auth.com';
    const regResult = registerEmailUser(testEmail, 'password123', 'John Doe');

    expect(regResult.error).toBeUndefined();
    expect(regResult.user).toBeDefined();
    expect(regResult.user?.email).toBe(testEmail);
    expect(regResult.user?.passwordHash).toBeDefined();
    expect(regResult.user?.passwordHash).not.toBe('password123');

    // Duplicate registration attempt
    const dupResult = registerEmailUser(testEmail, 'anotherPassword');
    expect(dupResult.user).toBeUndefined();
    expect(dupResult.error).toBe('An account with this email already exists.');
  });

  it('authenticates valid users and rejects invalid credentials', () => {
    const testEmail = 'alice@test-auth.com';
    registerEmailUser(testEmail, 'securePass789', 'Alice');

    // Successful login
    const loginOk = authenticateEmailUser(testEmail, 'securePass789');
    expect(loginOk.error).toBeUndefined();
    expect(loginOk.user?.email).toBe(testEmail);

    // Wrong password
    const loginFail = authenticateEmailUser(testEmail, 'wrongPassword');
    expect(loginFail.user).toBeUndefined();
    expect(loginFail.error).toBe('Invalid email or password.');

    // Non-existent user
    const noUser = authenticateEmailUser('nobody@test-auth.com', 'securePass789');
    expect(noUser.user).toBeUndefined();
    expect(noUser.error).toBe('Invalid email or password.');
  });

  it('creates and verifies cryptographically signed session tokens', () => {
    const mockUser = {
      id: 'usr_test_123',
      email: 'session.user@test-auth.com',
      name: 'Session User',
    };

    const token = createSessionToken(mockUser);
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(2);

    const verified = verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(mockUser.id);
    expect(verified?.email).toBe(mockUser.email);

    // Tampered token must fail verification
    const tampered = token.slice(0, -4) + 'abcd';
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it('handles forgot password token creation, validation, and resetting', () => {
    const testEmail = 'bob@test-auth.com';
    registerEmailUser(testEmail, 'initialPassword123', 'Bob');

    // Request reset token
    const tokenResult = createPasswordResetToken(testEmail);
    expect(tokenResult.success).toBe(true);
    expect(tokenResult.token).toBeDefined();

    const resetToken = tokenResult.token!;

    // Verify token
    const verifyResult = verifyResetToken(resetToken);
    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.email).toBe(testEmail);

    // Reset password with new password
    const resetResult = resetPasswordWithToken(resetToken, 'newPassword456!');
    expect(resetResult.success).toBe(true);

    // Old password should now fail
    const oldLogin = authenticateEmailUser(testEmail, 'initialPassword123');
    expect(oldLogin.user).toBeUndefined();

    // New password should now succeed
    const newLogin = authenticateEmailUser(testEmail, 'newPassword456!');
    expect(newLogin.user).toBeDefined();
    expect(newLogin.user?.email).toBe(testEmail);
  });

  it('permanently deletes a registered member and prevents login', () => {
    const testEmail = 'deleteme@test-auth.com';
    const reg = registerEmailUser(testEmail, 'password123', 'To Be Deleted');
    expect(reg.user).toBeDefined();

    const dbBefore = getDb();
    expect(dbBefore.users.some((u) => u.email === testEmail)).toBe(true);

    // Delete user
    const deleteResult = deleteUserById(reg.user!.id);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.user?.email).toBe(testEmail);

    // User must be removed from DB
    const dbAfter = getDb();
    expect(dbAfter.users.some((u) => u.email === testEmail)).toBe(false);

    // Member deleted event must be recorded in Recent Activity
    const deleteEvent = dbAfter.events.find((e) => e.type === 'member_delete' && e.email === testEmail);
    expect(deleteEvent).toBeDefined();

    // User must no longer be able to log in
    const loginAttempt = authenticateEmailUser(testEmail, 'password123');
    expect(loginAttempt.user).toBeUndefined();
    expect(loginAttempt.error).toBe('Invalid email or password.');
  });

  it('protects manager accounts from being deleted', () => {
    // Attempting to delete authorized manager
    const managerResult = deleteUserByEmail('sameerrout2004@gmail.com');
    expect(managerResult.success).toBe(false);
    expect(managerResult.error).toContain('Cannot delete an authorized manager account');
  });
});
