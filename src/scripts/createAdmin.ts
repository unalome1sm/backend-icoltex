/**
 * Script para crear el primer admin manualmente.
 * Uso: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=tuclave npx tsx src/scripts/createAdmin.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin';
import { connectDatabase } from '../config/database';

const EMAIL = process.env.ADMIN_EMAIL || '';
const PASSWORD = process.env.ADMIN_PASSWORD || '';

async function run() {
  if (!EMAIL || !PASSWORD) {
    console.error('❌ Usa: ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD=tuclave npx tsx src/scripts/createAdmin.ts');
    process.exit(1);
  }
  if (PASSWORD.length < 6) {
    console.error('❌ La contraseña debe tener al menos 6 caracteres');
    process.exit(1);
  }

  await connectDatabase();

  const existing = await Admin.findOne({ email: EMAIL.toLowerCase().trim() });
  if (existing) {
    console.log('⚠️ Ya existe un admin con ese correo');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await Admin.create({
    email: EMAIL.toLowerCase().trim(),
    passwordHash,
    role: 'admin',
    activo: true,
  });

  console.log('✅ Admin creado:', EMAIL);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
