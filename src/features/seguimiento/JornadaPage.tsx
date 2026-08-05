import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Square, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatoMoneda } from '@/utils/formato';

function obtenerGps(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

export default function JornadaPage() {
  const perfil = useAuthStore((s) => s.perfil);
  const queryClient = useQueryClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const [procesando, setProcesando] = useState(false);

  const { data: jornada, isLoading } = useQuery({
    queryKey: ['jornada-hoy', perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data } = await supabase
        .from('jornadas')
        .select('*')
        .eq('vendedor_id', perfil!.id)
        .eq('fecha', hoy)
        .maybeSingle();
      return data;
    }
  });

  const iniciar = useMutation({
    mutationFn: async () => {
      setProcesando(true);
      const gps = await obtenerGps();
      const { error } = await supabase.from('jornadas').insert({
        vendedor_id: perfil!.id,
        fecha: hoy,
        hora_inicio: new Date().toISOString(),
        gps_inicio_lat: gps?.lat ?? null,
        gps_inicio_lng: gps?.lng ?? null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jornada-hoy'] });
      setProcesando(false);
    },
    onError: () => setProcesando(false)
  });

  const finalizar = useMutation({
    mutationFn: async () => {
      setProcesando(true);
      const gps = await obtenerGps();
      const { error } = await supabase
        .from('jornadas')
        .update({ hora_fin: new Date().toISOString(), gps_fin_lat: gps?.lat ?? null, gps_fin_lng: gps?.lng ?? null })
        .eq('id', jornada!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jornada-hoy'] });
      setProcesando(false);
    },
    onError: () => setProcesando(false)
  });

  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin text-accent-500" />;
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="font-display text-lg font-bold text-slate-50">Mi jornada de hoy</h1>
        <p className="text-sm text-slate-400">Registra el inicio y cierre de tu recorrido diario.</p>
      </div>

      <div className="card p-5 space-y-4">
        {!jornada ? (
          <button onClick={() => iniciar.mutate()} disabled={procesando} className="btn-primary w-full">
            {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Iniciar jornada
          </button>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-display font-bold text-slate-100">{jornada.clientes_visitados}</p>
                <p className="text-xs text-slate-500">Visitados</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-slate-100">{jornada.ventas_realizadas}</p>
                <p className="text-xs text-slate-500">Ventas</p>
              </div>
              <div>
                <p className="text-xl font-display font-bold text-emerald-400">{formatoMoneda(Number(jornada.total_cobrado))}</p>
                <p className="text-xs text-slate-500">Cobrado</p>
              </div>
            </div>

            {jornada.gps_inicio_lat && (
              <p className="text-xs text-slate-500 flex items-center gap-1 justify-center">
                <MapPin className="h-3 w-3" /> Inicio registrado a las{' '}
                {new Date(jornada.hora_inicio!).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}

            {jornada.hora_fin ? (
              <p className="text-center text-sm text-emerald-400 font-medium">Jornada finalizada. ¡Buen trabajo!</p>
            ) : (
              <button onClick={() => finalizar.mutate()} disabled={procesando} className="btn-secondary w-full">
                {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                Finalizar jornada
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
