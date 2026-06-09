import { Request, Response } from 'express';
import { getDriveFolderId } from '../config/googleDrive';
import {
  driveConfiguredStatus,
  getDriveFileMetadata,
  getDriveFileStream,
  listDriveFolder,
  listDriveSubfolders,
} from '../services/drive.service';

export async function driveStatusHandler(_req: Request, res: Response) {
  res.json(driveConfiguredStatus());
}

export async function listDriveFilesHandler(req: Request, res: Response) {
  try {
    const folderId =
      typeof req.query.folderId === 'string' ? req.query.folderId : undefined;
    const imagesOnly = req.query.imagesOnly === 'true';
    const videosOnly = req.query.videosOnly === 'true';
    const foldersOnly = req.query.foldersOnly === 'true';

    const result = foldersOnly
      ? await listDriveSubfolders(folderId)
      : await listDriveFolder(folderId, { imagesOnly, videosOnly });

    if (!result.ok) {
      return res.status(503).json({ error: result.message });
    }

    res.json({
      folderId: result.folderId,
      files: result.files,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al listar archivos';
    res.status(500).json({ error: message });
  }
}

export async function getDriveFileMetadataHandler(req: Request, res: Response) {
  try {
    const { fileId } = req.params;
    if (!fileId?.trim()) {
      return res.status(400).json({ error: 'fileId obligatorio' });
    }

    const result = await getDriveFileMetadata(fileId.trim());
    if (!result.ok) {
      return res.status(404).json({ error: result.message });
    }

    res.json({ file: result.file });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al obtener metadata';
    res.status(500).json({ error: message });
  }
}

export async function getDriveFileContentHandler(req: Request, res: Response) {
  try {
    const { fileId } = req.params;
    if (!fileId?.trim()) {
      return res.status(400).json({ error: 'fileId obligatorio' });
    }

    const result = await getDriveFileStream(fileId.trim());
    if (!result.ok) {
      return res.status(result.status || 500).json({ error: result.message });
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.name)}"`,
    );
    res.setHeader('Cache-Control', 'public, max-age=3600');

    result.stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al transmitir el archivo' });
      }
    });

    result.stream.pipe(res);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al obtener archivo';
    res.status(500).json({ error: message });
  }
}

export async function getDriveRootFolderHandler(_req: Request, res: Response) {
  res.json({ folderId: getDriveFolderId() });
}
