import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/userAuth.middleware';
import {
  displayAuthorName,
  listProductReviews,
  upsertProductReview,
} from '../services/productReviews.service';
import { verifyToken, AUTH_COOKIE_NAME } from '../services/auth.service';

function optionalUserId(req: AuthenticatedRequest): string | undefined {
  const token =
    req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return undefined;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'user') return undefined;
  return payload.sub;
}

export async function getProductReviews(req: AuthenticatedRequest, res: Response) {
  try {
    const { groupId } = req.params;
    if (!groupId?.trim()) {
      return res.status(400).json({ error: 'groupId requerido' });
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const currentUserId = optionalUserId(req);
    const data = await listProductReviews(groupId.trim(), page, limit, currentUserId);
    res.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al cargar evaluaciones';
    res.status(500).json({ error: message });
  }
}

export async function postProductReview(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Debes iniciar sesión' });
    }
    const { groupId } = req.params;
    if (!groupId?.trim()) {
      return res.status(400).json({ error: 'groupId requerido' });
    }
    const { rating, comment } = req.body ?? {};
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'La calificación debe ser un entero entre 1 y 5' });
    }
    const commentText = typeof comment === 'string' ? comment.trim() : '';
    if (!commentText) {
      return res.status(400).json({ error: 'El comentario es obligatorio' });
    }
    if (commentText.length > 2000) {
      return res.status(400).json({ error: 'El comentario no puede superar 2000 caracteres' });
    }

    const review = await upsertProductReview(user._id.toString(), groupId.trim(), {
      rating: ratingNum,
      comment: commentText,
      authorName: displayAuthorName(user.nombre, user.email),
    });

    const list = await listProductReviews(groupId.trim(), 1, 10, user._id.toString());
    res.status(201).json({ review, ...list });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al guardar evaluación';
    res.status(500).json({ error: message });
  }
}
