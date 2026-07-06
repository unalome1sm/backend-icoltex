/** Variante cruda del webhook info-items-x-ref (antes caracterisiticas_items_icoltex) */
export type CatalogVitrinaVariantRaw = {
  codigo?: string;
  colorLabel?: string;
  itemNameCompleto?: string;
  stock?: string | number;
  activo?: boolean;
  unidadMedida?: string;
  caracteristica?: string;
};

export type CatalogVitrinaFiltrosRaw = {
  filtro1?: string[];
  filtro2?: string[];
  filtro3?: string[];
};

export type CatalogVitrinaImagenesRaw = {
  imagen1?: string;
  imagen2?: string;
  imagen3?: string;
};

/** Grupo vitrina crudo del webhook info-items-x-ref */
export type CatalogVitrinaGroupRaw = {
  nombreVitrina?: string;
  claseFamilia?: string;
  categoria?: string;
  filtros?: CatalogVitrinaFiltrosRaw[];
  imagenes?: CatalogVitrinaImagenesRaw[];
  variantes?: CatalogVitrinaVariantRaw[];
};

export type CatalogVitrinaFiltros = {
  filtro1: string[];
  filtro2: string[];
  filtro3: string[];
};

export type CatalogVitrinaVariant = {
  codigo: string;
  colorLabel: string;
  itemNameCompleto: string;
  stock: number;
  activo: boolean;
  unidadMedida?: string;
  caracteristica?: string;
};

export type CatalogVitrinaGroup = {
  groupKey: string;
  nombreVitrina: string;
  claseFamilia?: string;
  categoria?: string;
  filtros?: CatalogVitrinaFiltros[];
  imageUrls?: string[];
  variantes: CatalogVitrinaVariant[];
};

/** Fila aplanada para el explorador admin */
export type CatalogCharacteristicRow = {
  nombreVitrina: string;
  clase: string;
  categoria: string;
  color: string;
  codigo: string;
  activo: boolean;
  tienePrecio: boolean;
};
