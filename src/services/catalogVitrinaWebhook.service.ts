import type {
  CatalogCharacteristicRow,
  CatalogVitrinaGroup,
  CatalogVitrinaGroupRaw,
  CatalogVitrinaVariant,
  CatalogVitrinaVariantRaw,
} from '../types/catalogVitrina.types';

const DEFAULT_WEBHOOK_URL =
  'https://webhook-icoltex.tangara.cloud/webhook/caracterisiticas_items_icoltex';

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

export function normalizeKeyPart(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function buildVitrinaGroupKey(
  nombreVitrina: string,
  claseFamilia?: string,
  categoria?: string
): string {
  return [
    normalizeKeyPart(claseFamilia),
    normalizeKeyPart(categoria),
    normalizeKeyPart(nombreVitrina),
  ].join('|');
}

export function encodeGroupId(groupKey: string): string {
  return Buffer.from(groupKey, 'utf8').toString('base64url');
}

export function decodeGroupId(groupId: string): string | null {
  try {
    const key = Buffer.from(groupId, 'base64url').toString('utf8');
    return key.length > 0 ? key : null;
  } catch {
    return null;
  }
}

function parseStock(value: string | number | undefined): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function mapVariant(raw: CatalogVitrinaVariantRaw): CatalogVitrinaVariant | null {
  const codigo = raw.codigo?.trim();
  if (!codigo) return null;

  return {
    codigo,
    colorLabel: raw.colorLabel?.trim() || raw.itemNameCompleto?.trim() || codigo,
    itemNameCompleto: raw.itemNameCompleto?.trim() || codigo,
    stock: parseStock(raw.stock),
    activo: raw.activo !== false,
    unidadMedida: raw.unidadMedida?.trim() || undefined,
  };
}

function mapGroup(raw: CatalogVitrinaGroupRaw): CatalogVitrinaGroup | null {
  const nombreVitrina = raw.nombreVitrina?.trim();
  if (!nombreVitrina) return null;

  const variantes = (raw.variantes ?? [])
    .map(mapVariant)
    .filter((v): v is CatalogVitrinaVariant => v != null);

  const groupKey = buildVitrinaGroupKey(
    nombreVitrina,
    raw.claseFamilia,
    raw.categoria
  );

  return {
    groupKey,
    nombreVitrina,
    claseFamilia: raw.claseFamilia?.trim() || undefined,
    categoria: raw.categoria?.trim() || undefined,
    variantes,
  };
}

function extractResultRows(data: unknown): CatalogVitrinaGroupRaw[] {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    const first = data[0];
    if (first && typeof first === 'object' && 'result' in first) {
      const result = (first as { result: unknown }).result;
      return Array.isArray(result) ? (result as CatalogVitrinaGroupRaw[]) : [];
    }
    return data as CatalogVitrinaGroupRaw[];
  }
  if (data && typeof data === 'object' && 'result' in data) {
    const result = (data as { result: unknown }).result;
    return Array.isArray(result) ? (result as CatalogVitrinaGroupRaw[]) : [];
  }
  return [];
}

export async function fetchCatalogVitrinaFromWebhook(): Promise<CatalogVitrinaGroup[]> {
  const url =
    process.env.ICOLTEX_CARACTERISTICAS_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK_URL;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: getIcoltexBasicAuthHeader(),
    },
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`Webhook catálogo vitrina: HTTP ${res.status} ${res.statusText}`);
  }

  const data: unknown = await res.json();
  const rawGroups = extractResultRows(data);

  const groups: CatalogVitrinaGroup[] = [];
  for (const raw of rawGroups) {
    const mapped = mapGroup(raw);
    if (mapped && mapped.variantes.length > 0) {
      groups.push(mapped);
    }
  }

  groups.sort((a, b) => {
    const ca = (a.claseFamilia ?? '').localeCompare(b.claseFamilia ?? '', 'es', {
      sensitivity: 'base',
    });
    if (ca !== 0) return ca;
    const cc = (a.categoria ?? '').localeCompare(b.categoria ?? '', 'es', {
      sensitivity: 'base',
    });
    if (cc !== 0) return cc;
    return a.nombreVitrina.localeCompare(b.nombreVitrina, 'es', { sensitivity: 'base' });
  });

  return groups;
}

export function flattenCatalogCharacteristics(
  groups: CatalogVitrinaGroup[],
  priceByCodigo?: Map<string, boolean>
): CatalogCharacteristicRow[] {
  const rows: CatalogCharacteristicRow[] = [];

  for (const group of groups) {
    for (const variant of group.variantes) {
      rows.push({
        nombreVitrina: group.nombreVitrina,
        clase: group.claseFamilia ?? '',
        categoria: group.categoria ?? '',
        color: variant.colorLabel,
        codigo: variant.codigo,
        activo: variant.activo,
        tienePrecio: priceByCodigo?.get(variant.codigo) ?? false,
      });
    }
  }

  return rows;
}
