import mongoose, { Schema, Document } from 'mongoose';

export interface IProductCategory extends Document {
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

const ProductCategorySchema = new Schema<IProductCategory>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la categoria es obligatorio'],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: [true, 'El slug de la categoria es obligatorio'],
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

ProductCategorySchema.pre('validate', function onValidate(next) {
  if (this.nombre && !this.slug) {
    this.slug = normalizeSlug(this.nombre);
  }
  next();
});

export const ProductCategory = mongoose.model<IProductCategory>('ProductCategory', ProductCategorySchema);
