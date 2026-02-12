/**
 * Script para analizar la respuesta del endpoint de clientes Icoltex.
 * GET con Basic Auth → imprime tipo de respuesta, estructura y primeros ítems.
 *
 * Uso: npm run fetch:clientes (configurar ICOLTEX_* en .env)
 */
import 'dotenv/config';
import { getIcoltexUrl } from '../config/icoltexApi';

const URL = getIcoltexUrl('clientes');
const USER = process.env.ICOLTEX_API_USER || 'WCIcoltex';
const PASSWORD = process.env.ICOLTEX_API_PASSWORD || '';

async function run() {
  if (!PASSWORD) {
    console.error('❌ ICOLTEX_API_PASSWORD no está en .env');
    process.exit(1);
  }

  const auth = Buffer.from(`${USER}:${PASSWORD}`, 'utf8').toString('base64');
  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
  };

  console.log('═══════════════════════════════════════════════════════');
  console.log('  ANÁLISIS ENDPOINT CLIENTES ICOLTEX');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('URL:', URL);
  console.log('Auth: Basic', USER + ':****\n');

  try {
    const res = await fetch(URL, { method: 'GET', headers });
    const text = await res.text();
    const len = text.length;
    const preview = text.trim().slice(0, 500);

    console.log('HTTP', res.status, res.statusText);
    console.log('Longitud del body:', len, 'caracteres');
    console.log('Primeros 500 caracteres:', preview || '(vacío)\n');

    if (!res.ok) {
      console.error('❌ Error HTTP');
      process.exit(1);
    }

    if (!text.trim()) {
      console.log('⚠️ Body vacío. La API no devolvió datos.');
      process.exit(0);
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      // Intentar NDJSON (un JSON por línea)
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const parsed: unknown[] = [];
      for (const line of lines) {
        try {
          parsed.push(JSON.parse(line));
        } catch {
          console.error('❌ La respuesta no es JSON válido ni NDJSON.');
          console.log('Primeros 500 caracteres:', preview);
          process.exit(1);
        }
      }
      data = parsed;
      console.log('📦 Formato detectado: NDJSON (una línea por ítem). Total líneas:', parsed.length);
    }

    // Estructura
    console.log('📦 TIPO DE RESPUESTA:', Array.isArray(data) ? 'Array' : typeof data);
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      console.log('   Claves del objeto:', Object.keys(data).join(', '));
    }

    // Obtener array de clientes (puede ser el array directo o dentro de una clave)
    let clientes: any[] = [];
    if (Array.isArray(data)) {
      clientes = data;
    } else if (data !== null && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const possibleKeys = ['clientes', 'data', 'Clientes', 'Data', 'items', 'results'];
      for (const key of possibleKeys) {
        if (Array.isArray(obj[key])) {
          clientes = obj[key] as any[];
          console.log('   Array de clientes en clave:', key);
          break;
        }
      }
      if (clientes.length === 0 && Object.keys(obj).length > 0) {
        const firstKey = Object.keys(obj)[0];
        if (Array.isArray(obj[firstKey])) clientes = obj[firstKey] as any[];
        else console.log('   Estructura del objeto:', JSON.stringify(obj, null, 2).slice(0, 800));
      }
    }

    console.log('   Total ítems:', clientes.length);

    if (clientes.length > 0) {
      const first = clientes[0];
      console.log('\n📋 CAMPOS DEL PRIMER ÍTEM (nombres exactos):');
      console.log(Object.keys(first).map((k) => `   • "${k}"`).join('\n'));
      console.log('\n📄 PRIMER ÍTEM (ejemplo):');
      console.log(JSON.stringify(first, null, 2));
      if (clientes.length > 1) {
        console.log('\n📄 SEGUNDO ÍTEM (ejemplo):');
        console.log(JSON.stringify(clientes[1], null, 2));
      }
    }

    console.log('\n✅ Análisis listo.');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
