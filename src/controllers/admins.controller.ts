import { Request, Response } from 'express';
import { Admin } from '../models/Admin';

export const getAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await Admin.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
    res.json({ admins });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
