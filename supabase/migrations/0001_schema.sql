-- ============================================================================
-- SISTEMA INTELIGENTE DE GESTIÓN DE VENTAS A CRÉDITO POR RUTAS
-- Esquema completo de base de datos para Supabase (PostgreSQL)
-- ============================================================================
-- Ejecutar en orden: 0001_schema.sql -> 0002_functions_triggers.sql
--                     -> 0003_rls_policies.sql -> 0004_seed.sql
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "postgis"; -- para ubicación GPS

-- ============================================================================
-- ENUMS
-- ============================================================================
create type user_role as enum ('administrador', 'supervisor', 'vendedor');
create type estado_general as enum ('activo', 'inactivo');
create type modalidad_pago as enum ('diario', 'semanal', 'quincenal', 'mensual');
create type estado_venta as enum ('vigente', 'pagada', 'mora', 'anulada');
create type estado_cuota as enum ('pendiente', 'pagada', 'vencida', 'parcial');
create type metodo_pago as enum ('efectivo', 'transferencia', 'otro');
create type tipo_notificacion as enum ('pago_vencido', 'producto_agotado', 'stock_bajo', 'cobro_pendiente');

-- ============================================================================
-- PERFILES DE USUARIO (extiende auth.users de Supabase)
-- ============================================================================
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol user_role not null default 'vendedor',
  nombre_completo text not null,
  cedula text unique,
  celular text,
  direccion text,
  foto_url text,
  estado estado_general not null default 'activo',
  ruta_id uuid, -- se asigna FK más abajo tras crear tabla rutas
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table perfiles is 'Extiende auth.users con datos de negocio y rol. 1 fila por usuario autenticado.';

-- ============================================================================
-- RUTAS
-- ============================================================================
create table rutas (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  descripcion text,
  vendedor_id uuid references perfiles(id) on delete set null,
  municipios text[] not null default '{}',
  barrios text[] not null default '{}',
  estado estado_general not null default 'activo',
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table perfiles add constraint fk_perfiles_ruta
  foreign key (ruta_id) references rutas(id) on delete set null;

create index idx_rutas_vendedor on rutas(vendedor_id);
create index idx_rutas_estado on rutas(estado);

-- ============================================================================
-- CATEGORÍAS Y PRODUCTOS (INVENTARIO)
-- ============================================================================
create table categorias (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique,
  creado_en timestamptz not null default now()
);

create table productos (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique,
  nombre text not null,
  foto_url text,
  marca text,
  categoria_id uuid references categorias(id) on delete set null,
  precio_compra numeric(12,2) not null check (precio_compra >= 0),
  precio_venta numeric(12,2) not null check (precio_venta >= 0),
  ganancia numeric(12,2) generated always as (precio_venta - precio_compra) stored,
  cantidad integer not null default 0 check (cantidad >= 0),
  stock_minimo integer not null default 5 check (stock_minimo >= 0),
  fecha_vencimiento date,
  estado estado_general not null default 'activo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_productos_categoria on productos(categoria_id);
create index idx_productos_estado on productos(estado);
create index idx_productos_stock_bajo on productos(cantidad) where cantidad <= stock_minimo;

-- ============================================================================
-- ASIGNACIÓN DIARIA DE INVENTARIO A VENDEDORES
-- ============================================================================
create table asignaciones_inventario (
  id uuid primary key default uuid_generate_v4(),
  vendedor_id uuid not null references perfiles(id) on delete cascade,
  entregado_por uuid not null references perfiles(id),
  fecha date not null default current_date,
  hora time not null default current_time,
  observaciones text,
  creado_en timestamptz not null default now()
);

create table asignaciones_inventario_detalle (
  id uuid primary key default uuid_generate_v4(),
  asignacion_id uuid not null references asignaciones_inventario(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad_entregada integer not null check (cantidad_entregada > 0),
  cantidad_devuelta integer default 0 check (cantidad_devuelta >= 0)
);

create index idx_asig_inv_vendedor_fecha on asignaciones_inventario(vendedor_id, fecha);

-- Inventario que el vendedor tiene físicamente consigo (derivado, mantenido por triggers)
create table inventario_vendedor (
  vendedor_id uuid not null references perfiles(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete cascade,
  cantidad integer not null default 0 check (cantidad >= 0),
  actualizado_en timestamptz not null default now(),
  primary key (vendedor_id, producto_id)
);

-- ============================================================================
-- CLIENTES
-- ============================================================================
create table clientes (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  cedula text unique,
  celular text,
  direccion text,
  barrio text,
  municipio text,
  referencia text,
  foto_casa_url text,
  foto_cliente_url text,
  ubicacion_lat double precision,
  ubicacion_lng double precision,
  observaciones text,
  ruta_id uuid references rutas(id) on delete set null,
  registrado_por uuid references perfiles(id),
  estado estado_general not null default 'activo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index idx_clientes_ruta on clientes(ruta_id);
create index idx_clientes_cedula on clientes(cedula);
create index idx_clientes_nombre on clientes using gin (to_tsvector('spanish', nombre));

-- ============================================================================
-- VENTAS
-- ============================================================================
create table ventas (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references clientes(id),
  vendedor_id uuid not null references perfiles(id),
  ruta_id uuid references rutas(id),
  subtotal numeric(12,2) not null default 0,
  descuento numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  modalidad modalidad_pago not null default 'diario',
  numero_cuotas integer not null default 1 check (numero_cuotas > 0),
  valor_cuota numeric(12,2) not null default 0,
  fecha_primera_cuota date not null default current_date,
  estado estado_venta not null default 'vigente',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table ventas_detalle (
  id uuid primary key default uuid_generate_v4(),
  venta_id uuid not null references ventas(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  descuento numeric(12,2) not null default 0,
  subtotal numeric(12,2) generated always as (cantidad * precio_unitario - descuento) stored
);

create index idx_ventas_cliente on ventas(cliente_id);
create index idx_ventas_vendedor on ventas(vendedor_id);
create index idx_ventas_estado on ventas(estado);
create index idx_ventas_fecha on ventas(creado_en);

-- ============================================================================
-- CUOTAS (generadas automáticamente según modalidad de pago)
-- ============================================================================
create table cuotas (
  id uuid primary key default uuid_generate_v4(),
  venta_id uuid not null references ventas(id) on delete cascade,
  numero integer not null,
  valor numeric(12,2) not null check (valor >= 0),
  saldo numeric(12,2) not null check (saldo >= 0),
  fecha_vencimiento date not null,
  estado estado_cuota not null default 'pendiente',
  creado_en timestamptz not null default now(),
  unique (venta_id, numero)
);

create index idx_cuotas_venta on cuotas(venta_id);
create index idx_cuotas_estado_vencimiento on cuotas(estado, fecha_vencimiento);

-- ============================================================================
-- COBROS (PAGOS)
-- ============================================================================
create table cobros (
  id uuid primary key default uuid_generate_v4(),
  cuota_id uuid not null references cuotas(id),
  venta_id uuid not null references ventas(id),
  cliente_id uuid not null references clientes(id),
  vendedor_id uuid not null references perfiles(id),
  fecha date not null default current_date,
  hora time not null default current_time,
  valor numeric(12,2) not null check (valor > 0),
  metodo metodo_pago not null default 'efectivo',
  observacion text,
  firma_digital_url text,
  foto_comprobante_url text,
  ubicacion_lat double precision,
  ubicacion_lng double precision,
  creado_en timestamptz not null default now()
);

create index idx_cobros_venta on cobros(venta_id);
create index idx_cobros_cliente on cobros(cliente_id);
create index idx_cobros_vendedor_fecha on cobros(vendedor_id, fecha);

-- ============================================================================
-- SEGUIMIENTO DE JORNADA DEL VENDEDOR
-- ============================================================================
create table jornadas (
  id uuid primary key default uuid_generate_v4(),
  vendedor_id uuid not null references perfiles(id) on delete cascade,
  fecha date not null default current_date,
  hora_inicio timestamptz,
  hora_fin timestamptz,
  gps_inicio_lat double precision,
  gps_inicio_lng double precision,
  gps_fin_lat double precision,
  gps_fin_lng double precision,
  clientes_visitados integer not null default 0,
  ventas_realizadas integer not null default 0,
  total_cobrado numeric(12,2) not null default 0,
  creado_en timestamptz not null default now(),
  unique (vendedor_id, fecha)
);

-- Registro de visitas puntuales dentro de una jornada (para el mapa de recorrido)
create table visitas (
  id uuid primary key default uuid_generate_v4(),
  jornada_id uuid not null references jornadas(id) on delete cascade,
  cliente_id uuid references clientes(id),
  lat double precision,
  lng double precision,
  hora timestamptz not null default now()
);

-- ============================================================================
-- NOTIFICACIONES
-- ============================================================================
create table notificaciones (
  id uuid primary key default uuid_generate_v4(),
  tipo tipo_notificacion not null,
  titulo text not null,
  mensaje text not null,
  destinatario_id uuid references perfiles(id) on delete cascade, -- null = para todos los administradores
  entidad_tipo text, -- 'cliente' | 'producto' | 'venta' etc.
  entidad_id uuid,
  leida boolean not null default false,
  creado_en timestamptz not null default now()
);

create index idx_notificaciones_destinatario on notificaciones(destinatario_id, leida);

-- ============================================================================
-- AUDITORÍA
-- ============================================================================
create table auditoria (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references perfiles(id),
  accion text not null,
  entidad text,
  entidad_id uuid,
  detalle jsonb,
  ip text,
  creado_en timestamptz not null default now()
);

create index idx_auditoria_usuario on auditoria(usuario_id);
create index idx_auditoria_fecha on auditoria(creado_en);
