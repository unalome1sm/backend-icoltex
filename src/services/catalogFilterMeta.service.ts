import { CatalogVitrinaGroup } from '../models/CatalogVitrinaGroup';
import { Product } from '../models/Product';
import { buildMergedCatalogRows } from './mergedCatalog.service';

export type CatalogFilterMeta = {
  clases: string[];
  categoriasByClase: Record<string, string[]>;
  colores: string[];
  precioMin: number | null;
  precioMax: number | null;
  totalGroups: number;
  totalVariants: number;
};

function sortEs(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

function variantDisplayPrice(v: {
  unidadMedida?: string;
  precioMetro?: number;
  precioKilos?: number;
}): number | undefined {
  const isKg = v.unidadMedida?.toUpperCase() === 'KG';
  if (isKg) return v.precioKilos ?? v.precioMetro;
  return v.precioMetro ?? v.precioKilos;
}

/**
 * Metadata de filtros derivada del catálogo vitrina + precios (misma base que /shop).
 */
export async function fetchCatalogFilterMeta(): Promise<CatalogFilterMeta> {
  const vitrinaCount = await CatalogVitrinaGroup.countDocuments();

  if (vitrinaCount === 0) {
    return buildLegacyFilterMeta();
  }

  const groups = await buildMergedCatalogRows({});
  const clasesSet = new Set<string>();
  const categoriasMap = new Map<string, Set<string>>();
  const coloresSet = new Set<string>();
  let precioMin: number | null = null;
  let precioMax: number | null = null;
  let totalVariants = 0;

  for (const group of groups) {
    const clase = group.claseFamilia?.trim();
    if (clase) {
      clasesSet.add(clase);
      if (!categoriasMap.has(clase)) categoriasMap.set(clase, new Set());
      if (group.categoria?.trim()) {
        categoriasMap.get(clase)!.add(group.categoria.trim());
      }
    }

    for (const v of group.variantes) {
      totalVariants++;
      if (v.colorLabel?.trim()) coloresSet.add(v.colorLabel.trim());
      const price = variantDisplayPrice(v);
      if (price != null && !Number.isNaN(price)) {
        precioMin = precioMin == null ? price : Math.min(precioMin, price);
        precioMax = precioMax == null ? price : Math.max(precioMax, price);
      }
    }
  }

  const categoriasByClase: Record<string, string[]> = {};
  for (const [clase, cats] of categoriasMap) {
    categoriasByClase[clase] = sortEs([...cats]);
  }

  return {
    clases: sortEs([...clasesSet]),
    categoriasByClase,
    colores: sortEs([...coloresSet]),
    precioMin,
    precioMax,
    totalGroups: groups.length,
    totalVariants,
  };
}

async function buildLegacyFilterMeta(): Promise<CatalogFilterMeta> {
  const products = await Product.find({ activo: true }).lean();
  const clasesSet = new Set<string>();
  const categoriasMap = new Map<string, Set<string>>();
  const coloresSet = new Set<string>();
  let precioMin: number | null = null;
  let precioMax: number | null = null;

  for (const p of products) {
    if (p.claseFamilia?.trim()) {
      clasesSet.add(p.claseFamilia.trim());
      if (!categoriasMap.has(p.claseFamilia.trim())) {
        categoriasMap.set(p.claseFamilia.trim(), new Set());
      }
      if (p.categoria?.trim()) {
        categoriasMap.get(p.claseFamilia.trim())!.add(p.categoria.trim());
      }
    }
    if (p.colores?.trim()) coloresSet.add(p.colores.trim());
    const price = p.precioMetro ?? p.precioKilos;
    if (price != null) {
      precioMin = precioMin == null ? price : Math.min(precioMin, price);
      precioMax = precioMax == null ? price : Math.max(precioMax, price);
    }
  }

  const categoriasByClase: Record<string, string[]> = {};
  for (const [clase, cats] of categoriasMap) {
    categoriasByClase[clase] = sortEs([...cats]);
  }

  return {
    clases: sortEs([...clasesSet]),
    categoriasByClase,
    colores: sortEs([...coloresSet]),
    precioMin,
    precioMax,
    totalGroups: products.length,
    totalVariants: products.length,
  };
}

export function parseListParam(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeFilterList(values: string[] | undefined): string[] | undefined {
  if (!values?.length) return undefined;
  const normalized = values.map((v) => v.trim()).filter(Boolean);
  return normalized.length ? normalized : undefined;
}
