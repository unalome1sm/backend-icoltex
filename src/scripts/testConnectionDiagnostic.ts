/**
 * Diagnóstico de conexión a MongoDB Atlas.
 * Muestra la causa real del fallo (red, DNS, firewall, proyecto incorrecto).
 */
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';
import { MongoClient } from 'mongodb';

dotenv.config();

const dnsLookup = promisify(dns.lookup);

function getCauseChain(err: any): string[] {
  const messages: string[] = [];
  let current: any = err;
  while (current) {
    if (current.message) messages.push(current.message);
    if (current.code) messages.push(`[code: ${current.code}]`);
    current = current.cause;
  }
  return messages;
}

async function run() {
  const uri = process.env.MONGODB_URI || '';
  if (!uri) {
    console.error('❌ MONGODB_URI no está en .env');
    process.exit(1);
  }

  const hostMatch = uri.match(/@([^/?]+)/);
  const host = hostMatch ? hostMatch[1] : '';

  console.log('═══════════════════════════════════════════════════════');
  console.log('  DIAGNÓSTICO DE CONEXIÓN MONGODB ATLAS');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. DNS (para mongodb+srv el driver usa SRV, no A; un A fallido no implica que la conexión falle)
  console.log('1️⃣  Resolución DNS (SRV para Atlas)...');
  const isSrv = uri.includes('mongodb+srv://');
  try {
    if (isSrv) {
      const resolveSrv = promisify(dns.resolveSrv);
      const srvName = `_mongodb._tcp.${host}`;
      const srv = await resolveSrv(srvName);
      console.log(`   ✅ SRV ${srvName} → ${srv?.length ?? 0} nodo(s)\n`);
    } else {
      const result = await dnsLookup(host);
      console.log(`   ✅ ${host} → ${result.address}\n`);
    }
  } catch (dnsErr: any) {
    console.log(`   ⚠️  DNS: ${dnsErr.message}`);
    if (isSrv) console.log('   (Con mongodb+srv el driver puede conectar igual; no es bloqueante.)');
    console.log('');
  }

  // 2. Conexión MongoDB
  console.log('2️⃣  Intentando conexión a MongoDB (timeout 25s)...');
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 25000,
    connectTimeoutMS: 25000,
  });

  let connectionError: any = null;
  try {
    await client.connect();
    console.log('   ✅ Conexión exitosa.\n');
    await client.close();
    process.exit(0);
    return;
  } catch (error: any) {
    connectionError = error;
    const causeChain = getCauseChain(error);
    console.log('   ❌ Error de conexión:\n');
    console.log('   Mensaje:', error.message);
    if (error.code) console.log('   Código:', error.code);
    if (causeChain.length > 1) {
      console.log('   Cadena de causa:');
      causeChain.forEach((m, i) => console.log(`      ${i + 1}. ${m}`));
    }
  }

  // 3. Interpretación
  const errMsg = (connectionError?.message || '').toLowerCase();
  const errCode = connectionError?.code ?? connectionError?.cause?.code;

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  QUÉ HACER SEGÚN LA CAUSA');
  console.log('═══════════════════════════════════════════════════════\n');

  if (errCode === 'ETIMEDOUT' || errCode === 'ECONNREFUSED' || errMsg.includes('could not connect to any servers')) {
    console.log('🔴 La red no llega a los servidores de Atlas (timeout o conexión rechazada).');
    console.log('');
    console.log('   A) MISMO PROYECTO (lo más frecuente):');
    console.log('      • En Atlas, menú IZQUIERDO: elige el proyecto donde ves el cluster "unalomesm".');
    console.log('      • En ESE proyecto: Security → Network Access.');
    console.log('      • Debe aparecer 0.0.0.0/0 o tu IP. Si no, "Add IP Address" → 0.0.0.0/0.');
    console.log('      • El usuario unalomeweb123_db_user debe estar en Database Access de ESE mismo proyecto.');
    console.log('');
    console.log('   B) CLUSTER PAUSADO:');
    console.log('      • Si es Free Tier, en la tarjeta del cluster puede decir "Paused".');
    console.log('      • Pulsa "Resume" y espera 1–2 minutos.');
    console.log('');
    console.log('   C) RED / FIREWALL:');
    console.log('      • Prueba desde datos del móvil (hotspot) o otro WiFi.');
    console.log('      • Desactiva VPN. Comprueba que el antivirus no bloquee Node.');
  } else if (errMsg.includes('auth') || errMsg.includes('authentication') || errCode === 18) {
    console.log('🔴 Error de autenticación.');
    console.log('   → Atlas → Database Access: usuario en el MISMO proyecto que el cluster.');
    console.log('   → Verifica usuario y contraseña; cambia la contraseña en Atlas si tiene caracteres raros.');
  } else {
    console.log('🔴 Revisa en Atlas:');
    console.log('   • Mismo proyecto: cluster unalomesm + Network Access + Database User.');
    console.log('   • Network Access: 0.0.0.0/0 o tu IP.');
    console.log('   • Cluster activo (no pausado).');
  }

  console.log('');
  process.exit(1);
}

run();
