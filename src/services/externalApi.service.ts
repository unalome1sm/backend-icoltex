/**
 * Servicio para llamar a la API externa Icoltex (webhook) con Basic Auth.
 */
import { getIcoltexUrl, isIcoltexApiConfigured } from '../config/icoltexApi';

// Leer credenciales al momento de usar (por si .env se carga después)
function getCredentials(): { user: string; password: string } {
  const user = process.env.ICOLTEX_API_USER ?? '';
  const password = process.env.ICOLTEX_API_PASSWORD ?? '';
  return { user: user.trim(), password: password.trim() };
}

function getAuthHeader(): string {
  const { user, password } = getCredentials();
  const auth = Buffer.from(`${user}:${password}`, 'utf8').toString('base64');
  return `Basic ${auth}`;
}

/** Helper: pide una URL Icoltex y devuelve el array extraído del body. method por defecto GET; algunos endpoints requieren POST. */
async function fetchIcoltexArray(url: string, logLabel: string, method: 'GET' | 'POST' = 'GET'): Promise<Record<string, unknown>[]> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Icoltex API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const trimmed = text.trim();
  if (!trimmed) {
    console.warn('[Icoltex]', logLabel, 'Respuesta vacía. Status:', res.status, '| URL:', url, '| Comprueba en Postman que esa URL devuelve datos (mismo método y Basic Auth).');
    return [];
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    // Intentar NDJSON (un JSON por línea)
    const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: Record<string, unknown>[] = [];
    for (const line of lines) {
      try {
        const item = JSON.parse(line) as Record<string, unknown>;
        if (item && typeof item === 'object') parsed.push(item);
      } catch {
        // ignore invalid line
      }
    }
    if (parsed.length > 0) {
      console.log('[Icoltex]', logLabel, 'Formato: NDJSON. Total ítems:', parsed.length, '| Claves del primer ítem:', Object.keys(parsed[0] || {}).join(', '));
      return parsed;
    }
    console.error('Icoltex API: respuesta no es JSON válido. Longitud:', trimmed.length, 'Primeros 300 chars:', trimmed.slice(0, 300));
    throw new Error('La API de Icoltex devolvió una respuesta que no es JSON válido');
  }

  if (Array.isArray(data)) {
    const arr = data as Record<string, unknown>[];
    console.log('[Icoltex]', logLabel, 'Formato: array directo. Total ítems:', arr.length, arr.length > 0 ? '| Claves del primer ítem: ' + Object.keys(arr[0] || {}).join(', ') : '');
    return arr;
  }

  if (data !== null && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const topKeys = Object.keys(obj);
    const keys = ['clientes', 'data', 'Clientes', 'Data', 'items', 'result', 'results', 'value', 'records', 'rows'];
    for (const key of keys) {
      if (Array.isArray(obj[key])) {
        const arr = obj[key] as Record<string, unknown>[];
        console.log('[Icoltex]', logLabel, 'Formato: objeto con clave "' + key + '". Total ítems:', arr.length, arr.length > 0 ? '| Claves del primer ítem: ' + Object.keys(arr[0] || {}).join(', ') : '');
        return arr;
      }
    }
    for (const key of topKeys) {
      if (Array.isArray(obj[key])) {
        const arr = obj[key] as Record<string, unknown>[];
        console.log('[Icoltex]', logLabel, 'Formato: objeto con clave "' + key + '". Total ítems:', arr.length, arr.length > 0 ? '| Claves del primer ítem: ' + Object.keys(arr[0] || {}).join(', ') : '');
        return arr;
      }
    }
    console.warn('[Icoltex] El JSON no tiene un array. Claves del objeto raíz:', topKeys.join(', '), '| Primeros 200 chars:', JSON.stringify(obj).slice(0, 200));
  }

  return [];
}

/**
 * Obtiene el listado de clientes desde el webhook Icoltex.
 */
export async function fetchClientesFromIcoltex(): Promise<Record<string, unknown>[]> {
  if (!isIcoltexApiConfigured()) {
    throw new Error('API Icoltex no configurada: faltan ICOLTEX_API_URL, ICOLTEX_API_USER o ICOLTEX_API_PASSWORD');
  }
  return fetchIcoltexArray(getIcoltexUrl('clientes'), 'clientes', 'GET');
}

/**
 * Obtiene el listado de items/productos desde el webhook Icoltex.
 */
export async function fetchItemsFromIcoltex(): Promise<Record<string, unknown>[]> {
  if (!isIcoltexApiConfigured()) {
    throw new Error('API Icoltex no configurada: faltan ICOLTEX_API_URL, ICOLTEX_API_USER o ICOLTEX_API_PASSWORD');
  }
  return fetchIcoltexArray(getIcoltexUrl('items'), 'items');
}

/**
 * Obtiene el listado de clases/familias desde el webhook Icoltex.
 */
export async function fetchClassesFromIcoltex(): Promise<Record<string, unknown>[]> {
  if (!isIcoltexApiConfigured()) {
    throw new Error('API Icoltex no configurada: faltan ICOLTEX_API_URL, ICOLTEX_API_USER o ICOLTEX_API_PASSWORD');
  }
  return fetchIcoltexArray(getIcoltexUrl('clases'), 'clases');
}

/**
 * Obtiene el listado de categorias desde el webhook Icoltex.
 */
export async function fetchCategoriesFromIcoltex(): Promise<Record<string, unknown>[]> {
  if (!isIcoltexApiConfigured()) {
    throw new Error('API Icoltex no configurada: faltan ICOLTEX_API_URL, ICOLTEX_API_USER o ICOLTEX_API_PASSWORD');
  }
  return fetchIcoltexArray(getIcoltexUrl('categorias'), 'categorias');
}
