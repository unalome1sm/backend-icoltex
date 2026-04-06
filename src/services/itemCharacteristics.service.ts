export type ItemCharacteristicRow = {
  clase: string;
  categoria: string;
  color: string;
};

const DEFAULT_WEBHOOK_URL =
  'https://webhook-icoltex.tangara.cloud/webhook/caracterisiticas_items_icoltex';

/** Misma Basic Auth que el resto de webhooks Icoltex (ICOLTEX_API_USER / ICOLTEX_API_PASSWORD). */
function getIcoltexBasicAuthHeader(): string {
  const user = process.env.ICOLTEX_API_USER?.trim() ?? '';
  const password = process.env.ICOLTEX_API_PASSWORD?.trim() ?? '';
  if (!user || !password) {
    throw new Error(
      'Configura ICOLTEX_API_USER e ICOLTEX_API_PASSWORD en .env (Basic Auth del webhook Tangara).'
    );
  }
  const token = Buffer.from(`${user}:${password}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

function mapRow(raw: unknown): ItemCharacteristicRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const clase = typeof o.Clase === 'string' ? o.Clase.trim() : '';
  const categoria = typeof o.Categoria === 'string' ? o.Categoria.trim() : '';
  const color = typeof o.Color === 'string' ? o.Color.trim() : '';
  if (!clase && !categoria && !color) return null;
  return { clase, categoria, color };
}

function extractResultRows(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    const first = data[0];
    if (first && typeof first === 'object' && 'result' in first) {
      const r = (first as { result: unknown }).result;
      return Array.isArray(r) ? r : [];
    }
    return data;
  }
  if (data && typeof data === 'object' && 'result' in data) {
    const r = (data as { result: unknown }).result;
    return Array.isArray(r) ? r : [];
  }
  return [];
}

export async function fetchItemCharacteristicsFromWebhook(): Promise<ItemCharacteristicRow[]> {
  const url =
    process.env.ICOLTEX_CARACTERISTICAS_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK_URL;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: getIcoltexBasicAuthHeader(),
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`Webhook características: HTTP ${res.status} ${res.statusText}`);
  }

  const data: unknown = await res.json();
  const rawRows = extractResultRows(data);
  const items: ItemCharacteristicRow[] = [];
  for (const row of rawRows) {
    const mapped = mapRow(row);
    if (mapped) items.push(mapped);
  }

  return items;
}
