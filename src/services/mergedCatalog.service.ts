/**
 * Catálogo de tienda: estructura vitrina (caracterisiticas_items_icoltex en Mongo)
 * + precios e imágenes (items_icoltex → colección Product).
 */
import { CatalogVitrinaGroup, type ICatalogVitrinaGroup } from '../models/CatalogVitrinaGroup';
import { Product, type IProduct } from '../models/Product';
import { decodeGroupId, encodeGroupId } from './catalogVitrinaWebhook.service';
import type { GroupedCatalogFilter } from './groupedCatalog.service';
import {
  groupMatchesCatalogFilter,
  sortCatalogGroups,
  variantDisplayPrice,
  variantMatchesCatalogFilter,
} from '../utils/catalogFilterApply';

export type MergedProductVariant = {
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
  tienePrecio: boolean;
};

export type MergedProductRow = {
  groupId: string;
  groupKey: string;
  nombreVitrina: string;
  claseFamilia?: string;
  categoria?: string;
  variantes: MergedProductVariant[];
  precioDesde?: number;
  variantCount: number;
};

function extractCodigoTono(nombre: string): string | undefined {
  const m = nombre.match(/#\s*(\d{4})\s*$/);
  return m ? m[1] : undefined;
}

function hasPrice(product: IProduct | undefined): boolean {
  if (!product) return false;
  return (
    (product.precioMetro != null && !Number.isNaN(product.precioMetro)) ||
    (product.precioKilos != null && !Number.isNaN(product.precioKilos))
  );
}

function mergeVariant(
  vitrinaVariant: ICatalogVitrinaGroup['variantes'][number],
  product?: IProduct
): MergedProductVariant {
  const plain = product?.toObject({ flattenMaps: true });
  const itemName = vitrinaVariant.itemNameCompleto;

  return {
    mongoId: plain?._id ? String(plain._id) : vitrinaVariant.codigo,
    codigo: vitrinaVariant.codigo,
    colorLabel: vitrinaVariant.colorLabel,
    codigoTono: extractCodigoTono(itemName),
    itemNameCompleto: itemName,
    stock: vitrinaVariant.stock,
    precioMetro: plain?.precioMetro,
    precioKilos: plain?.precioKilos,
    activo: vitrinaVariant.activo,
    imageUrls: plain?.imageUrls,
    caracteristica: plain?.caracteristica,
    recomendacionesUsos: plain?.recomendacionesUsos,
    recomendacionesCuidados: plain?.recomendacionesCuidados,
    unidadMedida: vitrinaVariant.unidadMedida ?? plain?.unidadMedida,
    tienePrecio: hasPrice(product),
  };
}

function sortVariantes(a: MergedProductVariant, b: MergedProductVariant): number {
  const byColor = a.colorLabel.localeCompare(b.colorLabel, 'es', { sensitivity: 'base' });
  if (byColor !== 0) return byColor;
  const ta = a.codigoTono ?? '';
  const tb = b.codigoTono ?? '';
  if (ta !== tb) return ta.localeCompare(tb, undefined, { numeric: true });
  return a.codigo.localeCompare(b.codigo);
}

function sortGroups(a: MergedProductRow, b: MergedProductRow): number {
  const ca = (a.claseFamilia ?? '').localeCompare(b.claseFamilia ?? '', 'es', {
    sensitivity: 'base',
  });
  if (ca !== 0) return ca;
  const cc = (a.categoria ?? '').localeCompare(b.categoria ?? '', 'es', {
    sensitivity: 'base',
  });
  if (cc !== 0) return cc;
  return a.nombreVitrina.localeCompare(b.nombreVitrina, 'es', { sensitivity: 'base' });
}

async function loadProductsByCodigo(): Promise<Map<string, IProduct>> {
  const products = await Product.find({});
  const map = new Map<string, IProduct>();
  for (const product of products) {
    map.set(product.codigo, product);
  }
  return map;
}

export async function buildMergedCatalogRows(
  filter: GroupedCatalogFilter,
  options?: { requirePrice?: boolean }
): Promise<MergedProductRow[]> {
  const requirePrice = options?.requirePrice ?? filter.activo !== false;
  const vitrinaGroups = await CatalogVitrinaGroup.find({}).sort({ nombreVitrina: 1 });

  if (vitrinaGroups.length === 0) {
    return [];
  }

  const productsByCodigo = await loadProductsByCodigo();
  const rows: MergedProductRow[] = [];

  for (const group of vitrinaGroups) {
    if (!groupMatchesCatalogFilter(group, filter)) continue;

    const variantes = group.variantes
      .map((v) => mergeVariant(v, productsByCodigo.get(v.codigo)))
      .filter((v) => variantMatchesCatalogFilter(v, filter, requirePrice))
      .sort(sortVariantes);

    if (variantes.length === 0) continue;

    const precios = variantes
      .map(variantDisplayPrice)
      .filter((p): p is number => p != null && !Number.isNaN(p));
    const precioDesde = precios.length ? Math.min(...precios) : undefined;

    rows.push({
      groupId: encodeGroupId(group.groupKey),
      groupKey: group.groupKey,
      nombreVitrina: group.nombreVitrina,
      claseFamilia: group.claseFamilia || undefined,
      categoria: group.categoria || undefined,
      variantes,
      precioDesde,
      variantCount: variantes.length,
    });
  }

  if (filter.sort && filter.sort !== 'relevance') {
    return sortCatalogGroups(rows, filter.sort);
  }

  rows.sort(sortGroups);
  return rows;
}

export async function fetchMergedCatalogPage(
  filter: GroupedCatalogFilter,
  page: number,
  limit: number
): Promise<{ groups: MergedProductRow[]; total: number; totalPages: number; source: string }> {
  const all = await buildMergedCatalogRows(filter);
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * limit;

  return {
    groups: all.slice(skip, skip + limit),
    total,
    totalPages,
    source: 'catalog-vitrina+products',
  };
}

export async function fetchMergedProductByGroupId(
  groupId: string,
  filter: GroupedCatalogFilter
): Promise<MergedProductRow | null> {
  const all = await buildMergedCatalogRows(filter);
  const groupKey = decodeGroupId(groupId);
  return all.find((g) => g.groupId === groupId || (groupKey && g.groupKey === groupKey)) ?? null;
}

export async function buildPriceLookup(): Promise<Map<string, boolean>> {
  const products = await Product.find({}).select('codigo precioMetro precioKilos');
  const map = new Map<string, boolean>();
  for (const product of products) {
    map.set(product.codigo, hasPrice(product));
  }
  return map;
}
