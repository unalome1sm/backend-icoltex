import { Router } from 'express';
import {
  driveStatusHandler,
  getDriveFileContentHandler,
  getDriveFileMetadataHandler,
  getDriveRootFolderHandler,
  listDriveFilesHandler,
} from '../controllers/drive.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

/** Estado de configuración (admin) */
router.get('/status', requireAuth, driveStatusHandler);

/** Carpeta raíz configurada (admin) */
router.get('/folder', requireAuth, getDriveRootFolderHandler);

/** Listar archivos o subcarpetas de una carpeta (admin) */
router.get('/files', requireAuth, listDriveFilesHandler);

/** Metadata de un archivo (público — solo metadatos) */
router.get('/files/:fileId/metadata', getDriveFileMetadataHandler);

/** Contenido de imagen/video vía API (público — para mostrar en la tienda) */
router.get('/files/:fileId/content', getDriveFileContentHandler);

export default router;
