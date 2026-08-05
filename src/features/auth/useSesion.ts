import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useSesion() {
  const { perfil, cargando, setPerfil, setCargando } = useAuthStore();

  useEffect(() => {
    let activo = true;

    async function cargarPerfil(userId: string) {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!activo) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Error cargando perfil:', error.message);
        setPerfil(null);
      } else {
        setPerfil(data);
      }
      setCargando(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        cargarPerfil(session.user.id);
      } else {
        setCargando(false);
      }
    });

    const { data: subscripcion } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (session?.user) {
        setCargando(true);
        cargarPerfil(session.user.id);
      } else {
        setPerfil(null);
        setCargando(false);
      }
    });

    return () => {
      activo = false;
      subscripcion.subscription.unsubscribe();
    };
  }, [setPerfil, setCargando]);

  return { perfil, cargando };
}
