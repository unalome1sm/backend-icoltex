# Contexto para integración API Icoltex (sincronización de clientes)

Documento de contexto para la integración con el webhook Icoltex. La implementación actual usa `src/config/icoltexApi.ts` y `src/services/`.

---

## Proyecto

- **Backend:** Icoltex (tienda de telas).
- **Stack:** Node.js, Express, TypeScript, MongoDB (Mongoose).
- **Ruta base API:** `/api` (ej: `http://localhost:3001/api`).
- **Estructura:** `src/config`, `src/controllers`, `src/models`, `src/routes`, `src/middlewares`, `src/services`, `src/scripts`.

## Objetivo

Sincronizar clientes desde el webhook Icoltex (Basic Auth, GET clientes) hacia MongoDB: crear o actualizar por `numeroDocumento` (CardCode).

## Endpoint y autenticación

- **URL base:** `ICOLTEX_API_URL` en `.env` (ej: `https://webhook-icoltex.tangara.cloud/webhook`).
- **Endpoint clientes:** definido en `src/config/icoltexApi.ts` → `/clientes_icoltex`.
- **Auth:** Basic Auth (usuario y contraseña en header).

## Archivos actuales

| Archivo | Función |
|---------|--------|
| `src/config/icoltexApi.ts` | URL base, endpoints, `getIcoltexUrl()`, `isIcoltexApiConfigured()` |
| `src/services/externalApi.service.ts` | GET al webhook con Basic Auth, devuelve array de clientes |
| `src/services/syncClients.service.ts` | Mapeo API → Client, upsert en MongoDB |
| `src/controllers/sync.controller.ts` | getSyncStatus, syncClients |
| `src/routes/sync.routes.ts` | GET /status, POST /clients |

## Variables de entorno

- `ICOLTEX_API_URL` — URL base del webhook.
- `ICOLTEX_API_USER` — Usuario Basic Auth.
- `ICOLTEX_API_PASSWORD` — Contraseña (solo en `.env`).

## Uso

1. GET `/api/sync/status` — comprobar si está configurado.
2. POST `/api/sync/clients` — ejecutar sincronización.

Ver [ANALISIS_CLIENTES_ICOLTEX.md](./ANALISIS_CLIENTES_ICOLTEX.md) para mapeo de campos y flujo detallado.
