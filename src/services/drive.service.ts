import { google, type drive_v3 } from 'googleapis';
import {
  DRIVE_SCOPES,
  getDriveFolderId,
  getServiceAccountCredentials,
  isDriveConfigured,
} from '../config/googleDrive';

export type DriveFileDto = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  modifiedTime?: string;
  isFolder: boolean;
  parents?: string[];
  videoDurationMillis?: string;
  imageWidth?: number;
  imageHeight?: number;
};

type DriveListResult =
  | { ok: true; files: DriveFileDto[]; folderId: string }
  | { ok: false; message: string };

type DriveMetadataResult =
  | { ok: true; file: DriveFileDto }
  | { ok: false; message: string };

type DriveStreamResult =
  | {
      ok: true;
      stream: NodeJS.ReadableStream;
      mimeType: string;
      name: string;
    }
  | { ok: false; message: string; status?: number };

let driveClient: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive | null {
  if (driveClient) return driveClient;

  const credentials = getServiceAccountCredentials();
  if (!credentials) return null;

  const auth = new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: DRIVE_SCOPES,
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

function mapDriveFile(file: drive_v3.Schema$File): DriveFileDto {
  const mimeType = file.mimeType || 'application/octet-stream';
  return {
    id: file.id || '',
    name: file.name || 'Sin nombre',
    mimeType,
    size: file.size ?? undefined,
    thumbnailLink: file.thumbnailLink ?? undefined,
    webViewLink: file.webViewLink ?? undefined,
    modifiedTime: file.modifiedTime ?? undefined,
    isFolder: mimeType === 'application/vnd.google-apps.folder',
    parents: file.parents ?? undefined,
    videoDurationMillis:
      file.videoMediaMetadata?.durationMillis ?? undefined,
    imageWidth: file.imageMediaMetadata?.width ?? undefined,
    imageHeight: file.imageMediaMetadata?.height ?? undefined,
  };
}

const FILE_FIELDS =
  'id,name,mimeType,size,thumbnailLink,webViewLink,modifiedTime,parents,videoMediaMetadata,imageMediaMetadata';

export async function listDriveFolder(
  folderId?: string,
  options?: { imagesOnly?: boolean; videosOnly?: boolean },
): Promise<DriveListResult> {
  if (!isDriveConfigured()) {
    return {
      ok: false,
      message:
        'Google Drive no configurado. Agrega GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.',
    };
  }

  const drive = getDriveClient();
  if (!drive) {
    return { ok: false, message: 'No se pudo inicializar el cliente de Drive' };
  }

  const resolvedFolderId = getDriveFolderId(folderId);
  const mimeFilters: string[] = [];

  if (options?.imagesOnly) {
    mimeFilters.push("mimeType contains 'image/'");
  }
  if (options?.videosOnly) {
    mimeFilters.push("mimeType contains 'video/'");
  }

  const mimeQuery =
    mimeFilters.length > 0
      ? ` and (${mimeFilters.join(' or ')})`
      : ` and mimeType != 'application/vnd.google-apps.folder'`;

  const q = `'${resolvedFolderId}' in parents and trashed = false${mimeQuery}`;

  try {
    const response = await drive.files.list({
      q,
      fields: `files(${FILE_FIELDS})`,
      orderBy: 'folder,name',
      pageSize: 200,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = (response.data.files || [])
      .map(mapDriveFile)
      .filter((file) => file.id);

    return { ok: true, files, folderId: resolvedFolderId };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al listar archivos de Drive';
    return { ok: false, message };
  }
}

export async function listDriveSubfolders(
  folderId?: string,
): Promise<DriveListResult> {
  if (!isDriveConfigured()) {
    return {
      ok: false,
      message:
        'Google Drive no configurado. Agrega GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.',
    };
  }

  const drive = getDriveClient();
  if (!drive) {
    return { ok: false, message: 'No se pudo inicializar el cliente de Drive' };
  }

  const resolvedFolderId = getDriveFolderId(folderId);
  const q = `'${resolvedFolderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;

  try {
    const response = await drive.files.list({
      q,
      fields: `files(${FILE_FIELDS})`,
      orderBy: 'name',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = (response.data.files || [])
      .map(mapDriveFile)
      .filter((file) => file.id);

    return { ok: true, files, folderId: resolvedFolderId };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al listar carpetas de Drive';
    return { ok: false, message };
  }
}

export async function getDriveFileMetadata(
  fileId: string,
): Promise<DriveMetadataResult> {
  if (!isDriveConfigured()) {
    return {
      ok: false,
      message: 'Google Drive no configurado',
    };
  }

  const drive = getDriveClient();
  if (!drive) {
    return { ok: false, message: 'No se pudo inicializar el cliente de Drive' };
  }

  try {
    const response = await drive.files.get({
      fileId,
      fields: FILE_FIELDS,
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      return { ok: false, message: 'Archivo no encontrado' };
    }

    return { ok: true, file: mapDriveFile(response.data) };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al obtener metadata de Drive';
    return { ok: false, message };
  }
}

export async function getDriveFileStream(
  fileId: string,
): Promise<DriveStreamResult> {
  if (!isDriveConfigured()) {
    return { ok: false, message: 'Google Drive no configurado' };
  }

  const drive = getDriveClient();
  if (!drive) {
    return { ok: false, message: 'No se pudo inicializar el cliente de Drive' };
  }

  try {
    const meta = await getDriveFileMetadata(fileId);
    if (!meta.ok) {
      return { ok: false, message: meta.message, status: 404 };
    }

    const response = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    );

    const stream = response.data as NodeJS.ReadableStream;
    return {
      ok: true,
      stream,
      mimeType: meta.file.mimeType,
      name: meta.file.name,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al obtener archivo de Drive';
    return { ok: false, message, status: 500 };
  }
}

export function driveConfiguredStatus() {
  return {
    configured: isDriveConfigured(),
    folderId: getDriveFolderId(),
  };
}
