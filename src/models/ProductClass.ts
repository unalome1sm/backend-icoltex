import mongoose, { Schema, Document } from 'mongoose';

export interface IProductClass extends Document {
  nombre: string;
  slug: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const ProductClassSchema = new Schema<IProductClass>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la clase es obligatorio'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: [true, 'El slug de la clase es obligatorio'],
      trim: true,
      unique: true,
      index: true,
    },
    activo: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ProductClassSchema.pre('validate', function onValidate(next) {
  if (this.nombre && !this.slug) {
    this.slug = normalizeSlug(this.nombre);
  }
  next();
});

export const ProductClass = mongoose.model<IProductClass>('ProductClass', ProductClassSchema);
