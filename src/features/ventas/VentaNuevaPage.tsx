import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatoMoneda } from '@/utils/formato';
import type { Cliente, Producto, ModalidadPago } from '@/types/database.types';

interface LineaCarrito {
  producto: Producto;
  cantidad: number;
}

export default function VentaNuevaPage() {
  const navigate = useNavigate();
  const perfil = useAuthStore((s) => s.perfil);

  const [clienteId, setClienteId] = useState('');
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [descuento, setDescuento] = useState(0);
  const [modalidad, setModalidad] = useState<ModalidadPago>('diario');
  const [numeroCuotas, setNumeroCuotas] = useState(30);
  const [fechaPrimeraCuota, setFechaPrimeraCuota] = useState(() => new Date().toISOString().slice(0, 10));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('id, nombre').eq('estado', 'activo').order('nombre');
      if (error) throw error;
      return data as Pick<Cliente, 'id' | 'nombre'>[];
    }
  });

  // Inventario que el vendedor tiene consigo hoy
  const { data: inventarioDisponible } = useQuery({
    queryKey: ['inventario-vendedor', perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventario_vendedor')
        .select('cantidad, producto:productos(*)')
        .eq('vendedor_id', perfil!.id)
        .gt('cantidad', 0);
      if (error) throw error;
      return data as unknown as { cantidad: number; producto: Producto }[];
    }
  });

  function agregarProducto(producto: Producto, disponible: number) {
    setCarrito((prev) => {
      const existente = prev.find((l) => l.producto.id === producto.id);
      if (existente) {
        if (existente.cantidad >= disponible) return prev;
        return prev.map((l) => (l.producto.id === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l));
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  }

  function quitarProducto(productoId: string) {
    setCarrito((prev) => prev.filter((l) => l.producto.id !== productoId));
  }

  const subtotal = carrito.reduce((acc, l) => acc + l.cantidad * l.producto.precio_venta, 0);
  const total = Math.max(subtotal - descuento, 0);
  const valorCuotaEstimado = numeroCuotas > 0 ? total / numeroCuotas : 0;

  async function confirmarVenta() {
    if (!clienteId || carrito.length === 0 || !perfil) return;
    setGuardando(true);
    setError(null);
    try {
      const { data: venta, error: ventaError } = await supabase
        .from('ventas')
        .insert({
          cliente_id: clienteId,
          vendedor_id: perfil.id,
          descuento,
          modalidad,
          numero_cuotas: numeroCuotas,
          fecha_primera_cuota: fechaPrimeraCuota
        })
        .select()
        .single();
      if (ventaError) throw ventaError;

      const detalle = carrito.map((l) => ({
        venta_id: venta.id,
        producto_id: l.producto.id,
        cantidad: l.cantidad,
        precio_unitario: l.producto.precio_venta
      }));
      const { error: detalleError } = await supabase.from('ventas_detalle').insert(detalle);
      if (detalleError) throw detalleError;

      // aplicar descuento total (ya se guardó al crear) y generar cuotas
      await supabase.from('ventas').update({ descuento }).eq('id', venta.id);
      const { error: cuotasError } = await supabase.rpc('generar_cuotas', { p_venta_id: venta.id });
      if (cuotasError) throw cuotasError;

      navigate('/ventas');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate('/ventas')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Volver a ventas
      </button>

      <h1 className="font-display text-lg font-bold text-slate-50">Nueva venta</h1>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Cliente</label>
          <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Selecciona un cliente</option>
            {clientes?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Productos disponibles en tu inventario</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {inventarioDisponible?.map(({ producto, cantidad }) => (
              <button
                key={producto.id}
                type="button"
                onClick={() => agregarProducto(producto, cantidad)}
                className="flex items-center justify-between rounded-lg border border-surface-border px-3 py-2 text-left hover:border-accent-500/50 text-sm"
              >
                <span className="text-slate-200">{producto.nombre}</span>
                <span className="text-slate-500 text-xs">{formatoMoneda(producto.precio_venta)} · disp: {cantidad}</span>
              </button>
            ))}
            {inventarioDisponible?.length === 0 && (
              <p className="text-sm text-slate-500 col-span-2">
                No tienes inventario asignado. Solicita al administrador una asignación diaria.
              </p>
            )}
          </div>
        </div>

        {carrito.length > 0 && (
          <div className="space-y-2">
            <label className="label">Productos en la venta</label>
            {carrito.map((l) => (
              <div key={l.producto.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                <div>
                  <p className="text-sm text-slate-200">{l.producto.nombre}</p>
                  <p className="text-xs text-slate-500">{l.cantidad} x {formatoMoneda(l.producto.precio_venta)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-200">{formatoMoneda(l.cantidad * l.producto.precio_venta)}</span>
                  <button onClick={() => quitarProducto(l.producto.id)} className="text-slate-500 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Modalidad de pago</label>
            <select className="input" value={modalidad} onChange={(e) => setModalidad(e.target.value as ModalidadPago)}>
              <option value="diario">Diario</option>
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>
          <div>
            <label className="label">Número de cuotas</label>
            <input type="number" min={1} className="input" value={numeroCuotas} onChange={(e) => setNumeroCuotas(Number(e.target.value))} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Descuento</label>
            <input type="number" min={0} className="input" value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Fecha primera cuota</label>
            <input type="date" className="input" value={fechaPrimeraCuota} onChange={(e) => setFechaPrimeraCuota(e.target.value)} />
          </div>
        </div>

        <div className="rounded-lg bg-surface p-4 space-y-1 text-sm">
          <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{formatoMoneda(subtotal)}</span></div>
          <div className="flex justify-between text-slate-400"><span>Descuento</span><span>-{formatoMoneda(descuento)}</span></div>
          <div className="flex justify-between text-slate-100 font-semibold text-base pt-1 border-t border-surface-border mt-1">
            <span>Total</span><span>{formatoMoneda(total)}</span>
          </div>
          <div className="flex justify-between text-accent-400"><span>Valor por cuota</span><span>{formatoMoneda(valorCuotaEstimado)}</span></div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          onClick={confirmarVenta}
          disabled={guardando || !clienteId || carrito.length === 0}
          className="btn-primary w-full"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Confirmar venta
        </button>
      </div>
    </div>
  );
}
