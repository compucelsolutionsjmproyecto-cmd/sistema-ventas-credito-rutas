-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Roles: administrador (acceso total), supervisor (lectura amplia + gestión
-- operativa, sin borrar catálogos), vendedor (solo su propia información:
-- su ruta, sus clientes, sus ventas, sus cobros, su inventario).
-- ============================================================================

alter table perfiles enable row level security;
alter table rutas enable row level security;
alter table categorias enable row level security;
alter table productos enable row level security;
alter table asignaciones_inventario enable row level security;
alter table asignaciones_inventario_detalle enable row level security;
alter table inventario_vendedor enable row level security;
alter table clientes enable row level security;
alter table ventas enable row level security;
alter table ventas_detalle enable row level security;
alter table cuotas enable row level security;
alter table cobros enable row level security;
alter table jornadas enable row level security;
alter table visitas enable row level security;
alter table notificaciones enable row level security;
alter table auditoria enable row level security;

-- ---------------------------------------------------------------------------
-- PERFILES
-- ---------------------------------------------------------------------------
create policy "perfiles_select" on perfiles for select
  using (mi_rol() in ('administrador','supervisor') or id = auth.uid());

create policy "perfiles_insert_admin" on perfiles for insert
  with check (mi_rol() = 'administrador');

create policy "perfiles_update" on perfiles for update
  using (mi_rol() = 'administrador' or id = auth.uid())
  with check (mi_rol() = 'administrador' or id = auth.uid());

create policy "perfiles_delete_admin" on perfiles for delete
  using (mi_rol() = 'administrador');

-- ---------------------------------------------------------------------------
-- RUTAS
-- ---------------------------------------------------------------------------
create policy "rutas_select" on rutas for select
  using (mi_rol() in ('administrador','supervisor') or vendedor_id = auth.uid());

create policy "rutas_write_admin" on rutas for insert
  with check (mi_rol() in ('administrador','supervisor'));
create policy "rutas_update_admin" on rutas for update
  using (mi_rol() in ('administrador','supervisor'));
create policy "rutas_delete_admin" on rutas for delete
  using (mi_rol() = 'administrador');

-- ---------------------------------------------------------------------------
-- CATEGORÍAS Y PRODUCTOS (catálogo visible para todos los autenticados)
-- ---------------------------------------------------------------------------
create policy "categorias_select" on categorias for select using (auth.uid() is not null);
create policy "categorias_write_admin" on categorias for all
  using (mi_rol() in ('administrador','supervisor'))
  with check (mi_rol() in ('administrador','supervisor'));

create policy "productos_select" on productos for select using (auth.uid() is not null);
create policy "productos_write_admin" on productos for insert
  with check (mi_rol() in ('administrador','supervisor'));
create policy "productos_update_admin" on productos for update
  using (mi_rol() in ('administrador','supervisor'));
create policy "productos_delete_admin" on productos for delete
  using (mi_rol() = 'administrador');

-- ---------------------------------------------------------------------------
-- ASIGNACIONES DE INVENTARIO
-- ---------------------------------------------------------------------------
create policy "asig_inv_select" on asignaciones_inventario for select
  using (mi_rol() in ('administrador','supervisor') or vendedor_id = auth.uid());
create policy "asig_inv_insert_admin" on asignaciones_inventario for insert
  with check (mi_rol() in ('administrador','supervisor'));

create policy "asig_inv_det_select" on asignaciones_inventario_detalle for select
  using (
    mi_rol() in ('administrador','supervisor')
    or exists (select 1 from asignaciones_inventario a
               where a.id = asignacion_id and a.vendedor_id = auth.uid())
  );
create policy "asig_inv_det_insert_admin" on asignaciones_inventario_detalle for insert
  with check (mi_rol() in ('administrador','supervisor'));

-- ---------------------------------------------------------------------------
-- INVENTARIO POR VENDEDOR
-- ---------------------------------------------------------------------------
create policy "inv_vend_select" on inventario_vendedor for select
  using (mi_rol() in ('administrador','supervisor') or vendedor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- CLIENTES (cada vendedor ve solo los de su ruta / los que registró)
-- ---------------------------------------------------------------------------
create policy "clientes_select" on clientes for select
  using (
    mi_rol() in ('administrador','supervisor')
    or ruta_id = mi_ruta_id()
    or registrado_por = auth.uid()
  );
create policy "clientes_insert" on clientes for insert
  with check (
    mi_rol() in ('administrador','supervisor')
    or ruta_id = mi_ruta_id()
  );
create policy "clientes_update" on clientes for update
  using (
    mi_rol() in ('administrador','supervisor')
    or ruta_id = mi_ruta_id()
  );
create policy "clientes_delete_admin" on clientes for delete
  using (mi_rol() = 'administrador');

-- ---------------------------------------------------------------------------
-- VENTAS
-- ---------------------------------------------------------------------------
create policy "ventas_select" on ventas for select
  using (mi_rol() in ('administrador','supervisor') or vendedor_id = auth.uid());
create policy "ventas_insert" on ventas for insert
  with check (mi_rol() in ('administrador','supervisor') or vendedor_id = auth.uid());
create policy "ventas_update" on ventas for update
  using (mi_rol() in ('administrador','supervisor') or vendedor_id = auth.uid());
create policy "ventas_delete_admin" on ventas for delete
  using (mi_rol() = 'administrador');

create policy "ventas_detalle_select" on ventas_detalle for select
  using (
    mi_rol() in ('administrador','supervisor')
    or exists (select 1 from ventas v where v.id = venta_id and v.vendedor_id = auth.uid())
  );
create policy "ventas_detalle_insert" on ventas_detalle for insert
  with check (
    mi_rol() in ('administrador','supervisor')
    or exists (select 1 from ventas v where v.id = venta_id and v.vendedor_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- CUOTAS
-- ---------------------------------------------------------------------------
create policy "cuotas_select" on cuotas for select
  using (
    mi_rol() in ('administrador','supervisor')
    or exists (select 1 from ventas v where v.id = venta_id and v.vendedor_id = auth.uid())
  );
create policy "cuotas_write_admin" on cuotas for all
  using (mi_rol() in ('administrador','supervisor'))
  with check (mi_rol() in ('administrador','supervisor'));

-- ---------------------------------------------------------------------------
-- COBROS
-- ---------------------------------------------------------------------------
create policy "cobros_select" on cobros for select
  using (mi_rol() in ('administrador','supervisor') or vendedor_id = auth.uid());
create policy "cobros_insert" on cobros for insert
  with check (mi_rol() in ('administrador','supervisor') or vendedor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- JORNADAS Y VISITAS (seguimiento del vendedor)
-- ---------------------------------------------------------------------------
create policy "jornadas_select" on jornadas for select
  using (mi_rol() in ('administrador','supervisor') or vendedor_id = auth.uid());
create policy "jornadas_insert" on jornadas for insert
  with check (vendedor_id = auth.uid() or mi_rol() in ('administrador','supervisor'));
create policy "jornadas_update" on jornadas for update
  using (vendedor_id = auth.uid() or mi_rol() in ('administrador','supervisor'));

create policy "visitas_select" on visitas for select
  using (
    mi_rol() in ('administrador','supervisor')
    or exists (select 1 from jornadas j where j.id = jornada_id and j.vendedor_id = auth.uid())
  );
create policy "visitas_insert" on visitas for insert
  with check (
    exists (select 1 from jornadas j where j.id = jornada_id and j.vendedor_id = auth.uid())
    or mi_rol() in ('administrador','supervisor')
  );

-- ---------------------------------------------------------------------------
-- NOTIFICACIONES
-- ---------------------------------------------------------------------------
create policy "notificaciones_select" on notificaciones for select
  using (
    destinatario_id = auth.uid()
    or (destinatario_id is null and mi_rol() in ('administrador','supervisor'))
  );
create policy "notificaciones_update_propia" on notificaciones for update
  using (destinatario_id = auth.uid() or mi_rol() in ('administrador','supervisor'));

-- ---------------------------------------------------------------------------
-- AUDITORÍA (solo administradores la consultan; se escribe vía trigger)
-- ---------------------------------------------------------------------------
create policy "auditoria_select_admin" on auditoria for select
  using (mi_rol() = 'administrador');
