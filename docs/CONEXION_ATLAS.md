# Si la conexión falla aunque tengas 0.0.0.0/0 en Network Access

El mensaje "IP not whitelisted" a veces aparece por **otras causas**. Revisa esto en orden:

## 1. Mismo proyecto en Atlas

En MongoDB Atlas, **Network Access** y **Database Access** son **por proyecto**. El cluster `unalomesm` está en un proyecto concreto.

- En el **menú izquierdo** elige el **proyecto** donde ves el cluster **unalomesm**.
- En **ese mismo proyecto**:
  - **Network Access** → debe estar 0.0.0.0/0 (o tu IP).
  - **Database Access** → debe existir el usuario que usas en la URI (ej. `unalomeweb123_db_user`) con rol "Read and write to any database" (o al menos acceso a la base que usas).

Si el usuario está en otro proyecto, la conexión falla (a veces con mensaje de IP).

## 2. Cluster activo (no pausado)

En **Free Tier**, los clusters se **pausan** tras inactividad.

- En la vista del cluster, si sale **"Resume"** o **"Paused"**, haz clic en **Resume** y espera a que esté en estado **Active**.

## 3. Obtener la URI desde Atlas

- Entra al **proyecto** donde está el cluster **unalomesm**.
- Click en **Connect** en ese cluster.
- Elige **Drivers** (o Compass), copia la cadena de conexión.
- Sustituye `<password>` por la contraseña del usuario de **Database Access** de **ese proyecto**.
- En el `.env` usa esa URI (con el nombre de base de datos que quieras, ej. `icoltexdb` o `icoltex`).

## 4. Probar diagnóstico

```bash
npm run test:direct
```

Ese script muestra el **tipo de error** (autenticación vs red) y da pistas según el mensaje.

## Resumen

| Revisión | Dónde |
|----------|--------|
| Proyecto correcto | Menú izquierdo → mismo proyecto que el cluster unalomesm |
| Network Access | Security → Network Access (0.0.0.0/0 o tu IP) |
| Usuario y contraseña | Security → Database Access (usuario del mismo proyecto) |
| Cluster no pausado | Cluster → Resume si está Paused |
