import { Types } from 'mongoose';
import { Order, type IOrder, type OrderStatus } from '../models/Order';
import {
  buildCheckoutPayload,
  mapWompiStatusToOrderStatus,
  type WompiCheckoutPayload,
} from './wompi.service';

export type CreateOrderInput = {
  customer: {
    email: string;
    nombre: string;
    apellidos: string;
    tipoDocumento: string;
    numeroDocumento: string;
    telefono: string;
    recibirNovedades?: boolean;
  };
  shipping: {
    departamento: string;
    ciudad: string;
    direccion: string;
    tipoVivienda: 'casa' | 'edificio';
    apartamento?: string;
    notas?: string;
  };
  items: Array<{
    productId: string;
    nombre: string;
    quantity: number;
    measure: 'metro' | 'rollo' | 'peso';
    color?: string;
    precioMetro: number;
    imageUrl?: string;
  }>;
  userId?: string;
};

function generateReference(): string {
  const short = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ICOL-${Date.now()}-${short}`;
}

function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100);
}

export function validateAndNormalizeItems(items: CreateOrderInput['items']) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('El carrito está vacío');
  }

  const normalized = items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.precioMetro);
    if (!item.productId?.trim() || !item.nombre?.trim()) {
      throw new Error('Cada ítem debe tener productId y nombre');
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Cantidad inválida en un ítem');
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error('Precio inválido en un ítem');
    }
    const measure = item.measure;
    if (measure !== 'metro' && measure !== 'rollo' && measure !== 'peso') {
      throw new Error('Unidad de medida inválida');
    }
    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
    return {
      productId: item.productId.trim(),
      nombre: item.nombre.trim(),
      quantity,
      measure,
      color: item.color?.trim() || undefined,
      unitPrice,
      lineTotal,
      imageUrl: item.imageUrl?.trim() || undefined,
    };
  });

  const subtotalPesos = normalized.reduce((acc, i) => acc + i.lineTotal, 0);
  const amountInCents = pesosToCents(subtotalPesos);
  if (amountInCents < 1) {
    throw new Error('El monto del pedido debe ser mayor a cero');
  }

  return { items: normalized, amountInCents, subtotalPesos };
}

export async function createOrderWithCheckout(
  input: CreateOrderInput
): Promise<{ order: IOrder; checkout: WompiCheckoutPayload }> {
  const customer = input.customer;
  if (
    !customer?.email?.trim() ||
    !customer.nombre?.trim() ||
    !customer.apellidos?.trim() ||
    !customer.tipoDocumento?.trim() ||
    !customer.numeroDocumento?.trim() ||
    !customer.telefono?.trim()
  ) {
    throw new Error('Datos del cliente incompletos');
  }

  const shipping = input.shipping;
  if (
    !shipping?.departamento?.trim() ||
    !shipping.ciudad?.trim() ||
    !shipping.direccion?.trim() ||
    (shipping.tipoVivienda !== 'casa' && shipping.tipoVivienda !== 'edificio')
  ) {
    throw new Error('Datos de envío incompletos');
  }
  if (shipping.tipoVivienda === 'edificio' && !shipping.apartamento?.trim()) {
    throw new Error('Indica el apartamento o piso');
  }

  const { items, amountInCents } = validateAndNormalizeItems(input.items);
  const reference = generateReference();

  const order = await Order.create({
    reference,
    userId: input.userId && Types.ObjectId.isValid(input.userId) ? input.userId : undefined,
    customer: {
      email: customer.email.trim().toLowerCase(),
      nombre: customer.nombre.trim(),
      apellidos: customer.apellidos.trim(),
      tipoDocumento: customer.tipoDocumento.trim(),
      numeroDocumento: customer.numeroDocumento.trim(),
      telefono: customer.telefono.trim(),
      recibirNovedades: Boolean(customer.recibirNovedades),
    },
    shipping: {
      departamento: shipping.departamento.trim(),
      ciudad: shipping.ciudad.trim(),
      direccion: shipping.direccion.trim(),
      tipoVivienda: shipping.tipoVivienda,
      apartamento: shipping.apartamento?.trim() || undefined,
      notas: shipping.notas?.trim() || undefined,
    },
    items,
    amountInCents,
    currency: 'COP',
    status: 'PENDING',
  });

  const checkout = buildCheckoutPayload({
    reference: order.reference,
    amountInCents: order.amountInCents,
    currency: order.currency,
  });

  return { order, checkout };
}

export async function getOrderByReference(reference: string): Promise<IOrder | null> {
  if (!reference?.trim()) return null;
  return Order.findOne({ reference: reference.trim() });
}

const TERMINAL: OrderStatus[] = ['APPROVED', 'DECLINED', 'VOIDED', 'ERROR'];

export async function applyWompiTransactionEvent(tx: {
  id?: string;
  status?: string;
  reference?: string;
  payment_method_type?: string;
  status_message?: string;
}): Promise<IOrder | null> {
  const reference = tx.reference?.trim();
  if (!reference) return null;

  const order = await Order.findOne({ reference });
  if (!order) return null;

  // Idempotency: same transaction already applied with terminal status
  if (tx.id && order.wompiTransactionId === tx.id && TERMINAL.includes(order.status)) {
    return order;
  }

  const nextStatus = mapWompiStatusToOrderStatus(tx.status || 'PENDING');

  // Do not downgrade an APPROVED order
  if (order.status === 'APPROVED') {
    return order;
  }

  if (nextStatus === 'PENDING') {
    if (tx.id && !order.wompiTransactionId) {
      order.wompiTransactionId = tx.id;
      await order.save();
    }
    return order;
  }

  order.status = nextStatus;
  if (tx.id) order.wompiTransactionId = tx.id;
  if (tx.payment_method_type) order.paymentMethodType = tx.payment_method_type;
  if (tx.status_message) order.statusMessage = tx.status_message;
  await order.save();

  return order;
}
