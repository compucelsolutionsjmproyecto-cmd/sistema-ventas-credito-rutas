-- ============================================================================
-- DATOS INICIALES
-- ============================================================================
-- IMPORTANTE: El primer usuario administrador NO se crea aquí por SQL puro,
-- porque auth.users requiere pasar por Supabase Auth (para el hash de
-- contraseña). Pasos para crear el primer administrador:
--
-- 1. En el Dashboard de Supabase -> Authentication -> Users -> "Add user",
--    crea un usuario con correo y contraseña (ej: admin@tuempresa.com).
-- 2. Copia el UUID generado para ese usuario.
-- 3. Ejecuta:
--    update perfiles set rol = 'administrador', nombre_completo = 'Administrador Principal'
--    where id = 'PEGA-AQUI-EL-UUID';
--
-- El trigger handle_new_user() ya habrá creado su fila en "perfiles"
-- automáticamente con rol 'vendedor' por defecto; este paso solo lo asciende.
-- ============================================================================

insert into categorias (nombre) values
  ('Electrodomésticos'),
  ('Calzado'),
  ('Ropa'),
  ('Aseo y hogar'),
  ('Tecnología'),
  ('Otros')
on conflict (nombre) do nothing;
