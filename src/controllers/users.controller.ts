import { Request, Response } from 'express';
import { User } from '../models/User';
import { Admin } from '../models/Admin';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { activo, page = 1, limit = 50 } = req.query;
    const filter: Record<string, unknown> = {};

    if (activo === 'true' || activo === 'false') {
      filter.activo = activo === 'true';
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const emails = users.map((u: any) => u.email);
    const adminEmails = new Set(
      (await Admin.find({ email: { $in: emails } }).select('email').lean()).map((a: any) => a.email)
    );

    const usersWithAdmin = users.map((u: any) => ({
      ...u,
      isAdmin: adminEmails.has(u.email),
    }));

    const total = await User.countDocuments(filter);

    res.json({
      users: usersWithAdmin,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const promoteToAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const existingAdmin = await Admin.findOne({ email: user.email });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Este usuario ya es administrador' });
    }
    await Admin.create({
      email: user.email,
      passwordHash: user.passwordHash,
      nombre: user.nombre,
      activo: true,
    });
    res.json({ message: 'Usuario promovido a administrador' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al promover usuario' });
  }
};
