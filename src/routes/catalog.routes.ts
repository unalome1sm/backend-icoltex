import { Router } from 'express';
import { getItemCharacteristics } from '../controllers/itemCharacteristics.controller';
import {
  getCatalogFilterMeta,
  getGroupedProductById,
  getGroupedProducts,
} from '../controllers/groupedCatalog.controller';
import {
  getProductReviews,
  postProductReview,
} from '../controllers/productReviews.controller';
import { patchGroupMerchandising } from '../controllers/catalogMerchandising.controller';
import { requireUser } from '../middlewares/userAuth.middleware';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/item-characteristics', getItemCharacteristics);
router.get('/filter-meta', getCatalogFilterMeta);
router.get('/grouped-products', getGroupedProducts);
router.get('/grouped-products/:groupId/reviews', getProductReviews);
router.post('/grouped-products/:groupId/reviews', requireUser, postProductReview);
router.patch('/grouped-products/:groupId/merchandising', requireAuth, patchGroupMerchandising);
router.get('/grouped-products/:groupId', getGroupedProductById);

export default router;
