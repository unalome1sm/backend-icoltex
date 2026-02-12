# Verificación de Conexión MongoDB Atlas

## Pasos para Resolver

### 1. Verificar en MongoDB Atlas

1. Ve a [MongoDB Atlas](https://cloud.mongodb.com/)
2. Selecciona tu proyecto
3. Ve a **Network Access**
4. Verifica que tu IP o `0.0.0.0/0` esté en la lista y tenga estado "Active"

### 2. Si la IP está pero no funciona

**Opción A: Esperar unos minutos**  
Los cambios en Network Access pueden tardar 2-5 minutos en aplicarse.

**Opción B: Agregar acceso temporal para desarrollo**
1. En Network Access, click en "Add IP Address"
2. Selecciona "Allow Access from Anywhere"
3. Escribe: `0.0.0.0/0`
4. Click en "Confirm"
5. Espera 2-3 minutos y prueba de nuevo

### 3. Verificar el usuario de la base de datos

1. Ve a **Database Access**
2. Verifica que el usuario exista y tenga permisos "Read and write to any database" o al menos en tu base de datos
3. Si la contraseña es diferente, actualiza el archivo `.env`

### 4. Probar la conexión

```bash
npm run test:connection
npm run test:connection:diagnostic
```

## Notas

- ⚠️ `0.0.0.0/0` permite acceso desde cualquier IP — solo para desarrollo
- 🔒 En producción, usa IPs específicas
- ⏰ Los cambios en Network Access pueden tardar varios minutos
- 🔄 Si cambias de red o VPN, tu IP puede cambiar

Más detalles: [CONEXION_ATLAS.md](./CONEXION_ATLAS.md).
