/**
 * Google Drive REST API v3 Client
 * 
 * Provides secure server-side OAuth authentication, folder provisioning,
 * resilient file read/write operations, and safe diagnostics for ToolForForever.
 * 
 * Target Google Account: sameerrout2004@gmail.com
 * Dedicated Drive Folder: ToolForForever_Data
 */

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderName: string;
  targetAccount: string;
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
  md5Checksum?: string;
}

export interface CredentialProbeResult {
  tested: boolean;
  accepted: boolean;
  statusCode?: number;
  message: string;
}

export interface GoogleDriveStatus {
  configured: boolean;
  connected: boolean;
  folderName: string;
  folderId?: string;
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

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files';

export const TARGET_GOOGLE_ACCOUNT = 'sameerrout2004@gmail.com';
export const DEFAULT_FOLDER_NAME = 'ToolForForever_Data';

// Cache access token and folder ID across warm serverless lambdas
const globalForDrive = globalThis as unknown as {
  __drive_access_token__?: string;
  __drive_token_expires_at__?: number;
  __drive_folder_id__?: string;
  __drive_backup_folder_id__?: string;
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
export function getDriveEnvDiagnostics() {
  const clientIdMatch = resolveServerEnv([
    'GOOGLE_DRIVE_CLIENT_ID',
    'GOOGLE_CLIENT_ID',
    'GDRIVE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  ]);

  const clientSecretMatch = resolveServerEnv([
    'GOOGLE_DRIVE_CLIENT_SECRET',
    'GOOGLE_CLIENT_SECRET',
    'GDRIVE_CLIENT_SECRET',
  ]);

  const refreshTokenMatch = resolveServerEnv([
    'GOOGLE_DRIVE_REFRESH_TOKEN',
    'GOOGLE_REFRESH_TOKEN',
    'GDRIVE_REFRESH_TOKEN',
  ]);

  const folderNameMatch = resolveServerEnv([
    'GOOGLE_DRIVE_FOLDER_NAME',
    'GDRIVE_FOLDER_NAME',
  ]);

  const rawClientId = clientIdMatch ? clientIdMatch.value : '';
  const rawClientSecret = clientSecretMatch ? clientSecretMatch.value : '';
  const rawRefreshToken = refreshTokenMatch ? refreshTokenMatch.value : '';
  const folderName = folderNameMatch?.value || DEFAULT_FOLDER_NAME;

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
    validationErrors.push('GOOGLE_DRIVE_CLIENT_ID is missing.');
  } else if (clientIdFormat === 'looks_like_secret') {
    validationErrors.push(
      'GOOGLE_DRIVE_CLIENT_ID starts with "GOCSPX-", which matches the format of a Client Secret rather than a Client ID. In Vercel, please check that you did not enter the Client Secret in the GOOGLE_DRIVE_CLIENT_ID field.'
    );
  }

  if (!rawClientSecret) {
    validationErrors.push('GOOGLE_DRIVE_CLIENT_SECRET is missing.');
  } else if (clientSecretFormat === 'looks_like_client_id') {
    validationErrors.push(
      'GOOGLE_DRIVE_CLIENT_SECRET contains ".googleusercontent.com", which matches the format of a Client ID rather than a Client Secret. In Vercel, please check that you did not enter the Client ID in the GOOGLE_DRIVE_CLIENT_SECRET field.'
    );
  }

  if (!rawRefreshToken) {
    validationErrors.push('GOOGLE_DRIVE_REFRESH_TOKEN is not yet configured (one-time OAuth authorization required).');
  }

  // Inventory of relevant environment variable keys in process.env (Key names and lengths ONLY; zero secret exposure)
  const detectedGoogleEnvKeys: Array<{ key: string; length: number }> = [];
  for (const [k, v] of Object.entries(process.env)) {
    if (/GOOGLE|DRIVE|CLIENT|SECRET|OAUTH|TOKEN/i.test(k) && typeof v === 'string') {
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
    targetAccount: TARGET_GOOGLE_ACCOUNT,
    folderName,
    detectedGoogleEnvKeys,
    deployment,
  };
}

/**
 * Resolves Google Drive OAuth credentials.
 * Adheres strictly to safety constraints: does NOT automatically swap credentials
 * based solely on format. Validates and returns null if validation fails.
 */
export function getGoogleDriveConfig(): GoogleDriveConfig | null {
  const diag = getDriveEnvDiagnostics();
  if (!diag.hasClientId || !diag.hasClientSecret || !diag.hasRefreshToken) {
    return null;
  }

  // If format validation detects that variables appear swapped or invalid, do not proceed with bad credentials
  if (diag.clientIdFormat === 'looks_like_secret' || diag.clientSecretFormat === 'looks_like_client_id') {
    return null;
  }

  const clientIdMatch = resolveServerEnv([
    'GOOGLE_DRIVE_CLIENT_ID',
    'GOOGLE_CLIENT_ID',
    'GDRIVE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  ]);

  const clientSecretMatch = resolveServerEnv([
    'GOOGLE_DRIVE_CLIENT_SECRET',
    'GOOGLE_CLIENT_SECRET',
    'GDRIVE_CLIENT_SECRET',
  ]);

  const refreshTokenMatch = resolveServerEnv([
    'GOOGLE_DRIVE_REFRESH_TOKEN',
    'GOOGLE_REFRESH_TOKEN',
    'GDRIVE_REFRESH_TOKEN',
  ]);

  if (!clientIdMatch || !clientSecretMatch || !refreshTokenMatch) {
    return null;
  }

  return {
    clientId: clientIdMatch.value,
    clientSecret: clientSecretMatch.value,
    refreshToken: refreshTokenMatch.value,
    folderName: diag.folderName,
    targetAccount: TARGET_GOOGLE_ACCOUNT,
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
        redirect_uri: 'https://www.toolforforever.com/api/admin/drive-oauth/callback',
      }).toString(),
    });

    const bodyText = await res.text();
    let bodyJson: Record<string, unknown> = {};
    try {
      bodyJson = JSON.parse(bodyText);
    } catch {
      // not JSON
    }

    // Google OAuth behavior:
    // If client credentials are valid, Google validates credentials first and returns 400 invalid_grant for dummy code.
    if (res.status === 400 && bodyJson.error === 'invalid_grant') {
      return {
        tested: true,
        accepted: true,
        statusCode: 400,
        message: 'Google Cloud accepted Client ID and Client Secret (client authentication succeeded).',
      };
    }

    // If client credentials are invalid/rejected, Google returns 401 invalid_client.
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
 * Retrieves a valid OAuth2 access token for Google Drive API.
 * Uses cached token if valid; otherwise exchanges refresh token with Google OAuth.
 */
export async function getValidAccessToken(config?: GoogleDriveConfig): Promise<string> {
  const cfg = config || getGoogleDriveConfig();
  if (!cfg) {
    throw new Error(
      'Google Drive API credentials not configured. Please set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN in Vercel.'
    );
  }

  const now = Date.now();
  if (
    globalForDrive.__drive_access_token__ &&
    globalForDrive.__drive_token_expires_at__ &&
    globalForDrive.__drive_token_expires_at__ > now + 60000 // 60s buffer
  ) {
    return globalForDrive.__drive_access_token__;
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
    throw new Error(`Google Drive OAuth token refresh failed (${res.status}): ${errorDetail}`);
  }

  const tokenData = await res.json();
  const accessToken = tokenData.access_token as string;
  const expiresIn = (tokenData.expires_in as number) || 3600;

  globalForDrive.__drive_access_token__ = accessToken;
  globalForDrive.__drive_token_expires_at__ = now + expiresIn * 1000;

  return accessToken;
}

/**
 * Searches for or creates a folder in Google Drive.
 */
export async function getOrCreateFolder(
  folderName: string,
  parentFolderId?: string,
  customAccessToken?: string
): Promise<string> {
  const token = customAccessToken || (await getValidAccessToken());

  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const searchUrl = `${DRIVE_FILES_ENDPOINT}?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Failed to query folder '${folderName}' in Google Drive: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (Array.isArray(searchData.files) && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if it does not exist
  const createPayload: Record<string, unknown> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    createPayload.parents = [parentFolderId];
  }

  const createRes = await fetch(DRIVE_FILES_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create folder '${folderName}' in Google Drive: ${errText}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

/**
 * Resolves or creates the primary root data folder: 'ToolForForever_Data'.
 */
export async function getRootDataFolderId(customAccessToken?: string): Promise<string> {
  if (globalForDrive.__drive_folder_id__ && !customAccessToken) {
    return globalForDrive.__drive_folder_id__;
  }
  const folderName = cleanEnv(process.env.GOOGLE_DRIVE_FOLDER_NAME) || DEFAULT_FOLDER_NAME;
  const folderId = await getOrCreateFolder(folderName, undefined, customAccessToken);
  if (!customAccessToken) {
    globalForDrive.__drive_folder_id__ = folderId;
  }
  return folderId;
}

/**
 * Resolves or creates the backup folder inside 'ToolForForever_Data'.
 */
export async function getBackupFolderId(customAccessToken?: string): Promise<string> {
  if (globalForDrive.__drive_backup_folder_id__ && !customAccessToken) {
    return globalForDrive.__drive_backup_folder_id__;
  }
  const rootId = await getRootDataFolderId(customAccessToken);
  const backupId = await getOrCreateFolder('backups', rootId, customAccessToken);
  if (!customAccessToken) {
    globalForDrive.__drive_backup_folder_id__ = backupId;
  }
  return backupId;
}

/**
 * Finds a specific file by name in a given folder.
 */
export async function findFileInFolder(
  fileName: string,
  parentFolderId: string
): Promise<DriveFileMetadata | null> {
  const token = await getValidAccessToken();

  const query = `name = '${fileName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and trashed = false`;
  const url = `${DRIVE_FILES_ENDPOINT}?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,size,md5Checksum)&spaces=drive`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to find file '${fileName}' in Drive: ${errText}`);
  }

  const data = await res.json();
  if (Array.isArray(data.files) && data.files.length > 0) {
    return data.files[0] as DriveFileMetadata;
  }
  return null;
}

/**
 * Reads a JSON file from Google Drive.
 */
export async function readJsonFromDrive<T>(
  fileName: string,
  parentFolderId?: string
): Promise<{ data: T; fileId: string; modifiedTime?: string } | null> {
  const folderId = parentFolderId || (await getRootDataFolderId());
  const token = await getValidAccessToken();
  const fileMeta = await findFileInFolder(fileName, folderId);

  if (!fileMeta) {
    return null;
  }

  const downloadUrl = `${DRIVE_FILES_ENDPOINT}/${fileMeta.id}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to download '${fileName}' from Google Drive: ${errText}`);
  }

  const contentText = await res.text();
  try {
    const parsed = JSON.parse(contentText) as T;
    return {
      data: parsed,
      fileId: fileMeta.id,
      modifiedTime: fileMeta.modifiedTime,
    };
  } catch (err) {
    console.error(`[GoogleDrive] JSON parse error for '${fileName}':`, err);
    return null;
  }
}

/**
 * Writes or updates a JSON file in Google Drive with exponential backoff retries.
 */
export async function writeJsonToDrive(
  fileName: string,
  content: unknown,
  parentFolderId?: string,
  maxRetries = 3
): Promise<{ fileId: string }> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const folderId = parentFolderId || (await getRootDataFolderId());
      const token = await getValidAccessToken();
      const fileMeta = await findFileInFolder(fileName, folderId);
      const serialized = JSON.stringify(content, null, 2);

      if (fileMeta) {
        // Update existing file content
        const updateUrl = `${DRIVE_UPLOAD_ENDPOINT}/${fileMeta.id}?uploadType=media`;
        const updateRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: serialized,
        });

        if (!updateRes.ok) {
          const errText = await updateRes.text();
          throw new Error(`Failed to update '${fileName}' in Google Drive: ${errText}`);
        }

        return { fileId: fileMeta.id };
      }

      // Create new file via multipart upload
      const boundary = `-------toolino_drive_boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const metadata = JSON.stringify({
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json',
      });

      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${serialized}\r\n` +
        `--${boundary}--`;

      const uploadUrl = `${DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Failed to create '${fileName}' in Google Drive: ${errText}`);
      }

      const createdData = await uploadRes.json();
      return { fileId: createdData.id };
    } catch (err) {
      lastError = err;
      if (attempt >= maxRetries) {
        break;
      }
      const delay = Math.pow(2, attempt) * 200 + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Google Drive write to '${fileName}' failed after ${maxRetries} attempts: ${lastError}`);
}

/**
 * Creates an immutable timestamped backup of a file in the 'backups' folder.
 */
export async function createDriveBackup(
  content: unknown,
  prefix = 'backup'
): Promise<string> {
  const backupFolderId = await getBackupFolderId();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `${prefix}_${timestamp}.json`;
  const result = await writeJsonToDrive(backupName, content, backupFolderId, 2);
  return result.fileId;
}

/**
 * Lists files stored within the ToolForForever_Data folder.
 */
export async function listDriveFiles(): Promise<DriveFileMetadata[]> {
  const token = await getValidAccessToken();
  const folderId = await getRootDataFolderId();

  const query = `'${folderId}' in parents and trashed = false`;
  const url = `${DRIVE_FILES_ENDPOINT}?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,size)&spaces=drive`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to list files in Drive: ${await res.text()}`);
  }

  const data = await res.json();
  return (data.files as DriveFileMetadata[]) || [];
}

/**
 * Checks the live connectivity and environment diagnostics for Google Drive.
 */
export async function checkGoogleDriveHealth(): Promise<GoogleDriveStatus> {
  const diagnostics = getDriveEnvDiagnostics();
  const cfg = getGoogleDriveConfig();
  const targetAccount = TARGET_GOOGLE_ACCOUNT;
  const folderName = diagnostics.folderName;
  const now = new Date().toISOString();

  // If Client ID and Client Secret are present, probe Google OAuth token endpoint
  let probeResult: CredentialProbeResult | undefined;
  const rawClientId = resolveServerEnv(['GOOGLE_DRIVE_CLIENT_ID', 'GOOGLE_CLIENT_ID', 'GDRIVE_CLIENT_ID'])?.value;
  const rawClientSecret = resolveServerEnv(['GOOGLE_DRIVE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET', 'GDRIVE_CLIENT_SECRET'])?.value;
  if (rawClientId && rawClientSecret && diagnostics.clientIdFormat !== 'looks_like_secret' && diagnostics.clientSecretFormat !== 'looks_like_client_id') {
    probeResult = await probeGoogleClientCredentials(rawClientId, rawClientSecret);
  }

  if (!cfg) {
    let error = 'Google Drive credentials not configured in environment.';
    if (!diagnostics.hasClientId) {
      error = 'GOOGLE_DRIVE_CLIENT_ID is missing or not exposed in this environment.';
    } else if (!diagnostics.hasClientSecret) {
      error = 'GOOGLE_DRIVE_CLIENT_SECRET is missing.';
    } else if (!diagnostics.hasRefreshToken) {
      error = 'GOOGLE_DRIVE_REFRESH_TOKEN is missing (run OAuth authorization flow).';
    } else if (diagnostics.validationErrors.length > 0) {
      error = diagnostics.validationErrors[0];
    }

    return {
      configured: false,
      connected: false,
      folderName,
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
      deployment: diagnostics.deployment,
      detectedGoogleEnvKeys: diagnostics.detectedGoogleEnvKeys,
      probeResult,
      error,
    };
  }

  try {
    const folderId = await getRootDataFolderId();
    return {
      configured: true,
      connected: true,
      folderName,
      folderId,
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
      deployment: diagnostics.deployment,
      detectedGoogleEnvKeys: diagnostics.detectedGoogleEnvKeys,
      probeResult,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      configured: true,
      connected: false,
      folderName,
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
      deployment: diagnostics.deployment,
      detectedGoogleEnvKeys: diagnostics.detectedGoogleEnvKeys,
      probeResult,
      error: msg,
    };
  }
}
