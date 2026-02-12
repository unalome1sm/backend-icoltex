# Configuración de MongoDB Atlas

## Pasos para configurar MongoDB Atlas y resolver errores de conexión

### 1. Network Access (CRÍTICO - Resuelve el error SSL)

El error SSL `tlsv1 alert internal error` generalmente significa que tu IP no está permitida en MongoDB Atlas.

#### Pasos:
1. Ve a [MongoDB Atlas](https://cloud.mongodb.com/)
2. Selecciona tu cluster
3. Ve a **"Network Access"** (en el menú izquierdo bajo "Security")
4. Click en **"Add IP Address"**
5. Tienes dos opciones:
   - **Para desarrollo**: Selecciona **"Allow Access from Anywhere"** y escribe `0.0.0.0/0`
     - ⚠️ **Nota**: Esto permite acceso desde cualquier IP. Solo para desarrollo.
   - **Para producción**: Click en **"Add Current IP Address"** para agregar solo tu IP actual
6. Click en **"Confirm"**
7. Espera 1-2 minutos para que los cambios se apliquen

### 2. Database Access (Verificar credenciales)

1. Ve a **"Database Access"** (en el menú izquierdo bajo "Security")
2. Verifica que el usuario exista (ej. `unalomeweb123_db_user` según tu proyecto)
3. Si no existe, créalo con permisos **Read and write to any database**
4. Actualiza el `.env` con el usuario y contraseña correctos

### 3. Verificar la URI de conexión

Tu archivo `.env` debe tener la URI de tu cluster. La URL base y el nombre de la base de datos se configuran ahí. El código puede inyectar el nombre de la base si falta en la URI.

### 4. Probar la conexión

```bash
npm run test:connection
npm run test:connection:diagnostic
```

Ver también: [CONEXION_ATLAS.md](./CONEXION_ATLAS.md) para más diagnóstico.

### Solución de problemas

- **SSL/TLS error** → IP no en whitelist; agrega tu IP o `0.0.0.0/0` en Network Access.
- **Authentication failed** → Revisa usuario y contraseña en Database Access.
- **Connection timeout** → Red/firewall; prueba otra red o desactiva VPN.
