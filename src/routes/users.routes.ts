import { Router } from 'express';
import { getUsers, promoteToAdmin } from '../controllers/users.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, getUsers);
router.post('/:id/promote', requireAuth, promoteToAdmin);

export default router;
