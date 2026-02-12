# Análisis: endpoint de clientes Icoltex

## Endpoint y autenticación

| Dato | Valor |
|------|--------|
| **URL base** (en `.env`) | `ICOLTEX_API_URL=https://webhook-icoltex.tangara.cloud/webhook` |
| **Endpoint clientes** | Definido en `src/config/icoltexApi.ts` → `/clientes_icoltex` |
| **URL completa clientes** | Base + endpoint = `.../webhook/clientes_icoltex` |
| **Método** | GET |
| **Autenticación** | Basic Auth (header `Authorization: Basic <base64(usuario:contraseña)>`) |
| **Usuario** | `WCIcoltex` |
| **Contraseña** | Variable de entorno `ICOLTEX_API_PASSWORD` (no guardar en código) |

## Cómo ver la respuesta real

1. En tu `.env` agrega (con la contraseña real). La URL es solo la base; el path del endpoint se define en `src/config/icoltexApi.ts`:
   ```env
   ICOLTEX_API_URL=https://webhook-icoltex.tangara.cloud/webhook
   ICOLTEX_API_USER=WCIcoltex
   ICOLTEX_API_PASSWORD=<tu_contraseña_real>
   ```
2. Ejecuta:
   ```bash
   npm run fetch:clientes
   ```
3. El script imprime: tipo de respuesta (array u objeto), claves, total de ítems y los primeros registros con los **nombres exactos de los campos**.

## Estructura esperada (según documentación previa)

Cada cliente puede venir con campos como:

| Campo en la API (nombre exacto) | Tipo | Ejemplo |
|--------------------------------|------|---------|
| CardCode | string | "C1000410149" |
| Razón Social | string | "MARIA ANTONIA CORREA" |
| Nombre Comercial | string | "MARIA ANTONIA CORREA" |
| Moneda | string | "COP" |
| Nombre | string | "MARIA ANTONIA" |
| Primer Apellido | string | "CORREA" |
| Segundo Apellido | string | "" |
| Telefono | string | "3007698013" |
| Correo Electrónico | string | "mariaantoniacorreasolis@gmail.com" |
| País | string | "Colombia" |
| Ciudad | string | "Medellín" |

La respuesta puede ser un **array** `[...]` o un **objeto** con el array dentro (ej. `{ "clientes": [...] }` o `{ "data": [...] }`). El script `fetch:clientes` detecta ambos.

## Mapeo API → modelo Client (MongoDB)

| Campo API | Campo modelo Client | Notas |
|-----------|---------------------|--------|
| CardCode | `numeroDocumento` | Identificador único; también se puede usar como `codigo`. |
| Razón Social o Nombre Comercial | `nombre` | Usar uno si el otro viene vacío. |
| Correo Electrónico | `email` | Directo. |
| Telefono | `telefono` | Directo. |
| País | `pais` | Directo. |
| Ciudad | `ciudad` | Directo. |
| — | `tipoDocumento` | No viene en la API. Inferir por CardCode (ej. empieza por "C" → CC). |
| — | `departamento`, `direccion` | No vienen; dejar vacíos. |
| — | `activo` | Por defecto `true`. |

**Validación:** Si falta `CardCode` o está vacío, no crear el cliente (omitir o contar como error).

## Cómo poblar la base de datos (sincronizar clientes)

1. **Arranca el backend** (debe estar conectado a MongoDB):
   ```bash
   npm run dev
   ```

2. **Comprueba que la API Icoltex está configurada:**
   ```bash
   GET http://localhost:3001/api/sync/status
   ```
   Debe responder `{ "configured": true, ... }`.

3. **Ejecuta la sincronización de clientes:**
   ```bash
   POST http://localhost:3001/api/sync/clients
   ```
   (Sin body; desde Postman, Insomnia, curl o el frontend.)

   Ejemplo con **curl**:
   ```bash
   curl -X POST http://localhost:3001/api/sync/clients
   ```

4. **Respuesta esperada:** algo como:
   ```json
   {
     "message": "Sincronización de clientes completada",
     "totalFetched": 150,
     "created": 120,
     "updated": 30,
     "skipped": 0,
     "errors": 0
   }
   ```
   Los clientes se crean o actualizan en MongoDB por `numeroDocumento` (CardCode).
