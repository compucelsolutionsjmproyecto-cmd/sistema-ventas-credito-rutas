import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Power, Loader2, UserCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import type { Perfil, Ruta } from '@/types/database.types';

interface FormValores {
  nombre_completo: string;
  cedula: string;
  celular: string;
  direccion: string;
  correo: string;
  contrasena: string;
  ruta_id: string;
}

export default function VendedoresPage() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: vendedores, isLoading } = useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*, ruta:rutas(nombre)')
        .eq('rol', 'vendedor')
        .order('creado_en', { ascending: false });
      if (error) throw error;
      return data as (Perfil & { ruta: Pick<Ruta, 'nombre'> | null })[];
    }
  });

  const { data: rutas } = useQuery({
    queryKey: ['rutas-lista'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rutas').select('id, nombre').eq('estado', 'activo');
      if (error) throw error;
      return data as Pick<Ruta, 'id' | 'nombre'>[];
    }
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValores>();

  function abrirNuevo() {
    setError(null);
    setFoto(null);
    reset({ nombre_completo: '', cedula: '', celular: '', direccion: '', correo: '', contrasena: '', ruta_id: '' });
    setModalAbierto(true);
  }

  const crear = useMutation({
    mutationFn: async (valores: FormValores) => {
      // Nota: la creación del usuario ahora pasa por la Edge Function
      // "crear-vendedor", que valida en el servidor que quien llama sea
      // administrador o supervisor antes de crear la cuenta (usando la
      // service_role key). No requiere registro público habilitado.
      let foto_url: string | null = null;
      if (foto) {
        const ruta = `${Date.now()}-${foto.name}`;
        const { error: subidaError } = await supabase.storage.from('vendedores').upload(ruta, foto);
        if (!subidaError) {
          foto_url = supabase.storage.from('vendedores').getPublicUrl(ruta).data.publicUrl;
        }
      }

      const { data, error } = await supabase.functions.invoke('crear-vendedor', {
        body: {
          email: valores.correo,
          password: valores.contrasena,
          nombre_completo: valores.nombre_completo,
          cedula: valores.cedula,
          celular: valores.celular,
          direccion: valores.direccion,
          ruta_id: valores.ruta_id || null,
          foto_url
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendedores'] });
      setModalAbierto(false);
    },
    onError: (e: any) => setError(e.message)
  });

  const alternarEstado = useMutation({
    mutationFn: async (v: Perfil) => {
      const { error } = await supabase
        .from('perfiles')
        .update({ estado: v.estado === 'activo' ? 'inactivo' : 'activo' })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendedores'] })
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-50">Vendedores</h1>
          <p className="text-sm text-slate-400">Registra vendedores y asígnales una ruta.</p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}>
          <Plus className="h-4 w-4" /> Nuevo vendedor
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-accent-500" />}
        {vendedores?.map((v) => (
          <div key={v.id} className="card p-4 flex items-start gap-3">
            {v.foto_url ? (
              <img src={v.foto_url} alt={v.nombre_completo} className="h-12 w-12 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
                <UserCircle className="h-6 w-6 text-brand-200" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-200 truncate">{v.nombre_completo}</p>
              <p className="text-xs text-slate-500">{v.celular || 'Sin celular'}</p>
              <p className="text-xs text-slate-500">Ruta: {v.ruta?.nombre ?? 'Sin asignar'}</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`badge ${v.estado === 'activo' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                  {v.estado}
                </span>
                <button onClick={() => alternarEstado.mutate(v)} className="text-slate-400 hover:text-accent-400">
                  <Power className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {vendedores?.length === 0 && <p className="text-slate-500 text-sm">No hay vendedores registrados aún.</p>}
      </div>

      <Modal titulo="Nuevo vendedor" abierto={modalAbierto} onCerrar={() => setModalAbierto(false)}>
        <form onSubmit={handleSubmit((v) => crear.mutate(v))} className="space-y-4">
          <div>
            <label className="label">Foto</label>
            <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre completo</label>
              <input className="input" {...register('nombre_completo', { required: true })} />
            </div>
            <div>
              <label className="label">Cédula</label>
              <input className="input" {...register('cedula', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Celular</label>
              <input className="input" {...register('celular', { required: true })} />
            </div>
            <div>
              <label className="label">Ruta</label>
              <select className="input" {...register('ruta_id')}>
                <option value="">Sin asignar</option>
                {rutas?.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Dirección</label>
            <input className="input" {...register('direccion')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Usuario (correo)</label>
              <input type="email" className="input" {...register('correo', { required: true })} />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input type="password" className="input" {...register('contrasena', { required: true, minLength: 6 })} />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalAbierto(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Registrar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
