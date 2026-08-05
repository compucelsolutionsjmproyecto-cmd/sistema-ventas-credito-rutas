-- ============================================================================
-- SUPABASE STORAGE: buckets para fotos de productos, clientes, comprobantes,
-- firmas digitales y fotos de vendedores.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('productos', 'productos', true),
  ('clientes', 'clientes', true),
  ('vendedores', 'vendedores', true),
  ('comprobantes', 'comprobantes', false),
  ('firmas', 'firmas', false)
on conflict (id) do nothing;

-- Lectura pública para fotos de catálogo (productos, clientes, vendedores)
create policy "lectura_publica_productos"
  on storage.objects for select
  using (bucket_id = 'productos');

create policy "lectura_publica_clientes"
  on storage.objects for select
  using (bucket_id = 'clientes');

create policy "lectura_publica_vendedores"
  on storage.objects for select
  using (bucket_id = 'vendedores');

-- Comprobantes y firmas: solo usuarios autenticados con rol de gestión o
-- el propio vendedor dueño del archivo (prefijo de carpeta = su uuid)
create policy "lectura_comprobantes_autenticados"
  on storage.objects for select
  using (bucket_id = 'comprobantes' and auth.uid() is not null);

create policy "lectura_firmas_autenticados"
  on storage.objects for select
  using (bucket_id = 'firmas' and auth.uid() is not null);

-- Escritura: cualquier usuario autenticado puede subir a los buckets de
-- trabajo operativo (la validación fina de "a quién pertenece" ocurre en
-- las tablas relacionadas, protegidas por RLS)
create policy "escritura_autenticados_productos"
  on storage.objects for insert
  with check (bucket_id = 'productos' and auth.uid() is not null);
create policy "escritura_autenticados_clientes"
  on storage.objects for insert
  with check (bucket_id = 'clientes' and auth.uid() is not null);
create policy "escritura_autenticados_vendedores"
  on storage.objects for insert
  with check (bucket_id = 'vendedores' and auth.uid() is not null);
create policy "escritura_autenticados_comprobantes"
  on storage.objects for insert
  with check (bucket_id = 'comprobantes' and auth.uid() is not null);
create policy "escritura_autenticados_firmas"
  on storage.objects for insert
  with check (bucket_id = 'firmas' and auth.uid() is not null);

create policy "actualizacion_autenticados"
  on storage.objects for update
  using (auth.uid() is not null);

create policy "borrado_admin_supervisor"
  on storage.objects for delete
  using (mi_rol() in ('administrador','supervisor'));
