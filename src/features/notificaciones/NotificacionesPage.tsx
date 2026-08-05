import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Bell, PackageX, AlertTriangle, CalendarClock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatoFechaHora } from '@/utils/formato';
import type { TipoNotificacion } from '@/types/database.types';

const iconos: Record<TipoNotificacion, typeof Bell> = {
  pago_vencido: CalendarClock,
  producto_agotado: PackageX,
  stock_bajo: AlertTriangle,
  cobro_pendiente: Bell
};

export default function NotificacionesPage() {
  const perfil = useAuthStore((s) => s.perfil);
  const queryClient = useQueryClient();

  const { data: notificaciones, isLoading } = useQuery({
    queryKey: ['notificaciones-todas', perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      let query = supabase.from('notificaciones').select('*').order('creado_en', { ascending: false }).limit(50);
      query = perfil!.rol === 'vendedor' ? query.eq('destinatario_id', perfil!.id) : query.is('destinatario_id', null);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const marcarLeida = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificaciones-todas'] })
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="font-display text-lg font-bold text-slate-50">Notificaciones</h1>
        <p className="text-sm text-slate-400">Pagos vencidos, stock bajo y productos agotados.</p>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
      ) : (
        <div className="space-y-2">
          {notificaciones?.map((n) => {
            const Icono = iconos[n.tipo];
            return (
              <div key={n.id} className={`card p-4 flex items-start gap-3 ${n.leida ? 'opacity-60' : ''}`}>
                <div className="h-9 w-9 rounded-lg bg-accent-500/15 text-accent-400 flex items-center justify-center shrink-0">
                  <Icono className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-200">{n.titulo}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{n.mensaje}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatoFechaHora(n.creado_en)}</p>
                </div>
                {!n.leida && (
                  <button onClick={() => marcarLeida.mutate(n.id)} className="text-xs text-accent-400 hover:underline shrink-0">
                    Marcar leída
                  </button>
                )}
              </div>
            );
          })}
          {notificaciones?.length === 0 && <p className="text-sm text-slate-500 text-center py-8">No tienes notificaciones.</p>}
        </div>
      )}
    </div>
  );
}
