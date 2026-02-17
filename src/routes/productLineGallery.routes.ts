import { Router } from 'express';
import {
  getGalleryByKeys,
  listGalleries,
  upsertGallery,
} from '../controllers/productLineGallery.controller';

const router = Router();

router.get('/', getGalleryByKeys);
router.get('/list', listGalleries);
router.put('/', upsertGallery);

export default router;
