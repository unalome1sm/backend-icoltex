import { Request, Response } from 'express';
import { Admin } from '../models/Admin';
import { User } from '../models/User';
import {
  registerRequest,
  registerVerify,
  loginRequest,
  loginVerify,
  adminLoginRequest,
  adminLoginVerify,
  verifyToken,
  AUTH_COOKIE_NAME,
} from '../services/auth.service';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export async function registerRequestHandler(req: Request, res: Response) {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'El correo es obligatorio' });
    }
    const result = await registerRequest(email.trim());
    if (!result.ok) {
      return res.status(400).json({ error: result.message });
    }
    res.json({ message: result.message });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al solicitar registro' });
  }
}

export async function registerVerifyHandler(req: Request, res: Response) {
  try {
    const { email, code, password, confirmPassword, nombre } = req.body || {};
    if (!email || !code || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Email, código, contraseña y confirmación son obligatorios' });
    }
    if (typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
    }
    const result = await registerVerify(
      email.trim(),
      code.trim(),
      password,
      confirmPassword,
      typeof nombre === 'string' ? nombre : undefined
    );
    if (!result.ok) {
      return res.status(400).json({ error: result.message });
    }
    res.cookie(AUTH_COOKIE_NAME, result.token, COOKIE_OPTIONS);
    res.json({ message: result.message, user: result.user, token: result.token });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al verificar registro' });
  }
}

export async function loginRequestHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    const result = await loginRequest(email.trim(), password);
    if (!result.ok) {
      return res.status(400).json({ error: result.message });
    }
    res.json({ message: result.message });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al solicitar login' });
  }
}

export async function loginVerifyHandler(req: Request, res: Response) {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: 'Email y código son obligatorios' });
    }
    if (typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
    }
    const result = await loginVerify(email.trim(), code.trim());
    if (!result.ok) {
      return res.status(400).json({ error: result.message });
    }
    res.cookie(AUTH_COOKIE_NAME, result.token, COOKIE_OPTIONS);
    res.json({ message: result.message, user: result.user, token: result.token });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al verificar login' });
  }
}

export async function adminLoginRequestHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    const result = await adminLoginRequest(email.trim(), password);
    if (!result.ok) {
      return res.status(400).json({ error: result.message });
    }
    res.json({ message: result.message });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al solicitar login admin' });
  }
}

export async function adminLoginVerifyHandler(req: Request, res: Response) {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: 'Email y código son obligatorios' });
    }
    if (typeof code !== 'string' || code.length !== 6) {
      return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
    }
    const result = await adminLoginVerify(email.trim(), code.trim());
    if (!result.ok) {
      return res.status(400).json({ error: result.message });
    }
    res.cookie(AUTH_COOKIE_NAME, result.token, COOKIE_OPTIONS);
    res.json({ message: result.message, admin: result.admin, token: result.token });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al verificar login admin' });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  res.json({ message: 'Sesión cerrada' });
}

export async function meHandler(req: Request, res: Response) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    if (payload.role === 'admin') {
      const admin = await Admin.findById(payload.sub).select('-passwordHash');
      if (!admin || !admin.activo) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      return res.json({
        admin: {
          id: admin._id.toString(),
          email: admin.email,
          nombre: admin.nombre,
          role: admin.role,
        },
      });
    }
    if (payload.role === 'user') {
      const user = await User.findById(payload.sub).select('-passwordHash');
      if (!user || !user.activo) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      return res.json({
        user: {
          id: user._id.toString(),
          email: user.email,
          nombre: user.nombre,
          segundoNombre: user.segundoNombre,
          apellidos: user.apellidos,
          cedula: user.cedula,
          telefono: user.telefono,
          tipoVivienda: (user as any).tipoVivienda,
          direccionCasa: user.direccionCasa,
          apartamento: (user as any).apartamento,
          direccionOficina: user.direccionOficina,
          pisoOficina: (user as any).pisoOficina,
          numeroOficina: (user as any).numeroOficina,
        },
      });
    }
    return res.status(401).json({ error: 'Token inválido' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al obtener sesión' });
  }
}

export async function updateProfileHandler(req: Request, res: Response) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'user') {
      return res.status(403).json({ error: 'Solo usuarios pueden actualizar su perfil' });
    }
    const user = await User.findById(payload.sub);
    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    const body = req.body || {};
    if (body.nombre !== undefined) user.nombre = typeof body.nombre === 'string' ? body.nombre.trim() || undefined : undefined;
    if (body.segundoNombre !== undefined) user.segundoNombre = typeof body.segundoNombre === 'string' ? body.segundoNombre.trim() || undefined : undefined;
    if (body.apellidos !== undefined) user.apellidos = typeof body.apellidos === 'string' ? body.apellidos.trim() || undefined : undefined;
    if (body.tipoVivienda !== undefined) (user as any).tipoVivienda = body.tipoVivienda === 'casa' || body.tipoVivienda === 'edificio' ? body.tipoVivienda : undefined;
    if (body.direccionCasa !== undefined) user.direccionCasa = typeof body.direccionCasa === 'string' ? body.direccionCasa.trim() || undefined : undefined;
    if (body.apartamento !== undefined) (user as any).apartamento = typeof body.apartamento === 'string' ? body.apartamento.trim() || undefined : undefined;
    if (body.tieneOficina === false) {
      user.direccionOficina = undefined;
      (user as any).pisoOficina = undefined;
      (user as any).numeroOficina = undefined;
    } else {
      if (body.direccionOficina !== undefined) user.direccionOficina = typeof body.direccionOficina === 'string' ? body.direccionOficina.trim() || undefined : undefined;
      if (body.pisoOficina !== undefined) (user as any).pisoOficina = typeof body.pisoOficina === 'string' ? body.pisoOficina.trim() || undefined : undefined;
      if (body.numeroOficina !== undefined) (user as any).numeroOficina = typeof body.numeroOficina === 'string' ? body.numeroOficina.trim() || undefined : undefined;
    }
    if (body.cedula !== undefined) {
      const cedula = String(body.cedula).replace(/\D/g, '');
      if (cedula && (cedula.length < 5 || cedula.length > 15)) {
        return res.status(400).json({ error: 'La cédula debe tener entre 5 y 15 dígitos' });
      }
      user.cedula = cedula || undefined;
    }
    if (body.telefono !== undefined) {
      const telefono = String(body.telefono).replace(/\D/g, '');
      if (telefono && (telefono.length < 7 || telefono.length > 15)) {
        return res.status(400).json({ error: 'El teléfono debe tener entre 7 y 15 dígitos' });
      }
      user.telefono = telefono || undefined;
    }
    await user.save();
    const updated = await User.findById(user._id).select('-passwordHash').lean();
    const u = updated as any;
    return res.json({
      message: 'Perfil actualizado',
      user: {
        id: updated!._id.toString(),
        email: updated!.email,
        nombre: updated!.nombre,
        segundoNombre: updated!.segundoNombre,
        apellidos: updated!.apellidos,
        cedula: updated!.cedula,
        telefono: updated!.telefono,
        tipoVivienda: u.tipoVivienda,
        direccionCasa: updated!.direccionCasa,
        apartamento: u.apartamento,
        direccionOficina: updated!.direccionOficina,
        pisoOficina: u.pisoOficina,
        numeroOficina: u.numeroOficina,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Error al actualizar perfil' });
  }
}
