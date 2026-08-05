import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/ui/Modal';
import { formatoMoneda } from '@/utils/formato';
import type { Producto, Categoria } from '@/types/database.types';

interface FormValores {
  codigo: string;
  nombre: string;
  marca: string;
  categoria_id: string;
  precio_compra: number;
  precio_venta: number;
  cantidad: number;
  stock_minimo: number;
  fecha_vencimiento: string;
}

export default function InventarioPage() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [foto, setFoto] = useState<File | null>(null);

  const { data: productos, isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('*, categoria:categorias(nombre)')
        .order('creado_en', { ascending: false });
      if (error) throw error;
      return data as (Producto & { categoria: Pick<Categoria, 'nombre'> | null })[];
    }
  });

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('*').order('nombre');
      if (error) throw error;
      return data as Categoria[];
    }
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValores>();

  function abrirNuevo() {
    setEditando(null);
    setFoto(null);
    reset({ codigo: '', nombre: '', marca: '', categoria_id: '', precio_compra: 0, precio_venta: 0, cantidad: 0, stock_minimo: 5, fecha_vencimiento: '' });
    setModalAbierto(true);
  }

  function abrirEditar(p: Producto) {
    setEditando(p);
    setFoto(null);
    reset({
      codigo: p.codigo,
      nombre: p.nombre,
      marca: p.marca ?? '',
      categoria_id: p.categoria_id ?? '',
      precio_compra: p.precio_compra,
      precio_venta: p.precio_venta,
      cantidad: p.cantidad,
      stock_minimo: p.stock_minimo,
      fecha_vencimiento: p.fecha_vencimiento ?? ''
    });
    setModalAbierto(true);
  }

  const guardar = useMutation({
    mutationFn: async (valores: FormValores) => {
      let foto_url = editando?.foto_url ?? null;
      if (foto) {
        const ruta = `${Date.now()}-${foto.name}`;
        const { error: subidaError } = await supabase.storage.from('productos').upload(ruta, foto);
        if (!subidaError) foto_url = supabase.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
      }

      const payload = {
        codigo: valores.codigo,
        nombre: valores.nombre,
        marca: valores.marca || null,
        categoria_id: valores.categoria_id || null,
        precio_compra: Number(valores.precio_compra),
        precio_venta: Number(valores.precio_venta),
        cantidad: Number(valores.cantidad),
        stock_minimo: Number(valores.stock_minimo),
        fecha_vencimiento: valores.fecha_vencimiento || null,
        foto_url
      };

      if (editando) {
        const { error } = await supabase.from('productos').update(payload).eq('id', editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('productos').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      setModalAbierto(false);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-50">Inventario</h1>
          <p className="text-sm text-slate-400">Administra los productos disponibles para la venta.</p>
        </div>
        <button className="btn-primary" onClick={abrirNuevo}>
          <Plus className="h-4 w-4" /> Nuevo producto
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
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Precio venta</th>
                  <th className="px-4 py-3 font-medium">Ganancia</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos?.map((p) => (
                  <tr key={p.id} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {p.foto_url ? (
                          <img src={p.foto_url} className="h-9 w-9 rounded-lg object-cover" alt={p.nombre} />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-surface" />
                        )}
                        <div>
                          <p className="font-medium text-slate-200">{p.nombre}</p>
                          <p className="text-xs text-slate-500">{p.codigo} {p.marca && `· ${p.marca}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{p.categoria?.nombre ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-200">{formatoMoneda(p.precio_venta)}</td>
                    <td className="px-4 py-3 text-emerald-400">{formatoMoneda(p.ganancia)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        {p.cantidad}
                        {p.cantidad <= p.stock_minimo && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => abrirEditar(p)} className="text-slate-400 hover:text-accent-400">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {productos?.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No hay productos registrados aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal titulo={editando ? 'Editar producto' : 'Nuevo producto'} abierto={modalAbierto} onCerrar={() => setModalAbierto(false)}>
        <form onSubmit={handleSubmit((v) => guardar.mutate(v))} className="space-y-4">
          <div>
            <label className="label">Foto del producto</label>
            <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código</label>
              <input className="input" {...register('codigo', { required: true })} />
            </div>
            <div>
              <label className="label">Nombre</label>
              <input className="input" {...register('nombre', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Marca</label>
              <input className="input" {...register('marca')} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select className="input" {...register('categoria_id')}>
                <option value="">Sin categoría</option>
                {categorias?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Precio de compra</label>
              <input type="number" step="0.01" className="input" {...register('precio_compra', { required: true, valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Precio de venta</label>
              <input type="number" step="0.01" className="input" {...register('precio_venta', { required: true, valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad en inventario</label>
              <input type="number" className="input" {...register('cantidad', { required: true, valueAsNumber: true })} />
            </div>
            <div>
              <label className="label">Stock mínimo</label>
              <input type="number" className="input" {...register('stock_minimo', { required: true, valueAsNumber: true })} />
            </div>
          </div>
          <div>
            <label className="label">Fecha de vencimiento (opcional)</label>
            <input type="date" className="input" {...register('fecha_vencimiento')} />
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
