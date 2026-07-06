/**
 * Sincroniza productos (items) desde items_icoltex hacia MongoDB (upsert por codigo).
 */
import { Product } from '../models/Product';
import { mapItemsIcoltexRawToCanonical } from '../mappers/mapItemsIcoltexToProduct';
import { fetchItemsFromIcoltex } from './externalApi.service';
import { getItemCode, unwrapSapResultItems } from '../utils/sapNormalize';

export interface SyncProductsResult {
  totalFetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  withImages: number;
  details?: string[];
}

function buildProductUpdate(
  mapped: ReturnType<typeof mapItemsIcoltexRawToCanonical>,
  existingImageUrls?: string[]
): Record<string, unknown> {
  if (!mapped) return {};

  const update: Record<string, unknown> = {
    codigo: mapped.codigo,
    nombre: mapped.nombre,
    claseFamilia: mapped.claseFamilia,
    categoria: mapped.categoria,
    stock: mapped.stock,
    colores: mapped.colores,
    unidadMedida: mapped.unidadMedida,
    caracteristica: mapped.caracteristica,
    recomendacionesCuidados: mapped.recomendacionesCuidados,
    recomendacionesUsos: mapped.recomendacionesUsos,
    precioMetro: mapped.precioMetro,
    precioKilos: mapped.precioKilos,
    activo: mapped.activo,
  };

  if (mapped.imageUrls?.length) {
    update.imageUrls = mapped.imageUrls;
  } else if (existingImageUrls?.length) {
    update.imageUrls = existingImageUrls;
  }

  return update;
}

export async function syncProductsFromIcoltex(): Promise<SyncProductsResult> {
  const raw = await fetchItemsFromIcoltex();
  const result: SyncProductsResult = {
    totalFetched: raw.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    withImages: 0,
    details: [],
  };

  let totalToProcess = 0;
  for (const item of raw) totalToProcess += unwrapSapResultItems(item).length;
  console.log('[Sync] Productos: iniciando,', totalToProcess, 'productos a procesar');

  let processed = 0;
  for (const item of raw) {
    const productRecords = unwrapSapResultItems(item);
    for (const productRecord of productRecords) {
      processed++;
      if (processed % 100 === 0 || processed === totalToProcess) {
        console.log('[Sync] Productos: procesados', processed, '/', totalToProcess);
      }
      try {
        const mapped = mapItemsIcoltexRawToCanonical(productRecord);
        if (!mapped) {
          result.skipped++;
          result.details = result.details || [];
          const code = getItemCode(productRecord);
          const keys = Object.keys(productRecord).join(', ');
          result.details.push(
            code ? `Omitido: ${code}` : `Omitido (sin ItemCode). Claves del ítem: [${keys}]`
          );
          continue;
        }

        if (mapped.imageUrls?.length) result.withImages++;

        const filter = { codigo: mapped.codigo };
        const existing = await Product.findOne(filter);
        const update = buildProductUpdate(mapped, existing?.imageUrls);

        if (existing) {
          await Product.updateOne(filter, { $set: update });
          result.updated++;
        } else {
          await Product.create(update);
          result.created++;
        }
      } catch (err: unknown) {
        result.errors++;
        result.details = result.details || [];
        const message = err instanceof Error ? err.message : String(err);
        result.details.push(`${getItemCode(productRecord) || '?'}: ${message}`);
      }
    }
  }

  console.log('[Sync] Productos: terminado, devolviendo resultado');
  return result;
}

export async function collectProductCodigosWithPrice(): Promise<Set<string>> {
  const products = await Product.find({
    $or: [
      { precioMetro: { $exists: true, $ne: null } },
      { precioKilos: { $exists: true, $ne: null } },
    ],
  })
    .select('codigo')
    .lean();

  return new Set(products.map((p) => p.codigo));
}
