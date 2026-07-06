import type { GroupedCatalogFilter } from '../services/groupedCatalog.service';

export type VariantFilterable = {
  colorLabel: string;
  stock: number;
  activo: boolean;
  tienePrecio?: boolean;
  unidadMedida?: string;
  precioMetro?: number;
  precioKilos?: number;
};

export type GroupFilterable = {
  nombreVitrina: string;
  claseFamilia?: string;
  categoria?: string;
  variantes: VariantFilterable[];
  esDestacado?: boolean;
  esNovedad?: boolean;
};

export function variantDisplayPrice(v: VariantFilterable): number | undefined {
  const isKg = v.unidadMedida?.toUpperCase() === 'KG';
  if (isKg) return v.precioKilos ?? v.precioMetro;
  return v.precioMetro ?? v.precioKilos;
}

function matchesIgnoreCase(value: string, target: string): boolean {
  return value.trim().toLocaleLowerCase('es') === target.trim().toLocaleLowerCase('es');
}

export function groupMatchesCatalogFilter(
  group: GroupFilterable,
  filter: GroupedCatalogFilter
): boolean {
  if (filter.classFamily?.trim()) {
    const rx = filter.classFamily.trim();
    if (!group.claseFamilia || !new RegExp(`^${escapeRegex(rx)}$`, 'i').test(group.claseFamilia)) {
      return false;
    }
  }

  if (filter.categories?.length) {
    const cat = group.categoria?.trim() ?? '';
    const ok = filter.categories.some((c) => matchesIgnoreCase(cat, c));
    if (!ok) return false;
  } else if (filter.category?.trim()) {
    const rx = filter.category.trim();
    if (!group.categoria || !new RegExp(rx, 'i').test(group.categoria)) {
      return false;
    }
  }

  if (filter.q?.trim()) {
    const rx = filter.q.trim();
    const re = new RegExp(rx, 'i');
    const inGroup =
      re.test(group.nombreVitrina) ||
      re.test(group.claseFamilia ?? '') ||
      re.test(group.categoria ?? '');
    const inVariant = group.variantes.some(
      (v) =>
        re.test(v.colorLabel) ||
        re.test((v as { codigo?: string }).codigo ?? '') ||
        re.test((v as { itemNameCompleto?: string }).itemNameCompleto ?? '')
    );
    if (!inGroup && !inVariant) return false;
  }

  if (filter.destacado === true && !group.esDestacado) return false;
  if (filter.novedad === true && !group.esNovedad) return false;

  return true;
}

export function variantMatchesCatalogFilter(
  variant: VariantFilterable,
  filter: GroupedCatalogFilter,
  requirePrice: boolean
): boolean {
  const showOnlyActive = filter.activo !== false;
  if (showOnlyActive && !variant.activo) return false;
  if (filter.activo === false && variant.activo) return false;

  if (requirePrice && variant.tienePrecio === false) return false;

  if (filter.inStock && variant.stock <= 0) return false;

  if (filter.colors?.length) {
    const ok = filter.colors.some((c) => matchesIgnoreCase(variant.colorLabel, c));
    if (!ok) return false;
  }

  const price = variantDisplayPrice(variant);
  if (filter.precioMin != null && !Number.isNaN(filter.precioMin)) {
    if (price == null || price < filter.precioMin) return false;
  }
  if (filter.precioMax != null && !Number.isNaN(filter.precioMax)) {
    if (price == null || price > filter.precioMax) return false;
  }

  return true;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type SortableGroup = {
  nombreVitrina: string;
  precioDesde?: number;
};

export function sortCatalogGroups<T extends SortableGroup>(
  rows: T[],
  sort?: GroupedCatalogFilter['sort']
): T[] {
  const list = [...rows];
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => (a.precioDesde ?? Infinity) - (b.precioDesde ?? Infinity));
    case 'price-desc':
      return list.sort((a, b) => (b.precioDesde ?? 0) - (a.precioDesde ?? 0));
    case 'name':
      return list.sort((a, b) =>
        a.nombreVitrina.localeCompare(b.nombreVitrina, 'es', { sensitivity: 'base' })
      );
    default:
      return list;
  }
}
