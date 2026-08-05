import { useQuery } from '@tanstack/react-query';
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from 'date-fns';
import { supabase } from '@/lib/supabase';

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const hoy = startOfDay(new Date()).toISOString();
      const inicioSemana = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
      const inicioMes = startOfMonth(new Date()).toISOString();

      const [
        ventasHoy,
        cobrosHoy,
        gananciaSemana,
        gananciaMes,
        clientesRegistrados,
        clientesMorosos,
        productosDisponibles,
        rutasActivas,
        vendedoresActivos,
        ultimosCobros,
        cuotasVencidas
      ] = await Promise.all([
        supabase.from('ventas').select('total').gte('creado_en', hoy),
        supabase.from('cobros').select('valor').gte('creado_en', hoy),
        supabase.from('ventas').select('subtotal, ventas_detalle(cantidad, precio_unitario, producto_id)').gte('creado_en', inicioSemana),
        supabase.from('ventas').select('subtotal, ventas_detalle(cantidad, precio_unitario, producto_id)').gte('creado_en', inicioMes),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('ventas').select('id', { count: 'exact', head: true }).eq('estado', 'mora'),
        supabase.from('productos').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('rutas').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('perfiles').select('id', { count: 'exact', head: true }).eq('rol', 'vendedor').eq('estado', 'activo'),
        supabase.from('cobros').select('valor, creado_en, clientes(nombre)').order('creado_en', { ascending: false }).limit(6),
        supabase.from('cuotas').select('id', { count: 'exact', head: true }).eq('estado', 'vencida')
      ]);

      const totalVentasHoy = (ventasHoy.data ?? []).reduce((acc, v) => acc + Number(v.total), 0);
      const totalCobrosHoy = (cobrosHoy.data ?? []).reduce((acc, c) => acc + Number(c.valor), 0);

      // serie de últimos 7 días para el gráfico de ventas vs cobros
      const dias = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i));
      const [ventasSemana, cobrosSemana] = await Promise.all([
        supabase.from('ventas').select('total, creado_en').gte('creado_en', dias[0].toISOString()),
        supabase.from('cobros').select('valor, creado_en').gte('creado_en', dias[0].toISOString())
      ]);

      const serieDias = dias.map((dia) => {
        const clave = format(dia, 'yyyy-MM-dd');
        const ventasDia = (ventasSemana.data ?? [])
          .filter((v) => v.creado_en.startsWith(clave))
          .reduce((acc, v) => acc + Number(v.total), 0);
        const cobrosDia = (cobrosSemana.data ?? [])
          .filter((c) => c.creado_en.startsWith(clave))
          .reduce((acc, c) => acc + Number(c.valor), 0);
        return { dia: format(dia, 'EEE d'), ventas: ventasDia, cobros: cobrosDia };
      });

      return {
        ventasHoy: totalVentasHoy,
        cobrosHoy: totalCobrosHoy,
        gananciaSemana: (gananciaSemana.data ?? []).reduce((acc, v) => acc + Number(v.subtotal), 0),
        gananciaMes: (gananciaMes.data ?? []).reduce((acc, v) => acc + Number(v.subtotal), 0),
        clientesRegistrados: clientesRegistrados.count ?? 0,
        clientesMorosos: clientesMorosos.count ?? 0,
        productosDisponibles: productosDisponibles.count ?? 0,
        rutasActivas: rutasActivas.count ?? 0,
        vendedoresActivos: vendedoresActivos.count ?? 0,
        cuotasVencidas: cuotasVencidas.count ?? 0,
        ultimosCobros: ultimosCobros.data ?? [],
        serieDias
      };
    },
    refetchInterval: 60_000
  });
}
