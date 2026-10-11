/**
 * Google Drive REST API v3 Client
 * 
 * Provides server-side authentication and file management for Google Drive.
 * Designed for ToolForForever using the target Google account sameerrout2004@gmail.com
 * and folder "ToolForForever_Data".
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
}

export interface GoogleDriveStatus {
  configured: boolean;
  connected: boolean;
  folderName: string;
  folderId?: string;
  targetAccount: string;
  lastChecked: string;
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
 * Resolves Google Drive OAuth credentials from environment variables.
 */
export function getGoogleDriveConfig(): GoogleDriveConfig | null {
  const clientId =
    process.env.GOOGLE_DRIVE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    '';
  const clientSecret =
    process.env.GOOGLE_DRIVE_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    '';
  const refreshToken =
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN ||
    '';
  const folderName =
    process.env.GOOGLE_DRIVE_FOLDER_NAME ||
    DEFAULT_FOLDER_NAME;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    refreshToken: refreshToken.trim(),
    folderName: folderName.trim(),
    targetAccount: TARGET_GOOGLE_ACCOUNT,
  };
}

/**
 * Retrieves a valid OAuth2 access token for Google Drive API.
 * Uses cached token if valid; otherwise exchanges refresh token with Google OAuth.
 */
export async function getValidAccessToken(config?: GoogleDriveConfig): Promise<string> {
  const cfg = config || getGoogleDriveConfig();
  if (!cfg) {
    throw new Error(
      'Google Drive API credentials not configured. Please set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN.'
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
  parentFolderId?: string
): Promise<string> {
  const token = await getValidAccessToken();

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

  const createdData = await createRes.json();
  return createdData.id;
}

/**
 * Resolves the root ToolForForever_Data folder ID.
 */
export async function getRootDataFolderId(): Promise<string> {
  if (globalForDrive.__drive_folder_id__) {
    return globalForDrive.__drive_folder_id__;
  }

  const cfg = getGoogleDriveConfig();
  const folderName = cfg?.folderName || DEFAULT_FOLDER_NAME;
  const folderId = await getOrCreateFolder(folderName);
  globalForDrive.__drive_folder_id__ = folderId;
  return folderId;
}

/**
 * Resolves the backups/ subfolder ID inside ToolForForever_Data.
 */
export async function getBackupsFolderId(): Promise<string> {
  if (globalForDrive.__drive_backup_folder_id__) {
    return globalForDrive.__drive_backup_folder_id__;
  }

  const rootId = await getRootDataFolderId();
  const backupFolderId = await getOrCreateFolder('backups', rootId);
  globalForDrive.__drive_backup_folder_id__ = backupFolderId;
  return backupFolderId;
}

/**
 * Finds a file by name inside a parent folder in Google Drive.
 */
export async function findFileInFolder(
  fileName: string,
  parentFolderId: string
): Promise<DriveFileMetadata | null> {
  const token = await getValidAccessToken();

  const query = `name = '${fileName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and trashed = false`;
  const url = `${DRIVE_FILES_ENDPOINT}?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,size)&spaces=drive`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to locate file '${fileName}' in Google Drive: ${errText}`);
  }

  const data = await res.json();
  if (Array.isArray(data.files) && data.files.length > 0) {
    return data.files[0] as DriveFileMetadata;
  }

  return null;
}

/**
 * Reads and parses a JSON file from Google Drive.
 */
export async function readJsonFromDrive<T>(
  fileName: string,
  parentFolderId?: string
): Promise<{ data: T; fileId: string; modifiedTime?: string } | null> {
  const folderId = parentFolderId || (await getRootDataFolderId());
  const fileMeta = await findFileInFolder(fileName, folderId);
  if (!fileMeta) {
    return null;
  }

  const token = await getValidAccessToken();
  const downloadUrl = `${DRIVE_FILES_ENDPOINT}/${fileMeta.id}?alt=media`;

  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to read content of '${fileName}' (${fileMeta.id}): ${errText}`);
  }

  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as T;
    return {
      data: parsed,
      fileId: fileMeta.id,
      modifiedTime: fileMeta.modifiedTime,
    };
  } catch (parseErr) {
    throw new Error(`Invalid JSON format in Google Drive file '${fileName}': ${parseErr}`);
  }
}

/**
 * Writes or updates a JSON file in Google Drive.
 * Uses atomic multipart upload for file creation and media upload for updates.
 */
export async function writeJsonToDrive(
  fileName: string,
  content: unknown,
  parentFolderId?: string
): Promise<{ fileId: string }> {
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
  const boundary = `-------toolino_drive_boundary_${Date.now()}`;
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
}

/**
 * Creates a rolling timestamped backup in ToolForForever_Data/backups/
 */
export async function createDriveBackup(
  content: unknown,
  prefix = 'backup'
): Promise<string> {
  const backupFolderId = await getBackupsFolderId();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `${prefix}-${timestamp}.json`;

  const { fileId } = await writeJsonToDrive(backupFileName, content, backupFolderId);
  return fileId;
}

/**
 * Checks the live connectivity to Google Drive.
 */
export async function checkGoogleDriveHealth(): Promise<GoogleDriveStatus> {
  const cfg = getGoogleDriveConfig();
  const targetAccount = TARGET_GOOGLE_ACCOUNT;
  const folderName = cfg?.folderName || DEFAULT_FOLDER_NAME;
  const now = new Date().toISOString();

  if (!cfg) {
    return {
      configured: false,
      connected: false,
      folderName,
      targetAccount,
      lastChecked: now,
      error: 'Google Drive credentials not set in environment (GOOGLE_DRIVE_REFRESH_TOKEN missing).',
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
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      configured: true,
      connected: false,
      folderName,
      targetAccount,
      lastChecked: now,
      error: msg,
    };
  }
}
