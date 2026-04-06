import type { Request, Response } from 'express';
import {
  fetchGroupedCatalogPage,
  fetchGroupedProductByGroupId,
  type GroupedCatalogFilter,
} from '../services/groupedCatalog.service';

function parseFilter(req: Request): GroupedCatalogFilter {
  const { category, classFamily, q, activo, precioMin, precioMax } = req.query;

  const filter: GroupedCatalogFilter = {};

  if (activo === 'true') filter.activo = true;
  if (activo === 'false') filter.activo = false;

  if (typeof category === 'string' && category.trim()) filter.category = category;
  if (typeof classFamily === 'string' && classFamily.trim()) filter.classFamily = classFamily;
  if (typeof q === 'string' && q.trim()) filter.q = q;

  if (precioMin !== undefined && precioMin !== '') {
    const n = Number(precioMin);
    if (!Number.isNaN(n)) filter.precioMin = n;
  }
  if (precioMax !== undefined && precioMax !== '') {
    const n = Number(precioMax);
    if (!Number.isNaN(n)) filter.precioMax = n;
  }

  return filter;
}

/**
 * GET /api/catalog/grouped-products
 */
export const getGroupedProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const filter = parseFilter(req);
    const { groups, total, totalPages } = await fetchGroupedCatalogPage(filter, page, limit);
    res.json({
      groups,
      pagination: { page, limit, total, totalPages },
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
    const filter = parseFilter(req);
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
