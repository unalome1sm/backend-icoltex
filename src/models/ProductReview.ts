import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProductReview extends Document {
  userId: Types.ObjectId;
  groupId: string;
  rating: number;
  comment: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductReviewSchema = new Schema<IProductReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    groupId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
  },
  { timestamps: true }
);

ProductReviewSchema.index({ userId: 1, groupId: 1 }, { unique: true });
ProductReviewSchema.index({ groupId: 1, createdAt: -1 });

export const ProductReview = mongoose.model<IProductReview>('ProductReview', ProductReviewSchema);
