import { CatalogVitrinaGroup } from '../models/CatalogVitrinaGroup';
import { Product } from '../models/Product';
import { buildMergedCatalogRows } from './mergedCatalog.service';

export type CatalogFilterMeta = {
  /** Líneas comerciales (filtro1) */
  lineas: string[];
  usosByLinea: Record<string, string[]>;
  prendasByLinea: Record<string, string[]>;
  /** nombreVitrina por línea comercial */
  productosByLinea: Record<string, string[]>;
  colores: string[];
  precioMin: number | null;
  precioMax: number | null;
  totalGroups: number;
  totalVariants: number;
  /** @deprecated Admin / legado técnico — claseFamilia */
  clases: string[];
  /** @deprecated Admin / legado técnico */
  categoriasByClase: Record<string, string[]>;
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

function addToMapSet(map: Map<string, Set<string>>, key: string, value: string) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(value);
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
  const lineasSet = new Set<string>();
  const usosMap = new Map<string, Set<string>>();
  const prendasMap = new Map<string, Set<string>>();
  const productosMap = new Map<string, Set<string>>();
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
      if (group.categoria?.trim()) {
        addToMapSet(categoriasMap, clase, group.categoria.trim());
      }
    }

    const lineasFromFiltros = new Set<string>();
    for (const f of group.filtros ?? []) {
      for (const l of f.filtro1 ?? []) {
        const linea = l.trim();
        if (!linea) continue;
        lineasSet.add(linea);
        lineasFromFiltros.add(linea);
        for (const u of f.filtro2 ?? []) {
          if (u.trim()) addToMapSet(usosMap, linea, u.trim());
        }
        for (const p of f.filtro3 ?? []) {
          if (p.trim()) addToMapSet(prendasMap, linea, p.trim());
        }
      }
    }

    for (const linea of lineasFromFiltros) {
      addToMapSet(productosMap, linea, group.nombreVitrina);
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

  const usosByLinea: Record<string, string[]> = {};
  for (const [linea, usos] of usosMap) {
    usosByLinea[linea] = sortEs([...usos]);
  }
  const prendasByLinea: Record<string, string[]> = {};
  for (const [linea, prendas] of prendasMap) {
    prendasByLinea[linea] = sortEs([...prendas]);
  }
  const productosByLinea: Record<string, string[]> = {};
  for (const [linea, productos] of productosMap) {
    productosByLinea[linea] = sortEs([...productos]);
  }
  const categoriasByClase: Record<string, string[]> = {};
  for (const [clase, cats] of categoriasMap) {
    categoriasByClase[clase] = sortEs([...cats]);
  }

  return {
    lineas: sortEs([...lineasSet]),
    usosByLinea,
    prendasByLinea,
    productosByLinea,
    colores: sortEs([...coloresSet]),
    precioMin,
    precioMax,
    totalGroups: groups.length,
    totalVariants,
    clases: sortEs([...clasesSet]),
    categoriasByClase,
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
      if (p.categoria?.trim()) {
        addToMapSet(categoriasMap, p.claseFamilia.trim(), p.categoria.trim());
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
    lineas: [],
    usosByLinea: {},
    prendasByLinea: {},
    productosByLinea: {},
    colores: sortEs([...coloresSet]),
    precioMin,
    precioMax,
    totalGroups: products.length,
    totalVariants: products.length,
    clases: sortEs([...clasesSet]),
    categoriasByClase,
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
