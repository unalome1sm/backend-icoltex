/** Normalización de campos crudos SAP/Tangara → valores internos consistentes */

export type SapImagenBlock = {
  imagen1?: string | null;
  imagen2?: string | null;
  imagen3?: string | null;
};

export function trimText(value: unknown): string {
  if (value == null) return '';
  const s = typeof value === 'string' ? value.trim() : String(value).trim();
  return s;
}

export function optionalText(value: unknown): string | undefined {
  const s = trimText(value);
  return s || undefined;
}

export function parseSapStock(value: string | number | undefined | null): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function parseSapPrecio(value: string | number | undefined | null): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

export function parseSapActivo(estado: unknown): boolean {
  return trimText(estado).toUpperCase() === 'ACTIVO';
}

export function parseSapImagenes(
  blocks: SapImagenBlock[] | SapImagenBlock | undefined | null
): string[] {
  if (!blocks) return [];
  const list = Array.isArray(blocks) ? blocks : [blocks];
  const urls: string[] = [];
  for (const block of list) {
    if (!block || typeof block !== 'object') continue;
    for (const key of ['imagen1', 'imagen2', 'imagen3'] as const) {
      const url = optionalText(block[key]);
      if (url) urls.push(url);
    }
  }
  return urls;
}

export function getStringField(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (v == null) continue;
    const s = trimText(v);
    if (s) return s;
  }
  return '';
}

export function getItemCode(obj: Record<string, unknown>): string {
  const direct = getStringField(
    obj,
    'ItemCode',
    'Item Code',
    'itemCode',
    'item_code',
    'Código',
    'Codigo',
    'codigo',
    'id',
    'ID'
  );
  if (direct) return direct;

  const lower = (x: string) =>
    x.toLowerCase().normalize('NFD').replace(/\u0307/g, '').replace(/ó/g, 'o');
  for (const key of Object.keys(obj)) {
    const k = lower(key);
    if (k.includes('itemcode') || k.includes('codigo')) {
      const s = trimText(obj[key]);
      if (s) return s;
    }
  }
  return '';
}

export function unwrapSapResultItems(item: Record<string, unknown>): Record<string, unknown>[] {
  const inner = item.result ?? item.data ?? item.value;
  if (inner != null && typeof inner === 'object') {
    if (Array.isArray(inner)) {
      return inner.filter(
        (x): x is Record<string, unknown> => x != null && typeof x === 'object'
      ) as Record<string, unknown>[];
    }
    return [inner as Record<string, unknown>];
  }
  return [item];
}

export function extractSapResultRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    const first = data[0];
    if (first && typeof first === 'object' && 'result' in first) {
      const result = (first as { result: unknown }).result;
      return Array.isArray(result) ? (result as T[]) : [];
    }
    return data as T[];
  }
  if (data && typeof data === 'object' && 'result' in data) {
    const result = (data as { result: unknown }).result;
    return Array.isArray(result) ? (result as T[]) : [];
  }
  return [];
}
