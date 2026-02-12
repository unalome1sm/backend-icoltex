/**
 * Configuración de la API externa Icoltex (webhook).
 * La URL base viene de .env; los endpoints se definen aquí.
 */

const baseUrl = process.env.ICOLTEX_API_URL || 'https://webhook-icoltex.tangara.cloud/webhook';

/** Rutas de los endpoints del webhook Icoltex (sin la URL base) */
export const ICOLTEX_ENDPOINTS = {
  clientes: '/clientes_icoltex',
  items: '/items_icoltex',
  clases: '/clases_icoltex',
  categorias: '/categorias_icoltex',
} as const;

export type IcoltexEndpointKey = keyof typeof ICOLTEX_ENDPOINTS;

/** Devuelve la URL completa para un endpoint (base + ruta) */
export function getIcoltexUrl(endpointKey: IcoltexEndpointKey): string {
  const path = ICOLTEX_ENDPOINTS[endpointKey];
  const base = baseUrl.replace(/\/$/, '');
  const segment = path.startsWith('/') ? path : `/${path}`;
  return `${base}${segment}`;
}

/** Indica si la API Icoltex está configurada (URL y credenciales) */
export function isIcoltexApiConfigured(): boolean {
  return !!(
    process.env.ICOLTEX_API_URL &&
    process.env.ICOLTEX_API_USER &&
    process.env.ICOLTEX_API_PASSWORD
  );
}
