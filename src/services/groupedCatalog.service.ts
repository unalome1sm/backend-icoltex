/**
 * Catálogo agrupado para la tienda.
 * Fuente principal: vitrina Tangara (caracteristicas) + precios Mongo (items_icoltex).
 * Fallback legacy: agrupación derivada de Product.nombre si no hay vitrina sincronizada.
 */
import type { FilterQuery } from 'mongoose';
import { Product, type IProduct } from '../models/Product';
import { getCatalogVitrinaSyncMeta } from './syncCatalogVitrina.service';
import {
  groupMatchesCatalogFilter,
  sortCatalogGroups,
  variantDisplayPrice,
  variantMatchesCatalogFilter,
} from '../utils/catalogFilterApply';
import {
  buildMergedCatalogRows,
  fetchMergedCatalogPage,
  fetchMergedProductByGroupId,
  type MergedProductRow,
} from './mergedCatalog.service';
import { decodeGroupId, encodeGroupId } from './catalogVitrinaWebhook.service';

export type GroupedProductVariant = {
  mongoId: string;
  codigo: string;
  colorLabel: string;
  codigoTono?: string;
  itemNameCompleto: string;
  stock: number;
  precioMetro?: number;
  precioKilos?: number;
  activo: boolean;
  imageUrls?: string[];
  caracteristica?: string;
  recomendacionesUsos?: string;
  recomendacionesCuidados?: string;
  unidadMedida?: string;
  tienePrecio?: boolean;
};

export type GroupedProductRow = {
  groupId: string;
  groupKey: string;
  nombreVitrina: string;
  claseFamilia?: string;
  categoria?: string;
  variantes: GroupedProductVariant[];
  precioDesde?: number;
  variantCount: number;
};

export { decodeGroupId, encodeGroupId };

export type CatalogSortOption = 'relevance' | 'price-asc' | 'price-desc' | 'name';

export type GroupedCatalogFilter = {
  activo?: boolean;
  /** @deprecated Usar categories */
  category?: string;
  categories?: string[];
  classFamily?: string;
  colors?: string[];
  q?: string;
  precioMin?: number;
  precioMax?: number;
  inStock?: boolean;
  sort?: CatalogSortOption;
};

// --- Legacy fallback (agrupación por nombre en Product) ---

function normalizeKeyPart(s: string | undefined): string {
  return (s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function parseBaseFromNombre(nombre: string): string {
  const t = nombre.trim().replace(/^\*+\s*/, '');
  const idx = t.indexOf(':');
  if (idx === -1) return t;
  return t.slice(0, idx).trim() || t;
}

function extractCodigoTono(nombre: string): string | undefined {
  const m = nombre.match(/#\s*(\d{4})\s*$/);
  return m ? m[1] : undefined;
}

function colorLabelFromNombre(nombre: string, colores?: string): string {
  const c = colores?.trim();
  if (c && !/^tipo\s+[a-z]\s*$/i.test(c)) return c;
  const t = nombre.trim();
  const idx = t.indexOf(':');
  const resto = idx === -1 ? '' : t.slice(idx + 1).trim();
  const beforeHash = resto.split('#')[0].trim();
  if (beforeHash) return beforeHash;
  return c || resto || nombre.trim();
}

function productToVariant(doc: IProduct): GroupedProductVariant {
  const plain = doc.toObject({ flattenMaps: true });
  const nombre = String(plain.nombre ?? '');
  const tienePrecio =
    (plain.precioMetro != null && !Number.isNaN(plain.precioMetro)) ||
    (plain.precioKilos != null && !Number.isNaN(plain.precioKilos));

  return {
    mongoId: String(plain._id),
    codigo: plain.codigo,
    colorLabel: colorLabelFromNombre(nombre, plain.colores),
    codigoTono: extractCodigoTono(nombre),
    itemNameCompleto: nombre,
    stock: plain.stock ?? 0,
    precioMetro: plain.precioMetro,
    precioKilos: plain.precioKilos,
    activo: plain.activo !== false,
    imageUrls: plain.imageUrls,
    caracteristica: plain.caracteristica,
    recomendacionesUsos: plain.recomendacionesUsos,
    recomendacionesCuidados: plain.recomendacionesCuidados,
    unidadMedida: plain.unidadMedida,
    tienePrecio,
  };
}

function buildLegacyGroupKey(doc: IProduct): string {
  const plain = doc.toObject({ flattenMaps: true });
  const base = parseBaseFromNombre(String(plain.nombre ?? ''));
  return [
    normalizeKeyPart(plain.claseFamilia),
    normalizeKeyPart(plain.categoria),
    normalizeKeyPart(base),
  ].join('|');
}

function buildProductFilter(f: GroupedCatalogFilter): FilterQuery<IProduct> {
  const filter: FilterQuery<IProduct> = {};

  if (f.activo === true || f.activo === false) {
    filter.activo = f.activo;
  }

  if (f.category?.trim()) {
    filter.categoria = { $regex: f.category.trim(), $options: 'i' };
  }

  if (f.classFamily?.trim()) {
    filter.claseFamilia = { $regex: f.classFamily.trim(), $options: 'i' };
  }

  if (f.precioMin != null && !Number.isNaN(f.precioMin)) {
    filter.precioMetro = { ...(filter.precioMetro as object), $gte: f.precioMin };
  }
  if (f.precioMax != null && !Number.isNaN(f.precioMax)) {
    filter.precioMetro = { ...(filter.precioMetro as object), $lte: f.precioMax };
  }

  if (f.q?.trim()) {
    const rx = f.q.trim();
    filter.$or = [
      { nombre: { $regex: rx, $options: 'i' } },
      { codigo: { $regex: rx, $options: 'i' } },
      { categoria: { $regex: rx, $options: 'i' } },
      { claseFamilia: { $regex: rx, $options: 'i' } },
    ];
  }

  return filter;
}

function groupProductsLegacy(docs: IProduct[]): GroupedProductRow[] {
  const map = new Map<string, { groupKey: string; docs: IProduct[] }>();

  for (const doc of docs) {
    const groupKey = buildLegacyGroupKey(doc);
    let entry = map.get(groupKey);
    if (!entry) {
      entry = { groupKey, docs: [] };
      map.set(groupKey, entry);
    }
    entry.docs.push(doc);
  }

  const rows: GroupedProductRow[] = [];

  for (const { groupKey, docs: groupDocs } of map.values()) {
    const first = groupDocs[0];
    const plain = first.toObject({ flattenMaps: true });
    const nombreVitrina = parseBaseFromNombre(String(plain.nombre ?? plain.codigo ?? ''));
    const variantes = groupDocs.map(productToVariant);
    const precios = variantes
      .map(variantDisplayPrice)
      .filter((p): p is number => p != null && !Number.isNaN(p));
    const precioDesde = precios.length ? Math.min(...precios) : undefined;

    rows.push({
      groupId: encodeGroupId(groupKey),
      groupKey,
      nombreVitrina,
      claseFamilia: plain.claseFamilia || undefined,
      categoria: plain.categoria || undefined,
      variantes,
      precioDesde,
      variantCount: variantes.length,
    });
  }

  rows.sort((a, b) => {
    const ca = (a.claseFamilia ?? '').localeCompare(b.claseFamilia ?? '', 'es', { sensitivity: 'base' });
    if (ca !== 0) return ca;
    const cc = (a.categoria ?? '').localeCompare(b.categoria ?? '', 'es', { sensitivity: 'base' });
    if (cc !== 0) return cc;
    return a.nombreVitrina.localeCompare(b.nombreVitrina, 'es', { sensitivity: 'base' });
  });

  return rows;
}

function applyCatalogFiltersToRows(
  rows: GroupedProductRow[],
  filter: GroupedCatalogFilter
): GroupedProductRow[] {
  const requirePrice = filter.activo !== false;
  const filtered = rows
    .filter((group) => groupMatchesCatalogFilter(group, filter))
    .map((group) => {
      const variantes = group.variantes.filter((v) =>
        variantMatchesCatalogFilter(
          { ...v, tienePrecio: v.tienePrecio ?? Boolean(v.precioMetro ?? v.precioKilos) },
          filter,
          requirePrice
        )
      );
      const precios = variantes
        .map(variantDisplayPrice)
        .filter((p): p is number => p != null && !Number.isNaN(p));
      return {
        ...group,
        variantes,
        variantCount: variantes.length,
        precioDesde: precios.length ? Math.min(...precios) : undefined,
      };
    })
    .filter((group) => group.variantes.length > 0);

  if (filter.sort && filter.sort !== 'relevance') {
    return sortCatalogGroups(filtered, filter.sort);
  }
  return filtered;
}

async function fetchLegacyGroupedRows(filter: GroupedCatalogFilter): Promise<GroupedProductRow[]> {
  const mongoFilter = buildProductFilter(filter);
  const docs = await Product.find(mongoFilter).sort({ nombre: 1 });
  return applyCatalogFiltersToRows(groupProductsLegacy(docs), filter);
}

function mergedToGrouped(row: MergedProductRow): GroupedProductRow {
  return row;
}

async function useMergedCatalog(): Promise<boolean> {
  const meta = await getCatalogVitrinaSyncMeta();
  return meta.groupCount > 0;
}

export async function fetchGroupedCatalogRows(filter: GroupedCatalogFilter): Promise<GroupedProductRow[]> {
  if (await useMergedCatalog()) {
    return (await buildMergedCatalogRows(filter)).map(mergedToGrouped);
  }
  return fetchLegacyGroupedRows(filter);
}

export async function fetchGroupedCatalogPage(
  filter: GroupedCatalogFilter,
  page: number,
  limit: number
): Promise<{ groups: GroupedProductRow[]; total: number; totalPages: number; source?: string }> {
  if (await useMergedCatalog()) {
    const result = await fetchMergedCatalogPage(filter, page, limit);
    return {
      groups: result.groups.map(mergedToGrouped),
      total: result.total,
      totalPages: result.totalPages,
      source: result.source,
    };
  }

  const all = await fetchLegacyGroupedRows(filter);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * limit;

  return {
    groups: all.slice(skip, skip + limit),
    total,
    totalPages,
    source: 'legacy-products',
  };
}

export async function fetchGroupedProductByGroupId(
  groupId: string,
  filter: GroupedCatalogFilter
): Promise<GroupedProductRow | null> {
  if (await useMergedCatalog()) {
    const row = await fetchMergedProductByGroupId(groupId, filter);
    return row ? mergedToGrouped(row) : null;
  }

  const groupKey = decodeGroupId(groupId);
  if (!groupKey) return null;
  const all = await fetchLegacyGroupedRows(filter);
  return all.find((g) => g.groupKey === groupKey) ?? null;
}
