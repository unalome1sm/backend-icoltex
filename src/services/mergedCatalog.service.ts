/**
 * Catálogo de tienda: estructura vitrina (info-items-x-ref en Mongo)
 * + precios e imágenes SKU (items_icoltex → colección Product).
 */
import { CatalogVitrinaGroup, type ICatalogVitrinaFiltros, type ICatalogVitrinaGroup } from '../models/CatalogVitrinaGroup';
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
  colorHex?: string;
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
  descripcionCorta?: string;
  descripcionLarga?: string;
  caracteristicas?: string;
  usos?: string;
  cuidados?: string;
  imageUrls?: string[];
  filtros?: ICatalogVitrinaFiltros[];
  variantes: MergedProductVariant[];
  precioDesde?: number;
  variantCount: number;
  esDestacado?: boolean;
  esNovedad?: boolean;
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

function isNoUtilizarVariant(itemNameCompleto: string): boolean {
  return /^NO\s*UTILIZAR\b/i.test(itemNameCompleto.trim());
}

function resolveVariantImageUrls(
  product?: IProduct,
  groupImageUrls?: string[]
): string[] | undefined {
  if (product?.imageUrls?.length) return product.imageUrls;
  if (groupImageUrls?.length) return groupImageUrls;
  return undefined;
}

function mergeVariant(
  vitrinaVariant: ICatalogVitrinaGroup['variantes'][number],
  group: Pick<ICatalogVitrinaGroup, 'usos' | 'cuidados'>,
  product?: IProduct,
  groupImageUrls?: string[]
): MergedProductVariant {
  const plain = product?.toObject({ flattenMaps: true });
  const itemName = vitrinaVariant.itemNameCompleto;

  return {
    mongoId: plain?._id ? String(plain._id) : vitrinaVariant.codigo,
    codigo: vitrinaVariant.codigo,
    colorLabel: vitrinaVariant.colorLabel,
    colorHex: vitrinaVariant.colorHex || undefined,
    codigoTono: extractCodigoTono(itemName),
    itemNameCompleto: itemName,
    stock: vitrinaVariant.stock,
    precioMetro: plain?.precioMetro,
    precioKilos: plain?.precioKilos,
    activo: vitrinaVariant.activo,
    imageUrls: resolveVariantImageUrls(product, groupImageUrls),
    caracteristica: vitrinaVariant.caracteristica ?? plain?.caracteristica,
    recomendacionesUsos: group.usos?.trim() || plain?.recomendacionesUsos,
    recomendacionesCuidados: group.cuidados?.trim() || plain?.recomendacionesCuidados,
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

function buildVitrinaMongoQuery(filter: GroupedCatalogFilter): Record<string, unknown> {
  const q: Record<string, unknown> = {};
  if (filter.destacado === true) q.esDestacado = true;
  if (filter.novedad === true) q.esNovedad = true;
  return q;
}

function vitrinaSort(filter: GroupedCatalogFilter): Record<string, 1 | -1> {
  if (filter.destacado === true || filter.novedad === true) {
    return { merchandisingUpdatedAt: -1, nombreVitrina: 1 };
  }
  return { nombreVitrina: 1 };
}

export async function buildMergedCatalogRows(
  filter: GroupedCatalogFilter,
  options?: { requirePrice?: boolean }
): Promise<MergedProductRow[]> {
  const requirePrice = options?.requirePrice ?? filter.activo !== false;
  const vitrinaGroups = await CatalogVitrinaGroup.find(buildVitrinaMongoQuery(filter)).sort(
    vitrinaSort(filter)
  );

  if (vitrinaGroups.length === 0) {
    return [];
  }

  const productsByCodigo = await loadProductsByCodigo();
  const rows: MergedProductRow[] = [];

  for (const group of vitrinaGroups) {
    if (!groupMatchesCatalogFilter(group, filter)) continue;

    const groupImageUrls = group.imageUrls?.length ? group.imageUrls : undefined;

    const variantes = group.variantes
      .filter((v) => !isNoUtilizarVariant(v.itemNameCompleto))
      .map((v) => mergeVariant(v, group, productsByCodigo.get(v.codigo), groupImageUrls))
      .filter((v) => variantMatchesCatalogFilter(v, filter, requirePrice))
      .sort(sortVariantes);

    if (variantes.length === 0) continue;

    const precios = variantes
      .map(variantDisplayPrice)
      .filter((p): p is number => p != null && !Number.isNaN(p));
    const precioDesde = precios.length ? Math.min(...precios) : undefined;

    const rowImageUrls =
      groupImageUrls ??
      variantes.find((v) => v.imageUrls?.length)?.imageUrls;

    rows.push({
      groupId: encodeGroupId(group.groupKey),
      groupKey: group.groupKey,
      nombreVitrina: group.nombreVitrina,
      claseFamilia: group.claseFamilia || undefined,
      categoria: group.categoria || undefined,
      descripcionCorta: group.descripcionCorta || undefined,
      descripcionLarga: group.descripcionLarga || undefined,
      caracteristicas: group.caracteristicas || undefined,
      usos: group.usos || undefined,
      cuidados: group.cuidados || undefined,
      imageUrls: rowImageUrls,
      filtros: group.filtros?.length ? group.filtros : undefined,
      variantes,
      precioDesde,
      variantCount: variantes.length,
      esDestacado: Boolean(group.esDestacado),
      esNovedad: Boolean(group.esNovedad),
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
    source: 'info-items-x-ref+items_icoltex',
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
