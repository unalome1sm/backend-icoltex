import { Request, Response, NextFunction } from 'express';
import { verifyToken, AUTH_COOKIE_NAME } from '../services/auth.service';
import { User, type IUser } from '../models/User';

export type AuthenticatedRequest = Request & { user?: IUser };

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const token =
    req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Debes iniciar sesión para continuar' });
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'user') {
    return res.status(401).json({ error: 'Sesión inválida. Inicia sesión como cliente.' });
  }
  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user || !user.activo) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }
  (req as AuthenticatedRequest).user = user;
  next();
}
