import { Request, Response } from 'express';
import { ProductCategory } from '../models/ProductCategory';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const { activo, page = 1, limit = 100 } = req.query;
    const filter: Record<string, unknown> = {};

    if (activo !== undefined) {
      filter.activo = activo === 'true';
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const categories = await ProductCategory.find(filter)
      .sort({ nombre: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ProductCategory.countDocuments(filter);

    res.json({
      categories,
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

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const item = await ProductCategory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Categoria no encontrada' });
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
