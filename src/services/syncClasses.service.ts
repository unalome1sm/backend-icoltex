/**
 * Sincroniza clases/familias desde la API Icoltex hacia MongoDB (upsert por nombre).
 */
import { ProductClass } from '../models/ProductClass';
import { fetchClassesFromIcoltex } from './externalApi.service';

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

function mapIcoltexItemToClass(item: Record<string, unknown>): { nombre: string; activo: boolean } | null {
  const nombre = getString(item, 'Clase/Familia', 'Clase Familia', 'claseFamilia', 'clase', 'familia', 'nombre');
  if (!nombre) return null;

  return {
    nombre,
    activo: true,
  };
}

export interface SyncClassesResult {
  totalFetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  details?: string[];
}

/**
 * Obtiene clases/familias del webhook Icoltex y las sincroniza en MongoDB.
 */
export async function syncClassesFromIcoltex(): Promise<SyncClassesResult> {
  const raw = await fetchClassesFromIcoltex();
  const result: SyncClassesResult = {
    totalFetched: raw.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  let totalToProcess = 0;
  for (const item of raw) totalToProcess += unwrapItem(item).length;
  console.log('[Sync] Clases: iniciando,', totalToProcess, 'registros a procesar');

  const seen = new Set<string>();
  let processed = 0;

  for (const item of raw) {
    const classRecords = unwrapItem(item);
    for (const classRecord of classRecords) {
      processed++;
      if (processed % 100 === 0 || processed === totalToProcess) {
        console.log('[Sync] Clases: procesados', processed, '/', totalToProcess);
      }
      try {
        const mapped = mapIcoltexItemToClass(classRecord);
        if (!mapped) {
          result.skipped++;
          result.details = result.details || [];
          const keys = Object.keys(classRecord).join(', ');
          result.details.push(`Omitido (sin nombre de clase). Claves del ítem: [${keys}]`);
          continue;
        }

        const normalized = mapped.nombre.toLocaleLowerCase('es-CO');
        if (seen.has(normalized)) {
          result.skipped++;
          continue;
        }
        seen.add(normalized);

        const existing = await ProductClass.findOne({
          nombre: { $regex: `^${mapped.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });

        if (existing) {
          await ProductClass.updateOne({ _id: existing._id }, { $set: mapped });
          result.updated++;
        } else {
          await ProductClass.create(mapped);
          result.created++;
        }
      } catch (err: any) {
        result.errors++;
        result.details = result.details || [];
        result.details.push(`${mappedClassName(classRecord)}: ${err.message}`);
      }
    }
  }

  console.log('[Sync] Clases: terminado, devolviendo resultado');
  return result;
}

function mappedClassName(item: Record<string, unknown>): string {
  return getString(item, 'Clase/Familia', 'Clase Familia', 'claseFamilia', 'clase', 'familia', 'nombre') || '?';
}
