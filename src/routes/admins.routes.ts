import { Router } from 'express';
import { getAdmins } from '../controllers/admins.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, getAdmins);

export default router;
