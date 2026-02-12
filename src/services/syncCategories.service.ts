/**
 * Sincroniza categorias desde la API Icoltex hacia MongoDB (upsert por nombre).
 */
import { ProductCategory } from '../models/ProductCategory';
import { fetchCategoriesFromIcoltex } from './externalApi.service';

function getString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (v == null) continue;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    if (s !== '') return s;
  }
  return '';
}

function unwrapItem(item: Record<string, unknown>): Record<string, unknown>[] {
  const inner = item.result ?? item.data ?? item.value;
  if (inner != null && typeof inner === 'object') {
    if (Array.isArray(inner)) {
      return inner.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object') as Record<string, unknown>[];
    }
    return [inner as Record<string, unknown>];
  }
  return [item];
}

function mapIcoltexItemToCategory(item: Record<string, unknown>): { nombre: string; activo: boolean } | null {
  const nombre = getString(item, 'Categoria', 'Categoría', 'categoria', 'nombre');
  if (!nombre) return null;
  return { nombre, activo: true };
}

function mappedCategoryName(item: Record<string, unknown>): string {
  return getString(item, 'Categoria', 'Categoría', 'categoria', 'nombre') || '?';
}

export interface SyncCategoriesResult {
  totalFetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  details?: string[];
}

export async function syncCategoriesFromIcoltex(): Promise<SyncCategoriesResult> {
  const raw = await fetchCategoriesFromIcoltex();
  const result: SyncCategoriesResult = {
    totalFetched: raw.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  let totalToProcess = 0;
  for (const item of raw) totalToProcess += unwrapItem(item).length;
  console.log('[Sync] Categorias: iniciando,', totalToProcess, 'registros a procesar');

  const seen = new Set<string>();
  let processed = 0;

  for (const item of raw) {
    const categoryRecords = unwrapItem(item);
    for (const categoryRecord of categoryRecords) {
      processed++;
      if (processed % 100 === 0 || processed === totalToProcess) {
        console.log('[Sync] Categorias: procesados', processed, '/', totalToProcess);
      }
      try {
        const mapped = mapIcoltexItemToCategory(categoryRecord);
        if (!mapped) {
          result.skipped++;
          result.details = result.details || [];
          const keys = Object.keys(categoryRecord).join(', ');
          result.details.push(`Omitido (sin nombre de categoria). Claves del item: [${keys}]`);
          continue;
        }

        const normalized = mapped.nombre.toLocaleLowerCase('es-CO');
        if (seen.has(normalized)) {
          result.skipped++;
          continue;
        }
        seen.add(normalized);

        const existing = await ProductCategory.findOne({
          nombre: { $regex: `^${mapped.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });

        if (existing) {
          await ProductCategory.updateOne({ _id: existing._id }, { $set: mapped });
          result.updated++;
        } else {
          await ProductCategory.create(mapped);
          result.created++;
        }
      } catch (err: any) {
        result.errors++;
        result.details = result.details || [];
        result.details.push(`${mappedCategoryName(categoryRecord)}: ${err.message}`);
      }
    }
  }

  console.log('[Sync] Categorias: terminado, devolviendo resultado');
  return result;
}
