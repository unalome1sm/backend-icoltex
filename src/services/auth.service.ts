import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Admin } from '../models/Admin';
import { User } from '../models/User';
import { AuthOtp } from '../models/AuthOtp';
import { sendVerificationCode, isEmailConfigured } from './email.service';

const SALT_ROUNDS = 10;
const OTP_LENGTH = 6;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const COOKIE_NAME = 'icoltex_auth';
const OTP_TTL_MIN = Number(process.env.AUTH_OTP_TTL_MINUTES) || 10;
const RESEND_SEC = Number(process.env.AUTH_OTP_RESEND_SECONDS) || 60;

export const AUTH_COOKIE_NAME = COOKIE_NAME;

function generateOtp(): string {
  const bytes = crypto.randomBytes(3);
  let n = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16);
  n = n % 1_000_000;
  return n.toString().padStart(6, '0');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(adminId: string): string {
  const expiresInSeconds = 7 * 24 * 60 * 60; // 7 días
  return jwt.sign(
    { sub: adminId, role: 'admin' },
    JWT_SECRET as jwt.Secret,
    { expiresIn: expiresInSeconds }
  );
}

export function createUserToken(userId: string): string {
  const expiresInSeconds = 7 * 24 * 60 * 60; // 7 días
  return jwt.sign(
    { sub: userId, role: 'user' },
    JWT_SECRET as jwt.Secret,
    { expiresIn: expiresInSeconds }
  );
}

export function verifyToken(token: string): { sub: string; role: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET as jwt.Secret) as { sub: string; role: string };
    return payload;
  } catch {
    return null;
  }
}

export async function registerRequest(email: string): Promise<{ ok: boolean; message: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, message: 'Servicio de correo no configurado' };
  }
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return { ok: false, message: 'Ya existe una cuenta con ese correo' };
  }
  const recent = await AuthOtp.findOne({
    email: email.toLowerCase().trim(),
    purpose: 'register',
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_SEC * 1000) {
    return { ok: false, message: `Espera ${RESEND_SEC} segundos para reenviar el código` };
  }
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  await AuthOtp.create({
    email: email.toLowerCase().trim(),
    codeHash,
    purpose: 'register',
    expiresAt,
  });
  await sendVerificationCode(email, code, 'register');
  return { ok: true, message: 'Código enviado a tu correo' };
}

export async function registerVerify(email: string, code: string, password: string, confirmPassword: string, nombre?: string): Promise<{ ok: boolean; user?: { id: string; email: string }; token?: string; message: string }> {
  if (password !== confirmPassword) {
    return { ok: false, message: 'Las contraseñas no coinciden' };
  }
  if (password.length < 6) {
    return { ok: false, message: 'La contraseña debe tener al menos 6 caracteres' };
  }
  const otp = await AuthOtp.findOne({
    email: email.toLowerCase().trim(),
    purpose: 'register',
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!otp) {
    return { ok: false, message: 'Código inválido o expirado' };
  }
  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    await AuthOtp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
    return { ok: false, message: 'Código incorrecto' };
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    nombre: nombre?.trim() || undefined,
    activo: true,
  });
  await AuthOtp.updateOne({ _id: otp._id }, { usedAt: new Date() });
  const token = createUserToken(user._id.toString());
  return {
    ok: true,
    user: { id: user._id.toString(), email: user.email },
    token,
    message: 'Cuenta creada correctamente',
  };
}

export async function loginRequest(email: string, password: string): Promise<{ ok: boolean; message: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, message: 'Servicio de correo no configurado' };
  }
  const user = await User.findOne({ email: email.toLowerCase().trim(), activo: true });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    return { ok: false, message: 'Correo o contraseña incorrectos' };
  }
  const recent = await AuthOtp.findOne({
    email: email.toLowerCase().trim(),
    purpose: 'login',
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_SEC * 1000) {
    return { ok: false, message: `Espera ${RESEND_SEC} segundos para reenviar el código` };
  }
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  await AuthOtp.create({
    email: email.toLowerCase().trim(),
    codeHash,
    purpose: 'login',
    expiresAt,
  });
  await sendVerificationCode(email, code, 'login');
  return { ok: true, message: 'Código enviado a tu correo' };
}

export async function loginVerify(email: string, code: string): Promise<{ ok: boolean; user?: { id: string; email: string }; token?: string; message: string }> {
  const otp = await AuthOtp.findOne({
    email: email.toLowerCase().trim(),
    purpose: 'login',
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!otp) {
    return { ok: false, message: 'Código inválido o expirado' };
  }
  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    await AuthOtp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
    return { ok: false, message: 'Código incorrecto' };
  }
  const user = await User.findOne({ email: email.toLowerCase().trim(), activo: true });
  if (!user) {
    return { ok: false, message: 'Cuenta no encontrada' };
  }
  await AuthOtp.updateOne({ _id: otp._id }, { usedAt: new Date() });
  const token = createUserToken(user._id.toString());
  return {
    ok: true,
    user: { id: user._id.toString(), email: user.email },
    token,
    message: 'Sesión iniciada',
  };
}

export async function adminLoginRequest(email: string, password: string): Promise<{ ok: boolean; message: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, message: 'Servicio de correo no configurado' };
  }
  const admin = await Admin.findOne({ email: email.toLowerCase().trim(), activo: true });
  if (!admin || !(await comparePassword(password, admin.passwordHash))) {
    return { ok: false, message: 'Correo o contraseña incorrectos' };
  }
  const recent = await AuthOtp.findOne({
    email: email.toLowerCase().trim(),
    purpose: 'admin_login',
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_SEC * 1000) {
    return { ok: false, message: `Espera ${RESEND_SEC} segundos para reenviar el código` };
  }
  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
  await AuthOtp.create({
    email: email.toLowerCase().trim(),
    codeHash,
    purpose: 'admin_login',
    expiresAt,
  });
  await sendVerificationCode(email, code, 'login');
  return { ok: true, message: 'Código enviado a tu correo' };
}

export async function adminLoginVerify(email: string, code: string): Promise<{ ok: boolean; admin?: { id: string; email: string }; token?: string; message: string }> {
  const otp = await AuthOtp.findOne({
    email: email.toLowerCase().trim(),
    purpose: 'admin_login',
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  if (!otp) {
    return { ok: false, message: 'Código inválido o expirado' };
  }
  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    await AuthOtp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
    return { ok: false, message: 'Código incorrecto' };
  }
  const admin = await Admin.findOne({ email: email.toLowerCase().trim(), activo: true });
  if (!admin) {
    return { ok: false, message: 'Cuenta no encontrada' };
  }
  await AuthOtp.updateOne({ _id: otp._id }, { usedAt: new Date() });
  const token = createToken(admin._id.toString());
  return {
    ok: true,
    admin: { id: admin._id.toString(), email: admin.email },
    token,
    message: 'Sesión iniciada',
  };
}
