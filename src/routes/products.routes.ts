import { Router } from 'express';
import {
  getProductById,
  getProductCategories,
  getProductClasses,
  getProducts,
  updateProduct,
} from '../controllers/products.controller';

const router = Router();

router.get('/meta/categories', getProductCategories);
router.get('/meta/classes', getProductClasses);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.patch('/:id', updateProduct);

export default router;
