/** Carpeta raíz de medios: PAGINA ICOLTEX */
export const DEFAULT_DRIVE_FOLDER_ID = '15qfWHVlpLwV3nnUD7YWybEfUPKrhh8NT';

export const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export function getDriveFolderId(override?: string): string {
  const fromEnv = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  const folderId = override?.trim() || fromEnv || DEFAULT_DRIVE_FOLDER_ID;
  return folderId;
}

export function getServiceAccountCredentials():
  | { clientEmail: string; privateKey: string }
  | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n',
  ).trim();

  if (!clientEmail || !privateKey) {
    return null;
  }

  return { clientEmail, privateKey };
}

export function isDriveConfigured(): boolean {
  return getServiceAccountCredentials() !== null;
}
