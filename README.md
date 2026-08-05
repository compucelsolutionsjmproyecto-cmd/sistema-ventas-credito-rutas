# Sistema Inteligente de Gestión de Ventas a Crédito por Rutas

Aplicación web profesional (PWA) para gestionar ventas a crédito puerta a
puerta: rutas, vendedores, inventario, clientes, ventas, cuotas, cobros,
seguimiento por GPS, reportes y notificaciones — construida con
**React 18 + Vite + TypeScript + Tailwind + Supabase**.

## Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router,
  React Hook Form + Zod, TanStack Query, Zustand, PWA (`vite-plugin-pwa`).
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Realtime, Row Level
  Security).
- **Hosting:** Netlify.

## ✅ Base de datos ya conectada

Este proyecto ya está conectado a un proyecto Supabase real y con el
esquema completo instalado:

- **Proyecto:** `compucelsolutionsjmproyecto-cmd's Project`
- **Referencia:** `xmpnltmyhyyotokzgexq`
- **Región:** São Paulo (`sa-east-1`)
- **URL:** `https://xmpnltmyhyyotokzgexq.supabase.co`

Las 16 tablas, funciones, triggers, políticas RLS, buckets de Storage y
las categorías iniciales ya están creados. El archivo `.env` de este
proyecto ya trae las credenciales correctas — **no necesitas
configurarlo**, solo instalar dependencias y ejecutar.

**Único paso pendiente antes de usar la app: crear tu usuario
administrador** (ver sección 3 abajo), porque los usuarios con
contraseña deben crearse desde Supabase Auth, no por SQL directo.

## 1. Requisitos previos

- Node.js 20 o superior
- Una cuenta gratuita en [netlify.com](https://netlify.com) (para el
  despliegue)

## 2. Instalación local

```bash
npm install
npm run dev
```

La aplicación quedará disponible en `http://localhost:5173`. El archivo
`.env` ya incluido apunta a la base de datos real conectada arriba.

## 3. Crear tu primer usuario administrador

1. Entra al panel de tu proyecto: https://supabase.com/dashboard/project/xmpnltmyhyyotokzgexq
2. Ve a **Authentication → Users → Add user**, crea un correo y
   contraseña (ej. `admin@tuempresa.com`).
3. Copia el UUID del usuario creado.
4. Ve a **SQL Editor** y ejecuta:
   ```sql
   update perfiles
   set rol = 'administrador', nombre_completo = 'Administrador Principal'
   where id = 'PEGA-AQUI-EL-UUID';
   ```
5. Ya puedes iniciar sesión en la app con ese correo y contraseña.

Más detalle en [`docs/manual-conexion-supabase.md`](docs/manual-conexion-supabase.md).

## 4. Estructura del proyecto

```
src/
  app/            Componente raíz y enrutamiento
  components/     Componentes reutilizables (layout, ui, charts)
  features/       Un folder por módulo de negocio (auth, ventas, cobros...)
  hooks/          Hooks compartidos
  lib/            Cliente de Supabase
  store/          Estado global (Zustand)
  types/          Tipos TypeScript (incluye el esquema de la base de datos)
  utils/          Funciones utilitarias (formato de moneda, fechas...)
supabase/
  migrations/     Scripts SQL: tablas, funciones, triggers, RLS, storage
  seed/           Datos iniciales
docs/             Manuales de despliegue, técnico y de usuario
```

## 5. Roles del sistema

| Rol            | Alcance                                                        |
|----------------|-----------------------------------------------------------------|
| Administrador  | Acceso total: usuarios, rutas, inventario, reportes, auditoría |
| Supervisor     | Gestión operativa amplia (sin poder borrar catálogos ni auditoría) |
| Vendedor       | Solo su ruta, sus clientes, sus ventas, sus cobros y su jornada |

Los permisos están garantizados en dos capas: en el frontend (rutas
protegidas) y, de forma definitiva, en la base de datos mediante
**Row Level Security**.

## 6. Compilar para producción

```bash
npm run build
```

El resultado queda en `dist/`, listo para desplegar en Netlify (ver
[`docs/manual-despliegue-netlify.md`](docs/manual-despliegue-netlify.md)).

## 7. Documentación adicional

- [`docs/manual-despliegue-netlify.md`](docs/manual-despliegue-netlify.md) — Despliegue paso a paso en Netlify.
- [`docs/manual-conexion-supabase.md`](docs/manual-conexion-supabase.md) — Cómo crear y conectar tu proyecto Supabase.
- [`docs/manual-tecnico.md`](docs/manual-tecnico.md) — Arquitectura, modelo de datos y decisiones técnicas.
- [`docs/manual-usuario.md`](docs/manual-usuario.md) — Guía de uso para administradores, supervisores y vendedores.

## 8. Estado de este entregable

Este proyecto incluye una base **funcional y conectada de extremo a
extremo** (no simulada) con los módulos: autenticación y roles, dashboard
en tiempo real, rutas, vendedores, inventario, asignación diaria,
clientes (con GPS y fotos), ventas con generación automática de cuotas,
cobros con firma digital, seguimiento de jornada, reportes exportables a
PDF/Excel, notificaciones en tiempo real y auditoría.

Antes de producción, se recomienda:
- Mover la creación de usuarios (`auth.signUp`) a una **Edge Function**
  con `service_role key`, para que el registro de vendedores no dependa
  de que el proyecto permita auto-registro público.
- Configurar `pg_cron` en Supabase para ejecutar `tarea_diaria_notificaciones()`
  automáticamente cada día (el comando está comentado en
  `0002_functions_triggers.sql`).
- Reemplazar los íconos PWA de `public/icons/` por el logo real de tu
  empresa.
