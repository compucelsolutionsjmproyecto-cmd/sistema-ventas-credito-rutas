import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, PackageCheck, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatoFechaHora } from '@/utils/formato';
import type { Perfil, Producto } from '@/types/database.types';

interface LineaAsignacion {
  producto: Producto;
  cantidad: number;
}

export default function AsignacionesPage() {
  const perfil = useAuthStore((s) => s.perfil);
  const queryClient = useQueryClient();
  const [vendedorId, setVendedorId] = useState('');
  const [lineas, setLineas] = useState<LineaAsignacion[]>([]);
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: vendedores } = useQuery({
    queryKey: ['vendedores-lista'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfiles').select('id, nombre_completo').eq('rol', 'vendedor').eq('estado', 'activo');
      if (error) throw error;
      return data as Pick<Perfil, 'id' | 'nombre_completo'>[];
    }
  });

  const { data: productos } = useQuery({
    queryKey: ['productos-disponibles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('productos').select('*').eq('estado', 'activo').gt('cantidad', 0);
      if (error) throw error;
      return data as Producto[];
    }
  });

  const { data: historial, isLoading } = useQuery({
    queryKey: ['asignaciones-historial'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asignaciones_inventario')
        .select('*, vendedor:perfiles!asignaciones_inventario_vendedor_id_fkey(nombre_completo), detalle:asignaciones_inventario_detalle(cantidad_entregada, producto:productos(nombre))')
        .order('creado_en', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    }
  });

  function agregarLinea() {
    const producto = productos?.find((p) => p.id === productoId);
    if (!producto || cantidad <= 0) return;
    setLineas((prev) => [...prev, { producto, cantidad }]);
    setProductoId('');
    setCantidad(1);
  }

  const guardar = useMutation({
    mutationFn: async () => {
      const { data: asignacion, error: asigError } = await supabase
        .from('asignaciones_inventario')
        .insert({ vendedor_id: vendedorId, entregado_por: perfil!.id, observaciones: observaciones || null })
        .select()
        .single();
      if (asigError) throw asigError;

      const detalle = lineas.map((l) => ({
        asignacion_id: asignacion.id,
        producto_id: l.producto.id,
        cantidad_entregada: l.cantidad
      }));
      const { error: detalleError } = await supabase.from('asignaciones_inventario_detalle').insert(detalle);
      if (detalleError) throw detalleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asignaciones-historial'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      setVendedorId('');
      setLineas([]);
      setObservaciones('');
      setError(null);
    },
    onError: (e: any) => setError(e.message)
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-lg font-bold text-slate-50">Asignación diaria de inventario</h1>
        <p className="text-sm text-slate-400">Entrega productos del inventario general a un vendedor.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Vendedor</label>
          <select className="input" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
            <option value="">Selecciona un vendedor</option>
            {vendedores?.map((v) => <option key={v.id} value={v.id}>{v.nombre_completo}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
          <div>
            <label className="label">Producto</label>
            <select className="input" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              <option value="">Selecciona un producto</option>
              {productos?.map((p) => <option key={p.id} value={p.id}>{p.nombre} (disp: {p.cantidad})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input type="number" min={1} className="input w-24" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} />
          </div>
          <button type="button" onClick={agregarLinea} className="btn-secondary"><Plus className="h-4 w-4" /> Agregar</button>
        </div>

        {lineas.length > 0 && (
          <div className="space-y-2">
            {lineas.map((l, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                <span className="text-slate-200">{l.producto.nombre} × {l.cantidad}</span>
                <button onClick={() => setLineas((prev) => prev.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="label">Observaciones</label>
          <input className="input" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={() => guardar.mutate()}
          disabled={guardar.isPending || !vendedorId || lineas.length === 0}
          className="btn-primary w-full"
        >
          {guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
          Confirmar entrega
        </button>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Historial reciente</h2>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-accent-500" />
        ) : (
          <div className="space-y-2">
            {historial?.map((h) => (
              <div key={h.id} className="card p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-200">{h.vendedor?.nombre_completo}</p>
                  <p className="text-xs text-slate-500">{formatoFechaHora(h.creado_en)}</p>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {h.detalle?.map((d: any) => `${d.producto?.nombre} ×${d.cantidad_entregada}`).join(', ')}
                </p>
              </div>
            ))}
            {historial?.length === 0 && <p className="text-sm text-slate-500">Aún no hay asignaciones registradas.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
