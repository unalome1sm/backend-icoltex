import { Request, Response } from 'express';
import { ProductLineGallery } from '../models/ProductLineGallery';

/**
 * GET /api/product-galleries?categoria=X&claseFamilia=Y
 * Devuelve la galería para esa categoría y clase/familia (si existe).
 */
export const getGalleryByKeys = async (req: Request, res: Response) => {
  try {
    const { categoria, claseFamilia } = req.query;
    if (typeof categoria !== 'string' || typeof claseFamilia !== 'string') {
      return res.status(400).json({ error: 'Se requieren categoria y claseFamilia' });
    }
    const gallery = await ProductLineGallery.findOne({
      categoria: categoria.trim(),
      claseFamilia: claseFamilia.trim(),
    });
    if (!gallery) {
      return res.json({ categoria, claseFamilia, imageUrls: [] });
    }
    res.json(gallery);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al obtener la galería';
    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/product-galleries
 * Lista todas las galerías (opcional filtro por categoria o claseFamilia).
 */
export const listGalleries = async (req: Request, res: Response) => {
  try {
    const { categoria, claseFamilia } = req.query;
    const filter: Record<string, string> = {};
    if (typeof categoria === 'string' && categoria.trim()) filter.categoria = categoria.trim();
    if (typeof claseFamilia === 'string' && claseFamilia.trim()) filter.claseFamilia = claseFamilia.trim();
    const galleries = await ProductLineGallery.find(filter).sort({ categoria: 1, claseFamilia: 1 });
    res.json(galleries);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al listar galerías';
    res.status(500).json({ error: message });
  }
};

/**
 * PUT /api/product-galleries
 * Crea o actualiza la galería para un par (categoria, claseFamilia). Body: { categoria, claseFamilia, imageUrls }.
 */
export const upsertGallery = async (req: Request, res: Response) => {
  try {
    const { categoria, claseFamilia, imageUrls } = req.body;
    if (typeof categoria !== 'string' || typeof claseFamilia !== 'string') {
      return res.status(400).json({ error: 'Se requieren categoria y claseFamilia' });
    }
    const urls = Array.isArray(imageUrls)
      ? imageUrls.filter((u: unknown): u is string => typeof u === 'string' && u.trim() !== '')
      : [];
    const gallery = await ProductLineGallery.findOneAndUpdate(
      { categoria: categoria.trim(), claseFamilia: claseFamilia.trim() },
      { $set: { imageUrls: urls } },
      { new: true, upsert: true }
    );
    res.json(gallery);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al guardar la galería';
    res.status(500).json({ error: message });
  }
};
