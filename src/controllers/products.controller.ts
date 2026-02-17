import { Request, Response } from 'express';
import { Product } from '../models/Product';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { activo, q, category, classFamily, precioMin, precioMax, page = 1, limit = 50 } = req.query;
    const filter: Record<string, unknown> = {};

    if (activo === 'true' || activo === 'false') {
      filter.activo = activo === 'true';
    }

    if (category && typeof category === 'string') {
      filter.categoria = { $regex: category, $options: 'i' };
    }

    if (classFamily && typeof classFamily === 'string') {
      filter.claseFamilia = { $regex: classFamily, $options: 'i' };
    }

    if (precioMin !== undefined && precioMin !== '') {
      const min = Number(precioMin);
      if (!Number.isNaN(min)) {
        filter.precioMetro = filter.precioMetro || {};
        (filter.precioMetro as Record<string, number>).$gte = min;
      }
    }
    if (precioMax !== undefined && precioMax !== '') {
      const max = Number(precioMax);
      if (!Number.isNaN(max)) {
        filter.precioMetro = filter.precioMetro || {};
        (filter.precioMetro as Record<string, number>).$lte = max;
      }
    }

    if (q && typeof q === 'string') {
      filter.$or = [
        { nombre: { $regex: q, $options: 'i' } },
        { codigo: { $regex: q, $options: 'i' } },
        { categoria: { $regex: q, $options: 'i' } },
        { claseFamilia: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(filter)
      .sort({ nombre: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/products/meta/categories
 * Lista categorías distintas. Si se pasa claseFamilia, solo devuelve categorías que tienen productos de esa familia.
 */
export const getProductCategories = async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = { categoria: { $exists: true, $ne: '' } };
    const claseFamilia = req.query.claseFamilia;
    if (typeof claseFamilia === 'string' && claseFamilia.trim()) {
      filter.claseFamilia = claseFamilia.trim();
    }
    const categories = await Product.distinct('categoria', filter);
    res.json(categories.filter(Boolean).sort());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProductClasses = async (_req: Request, res: Response) => {
  try {
    const classes = await Product.distinct('claseFamilia', { claseFamilia: { $exists: true, $ne: '' } });
    res.json(classes.filter(Boolean).sort());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const ALLOWED_UPDATE_FIELDS = [
  'imageUrls',
  'nombre',
  'claseFamilia',
  'categoria',
  'stock',
  'colores',
  'unidadMedida',
  'caracteristica',
  'recomendacionesCuidados',
  'recomendacionesUsos',
  'precioMetro',
  'precioKilos',
  'activo',
] as const;

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    const body = req.body as Record<string, unknown>;
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (body[key] !== undefined) {
        product.set(key, body[key]);
      }
    }
    if (Array.isArray(body.imageUrls)) {
      product.imageUrls = body.imageUrls.filter((u): u is string => typeof u === 'string' && u.trim() !== '');
    }
    await product.save();
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
