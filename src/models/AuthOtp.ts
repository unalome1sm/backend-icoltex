import mongoose, { Schema, Document } from 'mongoose';

export type OtpPurpose = 'register' | 'login' | 'admin_login';

export interface IAuthOtp extends Document {
  email: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  usedAt?: Date;
  attempts: number;
  createdAt: Date;
}

const AuthOtpSchema = new Schema<IAuthOtp>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['register', 'login', 'admin_login'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

AuthOtpSchema.index({ email: 1, purpose: 1 });
AuthOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL para auto-limpiar expirados

export const AuthOtp = mongoose.model<IAuthOtp>('AuthOtp', AuthOtpSchema);
