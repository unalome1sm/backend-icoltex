/**
 * Agrupa productos Mongo (sincronizados desde items_icoltex) por nombre de vitrina
 * derivado de `nombre` (ItemName): BASE antes del primer ":" + clase + categoría.
 */
import type { FilterQuery } from 'mongoose';
import { Product, type IProduct } from '../models/Product';

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

function normalizeKeyPart(s: string | undefined): string {
  return (s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Codifica groupKey para URL (base64url). */
export function encodeGroupId(groupKey: string): string {
  return Buffer.from(groupKey, 'utf8').toString('base64url');
}

export function decodeGroupId(groupId: string): string | null {
  try {
    const key = Buffer.from(groupId, 'base64url').toString('utf8');
    return key.length > 0 ? key : null;
  } catch {
    return null;
  }
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

/** Si Colores es solo "TIPO X", el tono real suele ir en el nombre tras ":". */
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
  };
}

function buildGroupKey(doc: IProduct): string {
  const plain = doc.toObject({ flattenMaps: true });
  const base = parseBaseFromNombre(String(plain.nombre ?? ''));
  return [
    normalizeKeyPart(plain.claseFamilia),
    normalizeKeyPart(plain.categoria),
    normalizeKeyPart(base),
  ].join('|');
}

function sortVariantes(a: GroupedProductVariant, b: GroupedProductVariant): number {
  const byColor = a.colorLabel.localeCompare(b.colorLabel, 'es', { sensitivity: 'base' });
  if (byColor !== 0) return byColor;
  const ta = a.codigoTono ?? '';
  const tb = b.codigoTono ?? '';
  if (ta !== tb) return ta.localeCompare(tb, undefined, { numeric: true });
  return a.codigo.localeCompare(b.codigo);
}

function sortGroups(a: GroupedProductRow, b: GroupedProductRow): number {
  const ca = (a.claseFamilia ?? '').localeCompare(b.claseFamilia ?? '', 'es', { sensitivity: 'base' });
  if (ca !== 0) return ca;
  const cc = (a.categoria ?? '').localeCompare(b.categoria ?? '', 'es', { sensitivity: 'base' });
  if (cc !== 0) return cc;
  return a.nombreVitrina.localeCompare(b.nombreVitrina, 'es', { sensitivity: 'base' });
}

export type GroupedCatalogFilter = {
  activo?: boolean;
  category?: string;
  classFamily?: string;
  q?: string;
  precioMin?: number;
  precioMax?: number;
};

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

export function groupProducts(docs: IProduct[]): GroupedProductRow[] {
  const map = new Map<string, { groupKey: string; docs: IProduct[] }>();

  for (const doc of docs) {
    const groupKey = buildGroupKey(doc);
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
    const variantes = groupDocs.map(productToVariant).sort(sortVariantes);
    const precios = variantes.map((v) => v.precioMetro).filter((p): p is number => p != null && !Number.isNaN(p));
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

  rows.sort(sortGroups);
  return rows;
}

export async function fetchGroupedCatalogRows(filter: GroupedCatalogFilter): Promise<GroupedProductRow[]> {
  const mongoFilter = buildProductFilter(filter);
  const docs = await Product.find(mongoFilter).sort({ nombre: 1 });
  return groupProducts(docs);
}

export async function fetchGroupedCatalogPage(
  filter: GroupedCatalogFilter,
  page: number,
  limit: number
): Promise<{ groups: GroupedProductRow[]; total: number; totalPages: number }> {
  const all = await fetchGroupedCatalogRows(filter);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * limit;
  const groups = all.slice(skip, skip + limit);
  return { groups, total, totalPages };
}

export async function fetchGroupedProductByGroupId(
  groupId: string,
  filter: GroupedCatalogFilter
): Promise<GroupedProductRow | null> {
  const groupKey = decodeGroupId(groupId);
  if (!groupKey) return null;
  const all = await fetchGroupedCatalogRows(filter);
  return all.find((g) => g.groupKey === groupKey) ?? null;
}
