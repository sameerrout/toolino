/**
 * ToolForForever - Gmail API Storage Client
 * 
 * Provides secure server-side OAuth authentication, automated label provisioning,
 * and structured JSON record storage inside Gmail messages for ToolForForever.
 * 
 * Target Google Account: sameerrout2006@gmail.com
 * Dedicated Labels:
 *   - ToolForForever/Users
 *   - ToolForForever/Visits
 *   - ToolForForever/ToolUsage
 *   - ToolForForever/Activity
 *   - ToolForForever/Contact
 *   - ToolForForever/Metadata
 *   - ToolForForever/Backups
 */

import crypto from 'node:crypto';

export interface GmailStorageConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  targetAccount: string;
}

export interface GmailRecordMessage<T = unknown> {
  schemaVersion: number;
  recordType: 'user' | 'visit' | 'tool_usage' | 'activity' | 'contact' | 'metadata' | 'backup';
  recordId: string;
  createdAt: string;
  updatedAt: string;
  checksum: string;
  payload: T;
}

export interface CredentialProbeResult {
  tested: boolean;
  accepted: boolean;
  statusCode?: number;
  message: string;
}

export interface GmailStorageStatus {
  configured: boolean;
  connected: boolean;
  targetAccount: string;
  lastChecked: string;
  hasClientId: boolean;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  clientIdFormat: 'valid_google_client_id' | 'looks_like_secret' | 'unknown' | 'missing';
  clientSecretFormat: 'valid_secret' | 'looks_like_client_id' | 'unknown' | 'missing';
  refreshTokenFormat: 'valid_refresh_token_format' | 'unknown' | 'missing';
  validationPassed: boolean;
  validationErrors: string[];
  labelsFound: string[];
  deployment: {
    commitSha: string;
    commitMessage: string;
    vercelEnv: string;
    vercelUrl: string;
    vercelRegion: string;
    nodeVersion: string;
    serverTime: string;
  };
  detectedGoogleEnvKeys: Array<{ key: string; length: number }>;
  probeResult?: CredentialProbeResult;
  error?: string;
}

export const TARGET_GMAIL_ACCOUNT = 'sameerrout2006@gmail.com';

export const GMAIL_STORAGE_LABELS = {
  USERS: 'ToolForForever/Users',
  VISITS: 'ToolForForever/Visits',
  TOOL_USAGE: 'ToolForForever/ToolUsage',
  ACTIVITY: 'ToolForForever/Activity',
  CONTACT: 'ToolForForever/Contact',
  METADATA: 'ToolForForever/Metadata',
  BACKUPS: 'ToolForForever/Backups',
} as const;

export type GmailStorageLabelKey = keyof typeof GMAIL_STORAGE_LABELS;

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Cache access token and label IDs across warm serverless lambdas
const globalForGmail = globalThis as unknown as {
  __gmail_access_token__?: string;
  __gmail_token_expires_at__?: number;
  __gmail_labels_map__?: Record<string, string>;
};

/**
 * Strips wrapping quotes, trailing whitespace, and normalizes environment strings.
 */
export function cleanEnv(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  let trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Resilient server-side environment variable resolver.
 * 1. Checks candidate key names in exact casing.
 * 2. If not found, scans process.env for normalized keys (handling trailing spaces,
 *    leading spaces, casing variations, or common naming conventions).
 * 3. Never leaks secret values; returns only cleaned strings.
 */
export function resolveServerEnv(candidateKeys: string[]): { key: string; value: string } | null {
  // 1. Direct exact lookup
  for (const key of candidateKeys) {
    if (process.env[key] !== undefined && process.env[key] !== '') {
      const cleaned = cleanEnv(process.env[key]);
      if (cleaned) {
        return { key, value: cleaned };
      }
    }
  }

  // 2. Fuzzy match across all process.env keys (stripping spaces, symbols, and comparing uppercase)
  const normalizedTargets = new Map<string, string>();
  for (const k of candidateKeys) {
    normalizedTargets.set(k.toUpperCase().replace(/[^A-Z0-9]/g, ''), k);
  }

  for (const [actualKey, actualValue] of Object.entries(process.env)) {
    if (!actualValue || typeof actualValue !== 'string') continue;
    const norm = actualKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalizedTargets.has(norm)) {
      const cleaned = cleanEnv(actualValue);
      if (cleaned) {
        return { key: actualKey, value: cleaned };
      }
    }
  }

  return null;
}

/**
 * Diagnostic helper that checks variable presence, formatting, and validation
 * without exposing secret values.
 */
export function getGmailEnvDiagnostics() {
  const clientIdMatch = resolveServerEnv([
    'GMAIL_STORAGE_CLIENT_ID',
    'GMAIL_CLIENT_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_DRIVE_CLIENT_ID',
    'NEXT_PUBLIC_GMAIL_STORAGE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  ]);

  const clientSecretMatch = resolveServerEnv([
    'GMAIL_STORAGE_CLIENT_SECRET',
    'GMAIL_CLIENT_SECRET',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_DRIVE_CLIENT_SECRET',
  ]);

  const refreshTokenMatch = resolveServerEnv([
    'GMAIL_STORAGE_REFRESH_TOKEN',
    'GMAIL_REFRESH_TOKEN',
    'GOOGLE_DRIVE_REFRESH_TOKEN',
  ]);

  const rawClientId = clientIdMatch ? clientIdMatch.value : '';
  const rawClientSecret = clientSecretMatch ? clientSecretMatch.value : '';
  const rawRefreshToken = refreshTokenMatch ? refreshTokenMatch.value : '';

  // Format analysis
  let clientIdFormat: 'valid_google_client_id' | 'looks_like_secret' | 'unknown' | 'missing' = 'missing';
  if (rawClientId) {
    if (rawClientId.includes('.apps.googleusercontent.com') || rawClientId.includes('.googleusercontent.com')) {
      clientIdFormat = 'valid_google_client_id';
    } else if (rawClientId.startsWith('GOCSPX-')) {
      clientIdFormat = 'looks_like_secret';
    } else {
      clientIdFormat = 'unknown';
    }
  }

  let clientSecretFormat: 'valid_secret' | 'looks_like_client_id' | 'unknown' | 'missing' = 'missing';
  if (rawClientSecret) {
    if (rawClientSecret.includes('.apps.googleusercontent.com') || rawClientSecret.includes('.googleusercontent.com')) {
      clientSecretFormat = 'looks_like_client_id';
    } else if (rawClientSecret.startsWith('GOCSPX-') || rawClientSecret.length >= 20) {
      clientSecretFormat = 'valid_secret';
    } else {
      clientSecretFormat = 'unknown';
    }
  }

  let refreshTokenFormat: 'valid_refresh_token_format' | 'unknown' | 'missing' = 'missing';
  if (rawRefreshToken) {
    if (rawRefreshToken.startsWith('1//') || rawRefreshToken.startsWith('1/')) {
      refreshTokenFormat = 'valid_refresh_token_format';
    } else {
      refreshTokenFormat = 'unknown';
    }
  }

  // Safe validation check: do not automatically swap; validate and report
  const validationErrors: string[] = [];
  if (!rawClientId) {
    validationErrors.push('GMAIL_STORAGE_CLIENT_ID is missing.');
  } else if (clientIdFormat === 'looks_like_secret') {
    validationErrors.push(
      'GMAIL_STORAGE_CLIENT_ID starts with "GOCSPX-", which matches the format of a Client Secret rather than a Client ID. In Vercel, please check that you did not enter the Client Secret in the GMAIL_STORAGE_CLIENT_ID field.'
    );
  }

  if (!rawClientSecret) {
    validationErrors.push('GMAIL_STORAGE_CLIENT_SECRET is missing.');
  } else if (clientSecretFormat === 'looks_like_client_id') {
    validationErrors.push(
      'GMAIL_STORAGE_CLIENT_SECRET contains ".googleusercontent.com", which matches the format of a Client ID rather than a Client Secret. In Vercel, please check that you did not enter the Client ID in the GMAIL_STORAGE_CLIENT_SECRET field.'
    );
  }

  if (!rawRefreshToken) {
    validationErrors.push('GMAIL_STORAGE_REFRESH_TOKEN is not yet configured (one-time OAuth authorization required).');
  }

  // Inventory of relevant environment variable keys in process.env (Key names and lengths ONLY; zero secret exposure)
  const detectedGoogleEnvKeys: Array<{ key: string; length: number }> = [];
  for (const [k, v] of Object.entries(process.env)) {
    if (/GMAIL|GOOGLE|CLIENT|SECRET|OAUTH|TOKEN/i.test(k) && typeof v === 'string') {
      detectedGoogleEnvKeys.push({ key: k, length: v.length });
    }
  }

  const deployment = {
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || 'local-or-unreported',
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || '',
    vercelEnv: process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
    vercelUrl: process.env.VERCEL_URL || 'www.toolforforever.com',
    vercelRegion: process.env.VERCEL_REGION || 'local',
    nodeVersion: process.version,
    serverTime: new Date().toISOString(),
  };

  return {
    hasClientId: Boolean(rawClientId),
    hasClientSecret: Boolean(rawClientSecret),
    hasRefreshToken: Boolean(rawRefreshToken),
    clientIdMatch: clientIdMatch ? { key: clientIdMatch.key, length: rawClientId.length } : undefined,
    clientSecretMatch: clientSecretMatch ? { key: clientSecretMatch.key, length: rawClientSecret.length } : undefined,
    refreshTokenMatch: refreshTokenMatch ? { key: refreshTokenMatch.key, length: rawRefreshToken.length } : undefined,
    clientIdFormat,
    clientSecretFormat,
    refreshTokenFormat,
    validationPassed: validationErrors.length === 0,
    validationErrors,
    targetAccount: TARGET_GMAIL_ACCOUNT,
    detectedGoogleEnvKeys,
    deployment,
  };
}

/**
 * Resolves Gmail Storage OAuth credentials.
 * Does NOT automatically swap credentials based solely on format.
 */
export function getGmailStorageConfig(): GmailStorageConfig | null {
  const diag = getGmailEnvDiagnostics();
  if (!diag.hasClientId || !diag.hasClientSecret || !diag.hasRefreshToken) {
    return null;
  }

  if (diag.clientIdFormat === 'looks_like_secret' || diag.clientSecretFormat === 'looks_like_client_id') {
    return null;
  }

  const clientIdMatch = resolveServerEnv([
    'GMAIL_STORAGE_CLIENT_ID',
    'GMAIL_CLIENT_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_DRIVE_CLIENT_ID',
    'NEXT_PUBLIC_GMAIL_STORAGE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  ]);

  const clientSecretMatch = resolveServerEnv([
    'GMAIL_STORAGE_CLIENT_SECRET',
    'GMAIL_CLIENT_SECRET',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_DRIVE_CLIENT_SECRET',
  ]);

  const refreshTokenMatch = resolveServerEnv([
    'GMAIL_STORAGE_REFRESH_TOKEN',
    'GMAIL_REFRESH_TOKEN',
    'GOOGLE_DRIVE_REFRESH_TOKEN',
  ]);

  if (!clientIdMatch || !clientSecretMatch || !refreshTokenMatch) {
    return null;
  }

  return {
    clientId: clientIdMatch.value,
    clientSecret: clientSecretMatch.value,
    refreshToken: refreshTokenMatch.value,
    targetAccount: TARGET_GMAIL_ACCOUNT,
  };
}

/**
 * Safely probes the Google OAuth token endpoint to verify whether Google accepts
 * the Client ID and Client Secret, WITHOUT exposing credentials or tokens.
 */
export async function probeGoogleClientCredentials(
  clientId: string,
  clientSecret: string
): Promise<CredentialProbeResult> {
  if (!clientId || !clientSecret) {
    return {
      tested: false,
      accepted: false,
      message: 'Client ID or Client Secret is missing; cannot probe Google token endpoint.',
    };
  }

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: 'probe_authorization_credentials_check',
        redirect_uri: 'https://www.toolforforever.com/api/admin/gmail-oauth/callback',
      }).toString(),
    });

    const bodyText = await res.text();
    let bodyJson: Record<string, unknown> = {};
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      // not JSON
    }

    if (res.status === 400 && bodyJson.error === 'invalid_grant') {
      return {
        tested: true,
        accepted: true,
        statusCode: 400,
        message: 'Google Cloud accepted Client ID and Client Secret (client authentication succeeded).',
      };
    }

    if (res.status === 401 || bodyJson.error === 'invalid_client') {
      return {
        tested: true,
        accepted: false,
        statusCode: 401,
        message: 'Google Cloud rejected credentials: invalid Client ID or Client Secret.',
      };
    }

    return {
      tested: true,
      accepted: false,
      statusCode: res.status,
      message: `Google token endpoint returned status ${res.status} (${String(bodyJson.error || 'unexpected')}).`,
    };
  } catch (err) {
    return {
      tested: true,
      accepted: false,
      message: `Failed to connect to Google token endpoint: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Retrieves a valid OAuth2 access token for Gmail API.
 * Uses cached token if valid; otherwise exchanges refresh token with Google OAuth.
 */
export async function getValidAccessToken(config?: GmailStorageConfig): Promise<string> {
  const cfg = config || getGmailStorageConfig();
  if (!cfg) {
    throw new Error(
      'Gmail Storage credentials not configured. Please set GMAIL_STORAGE_CLIENT_ID, GMAIL_STORAGE_CLIENT_SECRET, and GMAIL_STORAGE_REFRESH_TOKEN in Vercel.'
    );
  }

  const now = Date.now();
  if (
    globalForGmail.__gmail_access_token__ &&
    globalForGmail.__gmail_token_expires_at__ &&
    globalForGmail.__gmail_token_expires_at__ > now + 60000 // 60s buffer
  ) {
    return globalForGmail.__gmail_access_token__;
  }

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: cfg.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorDetail = errorText;
    try {
      const parsed = JSON.parse(errorText);
      errorDetail = parsed.error_description || parsed.error || errorText;
    } catch {
      // Keep errorText
    }
    throw new Error(`Gmail API OAuth token refresh failed (${res.status}): ${errorDetail}`);
  }

  const tokenData = await res.json();
  const accessToken = tokenData.access_token as string;
  const expiresIn = (tokenData.expires_in as number) || 3600;

  globalForGmail.__gmail_access_token__ = accessToken;
  globalForGmail.__gmail_token_expires_at__ = now + expiresIn * 1000;

  return accessToken;
}

/**
 * Ensures all required ToolForForever labels exist in Gmail.
 * Idempotent operation: creates any missing labels and caches IDs.
 */
export async function ensureGmailLabels(customAccessToken?: string): Promise<Record<string, string>> {
  if (globalForGmail.__gmail_labels_map__ && !customAccessToken) {
    return globalForGmail.__gmail_labels_map__;
  }

  const token = customAccessToken || (await getValidAccessToken());

  // 1. Fetch existing labels
  const listRes = await fetch(`${GMAIL_API_BASE}/labels`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    throw new Error(`Failed to list Gmail labels: ${errText}`);
  }

  const listData = await listRes.json();
  const existingLabels: Array<{ id: string; name: string }> = listData.labels || [];
  const labelMap: Record<string, string> = {};

  for (const label of existingLabels) {
    labelMap[label.name] = label.id;
  }

  // 2. Create missing required labels
  const requiredLabels = Object.values(GMAIL_STORAGE_LABELS);
  for (const labelName of requiredLabels) {
    if (!labelMap[labelName]) {
      const createRes = await fetch(`${GMAIL_API_BASE}/labels`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create Gmail label '${labelName}': ${errText}`);
      }

      const created = await createRes.json();
      labelMap[labelName] = created.id;
    }
  }

  if (!customAccessToken) {
    globalForGmail.__gmail_labels_map__ = labelMap;
  }
  return labelMap;
}

/**
 * Encodes an RFC 2822 email message with headers and body into base64url format.
 */
export function buildRfc2822Message({
  to,
  from,
  subject,
  body,
  customHeaders = {},
}: {
  to: string;
  from: string;
  subject: string;
  body: string;
  customHeaders?: Record<string, string>;
}): string {
  // Sanitize subject and headers against CRLF injection
  const safeSubject = subject.replace(/[\r\n]+/g, ' ').trim();
  const safeTo = to.replace(/[\r\n]+/g, ' ').trim();
  const safeFrom = from.replace(/[\r\n]+/g, ' ').trim();

  const lines = [
    `To: ${safeTo}`,
    `From: ${safeFrom}`,
    `Subject: ${safeSubject}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: application/json; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
  ];

  for (const [key, value] of Object.entries(customHeaders)) {
    const safeKey = key.replace(/[^a-zA-Z0-9-]/g, '');
    const safeVal = value.replace(/[\r\n]+/g, ' ').trim();
    lines.push(`${safeKey}: ${safeVal}`);
  }

  lines.push('', body);
  const rawRfc = lines.join('\r\n');
  return Buffer.from(rawRfc, 'utf-8').toString('base64url');
}

/**
 * Inserts a structured record message into Gmail with the specified label.
 * Uses users.messages.insert so that the record is placed directly into the
 * designated label without appearing in the user's personal INBOX.
 */
export async function insertGmailRecordMessage<T = unknown>({
  labelName,
  recordType,
  recordId,
  payload,
  customAccessToken,
}: {
  labelName: string;
  recordType: GmailRecordMessage<T>['recordType'];
  recordId: string;
  payload: T;
  customAccessToken?: string;
}): Promise<{ messageId: string; record: GmailRecordMessage<T> }> {
  const token = customAccessToken || (await getValidAccessToken());
  const labelMap = await ensureGmailLabels(token);
  const labelId = labelMap[labelName];

  if (!labelId) {
    throw new Error(`Label '${labelName}' could not be resolved in Gmail.`);
  }

  const now = new Date().toISOString();
  const jsonPayload = JSON.stringify(payload);
  const checksum = crypto.createHash('sha256').update(jsonPayload).digest('hex');

  const record: GmailRecordMessage<T> = {
    schemaVersion: 1,
    recordType,
    recordId,
    createdAt: now,
    updatedAt: now,
    checksum,
    payload,
  };

  const subject = `[ToolForForever:${recordType.toUpperCase()}] ${recordId}`;
  const serializedRecord = JSON.stringify(record, null, 2);

  const raw = buildRfc2822Message({
    to: TARGET_GMAIL_ACCOUNT,
    from: `ToolForForever Storage <${TARGET_GMAIL_ACCOUNT}>`,
    subject,
    body: serializedRecord,
    customHeaders: {
      'X-TFF-Record-Type': recordType,
      'X-TFF-Record-Id': recordId,
      'X-TFF-Checksum': checksum,
    },
  });

  // users.messages.insert directly inserts the message into Gmail with the designated label
  const insertRes = await fetch(`${GMAIL_API_BASE}/messages?internalDateSource=dateHeader`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw,
      labelIds: [labelId], // Explicitly placed under ToolForForever label (NOT INBOX)
    }),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    throw new Error(`Failed to insert record '${recordId}' into Gmail: ${errText}`);
  }

  const data = await insertRes.json();
  return { messageId: data.id, record };
}

/**
 * Searches for messages matching a Gmail search query.
 */
export async function searchGmailMessages({
  query,
  maxResults = 50,
  customAccessToken,
}: {
  query: string;
  maxResults?: number;
  customAccessToken?: string;
}): Promise<Array<{ id: string; threadId: string }>> {
  const token = customAccessToken || (await getValidAccessToken());
  const url = `${GMAIL_API_BASE}/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to search Gmail messages (${query}): ${errText}`);
  }

  const data = await res.json();
  return (data.messages as Array<{ id: string; threadId: string }>) || [];
}

/**
 * Retrieves and parses a structured record document from a Gmail message ID.
 */
export async function getGmailRecordMessage<T = unknown>(
  messageId: string,
  customAccessToken?: string
): Promise<GmailRecordMessage<T> | null> {
  const token = customAccessToken || (await getValidAccessToken());
  const url = `${GMAIL_API_BASE}/messages/${messageId}?format=raw`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch message '${messageId}' from Gmail: ${await res.text()}`);
  }

  const data = await res.json();
  if (!data.raw) return null;

  // Decode raw RFC 2822 email
  const decodedRaw = Buffer.from(data.raw, 'base64url').toString('utf-8');

  // Extract body after blank line separator (\r\n\r\n or \n\n)
  const headerSplit = decodedRaw.indexOf('\r\n\r\n');
  const bodyContent = headerSplit !== -1
    ? decodedRaw.slice(headerSplit + 4)
    : decodedRaw.slice(decodedRaw.indexOf('\n\n') + 2);

  try {
    const parsed = JSON.parse(bodyContent) as GmailRecordMessage<T>;
    return parsed;
  } catch (err) {
    console.error(`[GmailStorage] Failed to parse message body as JSON (${messageId}):`, err);
    return null;
  }
}

/**
 * Trashes a message by ID.
 */
export async function trashGmailMessage(
  messageId: string,
  customAccessToken?: string
): Promise<void> {
  const token = customAccessToken || (await getValidAccessToken());
  const res = await fetch(`${GMAIL_API_BASE}/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to trash Gmail message '${messageId}': ${await res.text()}`);
  }
}

/**
 * Checks the live connectivity and environment diagnostics for Gmail storage.
 */
export async function checkGmailStorageHealth(): Promise<GmailStorageStatus> {
  const diagnostics = getGmailEnvDiagnostics();
  const cfg = getGmailStorageConfig();
  const targetAccount = TARGET_GMAIL_ACCOUNT;
  const now = new Date().toISOString();

  // If Client ID and Client Secret are present, probe Google OAuth token endpoint
  let probeResult: CredentialProbeResult | undefined;
  const rawClientId = resolveServerEnv([
    'GMAIL_STORAGE_CLIENT_ID',
    'GMAIL_CLIENT_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_DRIVE_CLIENT_ID',
  ])?.value;
  const rawClientSecret = resolveServerEnv([
    'GMAIL_STORAGE_CLIENT_SECRET',
    'GMAIL_CLIENT_SECRET',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_DRIVE_CLIENT_SECRET',
  ])?.value;

  if (
    rawClientId &&
    rawClientSecret &&
    diagnostics.clientIdFormat !== 'looks_like_secret' &&
    diagnostics.clientSecretFormat !== 'looks_like_client_id'
  ) {
    probeResult = await probeGoogleClientCredentials(rawClientId, rawClientSecret);
  }

  if (!cfg) {
    let error = 'Gmail Storage credentials not configured in environment.';
    if (!diagnostics.hasClientId) {
      error = 'GMAIL_STORAGE_CLIENT_ID is missing or not exposed in this environment.';
    } else if (!diagnostics.hasClientSecret) {
      error = 'GMAIL_STORAGE_CLIENT_SECRET is missing.';
    } else if (!diagnostics.hasRefreshToken) {
      error = 'GMAIL_STORAGE_REFRESH_TOKEN is missing (run Gmail OAuth authorization flow).';
    } else if (diagnostics.validationErrors.length > 0) {
      error = diagnostics.validationErrors[0];
    }

    return {
      configured: false,
      connected: false,
      targetAccount,
      lastChecked: now,
      hasClientId: diagnostics.hasClientId,
      hasClientSecret: diagnostics.hasClientSecret,
      hasRefreshToken: diagnostics.hasRefreshToken,
      clientIdFormat: diagnostics.clientIdFormat,
      clientSecretFormat: diagnostics.clientSecretFormat,
      refreshTokenFormat: diagnostics.refreshTokenFormat,
      validationPassed: diagnostics.validationPassed,
      validationErrors: diagnostics.validationErrors,
      labelsFound: [],
      deployment: diagnostics.deployment,
      detectedGoogleEnvKeys: diagnostics.detectedGoogleEnvKeys,
      probeResult,
      error,
    };
  }

  try {
    const labelMap = await ensureGmailLabels();
    return {
      configured: true,
      connected: true,
      targetAccount,
      lastChecked: now,
      hasClientId: true,
      hasClientSecret: true,
      hasRefreshToken: true,
      clientIdFormat: diagnostics.clientIdFormat,
      clientSecretFormat: diagnostics.clientSecretFormat,
      refreshTokenFormat: diagnostics.refreshTokenFormat,
      validationPassed: true,
      validationErrors: [],
      labelsFound: Object.keys(labelMap),
      deployment: diagnostics.deployment,
      detectedGoogleEnvKeys: diagnostics.detectedGoogleEnvKeys,
      probeResult,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      configured: true,
      connected: false,
      targetAccount,
      lastChecked: now,
      hasClientId: true,
      hasClientSecret: true,
      hasRefreshToken: true,
      clientIdFormat: diagnostics.clientIdFormat,
      clientSecretFormat: diagnostics.clientSecretFormat,
      refreshTokenFormat: diagnostics.refreshTokenFormat,
      validationPassed: false,
      validationErrors: [msg],
      labelsFound: [],
      deployment: diagnostics.deployment,
      detectedGoogleEnvKeys: diagnostics.detectedGoogleEnvKeys,
      probeResult,
      error: msg,
    };
  }
}
