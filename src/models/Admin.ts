import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  nombre?: string;
  role: 'admin';
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Email inválido'],
    },
    passwordHash: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
    },
    nombre: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin'],
      default: 'admin',
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

AdminSchema.index({ email: 1 });
AdminSchema.index({ activo: 1 });

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
