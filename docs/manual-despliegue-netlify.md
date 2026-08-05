# Manual de despliegue en Netlify

## Opción A: Despliegue desde un repositorio Git (recomendado)

1. Sube este proyecto a un repositorio en GitHub, GitLab o Bitbucket.
2. Entra a [app.netlify.com](https://app.netlify.com) → **Add new site →
   Import an existing project**.
3. Conecta tu repositorio.
4. Netlify detectará automáticamente la configuración gracias al archivo
   `netlify.toml` incluido:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Antes de desplegar, agrega las variables de entorno en **Site settings →
   Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Haz clic en **Deploy site**.

## Opción B: Despliegue manual (drag & drop)

1. En tu computador, ejecuta:
   ```bash
   npm install
   npm run build
   ```
2. Entra a [app.netlify.com/drop](https://app.netlify.com/drop).
3. Arrastra la carpeta `dist/` generada.

   > Nota: con este método las variables de entorno deben quedar
   > "quemadas" en el build local (tu archivo `.env` local) antes de
   > compilar, ya que no hay paso de build en el servidor de Netlify.

## Opción C: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

## Verificaciones posteriores al despliegue

- Abre la URL asignada por Netlify y confirma que la pantalla de inicio
  de sesión carga correctamente.
- Verifica que puedas iniciar sesión con el usuario administrador creado
  en Supabase.
- Desde un celular, abre la URL en Chrome/Safari y usa la opción
  **"Agregar a pantalla de inicio"** para instalar la PWA.
- Revisa en el panel de Supabase (**Authentication → URL Configuration**)
  que la URL de tu sitio en Netlify esté agregada como **Site URL** y en
  **Redirect URLs**, para que la autenticación funcione correctamente.

## Dominio propio (opcional)

En Netlify: **Domain settings → Add a domain**, y sigue las instrucciones
para apuntar tu DNS. Netlify emite automáticamente el certificado SSL.
