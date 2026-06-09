import { OAuth2Client } from 'google-auth-library';
import { Admin } from '../models/Admin';
import { User } from '../models/User';
import { createUserToken } from './auth.service';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export type GoogleAuthResult =
  | {
      ok: true;
      user: { id: string; email: string; nombre?: string };
      token: string;
      message: string;
      isNewUser: boolean;
    }
  | { ok: false; message: string };

export async function authenticateWithGoogle(
  idToken: string
): Promise<GoogleAuthResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return { ok: false, message: 'Inicio de sesión con Google no configurado' };
  }

  let payload: {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    name?: string;
  };

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    payload = ticket.getPayload() ?? {};
  } catch {
    return { ok: false, message: 'Token de Google inválido o expirado' };
  }

  const googleId = payload.sub;
  const email = payload.email?.toLowerCase().trim();
  const emailVerified = payload.email_verified !== false;

  if (!googleId || !email) {
    return { ok: false, message: 'No se pudo obtener el correo de Google' };
  }

  if (!emailVerified) {
    return {
      ok: false,
      message: 'Tu cuenta de Google debe tener el correo verificado',
    };
  }

  const admin = await Admin.findOne({ email, activo: true });
  if (admin) {
    return {
      ok: false,
      message:
        'Esta cuenta es de administrador. Use el acceso de administración.',
    };
  }

  const nombre =
    payload.given_name?.trim() ||
    payload.name?.split(' ')[0]?.trim() ||
    undefined;

  let user =
    (await User.findOne({ googleId })) ||
    (await User.findOne({ email }));

  let isNewUser = false;

  if (user) {
    if (!user.activo) {
      return { ok: false, message: 'Cuenta desactivada' };
    }

    if (!user.googleId) {
      user.googleId = googleId;
    }

    if (!user.nombre && nombre) {
      user.nombre = nombre;
    }

    await user.save();
  } else {
    user = await User.create({
      email,
      googleId,
      authProvider: 'google',
      nombre,
      activo: true,
    });
    isNewUser = true;
  }

  const token = createUserToken(user._id.toString());

  return {
    ok: true,
    user: {
      id: user._id.toString(),
      email: user.email,
      nombre: user.nombre,
    },
    token,
    message: isNewUser ? 'Cuenta creada con Google' : 'Sesión iniciada con Google',
    isNewUser,
  };
}
