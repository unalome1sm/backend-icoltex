import { Router } from 'express';
import { getSyncStatus, syncCategories, syncClasses, syncClients, syncProducts } from '../controllers/sync.controller';

const router = Router();

router.get('/status', getSyncStatus);
router.post('/clients', syncClients);
router.post('/products', syncProducts);
router.post('/classes', syncClasses);
router.post('/categories', syncCategories);

export default router;
