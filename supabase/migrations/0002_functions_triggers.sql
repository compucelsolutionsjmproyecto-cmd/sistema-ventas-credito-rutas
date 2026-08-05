-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Utilidad: actualizar columna actualizado_en automáticamente
-- ---------------------------------------------------------------------------
create or replace function set_actualizado_en()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_perfiles_updated before update on perfiles
  for each row execute function set_actualizado_en();
create trigger trg_rutas_updated before update on rutas
  for each row execute function set_actualizado_en();
create trigger trg_productos_updated before update on productos
  for each row execute function set_actualizado_en();
create trigger trg_clientes_updated before update on clientes
  for each row execute function set_actualizado_en();
create trigger trg_ventas_updated before update on ventas
  for each row execute function set_actualizado_en();

-- ---------------------------------------------------------------------------
-- Crear perfil automáticamente cuando se crea un usuario en auth.users
-- (el rol y demás datos se completan luego desde el módulo de administración)
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into perfiles (id, nombre_completo, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre_completo', new.email), 'vendedor')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Asignación diaria de inventario: al insertar detalle, descuenta de
-- inventario general y suma al inventario que porta el vendedor.
-- ---------------------------------------------------------------------------
create or replace function aplicar_asignacion_inventario()
returns trigger as $$
declare
  v_vendedor uuid;
  v_disponible integer;
begin
  select vendedor_id into v_vendedor from asignaciones_inventario where id = new.asignacion_id;

  select cantidad into v_disponible from productos where id = new.producto_id for update;
  if v_disponible < new.cantidad_entregada then
    raise exception 'Inventario insuficiente para el producto %: disponible %, solicitado %',
      new.producto_id, v_disponible, new.cantidad_entregada;
  end if;

  update productos set cantidad = cantidad - new.cantidad_entregada where id = new.producto_id;

  insert into inventario_vendedor (vendedor_id, producto_id, cantidad)
  values (v_vendedor, new.producto_id, new.cantidad_entregada)
  on conflict (vendedor_id, producto_id)
  do update set cantidad = inventario_vendedor.cantidad + excluded.cantidad,
                actualizado_en = now();

  return new;
end;
$$ language plpgsql;

create trigger trg_asignacion_inventario
  after insert on asignaciones_inventario_detalle
  for each row execute function aplicar_asignacion_inventario();

-- ---------------------------------------------------------------------------
-- Ventas: al insertar el detalle de una venta, descuenta del inventario
-- que porta el vendedor (no del inventario general, ya que ese producto
-- ya fue asignado previamente al vendedor).
-- ---------------------------------------------------------------------------
create or replace function aplicar_detalle_venta()
returns trigger as $$
declare
  v_vendedor uuid;
  v_disponible integer;
begin
  select vendedor_id into v_vendedor from ventas where id = new.venta_id;

  select cantidad into v_disponible from inventario_vendedor
    where vendedor_id = v_vendedor and producto_id = new.producto_id for update;

  if v_disponible is null or v_disponible < new.cantidad then
    raise exception 'El vendedor no tiene suficiente inventario del producto % (disponible: %)',
      new.producto_id, coalesce(v_disponible, 0);
  end if;

  update inventario_vendedor
    set cantidad = cantidad - new.cantidad, actualizado_en = now()
    where vendedor_id = v_vendedor and producto_id = new.producto_id;

  return new;
end;
$$ language plpgsql;

create trigger trg_detalle_venta
  after insert on ventas_detalle
  for each row execute function aplicar_detalle_venta();

-- ---------------------------------------------------------------------------
-- Ventas: recalcular subtotal/total de la venta cuando cambia el detalle
-- ---------------------------------------------------------------------------
create or replace function recalcular_totales_venta()
returns trigger as $$
declare
  v_venta_id uuid;
  v_subtotal numeric(12,2);
begin
  v_venta_id := coalesce(new.venta_id, old.venta_id);
  select coalesce(sum(subtotal), 0) into v_subtotal from ventas_detalle where venta_id = v_venta_id;
  update ventas
    set subtotal = v_subtotal,
        total = v_subtotal - descuento
    where id = v_venta_id;
  return null;
end;
$$ language plpgsql;

create trigger trg_recalcular_totales_venta
  after insert or update or delete on ventas_detalle
  for each row execute function recalcular_totales_venta();

-- ---------------------------------------------------------------------------
-- Generación automática de cuotas según modalidad de pago,
-- disparada cuando la venta pasa a tener total > 0 (tras insertar detalle).
-- Se ejecuta manualmente vía función generar_cuotas() llamada desde el
-- backend al confirmar la venta, para permitir agregar varios productos
-- antes de calcular las cuotas.
-- ---------------------------------------------------------------------------
create or replace function generar_cuotas(p_venta_id uuid)
returns void as $$
declare
  v_venta ventas%rowtype;
  v_intervalo interval;
  v_valor_cuota numeric(12,2);
  i integer;
  v_fecha date;
begin
  select * into v_venta from ventas where id = p_venta_id;

  delete from cuotas where venta_id = p_venta_id;

  v_intervalo := case v_venta.modalidad
    when 'diario' then interval '1 day'
    when 'semanal' then interval '1 week'
    when 'quincenal' then interval '15 days'
    when 'mensual' then interval '1 month'
  end;

  v_valor_cuota := round(v_venta.total / v_venta.numero_cuotas, 2);

  for i in 1..v_venta.numero_cuotas loop
    v_fecha := v_venta.fecha_primera_cuota + (v_intervalo * (i - 1));
    insert into cuotas (venta_id, numero, valor, saldo, fecha_vencimiento)
    values (
      p_venta_id,
      i,
      case when i = v_venta.numero_cuotas
        then v_venta.total - (v_valor_cuota * (v_venta.numero_cuotas - 1)) -- ajusta redondeo en la última
        else v_valor_cuota
      end,
      case when i = v_venta.numero_cuotas
        then v_venta.total - (v_valor_cuota * (v_venta.numero_cuotas - 1))
        else v_valor_cuota
      end,
      v_fecha
    );
  end loop;

  update ventas set valor_cuota = v_valor_cuota where id = p_venta_id;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Cobros: al registrar un pago, actualizar el saldo de la cuota
-- y el estado de la venta si ya quedó totalmente pagada.
-- ---------------------------------------------------------------------------
create or replace function aplicar_cobro()
returns trigger as $$
declare
  v_saldo_restante numeric(12,2);
  v_cuotas_pendientes integer;
begin
  select saldo - new.valor into v_saldo_restante from cuotas where id = new.cuota_id;

  if v_saldo_restante < 0 then
    raise exception 'El valor del cobro (%.2f) supera el saldo pendiente de la cuota', new.valor;
  end if;

  update cuotas
    set saldo = v_saldo_restante,
        estado = case when v_saldo_restante = 0 then 'pagada'
                      when v_saldo_restante < valor then 'parcial'
                      else estado end
    where id = new.cuota_id;

  select count(*) into v_cuotas_pendientes
    from cuotas where venta_id = new.venta_id and estado != 'pagada';

  if v_cuotas_pendientes = 0 then
    update ventas set estado = 'pagada' where id = new.venta_id;
  end if;

  -- acumular en la jornada del día si existe
  update jornadas
    set total_cobrado = total_cobrado + new.valor
    where vendedor_id = new.vendedor_id and fecha = new.fecha;

  return new;
end;
$$ language plpgsql;

create trigger trg_aplicar_cobro
  after insert on cobros
  for each row execute function aplicar_cobro();

-- ---------------------------------------------------------------------------
-- Marcar cuotas vencidas automáticamente (ejecutar vía cron / pg_cron diario)
-- y generar notificaciones de pagos vencidos, stock bajo y agotado.
-- ---------------------------------------------------------------------------
create or replace function tarea_diaria_notificaciones()
returns void as $$
begin
  -- cuotas vencidas
  update cuotas set estado = 'vencida'
    where estado in ('pendiente', 'parcial') and fecha_vencimiento < current_date;

  update ventas set estado = 'mora'
    where id in (select venta_id from cuotas where estado = 'vencida')
    and estado = 'vigente';

  insert into notificaciones (tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select 'pago_vencido',
         'Pago vencido',
         'El cliente ' || c.nombre || ' tiene una cuota vencida desde ' || cu.fecha_vencimiento,
         'cliente', c.id
  from cuotas cu
  join ventas v on v.id = cu.venta_id
  join clientes c on c.id = v.cliente_id
  where cu.estado = 'vencida'
  and not exists (
    select 1 from notificaciones n
    where n.entidad_id = c.id and n.tipo = 'pago_vencido'
    and n.creado_en::date = current_date
  );

  -- stock bajo / agotado
  insert into notificaciones (tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select case when p.cantidad = 0 then 'producto_agotado' else 'stock_bajo' end,
         case when p.cantidad = 0 then 'Producto agotado' else 'Stock bajo' end,
         p.nombre || ' — cantidad disponible: ' || p.cantidad,
         'producto', p.id
  from productos p
  where p.cantidad <= p.stock_minimo and p.estado = 'activo'
  and not exists (
    select 1 from notificaciones n
    where n.entidad_id = p.id and n.tipo in ('producto_agotado','stock_bajo')
    and n.creado_en::date = current_date
  );
end;
$$ language plpgsql;

-- Nota: programar con pg_cron (Supabase lo soporta como extensión):
-- select cron.schedule('tarea-diaria-notificaciones', '0 6 * * *', $$select tarea_diaria_notificaciones();$$);

-- ---------------------------------------------------------------------------
-- Auditoría genérica: registrar inserts/updates/deletes de tablas sensibles
-- ---------------------------------------------------------------------------
create or replace function registrar_auditoria()
returns trigger as $$
begin
  insert into auditoria (usuario_id, accion, entidad, entidad_id, detalle)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case tg_op
      when 'DELETE' then to_jsonb(old)
      else to_jsonb(new)
    end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_auditoria_ventas
  after insert or update or delete on ventas
  for each row execute function registrar_auditoria();
create trigger trg_auditoria_cobros
  after insert on cobros
  for each row execute function registrar_auditoria();
create trigger trg_auditoria_productos
  after insert or update or delete on productos
  for each row execute function registrar_auditoria();
create trigger trg_auditoria_clientes
  after insert or update or delete on clientes
  for each row execute function registrar_auditoria();
create trigger trg_auditoria_perfiles
  after update on perfiles
  for each row execute function registrar_auditoria();

-- ---------------------------------------------------------------------------
-- Helper: rol del usuario autenticado (usado por las políticas RLS)
-- ---------------------------------------------------------------------------
create or replace function mi_rol()
returns user_role as $$
  select rol from perfiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function mi_ruta_id()
returns uuid as $$
  select ruta_id from perfiles where id = auth.uid();
$$ language sql stable security definer;
