import crypto from 'crypto';

export type WompiEnv = 'sandbox' | 'production';

export type WompiCheckoutPayload = {
  reference: string;
  publicKey: string;
  currency: string;
  amountInCents: number;
  integritySignature: string;
  /** Empty when FRONTEND_URL is localhost — CloudFront WAF blocks redirect-url with localhost. */
  redirectUrl: string;
  checkoutUrl: string;
  env: WompiEnv;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export function getWompiEnv(): WompiEnv {
  const raw = (process.env.WOMPI_ENV || 'sandbox').trim().toLowerCase();
  return raw === 'production' ? 'production' : 'sandbox';
}

export function getWompiPublicKey(): string {
  return requiredEnv('WOMPI_PUBLIC_KEY');
}

export function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/** True when FRONTEND_URL is a public HTTPS origin (safe for Wompi redirect-url). */
export function isPublicFrontendUrl(url: string = getFrontendUrl()): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Web Checkout URL — same host for test/prod; keys distinguish the environment. */
export function getWompiCheckoutUrl(): string {
  return 'https://checkout.wompi.co/p/';
}

/**
 * SHA256(reference + amountInCents + currency + integritySecret)
 * @see https://docs.wompi.co/docs/colombia/widget-checkout-web/
 */
export function buildIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string = 'COP'
): string {
  const integritySecret = requiredEnv('WOMPI_INTEGRITY_SECRET');
  const raw = `${reference}${amountInCents}${currency}${integritySecret}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function buildCheckoutPayload(input: {
  reference: string;
  amountInCents: number;
  currency?: string;
}): WompiCheckoutPayload {
  const currency = input.currency || 'COP';
  const publicKey = getWompiPublicKey();
  const frontendUrl = getFrontendUrl();
  const integritySignature = buildIntegritySignature(
    input.reference,
    input.amountInCents,
    currency
  );

  // Omit localhost redirect-url: CloudFront WAF returns 403 Request blocked.
  const redirectUrl = isPublicFrontendUrl(frontendUrl)
    ? `${frontendUrl}/checkout/result?reference=${encodeURIComponent(input.reference)}`
    : '';

  return {
    reference: input.reference,
    publicKey,
    currency,
    amountInCents: input.amountInCents,
    integritySignature,
    redirectUrl,
    checkoutUrl: getWompiCheckoutUrl(),
    env: getWompiEnv(),
  };
}

type WompiEventBody = {
  event?: string;
  data?: {
    transaction?: Record<string, unknown>;
  };
  signature?: {
    properties?: string[];
    checksum?: string;
  };
  timestamp?: number;
};

function resolvePropertyPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Validates Wompi event checksum (SHA256 of property values + timestamp + events secret).
 * @see https://docs.wompi.co/docs/colombia/eventos/
 */
export function verifyEventChecksum(
  eventBody: WompiEventBody,
  headerChecksum?: string | string[]
): boolean {
  const eventsSecret = requiredEnv('WOMPI_EVENTS_SECRET');
  const properties = eventBody.signature?.properties;
  const timestamp = eventBody.timestamp;
  if (!properties?.length || timestamp == null) return false;

  let concat = '';
  for (const prop of properties) {
    const value = resolvePropertyPath(eventBody.data as Record<string, unknown>, prop);
    if (value === undefined || value === null) return false;
    concat += String(value);
  }
  concat += String(timestamp);
  concat += eventsSecret;

  const computed = crypto.createHash('sha256').update(concat).digest('hex');
  const expected =
    (typeof headerChecksum === 'string' ? headerChecksum : headerChecksum?.[0]) ||
    eventBody.signature?.checksum;

  if (!expected) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'utf8'),
      Buffer.from(expected, 'utf8')
    );
  } catch {
    return computed === expected;
  }
}

export function mapWompiStatusToOrderStatus(
  status: string
): 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING' {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'APPROVED';
    case 'DECLINED':
      return 'DECLINED';
    case 'VOIDED':
      return 'VOIDED';
    case 'ERROR':
      return 'ERROR';
    default:
      return 'PENDING';
  }
}
