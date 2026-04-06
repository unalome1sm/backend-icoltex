import { Request, Response } from 'express';
import { fetchItemCharacteristicsFromWebhook } from '../services/itemCharacteristics.service';

/**
 * GET /api/catalog/item-characteristics
 * Proxy al webhook Tangara: clase + categoría + color por ítem de catálogo.
 */
export const getItemCharacteristics = async (_req: Request, res: Response) => {
  try {
    const items = await fetchItemCharacteristicsFromWebhook();
    res.json({
      count: items.length,
      items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener características';
    res.status(502).json({ error: message });
  }
};
