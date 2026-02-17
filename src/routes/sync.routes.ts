import { Router } from 'express';
import { getSyncStatus, syncCategories, syncClasses, syncClients, syncProducts } from '../controllers/sync.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/status', getSyncStatus);
router.post('/clients', requireAuth, syncClients);
router.post('/products', requireAuth, syncProducts);
router.post('/classes', requireAuth, syncClasses);
router.post('/categories', requireAuth, syncCategories);

export default router;
