import { Router } from 'express';
import adminsRoutes from './admins.routes';
import authRoutes from './auth.routes';
import categoriesRoutes from './categories.routes';
import clientsRoutes from './clients.routes';
import classesRoutes from './classes.routes';
import imagesRoutes from './images.routes';
import productLineGalleryRoutes from './productLineGallery.routes';
import productsRoutes from './products.routes';
import usersRoutes from './users.routes';
import syncRoutes from './sync.routes';

const router = Router();

router.use('/admins', adminsRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoriesRoutes);
router.use('/clients', clientsRoutes);
router.use('/classes', classesRoutes);
router.use('/images', imagesRoutes);
router.use('/product-galleries', productLineGalleryRoutes);
router.use('/products', productsRoutes);
router.use('/users', usersRoutes);
router.use('/sync', syncRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API Icoltex funcionando correctamente' });
});

export default router;



