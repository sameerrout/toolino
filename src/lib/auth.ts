import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const DEFAULT_MANAGER_EMAILS = [
  'sameerrout2004@gmail.com',
  'sonysampangi9@gmail.com',
];

export function getAuthorizedManagerEmails(): string[] {
  if (process.env.MANAGER_EMAILS) {
    return process.env.MANAGER_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_MANAGER_EMAILS;
}

export function isManagerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const authorized = getAuthorizedManagerEmails();
  return authorized.some((mgr) => mgr.toLowerCase() === normalized);
}

const SESSION_COOKIE_NAME = 'toolino_session';

/**
 * Retrieves the cryptographic session secret from the environment.
 * Falls back to a deterministic application key if SESSION_SECRET is not yet set in Vercel environment variables.
 */
function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'toolino_session_sec_7f9c2d1b8e4a3f6095a12b3c4d5e6f708192a3b4c5d6e7f8';
  return secret;
}

export interface SessionData {
  id: string;
  email: string;
  name: string;
  picture?: string;
  isManager: boolean;
  iat: number;
  exp: number;
}

export function createSessionToken(user: { id: string; email: string; name: string; picture?: string }): string {
  const isManager = isManagerEmail(user.email);
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24 * 7; // 7 days

  const payload: SessionData = {
    id: user.id,
    email: user.email.toLowerCase(),
    name: user.name,
    picture: user.picture,
    isManager,
    iat: now,
    exp,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token: string | null | undefined): SessionData | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch (err) {
    console.error('Session verification aborted:', err);
    return null;
  }

  const [payloadBase64, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const json = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const data = JSON.parse(json) as SessionData;

    // Check expiration
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Always recompute isManager against authorized list
    data.isManager = isManagerEmail(data.email);

    return data;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireManagerSession(): Promise<SessionData | null> {
  const session = await getServerSession();
  if (!session || !isManagerEmail(session.email)) {
    return null;
  }
  return session;
}

export { SESSION_COOKIE_NAME };
