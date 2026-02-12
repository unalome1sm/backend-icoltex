import { Request, Response } from 'express';
import { ProductClass } from '../models/ProductClass';

export const getClasses = async (req: Request, res: Response) => {
  try {
    const { activo, page = 1, limit = 100 } = req.query;
    const filter: Record<string, unknown> = {};

    if (activo !== undefined) {
      filter.activo = activo === 'true';
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const classes = await ProductClass.find(filter)
      .sort({ nombre: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await ProductClass.countDocuments(filter);

    res.json({
      classes,
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

export const getClassById = async (req: Request, res: Response) => {
  try {
    const item = await ProductClass.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Clase no encontrada' });
    }
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
