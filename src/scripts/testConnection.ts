import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';

// Cargar variables de entorno
dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔄 Intentando conectar a MongoDB...');
    console.log(`📍 URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/icoltex'}`);
    
    await connectDatabase();
    
    console.log('✅ Conexión exitosa a MongoDB!');
    console.log('✅ La base de datos está lista para usar.');
    
    // Cerrar la conexión después de la prueba
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al conectar:', error);
    console.log('\n💡 Verifica que:');
    console.log('   1. MongoDB esté corriendo (local o Atlas)');
    console.log('   2. La URI en .env sea correcta');
    console.log('   3. Tengas acceso a la base de datos');
    process.exit(1);
  }
};

testConnection();


