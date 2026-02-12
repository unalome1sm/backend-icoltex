import { Router } from 'express';
import categoriesRoutes from './categories.routes';
import clientsRoutes from './clients.routes';
import classesRoutes from './classes.routes';
import productsRoutes from './products.routes';
import syncRoutes from './sync.routes';

const router = Router();

router.use('/categories', categoriesRoutes);
router.use('/clients', clientsRoutes);
router.use('/classes', classesRoutes);
router.use('/products', productsRoutes);
router.use('/sync', syncRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Icoltex funcionando correctamente' });
});

export default router;



