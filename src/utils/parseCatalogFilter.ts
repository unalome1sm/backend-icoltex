import type { Request } from 'express';
import type { CatalogSortOption, GroupedCatalogFilter } from '../services/groupedCatalog.service';
import { normalizeFilterList, parseListParam } from '../services/catalogFilterMeta.service';

const SORT_VALUES: CatalogSortOption[] = ['relevance', 'price-asc', 'price-desc', 'name'];

export function parseCatalogFilterFromRequest(req: Request): GroupedCatalogFilter {
  const {
    category,
    categories,
    classFamily,
    filtro1,
    filtro2,
    filtro3,
    nombre,
    color,
    colors,
    q,
    activo,
    precioMin,
    precioMax,
    inStock,
    sort,
    destacado,
    novedad,
  } = req.query;

  const filter: GroupedCatalogFilter = {};

  if (activo === 'true') filter.activo = true;
  if (activo === 'false') filter.activo = false;

  if (typeof filtro1 === 'string' && filtro1.trim()) {
    filter.filtro1 = filtro1.trim();
  }

  const filtro2List = parseListParam(filtro2);
  filter.filtro2 = normalizeFilterList(filtro2List);

  const filtro3List = parseListParam(filtro3);
  filter.filtro3 = normalizeFilterList(filtro3List);

  if (typeof nombre === 'string' && nombre.trim()) {
    filter.nombre = nombre.trim();
  }

  // Legacy (admin / productos SKU)
  if (typeof classFamily === 'string' && classFamily.trim()) {
    filter.classFamily = classFamily.trim();
  }

  const categoryList = [
    ...parseListParam(categories),
    ...parseListParam(category),
  ];
  const normalizedCategories = normalizeFilterList(categoryList);
  if (normalizedCategories) {
    filter.categories = normalizedCategories;
    filter.category = normalizedCategories[0];
  }

  const colorList = [...parseListParam(colors), ...parseListParam(color)];
  filter.colors = normalizeFilterList(colorList);

  if (typeof q === 'string' && q.trim()) filter.q = q.trim();

  if (precioMin !== undefined && precioMin !== '') {
    const n = Number(precioMin);
    if (!Number.isNaN(n)) filter.precioMin = n;
  }
  if (precioMax !== undefined && precioMax !== '') {
    const n = Number(precioMax);
    if (!Number.isNaN(n)) filter.precioMax = n;
  }

  if (inStock === 'true' || inStock === '1') {
    filter.inStock = true;
  }

  if (typeof sort === 'string' && SORT_VALUES.includes(sort as CatalogSortOption)) {
    filter.sort = sort as CatalogSortOption;
  }

  if (destacado === 'true' || destacado === '1') {
    filter.destacado = true;
  }
  if (novedad === 'true' || novedad === '1') {
    filter.novedad = true;
  }

  return filter;
}
