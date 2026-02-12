import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    codigo: {
      type: String,
      required: [true, 'El código del producto es obligatorio'],
      trim: true,
      unique: true,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre del producto es obligatorio'],
      trim: true,
    },
    claseFamilia: { type: String, trim: true },
    categoria: { type: String, trim: true },
    stock: {
      type: Number,
      default: 0,
    },
    colores: { type: String, trim: true },
    unidadMedida: { type: String, trim: true },
    caracteristica: { type: String, trim: true },
    recomendacionesCuidados: { type: String, trim: true },
    recomendacionesUsos: { type: String, trim: true },
    precioMetro: { type: Number },
    precioKilos: { type: Number },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ nombre: 'text' });
ProductSchema.index({ activo: 1 });
ProductSchema.index({ categoria: 1, claseFamilia: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
