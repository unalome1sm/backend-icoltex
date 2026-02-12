/**
 * Sincroniza productos (items) desde la API Icoltex hacia MongoDB (upsert por codigo).
 */
import { Product } from '../models/Product';
import { fetchItemsFromIcoltex } from './externalApi.service';

function getString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (v == null) continue;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    if (s !== '') return s;
  }
  return '';
}

function getNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (v == null) continue;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

/**
 * La API puede devolver cada ítem como { code, result } con los productos dentro de result (objeto o array).
 */
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

function getItemCode(item: Record<string, unknown>): string {
  const keys = ['ItemCode', 'Item Code', 'itemCode', 'item_code', 'Código', 'Codigo', 'codigo', 'id', 'ID'];
  for (const key of keys) {
    const v = item[key];
    if (v == null) continue;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    if (s !== '') return s;
  }
  const lower = (x: string) => x.toLowerCase().normalize('NFD').replace(/\u0307/g, '').replace(/ó/g, 'o');
  for (const key of Object.keys(item)) {
    const k = lower(key);
    if (k.includes('itemcode') || k.includes('codigo')) {
      const v = item[key];
      if (v == null) continue;
      const s = typeof v === 'string' ? v.trim() : String(v).trim();
      if (s !== '') return s;
    }
  }
  return '';
}

/**
 * Mapea un ítem de la API Icoltex al formato del modelo Product.
 */
function mapIcoltexItemToProduct(item: Record<string, unknown>): Record<string, unknown> | null {
  const codigo = getItemCode(item);
  if (!codigo) return null;

  const nombre = getString(item, 'ItemName', 'Item Name', 'itemName', 'Nombre', 'nombre') || codigo;
  const estado = getString(item, 'Estado', 'estado').toUpperCase();
  const activo = estado === 'ACTIVO';

  const stock = getNumber(item, 'Stock', 'stock');
  const precioMetro = getNumber(item, 'Precio Metro', 'PrecioMetro', 'precioMetro');
  const precioKilos = getNumber(item, 'Precio Kilos', 'PrecioKilos', 'precioKilos');

  return {
    codigo: codigo.trim(),
    nombre,
    claseFamilia: getString(item, 'Clase/Familia', 'Clase Familia', 'claseFamilia') || undefined,
    categoria: getString(item, 'Categoría', 'Categoria', 'categoria') || undefined,
    stock: stock ?? 0,
    colores: getString(item, 'Colores', 'colores') || undefined,
    unidadMedida: getString(item, 'Unidad de Medida', 'UnidadMedida', 'unidadMedida') || undefined,
    caracteristica: getString(item, 'Característica', 'Caracteristica', 'caracteristica') || undefined,
    recomendacionesCuidados: getString(item, 'Recomendaciones_Cuidados', 'RecomendacionesCuidados') || undefined,
    recomendacionesUsos: getString(item, 'Recomendaciones_Usos', 'RecomendacionesUsos') || undefined,
    precioMetro: precioMetro ?? undefined,
    precioKilos: precioKilos ?? undefined,
    activo,
  };
}

export interface SyncProductsResult {
  totalFetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  details?: string[];
}

/**
 * Obtiene items del webhook Icoltex y los sincroniza en MongoDB (crear o actualizar por codigo).
 */
export async function syncProductsFromIcoltex(): Promise<SyncProductsResult> {
  const raw = await fetchItemsFromIcoltex();
  const result: SyncProductsResult = {
    totalFetched: raw.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  let totalToProcess = 0;
  for (const item of raw) totalToProcess += unwrapItem(item).length;
  console.log('[Sync] Productos: iniciando,', totalToProcess, 'productos a procesar');

  let processed = 0;
  for (const item of raw) {
    const productRecords = unwrapItem(item);
    for (const productRecord of productRecords) {
      processed++;
      if (processed % 100 === 0 || processed === totalToProcess) {
        console.log('[Sync] Productos: procesados', processed, '/', totalToProcess);
      }
      try {
        const mapped = mapIcoltexItemToProduct(productRecord);
        if (!mapped) {
          result.skipped++;
          result.details = result.details || [];
          const code = getItemCode(productRecord);
          const keys = Object.keys(productRecord).join(', ');
          result.details.push(code ? `Omitido: ${code}` : `Omitido (sin ItemCode). Claves del ítem: [${keys}]`);
          continue;
        }

        const filter = { codigo: mapped.codigo };
        const existing = await Product.findOne(filter);

        if (existing) {
          await Product.updateOne(filter, { $set: mapped });
          result.updated++;
        } else {
          await Product.create(mapped);
          result.created++;
        }
      } catch (err: any) {
        result.errors++;
        result.details = result.details || [];
        result.details.push(`${getItemCode(productRecord) || '?'}: ${err.message}`);
      }
    }
  }

  console.log('[Sync] Productos: terminado, devolviendo resultado');
  return result;
}
