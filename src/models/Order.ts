import mongoose, { Schema, Document, Types } from 'mongoose';

export type OrderStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export interface IOrderCustomer {
  email: string;
  nombre: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono: string;
  recibirNovedades: boolean;
}

export interface IOrderShipping {
  departamento: string;
  ciudad: string;
  direccion: string;
  tipoVivienda: 'casa' | 'edificio';
  apartamento?: string;
  notas?: string;
}

export interface IOrderItem {
  productId: string;
  nombre: string;
  quantity: number;
  measure: 'metro' | 'rollo' | 'peso';
  color?: string;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string;
}

export interface IOrder extends Document {
  reference: string;
  userId?: Types.ObjectId;
  customer: IOrderCustomer;
  shipping: IOrderShipping;
  items: IOrderItem[];
  amountInCents: number;
  currency: string;
  status: OrderStatus;
  wompiTransactionId?: string;
  paymentMethodType?: string;
  statusMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderCustomerSchema = new Schema<IOrderCustomer>(
  {
    email: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    apellidos: { type: String, required: true, trim: true },
    tipoDocumento: { type: String, required: true, trim: true },
    numeroDocumento: { type: String, required: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    recibirNovedades: { type: Boolean, default: false },
  },
  { _id: false }
);

const OrderShippingSchema = new Schema<IOrderShipping>(
  {
    departamento: { type: String, required: true, trim: true },
    ciudad: { type: String, required: true, trim: true },
    direccion: { type: String, required: true, trim: true },
    tipoVivienda: { type: String, enum: ['casa', 'edificio'], required: true },
    apartamento: { type: String, trim: true },
    notas: { type: String, trim: true },
  },
  { _id: false }
);

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, required: true, trim: true },
    nombre: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.01 },
    measure: { type: String, enum: ['metro', 'rollo', 'peso'], required: true },
    color: { type: String, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, trim: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    customer: { type: OrderCustomerSchema, required: true },
    shipping: { type: OrderShippingSchema, required: true },
    items: { type: [OrderItemSchema], required: true },
    amountInCents: { type: Number, required: true, min: 1 },
    currency: { type: String, required: true, default: 'COP' },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'],
      required: true,
      default: 'PENDING',
      index: true,
    },
    wompiTransactionId: { type: String, trim: true, index: true },
    paymentMethodType: { type: String, trim: true },
    statusMessage: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);

/**
 * Legacy unique index `numeroOrden_1` (old schema) rejects inserts where
 * `numeroOrden` is missing/null after the first document. Our model uses `reference`.
 */
export async function ensureOrderIndexes(): Promise<void> {
  try {
    const indexes = await Order.collection.indexes();
    if (indexes.some((idx) => idx.name === 'numeroOrden_1')) {
      await Order.collection.dropIndex('numeroOrden_1');
      console.log('🧹 Índice legacy orders.numeroOrden_1 eliminado');
    }
    await Order.syncIndexes();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn('⚠️ No se pudieron sincronizar índices de Order:', message);
  }
}
