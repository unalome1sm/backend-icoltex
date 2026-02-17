import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service';
import { Admin } from '../models/Admin';
import { AUTH_COOKIE_NAME } from '../services/auth.service';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Sesión expirada. Inicia sesión de nuevo.' });
  }
  const admin = await Admin.findById(payload.sub).select('-passwordHash');
  if (!admin || !admin.activo) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }
  (req as any).admin = admin;
  next();
}
