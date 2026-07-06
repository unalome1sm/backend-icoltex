/** Modelo interno normalizado — destino de mappers SAP */

export type CanonicalProduct = {
  codigo: string;
  nombre: string;
  claseFamilia?: string;
  categoria?: string;
  stock: number;
  colores?: string;
  unidadMedida?: string;
  caracteristica?: string;
  recomendacionesCuidados?: string;
  recomendacionesUsos?: string;
  precioMetro?: number;
  precioKilos?: number;
  activo: boolean;
  imageUrls?: string[];
};

export type CanonicalVitrinaFiltros = {
  filtro1: string[];
  filtro2: string[];
  filtro3: string[];
};

export type CanonicalVariant = {
  codigo: string;
  colorLabel: string;
  itemNameCompleto: string;
  stock: number;
  activo: boolean;
  unidadMedida?: string;
  caracteristica?: string;
};

export type CanonicalVitrinaGroup = {
  groupKey: string;
  nombreVitrina: string;
  claseFamilia?: string;
  categoria?: string;
  filtros?: CanonicalVitrinaFiltros[];
  imageUrls?: string[];
  variantes: CanonicalVariant[];
};
