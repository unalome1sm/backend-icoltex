import mongoose, { Schema, Document } from 'mongoose';

export interface IProductLineGallery extends Document {
  categoria: string;
  claseFamilia: string;
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductLineGallerySchema = new Schema<IProductLineGallery>(
  {
    categoria: {
      type: String,
      required: true,
      trim: true,
    },
    claseFamilia: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrls: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ProductLineGallerySchema.index({ categoria: 1, claseFamilia: 1 }, { unique: true });

export const ProductLineGallery = mongoose.model<IProductLineGallery>(
  'ProductLineGallery',
  ProductLineGallerySchema
);
