import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  nombre?: string;
  segundoNombre?: string;
  apellidos?: string;
  cedula?: string;
  telefono?: string;
  tipoVivienda?: 'casa' | 'edificio';
  direccionCasa?: string;
  apartamento?: string;
  direccionOficina?: string;
  pisoOficina?: string;
  numeroOficina?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
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
    segundoNombre: {
      type: String,
      trim: true,
    },
    apellidos: {
      type: String,
      trim: true,
    },
    cedula: {
      type: String,
      trim: true,
    },
    telefono: {
      type: String,
      trim: true,
    },
    tipoVivienda: {
      type: String,
      enum: ['casa', 'edificio'],
    },
    direccionCasa: {
      type: String,
      trim: true,
    },
    apartamento: {
      type: String,
      trim: true,
    },
    direccionOficina: {
      type: String,
      trim: true,
    },
    pisoOficina: {
      type: String,
      trim: true,
    },
    numeroOficina: {
      type: String,
      trim: true,
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

UserSchema.index({ email: 1 });
UserSchema.index({ activo: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
