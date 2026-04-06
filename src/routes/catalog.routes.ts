import { Router } from 'express';
import { getItemCharacteristics } from '../controllers/itemCharacteristics.controller';
import { getGroupedProductById, getGroupedProducts } from '../controllers/groupedCatalog.controller';

const router = Router();

router.get('/item-characteristics', getItemCharacteristics);
router.get('/grouped-products', getGroupedProducts);
router.get('/grouped-products/:groupId', getGroupedProductById);

export default router;
