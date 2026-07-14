import mongoose from 'mongoose';
import { ensureOrderIndexes } from '../models/Order';

export const connectDatabase = async (): Promise<void> => {
  let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/icoltexdb';
  
  try {
    // Asegurar que la contraseña esté correctamente codificada para URL
    if (mongoUri.includes('mongodb+srv://')) {
      // Extraer y codificar la contraseña si es necesario
      const uriMatch = mongoUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@(.+)/);
      if (uriMatch) {
        const username = uriMatch[1];
        let password = uriMatch[2];
        const hostAndRest = uriMatch[3];
        
        // Codificar caracteres especiales en la contraseña si no están ya codificados
        const decodedPassword = decodeURIComponent(password);
        if (decodedPassword !== password || password.includes('@') || password.includes(':')) {
          password = encodeURIComponent(decodedPassword);
          mongoUri = `mongodb+srv://${username}:${password}@${hostAndRest}`;
        }
      }
    }
    
    // Si es una URI de MongoDB Atlas y no tiene nombre de base de datos, agregarlo
    if (mongoUri.includes('mongodb+srv://')) {
      // Verificar si falta el nombre de la base de datos (después del / pero antes del ?)
      const urlParts = mongoUri.split('mongodb+srv://')[1];
      const afterAt = urlParts.split('@')[1] || urlParts;
      const hostAndPath = afterAt.split('?')[0];
      const queryString = mongoUri.includes('?') ? '?' + mongoUri.split('?')[1] : '';
      
      // Nombre de la base de datos (debe coincidir con el nombre real en MongoDB Atlas)
      const dbName = process.env.MONGODB_DB_NAME || 'icoltexdb';
      
      // Si no hay / después del host, agregar el nombre de la base de datos
      if (!hostAndPath.includes('/')) {
        mongoUri = mongoUri.replace('@' + hostAndPath, `@${hostAndPath}/${dbName}`);
      } else if (hostAndPath.endsWith('/')) {
        // Si termina con / pero no tiene nombre de base de datos
        mongoUri = mongoUri.replace(hostAndPath + queryString, hostAndPath + dbName + queryString);
      }
    }
    
    // Opciones alineadas con el diagnóstico que sí conecta (MongoClient); evitan fallos por TLS estricto
    const options: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 25000,
      connectTimeoutMS: 25000,
      socketTimeoutMS: 45000,
    };
    if (mongoUri.includes('mongodb+srv://')) {
      if (!mongoUri.includes('retryWrites')) {
        const separator = mongoUri.includes('?') ? '&' : '?';
        mongoUri += `${separator}retryWrites=true&w=majority`;
      }
    }
    
    console.log(`🔗 Conectando con URI: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`); // Ocultar password en logs
    
    await mongoose.connect(mongoUri, options);
    
    const dbName = mongoose.connection.db?.databaseName;
    console.log(`✅ MongoDB conectado exitosamente`);
    console.log(`📦 Base de datos: ${dbName || 'icoltexdb'}`);

    await ensureOrderIndexes();
  } catch (error: any) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    console.error('🔍 Error completo:', error);
    console.log('\n💡 Posibles soluciones:');
    
    // Detectar error específico de IP no permitida
    if (error.message.includes('whitelist') || error.message.includes('Could not connect to any servers')) {
      console.log('   🚫 IP NO PERMITIDA - Este es el problema principal:');
      console.log('');
      console.log('   📋 Pasos para resolver:');
      console.log('      1. Ve a MongoDB Atlas: https://cloud.mongodb.com/');
      console.log('      2. Selecciona tu cluster');
      console.log('      3. Ve a "Network Access" (Security → Network Access)');
      console.log('      4. Click en "Add IP Address"');
      console.log('      5. Para desarrollo rápido, usa "Allow Access from Anywhere"');
      console.log('         - Escribe: 0.0.0.0/0');
      console.log('         - ⚠️ Solo para desarrollo, NO para producción');
      console.log('      6. Click en "Confirm"');
      console.log('      7. ESPERA 2-3 MINUTOS para que se apliquen los cambios');
      console.log('');
      console.log('   🔍 Verificación:');
      console.log('      - Tu IP actual puede haber cambiado (IP dinámica)');
      console.log('      - Si estás en una red corporativa, pueden usar NAT');
      console.log('      - Si estás usando VPN, tu IP externa es la del VPN');
      console.log('');
      console.log('   💡 Tip: Usa 0.0.0.0/0 temporalmente para confirmar que funciona');
      console.log('           Luego puedes restringir a IPs específicas si es necesario');
    } else if (error.message.includes('SSL') || error.message.includes('TLS') || error.message.includes('tlsv1')) {
      console.log('   🔒 Error SSL/TLS detectado:');
      console.log('      Si tu IP YA está configurada en MongoDB Atlas, entonces:');
      console.log('');
      console.log('      1. 🔐 VERIFICA LAS CREDENCIALES (MÁS PROBABLE):');
      console.log('         → Ve a MongoDB Atlas → Database Access');
      console.log('         → Verifica que el usuario "sales_db_user" exista');
      console.log('         → Verifica que la contraseña sea correcta');
      console.log('         → Si la contraseña tiene caracteres especiales, puede necesitar encoding');
      console.log('         → Intenta cambiar la contraseña en Atlas y actualizar el .env');
      console.log('');
      console.log('      2. 🔑 VERIFICA LOS PERMISOS DEL USUARIO:');
      console.log('         → El usuario debe tener "Read and write to any database"');
      console.log('         → O al menos permisos en la base de datos "icoltex"');
      console.log('');
      console.log('      3. ⏰ ESPERA UNOS MINUTOS:');
      console.log('         → Los cambios en Network Access pueden tardar 1-2 minutos en aplicarse');
      console.log('         → Cierra y vuelve a abrir MongoDB Atlas para refrescar');
      console.log('');
      console.log('      4. 🌐 VERIFICA LA RED:');
      console.log('         → Algunas redes corporativas/VPN bloquean conexiones SSL');
      console.log('         → Prueba desde otra red si es posible');
      console.log('');
      const sanitizedUri = (process.env.MONGODB_URI || mongoUri).replace(/:[^:@]+@/, ':****@');
      console.log('   📝 URI usada (sin contraseña):', sanitizedUri);
      console.log('');
      console.log('   💡 SUGERENCIA: Prueba crear un nuevo usuario en MongoDB Atlas:');
      console.log('      1. Database Access → Add New Database User');
      console.log('      2. Username: sales_db_user (o nuevo nombre)');
      console.log('      3. Password: Genera una nueva sin caracteres especiales');
      console.log('      4. Privileges: Read and write to any database');
      console.log('      5. Actualiza el .env con las nuevas credenciales');
    } else {
      console.log('      1. MongoDB esté corriendo (local o Atlas)');
      console.log('      2. La URI en .env sea correcta');
      console.log('      3. Tengas acceso a la base de datos');
    }
    process.exit(1);
  }
};

// Manejar eventos de conexión
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB desconectado');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Error en MongoDB:', error);
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconectado');
});

