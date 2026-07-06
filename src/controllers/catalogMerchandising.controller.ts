import type { Request, Response } from 'express';
import { updateGroupMerchandising } from '../services/catalogMerchandising.service';

export async function patchGroupMerchandising(req: Request, res: Response) {
  try {
    const { groupId } = req.params;
    if (!groupId?.trim()) {
      return res.status(400).json({ error: 'groupId requerido' });
    }

    const { esDestacado, esNovedad } = req.body ?? {};
    if (typeof esDestacado !== 'boolean' && typeof esNovedad !== 'boolean') {
      return res.status(400).json({ error: 'Envía esDestacado y/o esNovedad como boolean' });
    }

    const group = await updateGroupMerchandising(groupId.trim(), {
      ...(typeof esDestacado === 'boolean' ? { esDestacado } : {}),
      ...(typeof esNovedad === 'boolean' ? { esNovedad } : {}),
    });

    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    res.json(group);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al actualizar merchandising';
    const status = message.includes('no encontrado') || message.includes('inválido') ? 404 : 500;
    res.status(status).json({ error: message });
  }
}
