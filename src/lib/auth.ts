import { readDb, writeDb, UserRecord } from './db';

const SESSION_KEY = 'toolino_active_session';

export const DEFAULT_MANAGER_EMAILS = [
  'sameerrout2004@gmail.com',
  'sonysampangi9@gmail.com',
];

export function isManagerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return DEFAULT_MANAGER_EMAILS.some((mgr) => mgr.toLowerCase() === normalized);
}

function getStorage(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (k: string) => ((globalThis as unknown as Record<string, string>)[`__mem_${k}`] ?? null),
    setItem: (k: string, v: string) => { (globalThis as unknown as Record<string, string>)[`__mem_${k}`] = v; },
    removeItem: (k: string) => { delete (globalThis as unknown as Record<string, string>)[`__mem_${k}`]; },
  };
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(bytes);
  }
  return bufferToHex(bytes.buffer);
}

export async function hashPasswordPBKDF2(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const subtle =
    typeof window !== 'undefined' && window.crypto?.subtle
      ? window.crypto.subtle
      : (globalThis.crypto?.subtle ?? (await import('crypto')).webcrypto.subtle);

  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(saltHex),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bufferToHex(derivedBits);
}

export async function registerClientUser(params: {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'manager';
}): Promise<{ ok: boolean; error?: string; user?: Omit<UserRecord, 'passwordHash' | 'salt'> }> {
  const email = params.email.trim().toLowerCase();
  if (!email || params.password.length < 8) {
    return { ok: false, error: 'Valid email and a password of at least 8 characters are required.' };
  }
  const db = readDb();
  if (db.users.some((u) => u.email === email)) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const salt = generateSalt();
  const passwordHash = await hashPasswordPBKDF2(params.password, salt);
  const role = params.role ?? (isManagerEmail(email) ? 'manager' : 'user');
  const newUser: UserRecord = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr_${Date.now()}`,
    name: params.name.trim(),
    email,
    passwordHash,
    salt,
    role,
    createdAt: new Date().toISOString(),
  };
  writeDb((draft) => {
    draft.users.push(newUser);
  });
  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  setSession(safeUser);
  return { ok: true, user: safeUser };
}

export async function loginClientUser(emailInput: string, passwordInput: string) {
  const email = emailInput.trim().toLowerCase();
  const db = readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user) {
    return { ok: false, error: 'Invalid email or password.' };
  }
  const computedHash = await hashPasswordPBKDF2(passwordInput, user.salt);
  if (computedHash !== user.passwordHash) {
    return { ok: false, error: 'Invalid email or password.' };
  }
  const now = new Date().toISOString();
  writeDb((draft) => {
    const target = draft.users.find((u) => u.id === user.id);
    if (target) target.lastLoginAt = now;
    draft.logins.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `login_${Date.now()}`,
      email: user.email,
      role: user.role,
      timestamp: now,
    });
  });
  const { passwordHash: _, salt: __, ...safeUser } = user;
  setSession(safeUser);
  return { ok: true, user: safeUser };
}

export function setSession(user: Omit<UserRecord, 'passwordHash' | 'salt'>) {
  const storage = getStorage();
  storage.setItem(
    SESSION_KEY,
    JSON.stringify({
      user,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7-day expiry
    })
  );
}

export function getSession(): Omit<UserRecord, 'passwordHash' | 'salt'> | null {
  try {
    const storage = getStorage();
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      storage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed.user;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  const storage = getStorage();
  storage.removeItem(SESSION_KEY);
}
