# Manual de conexión con Supabase

> **Este proyecto ya está conectado.** El esquema completo (16 tablas,
> funciones, triggers, políticas RLS y buckets de Storage) ya fue
> instalado en el proyecto `xmpnltmyhyyotokzgexq`
> (`https://xmpnltmyhyyotokzgexq.supabase.co`), y el archivo `.env`
> incluido ya tiene las credenciales correctas. Puedes saltar
> directamente al **paso 3** para crear tu usuario administrador.
> El resto de esta guía queda como referencia por si en el futuro
> necesitas montar el sistema en un proyecto Supabase nuevo (por
> ejemplo, para un ambiente de pruebas separado).

## 1. Crear el proyecto

1. Entra a [supabase.com](https://supabase.com) e inicia sesión.
2. **New project** → elige una organización, un nombre (ej.
   `ventas-credito-rutas`), una contraseña segura para la base de datos y
   la región más cercana a tus usuarios.
3. Espera 1-2 minutos mientras se aprovisiona el proyecto.

## 2. Ejecutar el esquema SQL

1. Ve a **SQL Editor** en el menú lateral.
2. Abre `supabase/migrations/0001_schema.sql` de este proyecto, copia todo
   el contenido, pégalo en un nuevo query y presiona **Run**.
3. Repite el mismo paso, **en este orden exacto**, con:
   - `0002_functions_triggers.sql`
   - `0003_rls_policies.sql`
   - `0005_storage.sql`
   - `supabase/seed/0004_seed.sql`

   > Si algún script falla, revisa el mensaje de error: normalmente
   > significa que un script anterior no se ejecutó completo. Puedes
   > volver a ejecutar cada script de forma segura (usan `if not exists`
   > o `on conflict do nothing` donde aplica).

4. Si tu proyecto no tiene disponible la extensión `postgis` (usada para
   ubicación GPS), ve a **Database → Extensions**, búscala y actívala
   antes de ejecutar `0001_schema.sql`. La mayoría de proyectos nuevos ya
   la traen disponible.

## 3. Crear el primer usuario administrador

1. Ve a **Authentication → Users → Add user**.
2. Ingresa un correo y una contraseña (por ejemplo,
   `admin@tuempresa.com`).
3. Copia el **UUID** del usuario recién creado (columna "UID").
4. Vuelve al **SQL Editor** y ejecuta:
   ```sql
   update perfiles
   set rol = 'administrador', nombre_completo = 'Administrador Principal'
   where id = 'PEGA-AQUI-EL-UUID';
   ```
5. Ya puedes iniciar sesión en la aplicación con ese correo y contraseña.

## 4. Obtener las credenciales para tu `.env`

1. Ve a **Project Settings → API**.
2. Copia:
   - **Project URL** → pégalo en `VITE_SUPABASE_URL`
   - **anon public** key → pégala en `VITE_SUPABASE_ANON_KEY`
3. Nunca uses la **service_role key** en el frontend: solo debe usarse en
   funciones de servidor (Edge Functions).

## 5. Buckets de almacenamito (Storage)

El script `0005_storage.sql` ya crea los buckets `productos`, `clientes`,
`vendedores` (públicos, para mostrar fotos en la interfaz) y
`comprobantes`, `firmas` (privados). No necesitas crearlos manualmente.

## 6. Habilitar Realtime (para el dashboard y notificaciones en vivo)

1. Ve a **Database → Replication**.
2. Verifica que las tablas `notificaciones`, `ventas` y `cobros` tengan
   activado el toggle de **Realtime**. Si no aparecen, actívalas.

## 7. (Opcional) Notificaciones automáticas diarias con pg_cron

1. Ve a **Database → Extensions** y activa `pg_cron`.
2. En el **SQL Editor**, ejecuta:
   ```sql
   select cron.schedule(
     'tarea-diaria-notificaciones',
     '0 6 * * *',
     $$select tarea_diaria_notificaciones();$$
   );
   ```
   Esto marcará cuotas vencidas y generará notificaciones de stock todos
   los días a las 6:00 a.m. (hora del servidor, UTC).

## 8. Registro de nuevos vendedores en producción

Por defecto, `VendedoresPage.tsx` usa `supabase.auth.signUp()` desde el
navegador, lo cual requiere que el **registro público** esté habilitado
en **Authentication → Providers → Email**. Para mayor control en
producción, se recomienda mover esa lógica a una Edge Function que use la
`service_role key` y el método `auth.admin.createUser()`, de forma que
solo el backend pueda crear cuentas nuevas.
