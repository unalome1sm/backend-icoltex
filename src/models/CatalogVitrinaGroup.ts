import mongoose, { Schema, Document } from 'mongoose';

export type ICatalogVitrinaVariant = {
  codigo: string;
  colorLabel: string;
  itemNameCompleto: string;
  stock: number;
  activo: boolean;
  unidadMedida?: string;
};

export interface ICatalogVitrinaGroup extends Document {
  groupKey: string;
  nombreVitrina: string;
  claseFamilia?: string;
  categoria?: string;
  variantes: ICatalogVitrinaVariant[];
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CatalogVitrinaVariantSchema = new Schema<ICatalogVitrinaVariant>(
  {
    codigo: { type: String, required: true, trim: true },
    colorLabel: { type: String, required: true, trim: true },
    itemNameCompleto: { type: String, required: true, trim: true },
    stock: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
    unidadMedida: { type: String, trim: true },
  },
  { _id: false }
);

const CatalogVitrinaGroupSchema = new Schema<ICatalogVitrinaGroup>(
  {
    groupKey: { type: String, required: true, unique: true, trim: true },
    nombreVitrina: { type: String, required: true, trim: true },
    claseFamilia: { type: String, trim: true },
    categoria: { type: String, trim: true },
    variantes: { type: [CatalogVitrinaVariantSchema], default: [] },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CatalogVitrinaGroupSchema.index({ claseFamilia: 1, categoria: 1 });
CatalogVitrinaGroupSchema.index({ nombreVitrina: 1 });

export const CatalogVitrinaGroup = mongoose.model<ICatalogVitrinaGroup>(
  'CatalogVitrinaGroup',
  CatalogVitrinaGroupSchema
);
