import { Request, Response } from 'express';
import { isIcoltexApiConfigured } from '../config/icoltexApi';
import { syncClientsFromIcoltex } from '../services/syncClients.service';
import { syncProductsFromIcoltex } from '../services/syncProducts.service';
import { syncClassesFromIcoltex } from '../services/syncClasses.service';
import { syncCategoriesFromIcoltex } from '../services/syncCategories.service';

/**
 * GET /api/sync/status
 * Indica si la API Icoltex está configurada (sin probar credenciales).
 */
export const getSyncStatus = (req: Request, res: Response) => {
  const configured = isIcoltexApiConfigured();
  res.json({
    configured,
    message: configured
      ? 'API Icoltex configurada. Puedes usar POST /api/sync/clients para sincronizar clientes.'
      : 'Faltan ICOLTEX_API_URL, ICOLTEX_API_USER o ICOLTEX_API_PASSWORD en .env',
  });
};

/**
 * POST /api/sync/clients
 * Sincroniza clientes desde el webhook Icoltex a MongoDB (crear/actualizar por numeroDocumento).
 * Envía la respuesta explícitamente para evitar que Postman/cliente quede colgado.
 */
export const syncClients = (req: Request, res: Response) => {
  if (!isIcoltexApiConfigured()) {
    return res.status(503).json({
      error: 'API Icoltex no configurada',
      message: 'Configura ICOLTEX_API_URL, ICOLTEX_API_USER e ICOLTEX_API_PASSWORD en .env',
    });
  }

  syncClientsFromIcoltex()
    .then((result) => {
      if (res.headersSent) return;
      console.log('[Sync] Clientes: completado, enviando respuesta:', result.created, 'creados,', result.updated, 'actualizados');
      const body = {
        message: 'Sincronización de clientes completada',
        ...result,
      };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).end(JSON.stringify(body));
    })
    .catch((err: any) => {
      console.error('Sync clients error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Error al sincronizar clientes',
          message: err?.message ?? String(err),
        });
      }
    });
};

/**
 * POST /api/sync/products
 * Sincroniza productos (items) desde el webhook Icoltex a MongoDB (crear/actualizar por codigo).
 */
export const syncProducts = (req: Request, res: Response) => {
  if (!isIcoltexApiConfigured()) {
    return res.status(503).json({
      error: 'API Icoltex no configurada',
      message: 'Configura ICOLTEX_API_URL, ICOLTEX_API_USER e ICOLTEX_API_PASSWORD en .env',
    });
  }

  syncProductsFromIcoltex()
    .then((result) => {
      if (res.headersSent) return;
      console.log('[Sync] Productos: completado, enviando respuesta:', result.created, 'creados,', result.updated, 'actualizados');
      const body = {
        message: 'Sincronización de productos completada',
        ...result,
      };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).end(JSON.stringify(body));
    })
    .catch((err: any) => {
      console.error('Sync products error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Error al sincronizar productos',
          message: err?.message ?? String(err),
        });
      }
    });
};

/**
 * POST /api/sync/classes
 * Sincroniza clases/familias desde el webhook Icoltex a MongoDB.
 */
export const syncClasses = (req: Request, res: Response) => {
  if (!isIcoltexApiConfigured()) {
    return res.status(503).json({
      error: 'API Icoltex no configurada',
      message: 'Configura ICOLTEX_API_URL, ICOLTEX_API_USER e ICOLTEX_API_PASSWORD en .env',
    });
  }

  syncClassesFromIcoltex()
    .then((result) => {
      if (res.headersSent) return;
      console.log('[Sync] Clases: completado, enviando respuesta:', result.created, 'creados,', result.updated, 'actualizados');
      const body = {
        message: 'Sincronización de clases completada',
        ...result,
      };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).end(JSON.stringify(body));
    })
    .catch((err: any) => {
      console.error('Sync classes error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Error al sincronizar clases',
          message: err?.message ?? String(err),
        });
      }
    });
};

/**
 * POST /api/sync/categories
 * Sincroniza categorias desde el webhook Icoltex a MongoDB.
 */
export const syncCategories = (req: Request, res: Response) => {
  if (!isIcoltexApiConfigured()) {
    return res.status(503).json({
      error: 'API Icoltex no configurada',
      message: 'Configura ICOLTEX_API_URL, ICOLTEX_API_USER e ICOLTEX_API_PASSWORD en .env',
    });
  }

  syncCategoriesFromIcoltex()
    .then((result) => {
      if (res.headersSent) return;
      console.log('[Sync] Categorias: completado, enviando respuesta:', result.created, 'creados,', result.updated, 'actualizados');
      const body = {
        message: 'Sincronizacion de categorias completada',
        ...result,
      };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).end(JSON.stringify(body));
    })
    .catch((err: any) => {
      console.error('Sync categories error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Error al sincronizar categorias',
          message: err?.message ?? String(err),
        });
      }
    });
};
