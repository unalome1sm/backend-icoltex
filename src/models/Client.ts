import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
  codigo?: string;
  nombre: string;
  tipoDocumento: 'CC' | 'NIT' | 'CE' | 'PASAPORTE';
  numeroDocumento: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  pais?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    codigo: {
      type: String,
      trim: true,
      uppercase: true,
    },
    nombre: {
      type: String,
      required: [true, 'El nombre del cliente es obligatorio'],
      trim: true,
    },
    tipoDocumento: {
      type: String,
      enum: ['CC', 'NIT', 'CE', 'PASAPORTE'],
      required: [true, 'El tipo de documento es obligatorio'],
    },
    numeroDocumento: {
      type: String,
      required: [true, 'El número de documento es obligatorio'],
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un email válido'],
    },
    telefono: {
      type: String,
      trim: true,
    },
    direccion: {
      type: String,
      trim: true,
    },
    ciudad: {
      type: String,
      trim: true,
    },
    departamento: {
      type: String,
      trim: true,
    },
    pais: {
      type: String,
      trim: true,
      default: 'Colombia',
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

// Índices (numeroDocumento ya tiene unique: true, no duplicar)
ClientSchema.index({ nombre: 'text' });
ClientSchema.index({ email: 1 });
ClientSchema.index({ activo: 1 });

export const Client = mongoose.model<IClient>('Client', ClientSchema);



