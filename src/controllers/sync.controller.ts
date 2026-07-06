import { Request, Response } from 'express';
import { isIcoltexApiConfigured } from '../config/icoltexApi';
import { syncClientsFromIcoltex } from '../services/syncClients.service';
import { syncProductsFromIcoltex } from '../services/syncProducts.service';
import { syncClassesFromIcoltex } from '../services/syncClasses.service';
import { syncCategoriesFromIcoltex } from '../services/syncCategories.service';
import {
  getCatalogVitrinaSyncMeta,
  syncCatalogVitrinaFromWebhook,
} from '../services/syncCatalogVitrina.service';
import { syncCatalogFullFromSap } from '../services/syncCatalogFull.service';

/**
 * GET /api/sync/status
 * Indica si la API Icoltex está configurada (sin probar credenciales).
 */
export const getSyncStatus = async (_req: Request, res: Response) => {
  const configured = isIcoltexApiConfigured();
  const catalogVitrina = await getCatalogVitrinaSyncMeta();

  res.json({
    configured,
    catalogVitrina,
    message: configured
      ? 'API Icoltex configurada. Sincroniza catálogo completo (POST /api/sync/catalog-full), vitrina (POST /api/sync/catalog-vitrina) o precios (POST /api/sync/products).'
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

/**
 * POST /api/sync/catalog-vitrina
 * Sincroniza catálogo vitrina (info-items-x-ref) a MongoDB.
 */
export const syncCatalogVitrina = (req: Request, res: Response) => {
  if (!isIcoltexApiConfigured()) {
    return res.status(503).json({
      error: 'API Icoltex no configurada',
      message: 'Configura ICOLTEX_API_URL, ICOLTEX_API_USER e ICOLTEX_API_PASSWORD en .env',
    });
  }

  syncCatalogVitrinaFromWebhook()
    .then((result) => {
      if (res.headersSent) return;
      console.log(
        '[Sync] Catálogo vitrina:',
        result.totalFetched,
        'grupos,',
        result.variantCount,
        'variantes'
      );
      const body = {
        message: 'Sincronización de catálogo vitrina completada',
        ...result,
      };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).end(JSON.stringify(body));
    })
    .catch((err: unknown) => {
      console.error('Sync catalog vitrina error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Error al sincronizar catálogo vitrina',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
};

/**
 * POST /api/sync/catalog-full
 * Sincroniza vitrina (info-items-x-ref) + productos (items_icoltex) y reporta cruces.
 */
export const syncCatalogFull = (req: Request, res: Response) => {
  if (!isIcoltexApiConfigured()) {
    return res.status(503).json({
      error: 'API Icoltex no configurada',
      message: 'Configura ICOLTEX_API_URL, ICOLTEX_API_USER e ICOLTEX_API_PASSWORD en .env',
    });
  }

  syncCatalogFullFromSap()
    .then((result) => {
      if (res.headersSent) return;
      console.log(
        '[Sync] Catálogo completo:',
        result.vitrina.totalFetched,
        'grupos,',
        result.products.created + result.products.updated,
        'productos'
      );
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(200).end(JSON.stringify(result));
    })
    .catch((err: unknown) => {
      console.error('Sync catalog full error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Error al sincronizar catálogo completo',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
};
