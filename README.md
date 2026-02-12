# Backend API - Icoltex

Backend REST API para la tienda de telas Icoltex. Node.js, Express, TypeScript, MongoDB (Mongoose).

## Estructura del proyecto

```
backend-icoltex/
├── src/
│   ├── config/          # Configuración (DB, API Icoltex)
│   │   ├── database.ts
│   │   └── icoltexApi.ts
│   ├── controllers/     # Lógica por recurso
│   ├── models/         # Mongoose (Client)
│   ├── routes/         # Rutas API
│   ├── services/       # Lógica externa (webhook Icoltex, sync)
│   ├── middlewares/    # Error handling, etc.
│   ├── scripts/        # Scripts de utilidad (test conexión, fetch clientes)
│   └── server.ts       # Punto de entrada
├── docs/               # Documentación (MongoDB, sync, análisis)
├── .env.example
└── package.json
```

## Modelos

- **Client** — Clientes (sincronizados desde el webhook Icoltex o creados/editados por API).

## Instalación

```bash
cd backend-icoltex
npm install
cp .env.example .env
```

Configura en `.env`: `MONGODB_URI`, `MONGODB_DB_NAME` (opcional), y para sync de clientes: `ICOLTEX_API_URL`, `ICOLTEX_API_USER`, `ICOLTEX_API_PASSWORD`. Ver `.env.example` y `docs/` para más detalle.

## Ejecutar

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desarrollo con hot reload |
| `npm run build` | Compilar TypeScript |
| `npm start` | Producción (tras `build`) |

Servidor: `http://localhost:3001` (API en `/api`).

## Scripts de utilidad

| Comando | Uso |
|---------|-----|
| `npm run test:connection` | Probar conexión a MongoDB |
| `npm run test:direct` | Probar conexión con driver nativo |
| `npm run test:connection:diagnostic` | Diagnóstico detallado (DNS, causa del error) |
| `npm run fetch:clientes` | Obtener y mostrar respuesta del endpoint de clientes Icoltex (requiere ICOLTEX_* en .env) |

## Rutas de la API

- **Health:** `GET /api/health`
- **Clientes:** `GET /api/clients`, `GET /api/clients/search?q=`, `GET /api/clients/:id`, `POST /api/clients`, `PUT /api/clients/:id`, `DELETE /api/clients/:id`
- **Sync Icoltex:** `GET /api/sync/status`, `POST /api/sync/clients`

## Sincronización con Icoltex (clientes)

1. En `.env`: `ICOLTEX_API_URL` (solo la base, ej. `https://webhook-icoltex.tangara.cloud/webhook`), `ICOLTEX_API_USER`, `ICOLTEX_API_PASSWORD`.
2. Los endpoints (ej. `/clientes_icoltex`) se definen en `src/config/icoltexApi.ts`.
3. `GET /api/sync/status` → comprobar si está configurado.
4. `POST /api/sync/clients` → ejecutar sincronización (crear/actualizar clientes en MongoDB por número de documento).

Más detalle: **docs/ANALISIS_CLIENTES_ICOLTEX.md**.

## Documentación

En la carpeta **docs/**:

- **docs/README.md** — Índice de la documentación.
- **docs/ANALISIS_CLIENTES_ICOLTEX.md** — Endpoint clientes, mapeo, cómo sincronizar.
- **docs/CONEXION_ATLAS.md** — Problemas de conexión a MongoDB Atlas.
- **docs/MONGODB_SETUP.md** — Configuración de Atlas.
- **docs/VERIFICAR_CONEXION.md** — Verificar conexión.
- **docs/INTEGRACION_ICOLTEX_CONTEXTO.md** — Contexto de la integración Icoltex.
