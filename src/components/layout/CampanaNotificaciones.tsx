import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Notificacion } from '@/types/database.types';

export default function CampanaNotificaciones() {
  const perfil = useAuthStore((s) => s.perfil);
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  useEffect(() => {
    if (!perfil) return;

    async function cargar() {
      let query = supabase
        .from('notificaciones')
        .select('*')
        .eq('leida', false)
        .order('creado_en', { ascending: false })
        .limit(10);

      if (perfil!.rol === 'vendedor') {
        query = query.eq('destinatario_id', perfil!.id);
      } else {
        query = query.is('destinatario_id', null);
      }
      const { data } = await query;
      setNotificaciones(data ?? []);
    }
    cargar();

    const canal = supabase
      .channel('notificaciones-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        () => cargar()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [perfil]);

  async function marcarLeida(id: string) {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="relative text-slate-300 hover:text-slate-100 p-2 rounded-lg hover:bg-white/5"
      >
        <Bell className="h-5 w-5" />
        {notificaciones.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent-500 text-[10px] font-bold flex items-center justify-center text-white">
            {notificaciones.length > 9 ? '9+' : notificaciones.length}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 mt-2 w-80 card z-40 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-surface-border flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Notificaciones</p>
              <Link
                to="/notificaciones"
                onClick={() => setAbierto(false)}
                className="text-xs text-accent-400 hover:underline"
              >
                Ver todas
              </Link>
            </div>
            {notificaciones.length === 0 ? (
              <p className="text-sm text-slate-500 p-4 text-center">Sin notificaciones nuevas</p>
            ) : (
              notificaciones.map((n) => (
                <button
                  key={n.id}
                  onClick={() => marcarLeida(n.id)}
                  className="w-full text-left p-3 border-b border-surface-border last:border-0 hover:bg-white/5"
                >
                  <p className="text-sm font-medium text-slate-200">{n.titulo}</p>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.mensaje}</p>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
