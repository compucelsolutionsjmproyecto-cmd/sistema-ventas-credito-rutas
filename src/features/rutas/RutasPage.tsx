import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Power, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import type { Ruta, Perfil } from '@/types/database.types';

interface FormValores {
  nombre: string;
  descripcion: string;
  vendedor_id: string;
  municipios: string;
  barrios: string;
}

export default function RutasPage() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [rutaEditando, setRutaEditando] = useState<Ruta | null>(null);

  const { data: rutas, isLoading } = useQuery({
    queryKey: ['rutas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rutas')
        .select('*, vendedor:perfiles(nombre_completo)')
        .order('creado_en', { ascending: false });
      if (error) throw error;
      return data as (Ruta & { vendedor: Pick<Perfil, 'nombre_completo'> | null })[];
    }
  });

  const { data: vendedores } = useQuery({
    queryKey: ['vendedores-lista'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, nombre_completo')
        .eq('rol', 'vendedor')
        .eq('estado', 'activo');
      if (error) throw error;
      return data as Pick<Perfil, 'id' | 'nombre_completo'>[];
    }
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValores>();

  function abrirNueva() {
    setRutaEditando(null);
    reset({ nombre: '', descripcion: '', vendedor_id: '', municipios: '', barrios: '' });
    setModalAbierto(true);
  }

  function abrirEditar(ruta: Ruta) {
    setRutaEditando(ruta);
    reset({
      nombre: ruta.nombre,
      descripcion: ruta.descripcion ?? '',
      vendedor_id: ruta.vendedor_id ?? '',
      municipios: ruta.municipios.join(', '),
      barrios: ruta.barrios.join(', ')
    });
    setModalAbierto(true);
  }

  const guardar = useMutation({
    mutationFn: async (valores: FormValores) => {
      const payload = {
        nombre: valores.nombre,
        descripcion: valores.descripcion || null,
        vendedor_id: valores.vendedor_id || null,
        municipios: valores.municipios.split(',').map((s) => s.trim()).filter(Boolean),
        barrios: valores.barrios.split(',').map((s) => s.trim()).filter(Boolean)
      };
      if (rutaEditando) {
        const { error } = await supabase.from('rutas').update(payload).eq('id', rutaEditando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rutas').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rutas'] });
      setModalAbierto(false);
    }
  });

  const alternarEstado = useMutation({
    mutationFn: async (ruta: Ruta) => {
      const { error } = await supabase
        .from('rutas')
        .update({ estado: ruta.estado === 'activo' ? 'inactivo' : 'activo' })
        .eq('id', ruta.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rutas'] })
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-50">Rutas</h1>
          <p className="text-sm text-slate-400">Crea rutas y asigna vendedores, municipios y barrios.</p>
        </div>
        <button className="btn-primary" onClick={abrirNueva}>
          <Plus className="h-4 w-4" /> Nueva ruta
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-surface-border">
                  <th className="px-4 py-3 font-medium">Ruta</th>
                  <th className="px-4 py-3 font-medium">Vendedor</th>
                  <th className="px-4 py-3 font-medium">Municipios</th>
                  <th className="px-4 py-3 font-medium">Barrios</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rutas?.map((ruta) => (
                  <tr key={ruta.id} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{ruta.nombre}</p>
                      {ruta.descripcion && <p className="text-xs text-slate-500">{ruta.descripcion}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{ruta.vendedor?.nombre_completo ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{ruta.municipios.join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[160px] truncate">{ruta.barrios.join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ruta.estado === 'activo' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                        {ruta.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => abrirEditar(ruta)} className="text-slate-400 hover:text-accent-400">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => alternarEstado.mutate(ruta)} className="text-slate-400 hover:text-accent-400">
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rutas?.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No hay rutas registradas aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal titulo={rutaEditando ? 'Editar ruta' : 'Nueva ruta'} abierto={modalAbierto} onCerrar={() => setModalAbierto(false)}>
        <form onSubmit={handleSubmit((v) => guardar.mutate(v))} className="space-y-4">
          <div>
            <label className="label">Nombre de la ruta</label>
            <input className="input" {...register('nombre', { required: true })} placeholder="Ruta Norte" />
          </div>
          <div>
            <label className="label">Descripción</label>
            <input className="input" {...register('descripcion')} placeholder="Opcional" />
          </div>
          <div>
            <label className="label">Vendedor asignado</label>
            <select className="input" {...register('vendedor_id')}>
              <option value="">Sin asignar</option>
              {vendedores?.map((v) => (
                <option key={v.id} value={v.id}>{v.nombre_completo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Municipios (separados por coma)</label>
            <input className="input" {...register('municipios')} placeholder="Bello, Itagüí" />
          </div>
          <div>
            <label className="label">Barrios (separados por coma)</label>
            <input className="input" {...register('barrios')} placeholder="Centro, La Milagrosa" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalAbierto(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
