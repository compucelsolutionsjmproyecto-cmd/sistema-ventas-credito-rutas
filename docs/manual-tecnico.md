# Manual técnico

## 1. Arquitectura general

```
┌─────────────────────────┐         ┌──────────────────────────┐
│   React 18 + Vite (PWA)  │ <-----> │        Supabase           │
│   TanStack Query         │  REST/  │  - Auth (JWT)              │
│   Zustand (estado global)│  WS     │  - PostgreSQL + RLS        │
│   React Router           │         │  - Storage (fotos/firmas)  │
└─────────────────────────┘         │  - Realtime (WS)           │
                                     └──────────────────────────┘
```

La aplicación es un **SPA (Single Page Application)** sin backend propio:
toda la lógica de negocio crítica (descuentos de inventario, generación
de cuotas, actualización de saldos, auditoría) vive en **funciones y
triggers de PostgreSQL**, no en el frontend. Esto evita inconsistencias
si dos vendedores usan la app al mismo tiempo, y garantiza que las reglas
se cumplan aunque alguien intente saltarse la interfaz.

## 2. Modelo de datos (resumen)

| Tabla                          | Propósito |
|--------------------------------|-----------|
| `perfiles`                     | Extiende `auth.users` con rol, datos de contacto y ruta |
| `rutas`                        | Rutas de venta, con municipios/barrios y vendedor asignado |
| `categorias` / `productos`     | Catálogo de inventario |
| `asignaciones_inventario(_detalle)` | Entregas diarias de inventario del admin al vendedor |
| `inventario_vendedor`          | Inventario que cada vendedor porta actualmente (derivado) |
| `clientes`                     | Clientes finales, con ubicación GPS y fotos |
| `ventas` / `ventas_detalle`    | Cabecera y líneas de cada venta a crédito |
| `cuotas`                       | Cuotas generadas automáticamente según la modalidad de pago |
| `cobros`                       | Pagos registrados contra una cuota, con firma y comprobante |
| `jornadas` / `visitas`         | Seguimiento del recorrido diario del vendedor |
| `notificaciones`                | Alertas de mora, stock bajo y agotado |
| `auditoria`                    | Bitácora de acciones sensibles (quién, qué, cuándo) |

El diagrama entidad-relación completo puede reconstruirse leyendo
`supabase/migrations/0001_schema.sql`, que contiene todas las claves
foráneas y restricciones.

## 3. Lógica de negocio automatizada (triggers y funciones)

- **`aplicar_asignacion_inventario()`**: al asignar inventario a un
  vendedor, descuenta del inventario general y lo suma a
  `inventario_vendedor`. Lanza una excepción si no hay stock suficiente.
- **`aplicar_detalle_venta()`**: al vender, descuenta del inventario que
  el vendedor porta consigo (no del inventario general).
- **`recalcular_totales_venta()`**: recalcula `subtotal`/`total` de la
  venta cada vez que cambian sus líneas.
- **`generar_cuotas(venta_id)`**: genera las cuotas según la modalidad
  (diario/semanal/quincenal/mensual), ajustando el redondeo en la
  última cuota. Se invoca desde el frontend vía `supabase.rpc(...)`
  después de insertar el detalle de la venta.
- **`aplicar_cobro()`**: al registrar un pago, descuenta el saldo de la
  cuota, la marca como pagada/parcial, y si ya no quedan cuotas
  pendientes, marca la venta como `pagada`.
- **`tarea_diaria_notificaciones()`**: marca cuotas vencidas, pasa la
  venta a estado `mora`, y genera notificaciones de pago vencido, stock
  bajo y producto agotado. Pensada para ejecutarse a diario vía
  `pg_cron` (ver manual de conexión con Supabase).
- **`registrar_auditoria()`**: trigger genérico que registra en
  `auditoria` cualquier inserción/actualización/borrado en tablas
  sensibles (`ventas`, `cobros`, `productos`, `clientes`, `perfiles`).

## 4. Seguridad (Row Level Security)

Cada tabla tiene RLS habilitado. Las políticas usan dos funciones
auxiliares:

- `mi_rol()`: devuelve el rol del usuario autenticado (`auth.uid()`).
- `mi_ruta_id()`: devuelve la ruta asignada al usuario autenticado.

Regla general aplicada en casi todas las tablas operativas
(`clientes`, `ventas`, `cobros`, `jornadas`, `inventario_vendedor`):

```sql
using (
  mi_rol() in ('administrador','supervisor')
  or <columna_dueño> = auth.uid()  -- o ruta_id = mi_ruta_id()
)
```

Esto significa que, sin importar lo que haga el frontend, un vendedor
**nunca podrá leer ni modificar, a nivel de base de datos**, clientes,
ventas o cobros que no sean suyos.

## 5. Frontend: convenciones de código

- **Un folder por módulo de negocio** en `src/features/<modulo>`, cada
  uno con sus propias páginas y hooks de datos.
- **TanStack Query** para todo el fetching/mutación de datos remotos
  (`useQuery`/`useMutation`), con invalidación de caché tras cada
  mutación exitosa.
- **Zustand** solo para estado de sesión/autenticación global
  (`useAuthStore`); el resto del estado vive en los componentes o en
  React Query.
- **React Hook Form + Zod** para formularios con validación (ver
  `LoginPage.tsx` como referencia).
- Nombres de variables, funciones y componentes en **español**, para
  mantener coherencia con el dominio del negocio.

## 6. PWA

Configurada en `vite.config.ts` con `vite-plugin-pwa`:
- `registerType: 'autoUpdate'`: la app se actualiza sola en segundo
  plano.
- Estrategia `NetworkFirst` para las llamadas a la API de Supabase, de
  forma que si hay conexión intermitente, se sirve la última respuesta
  en caché.
- Manifest con íconos en `public/icons/` (reemplázalos por el logo real
  antes de producción).

## 7. Extender el sistema

Para agregar un nuevo módulo:
1. Crea la tabla y sus políticas RLS en un nuevo archivo
   `supabase/migrations/000X_nombre.sql`.
2. Agrega los tipos en `src/types/database.types.ts`.
3. Crea `src/features/<modulo>/<Modulo>Page.tsx` siguiendo el patrón de
   `RutasPage.tsx` (listado + modal de creación/edición con React Query).
4. Regístralo en `src/app/App.tsx` y en
   `src/components/layout/navegacion.ts` (con los roles que deben verlo).

## 8. Regenerar tipos automáticamente (opcional)

Si instalas la Supabase CLI, puedes mantener
`src/types/database.types.ts` sincronizado con el esquema real:

```bash
supabase login
supabase gen types typescript --project-id TU-PROYECTO > src/types/database.types.ts
```
