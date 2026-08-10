import mongoose, { Schema, Document } from 'mongoose';

export type ICatalogVitrinaFiltros = {
  filtro1: string[];
  filtro2: string[];
  filtro3: string[];
};

export type ICatalogVitrinaVariant = {
  codigo: string;
  colorLabel: string;
  itemNameCompleto: string;
  stock: number;
  activo: boolean;
  unidadMedida?: string;
  caracteristica?: string;
  colorHex?: string;
};

export interface ICatalogVitrinaGroup extends Document {
  groupKey: string;
  nombreVitrina: string;
  claseFamilia?: string;
  categoria?: string;
  descripcionCorta?: string;
  descripcionLarga?: string;
  caracteristicas?: string;
  usos?: string;
  cuidados?: string;
  filtros?: ICatalogVitrinaFiltros[];
  imageUrls?: string[];
  variantes: ICatalogVitrinaVariant[];
  syncedAt: Date;
  /** Marcado manual desde admin — no lo sobrescribe el sync SAP */
  esDestacado: boolean;
  esNovedad: boolean;
  merchandisingUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CatalogVitrinaFiltrosSchema = new Schema<ICatalogVitrinaFiltros>(
  {
    filtro1: { type: [String], default: [] },
    filtro2: { type: [String], default: [] },
    filtro3: { type: [String], default: [] },
  },
  { _id: false }
);

const CatalogVitrinaVariantSchema = new Schema<ICatalogVitrinaVariant>(
  {
    codigo: { type: String, required: true, trim: true },
    colorLabel: { type: String, required: true, trim: true },
    itemNameCompleto: { type: String, required: true, trim: true },
    stock: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
    unidadMedida: { type: String, trim: true },
    caracteristica: { type: String, trim: true },
    colorHex: { type: String, trim: true },
  },
  { _id: false }
);

const CatalogVitrinaGroupSchema = new Schema<ICatalogVitrinaGroup>(
  {
    groupKey: { type: String, required: true, unique: true, trim: true },
    nombreVitrina: { type: String, required: true, trim: true },
    claseFamilia: { type: String, trim: true },
    categoria: { type: String, trim: true },
    descripcionCorta: { type: String, trim: true },
    descripcionLarga: { type: String, trim: true },
    caracteristicas: { type: String, trim: true },
    usos: { type: String, trim: true },
    cuidados: { type: String, trim: true },
    filtros: { type: [CatalogVitrinaFiltrosSchema], default: undefined },
    imageUrls: { type: [String], default: undefined },
    variantes: { type: [CatalogVitrinaVariantSchema], default: [] },
    syncedAt: { type: Date, default: Date.now },
    esDestacado: { type: Boolean, default: false },
    esNovedad: { type: Boolean, default: false },
    merchandisingUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

CatalogVitrinaGroupSchema.index({ claseFamilia: 1, categoria: 1 });
CatalogVitrinaGroupSchema.index({ nombreVitrina: 1 });
CatalogVitrinaGroupSchema.index({ esDestacado: 1 });
CatalogVitrinaGroupSchema.index({ esNovedad: 1 });

export const CatalogVitrinaGroup = mongoose.model<ICatalogVitrinaGroup>(
  'CatalogVitrinaGroup',
  CatalogVitrinaGroupSchema
);
