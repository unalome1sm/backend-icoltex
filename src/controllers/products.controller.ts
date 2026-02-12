import { Request, Response } from 'express';
import { Product } from '../models/Product';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { activo, q, category, classFamily, page = 1, limit = 50 } = req.query;
    const filter: Record<string, unknown> = {};

    if (activo !== undefined) {
      filter.activo = activo === 'true';
    }

    if (category && typeof category === 'string') {
      filter.categoria = { $regex: category, $options: 'i' };
    }

    if (classFamily && typeof classFamily === 'string') {
      filter.claseFamilia = { $regex: classFamily, $options: 'i' };
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
