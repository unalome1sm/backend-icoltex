import { Request, Response } from 'express';
import { CatalogVitrinaGroup } from '../models/CatalogVitrinaGroup';
import {
  fetchCatalogVitrinaFromWebhook,
  flattenCatalogCharacteristics,
} from '../services/catalogVitrinaWebhook.service';
import { buildPriceLookup } from '../services/mergedCatalog.service';
import type { CatalogVitrinaGroup as CatalogVitrinaGroupDto } from '../types/catalogVitrina.types';

async function loadCatalogGroups(): Promise<CatalogVitrinaGroupDto[]> {
  const stored = await CatalogVitrinaGroup.find({}).sort({ nombreVitrina: 1 }).lean();

  if (stored.length > 0) {
    return stored.map((doc) => ({
      groupKey: doc.groupKey,
      nombreVitrina: doc.nombreVitrina,
      claseFamilia: doc.claseFamilia,
      categoria: doc.categoria,
      variantes: doc.variantes,
    }));
  }

  return fetchCatalogVitrinaFromWebhook();
}

/**
 * GET /api/catalog/item-characteristics
 * Catálogo vitrina Tangara + indicador de precio (items_icoltex en Mongo).
 */
export const getItemCharacteristics = async (_req: Request, res: Response) => {
  try {
    const groups = await loadCatalogGroups();
    const priceByCodigo = await buildPriceLookup();
    const items = flattenCatalogCharacteristics(groups, priceByCodigo);
    const meta = await CatalogVitrinaGroup.findOne()
      .sort({ syncedAt: -1 })
      .select('syncedAt')
      .lean();

    res.json({
      count: items.length,
      groupCount: groups.length,
      items,
      groups,
      source: meta ? 'mongodb' : 'webhook-live',
      lastSyncedAt: meta?.syncedAt ? new Date(meta.syncedAt).toISOString() : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener catálogo vitrina';
    res.status(502).json({ error: message });
  }
};
