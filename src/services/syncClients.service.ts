/**
 * Sincroniza clientes desde la API Icoltex hacia MongoDB (upsert por numeroDocumento).
 */
import { Client } from '../models/Client';
import { fetchClientesFromIcoltex } from './externalApi.service';

type TipoDocumento = 'CC' | 'NIT' | 'CE' | 'PASAPORTE';

function inferTipoDocumento(cardCode: string): TipoDocumento {
  if (!cardCode || typeof cardCode !== 'string') return 'CC';
  const upper = cardCode.toUpperCase();
  if (upper.startsWith('NIT') || /^\d{9,}$/.test(cardCode.replace(/\D/g, ''))) return 'NIT';
  if (upper.startsWith('CE')) return 'CE';
  if (upper.startsWith('P') || upper.startsWith('PAS')) return 'PASAPORTE';
  return 'CC';
}

function getString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (v == null) continue;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    if (s !== '') return s;
  }
  return '';
}

/**
 * La API puede devolver cada ítem como { code, result } con el cliente dentro de result.
 * Devuelve uno o más objetos a mapear: si result es objeto, [result]; si result es array, result; sino [item].
 */
function unwrapItem(item: Record<string, unknown>): Record<string, unknown>[] {
  const inner = item.result ?? item.data ?? item.value;
  if (inner != null && typeof inner === 'object') {
    if (Array.isArray(inner)) {
      return inner.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object') as Record<string, unknown>[];
    }
    return [inner as Record<string, unknown>];
  }
  return [item];
}

/** Obtiene el identificador del cliente; acepta string o número. Busca por nombre de clave y por coincidencia (card/codigo). */
function getCardCode(item: Record<string, unknown>): string {
  const keys = ['CardCode', 'Card Code', 'cardCode', 'cardcode', 'card_code', 'Código', 'Codigo', 'codigo', 'id', 'ID'];
  for (const key of keys) {
    const v = item[key];
    if (v == null) continue;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    if (s !== '') return s;
  }
  // Fallback: cualquier clave cuyo nombre contenga "card" o "codigo" (insensible a mayúsculas)
  const lower = (x: string) => x.toLowerCase().normalize('NFD').replace(/\u0307/g, '').replace(/ó/g, 'o');
  for (const key of Object.keys(item)) {
    const k = lower(key);
    if (k.includes('card') || k.includes('codigo')) {
      const v = item[key];
      if (v == null) continue;
      const s = typeof v === 'string' ? v.trim() : String(v).trim();
      if (s !== '') return s;
    }
  }
  return '';
}

/**
 * Mapea un ítem de la API Icoltex al formato del modelo Client.
 * Acepta CardCode, Código, Codigo, codigo, id, ID como identificador.
 */
function mapIcoltexItemToClient(item: Record<string, unknown>): Record<string, unknown> | null {
  const cardCode = getCardCode(item);
  if (!cardCode) return null;

  const nombre = getString(item, 'Razón Social', 'Razon Social', 'Nombre Comercial', 'nombreComercial', 'Nombre', 'nombre') || cardCode;
  const tipoDocumento = inferTipoDocumento(cardCode);

  return {
    codigo: cardCode.toUpperCase(),
    numeroDocumento: cardCode.trim(),
    nombre,
    tipoDocumento,
    email: getString(item, 'Correo Electrónico', 'Correo Electronico', 'correoElectronico', 'Email', 'email') || undefined,
    telefono: getString(item, 'Telefono', 'telefono', 'Teléfono') || undefined,
    ciudad: getString(item, 'Ciudad', 'ciudad') || undefined,
    departamento: getString(item, 'Departamento', 'departamento') || undefined,
    pais: getString(item, 'País', 'Pais', 'pais') || 'Colombia',
    direccion: getString(item, 'Dirección', 'Direccion', 'direccion') || undefined,
    activo: true,
  };
}

export interface SyncClientsResult {
  totalFetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  details?: string[];
}

/**
 * Obtiene clientes del webhook Icoltex y los sincroniza en MongoDB (crear o actualizar por numeroDocumento).
 */
export async function syncClientsFromIcoltex(): Promise<SyncClientsResult> {
  const raw = await fetchClientesFromIcoltex();
  const result: SyncClientsResult = {
    totalFetched: raw.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  let totalToProcess = 0;
  for (const item of raw) totalToProcess += unwrapItem(item).length;
  console.log('[Sync] Clientes: iniciando,', totalToProcess, 'clientes a procesar');

  let processed = 0;
  for (const item of raw) {
    const clientRecords = unwrapItem(item);
    for (const clientRecord of clientRecords) {
      processed++;
      if (processed % 100 === 0 || processed === totalToProcess) {
        console.log('[Sync] Clientes: procesados', processed, '/', totalToProcess);
      }
      try {
        const mapped = mapIcoltexItemToClient(clientRecord);
        if (!mapped) {
          result.skipped++;
          result.details = result.details || [];
          const code = getCardCode(clientRecord);
          const keys = Object.keys(clientRecord).join(', ');
          result.details.push(code ? `Omitido: ${code}` : `Omitido (sin CardCode). Claves del ítem: [${keys}]`);
          continue;
        }

        const filter = { numeroDocumento: mapped.numeroDocumento };
        const existing = await Client.findOne(filter);

        if (existing) {
          await Client.updateOne(filter, { $set: mapped });
          result.updated++;
        } else {
          await Client.create(mapped);
          result.created++;
        }
      } catch (err: any) {
        result.errors++;
        result.details = result.details || [];
        result.details.push(`${getCardCode(clientRecord) || '?'}: ${err.message}`);
      }
    }
  }

  console.log('[Sync] Clientes: terminado, devolviendo resultado');
  return result;
}
