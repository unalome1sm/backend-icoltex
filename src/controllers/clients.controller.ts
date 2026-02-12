import { Request, Response } from 'express';
import { Client } from '../models/Client';

export const getClients = async (req: Request, res: Response) => {
  try {
    const { activo, page = 1, limit = 50 } = req.query;
    const filter: any = {};
    
    if (activo !== undefined) {
      filter.activo = activo === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const clients = await Client.find(filter)
      .sort({ nombre: 1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Client.countDocuments(filter);
    
    res.json({
      clients,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getClientById = async (req: Request, res: Response) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const searchClients = async (req: Request, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'El parámetro de búsqueda (q) es requerido' });
    }

    const clients = await Client.find({
      $or: [
        { nombre: { $regex: q, $options: 'i' } },
        { numeroDocumento: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
      activo: true,
    }).limit(Number(limit));
    
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createClient = async (req: Request, res: Response) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un cliente con ese número de documento' });
    }
    res.status(400).json({ error: error.message });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(client);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};



