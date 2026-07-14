import type { Request, Response } from 'express';
import { verifyToken, AUTH_COOKIE_NAME } from '../services/auth.service';
import {
  applyWompiTransactionEvent,
  createOrderWithCheckout,
  getOrderByReference,
  type CreateOrderInput,
} from '../services/order.service';
import { verifyEventChecksum } from '../services/wompi.service';

function optionalUserId(req: Request): string | undefined {
  const token =
    req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return undefined;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'user') return undefined;
  return payload.sub;
}

function serializeOrder(order: Awaited<ReturnType<typeof getOrderByReference>>) {
  if (!order) return null;
  return {
    reference: order.reference,
    status: order.status,
    currency: order.currency,
    amountInCents: order.amountInCents,
    total: order.amountInCents / 100,
    customer: order.customer,
    shipping: order.shipping,
    items: order.items,
    wompiTransactionId: order.wompiTransactionId,
    paymentMethodType: order.paymentMethodType,
    statusMessage: order.statusMessage,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function createOrderHandler(req: Request, res: Response) {
  try {
    const body = req.body as CreateOrderInput;
    const { order, checkout } = await createOrderWithCheckout({
      ...body,
      userId: optionalUserId(req),
    });

    res.status(201).json({
      order: serializeOrder(order),
      checkout,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al crear la orden';
    const status =
      message.includes('vacío') ||
      message.includes('inválid') ||
      message.includes('incompleto') ||
      message.includes('Indica') ||
      message.includes('mayor a cero') ||
      message.includes('Falta la variable')
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
}

export async function getOrderByReferenceHandler(req: Request, res: Response) {
  try {
    const { reference } = req.params;
    const order = await getOrderByReference(reference || '');
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    res.json({ order: serializeOrder(order) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al consultar la orden';
    res.status(500).json({ error: message });
  }
}

export async function wompiWebhookHandler(req: Request, res: Response) {
  try {
    const headerChecksum = req.headers['x-event-checksum'];
    const body = req.body as {
      event?: string;
      data?: { transaction?: Record<string, unknown> };
      signature?: { properties?: string[]; checksum?: string };
      timestamp?: number;
    };

    if (!verifyEventChecksum(body, headerChecksum)) {
      return res.status(400).json({ error: 'Firma de evento inválida' });
    }

    const tx = body.data?.transaction;
    if (!tx || typeof tx !== 'object') {
      return res.status(200).json({ ok: true, ignored: true });
    }

    await applyWompiTransactionEvent({
      id: typeof tx.id === 'string' ? tx.id : undefined,
      status: typeof tx.status === 'string' ? tx.status : undefined,
      reference: typeof tx.reference === 'string' ? tx.reference : undefined,
      payment_method_type:
        typeof tx.payment_method_type === 'string' ? tx.payment_method_type : undefined,
      status_message: typeof tx.status_message === 'string' ? tx.status_message : undefined,
    });

    res.status(200).json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error en webhook Wompi';
    // Acknowledge to avoid endless retries on env misconfig for non-signature errors,
    // but log and return 500 for unexpected failures so Wompi can retry.
    console.error('[wompi webhook]', message);
    res.status(500).json({ error: message });
  }
}
