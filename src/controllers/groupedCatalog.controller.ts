import type { Request, Response } from 'express';
import {
  fetchGroupedCatalogPage,
  fetchGroupedProductByGroupId,
} from '../services/groupedCatalog.service';
import { fetchCatalogFilterMeta } from '../services/catalogFilterMeta.service';
import { parseCatalogFilterFromRequest } from '../utils/parseCatalogFilter';

/**
 * GET /api/catalog/grouped-products
 */
export const getGroupedProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const filter = parseCatalogFilterFromRequest(req);
    const { groups, total, totalPages, source } = await fetchGroupedCatalogPage(filter, page, limit);
    res.json({
      groups,
      pagination: { page, limit, total, totalPages },
      source,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al agrupar productos';
    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/catalog/grouped-products/:groupId
 */
export const getGroupedProductById = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ error: 'groupId requerido' });
    }
    const filter = parseCatalogFilterFromRequest(req);
    const group = await fetchGroupedProductByGroupId(groupId, filter);
    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    res.json(group);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener grupo';
    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/catalog/filter-meta
 */
export const getCatalogFilterMeta = async (_req: Request, res: Response) => {
  try {
    const meta = await fetchCatalogFilterMeta();
    res.json(meta);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener metadata de filtros';
    res.status(500).json({ error: message });
  }
};
