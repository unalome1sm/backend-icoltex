/** Variante cruda del webhook caracterisiticas_items_icoltex */
export type CatalogVitrinaVariantRaw = {
  codigo?: string;
  colorLabel?: string;
  itemNameCompleto?: string;
  stock?: string | number;
  activo?: boolean;
  unidadMedida?: string;
};

/** Grupo vitrina crudo del webhook caracterisiticas_items_icoltex */
export type CatalogVitrinaGroupRaw = {
  nombreVitrina?: string;
  claseFamilia?: string;
  categoria?: string;
  variantes?: CatalogVitrinaVariantRaw[];
};

export type CatalogVitrinaVariant = {
  codigo: string;
  colorLabel: string;
  itemNameCompleto: string;
  stock: number;
  activo: boolean;
  unidadMedida?: string;
};

export type CatalogVitrinaGroup = {
  groupKey: string;
  nombreVitrina: string;
  claseFamilia?: string;
  categoria?: string;
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
