import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Cargar variables de entorno
dotenv.config();

const testDirectConnection = async () => {
  const uri = process.env.MONGODB_URI || '';
  
  if (!uri) {
    console.error('❌ MONGODB_URI no está definida en el archivo .env');
    process.exit(1);
  }

  let mongoUri = uri;
  
  // Asegurar que tenga el nombre de la base de datos
  if (mongoUri.includes('mongodb+srv://') && !mongoUri.match(/\/[^/?]+(\?|$)/)) {
    const separator = mongoUri.includes('?') ? '&' : '?';
    mongoUri = mongoUri.replace('?', '/icoltex?').replace('mongodb+srv://', 'mongodb+srv://');
    if (!mongoUri.includes('/icoltex')) {
      mongoUri = mongoUri.replace(/(mongodb\+srv:\/\/[^/]+)(\?|$)/, '$1/icoltex$2');
    }
  }

  console.log('🔄 Probando conexión directa con MongoDB Driver...');
  console.log(`📍 URI: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);
  console.log('');

  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
    tls: true,
  });

  try {
    console.log('📡 Intentando conectar...');
    await client.connect();
    console.log('✅ Conexión exitosa con MongoDB Driver!');
    
    // Listar las bases de datos para verificar la conexión
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    console.log('📦 Bases de datos disponibles:');
    databases.databases.forEach((db: any) => {
      console.log(`   - ${db.name}`);
    });
    
    // Probar operación en la base de datos
    const db = client.db('icoltex');
    const collections = await db.listCollections().toArray();
    console.log(`\n📚 Colecciones en "icoltex": ${collections.length}`);
    if (collections.length > 0) {
      collections.forEach((col: any) => {
        console.log(`   - ${col.name}`);
      });
    } else {
      console.log('   (Base de datos vacía - esto es normal si es nueva)');
    }
    
    await client.close();
    console.log('\n✅ Test completado exitosamente!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error en conexión directa:', error.message);
    console.error('   Tipo de error:', error.name);
    if (error.cause) console.error('   Causa:', error.cause?.message || error.cause);
    if (error.code) console.error('   Código:', error.code);

    const msg = (error.message || '').toLowerCase();
    if (msg.includes('authentication') || msg.includes('auth') || error.code === 18) {
      console.log('\n💡 DIAGNÓSTICO: Error de AUTENTICACIÓN (usuario/contraseña o permisos).');
      console.log('   → Atlas → Database Access: usuario debe estar en el MISMO proyecto que el cluster.');
      console.log('   → Comprueba usuario y contraseña; si la contraseña tiene caracteres raros, cámbiala en Atlas.');
    } else if (msg.includes('whitelist') || msg.includes('could not connect to any servers')) {
      console.log('\n💡 DIAGNÓSTICO: Atlas no permite la conexión desde esta red.');
      console.log('   → Mismo PROYECTO: Network Access y el cluster deben estar en el mismo proyecto (menú izquierdo).');
      console.log('   → Cluster pausado: si es Free Tier, revisa si el cluster está "Paused" y dale "Resume".');
      console.log('   → Prueba desde otra red (móvil, otro WiFi) o desactiva VPN.');
    } else {
      console.log('\n💡 Revisa en Atlas: mismo proyecto para cluster, Network Access y Database Access; cluster activo (no pausado).');
    }
    process.exit(1);
  }
};

testDirectConnection();

