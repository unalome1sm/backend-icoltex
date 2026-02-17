import { Router } from 'express';
import {
  registerRequestHandler,
  registerVerifyHandler,
  loginRequestHandler,
  loginVerifyHandler,
  adminLoginRequestHandler,
  adminLoginVerifyHandler,
  logoutHandler,
  meHandler,
  updateProfileHandler,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register/request', registerRequestHandler);
router.post('/register/verify', registerVerifyHandler);
router.post('/login/request', loginRequestHandler);
router.post('/login/verify', loginVerifyHandler);
router.post('/admin/login/request', adminLoginRequestHandler);
router.post('/admin/login/verify', adminLoginVerifyHandler);
router.post('/logout', logoutHandler);
router.get('/me', meHandler);
router.patch('/profile', updateProfileHandler);

export default router;
