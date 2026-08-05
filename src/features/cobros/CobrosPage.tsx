import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Wallet, Eraser } from 'lucide-react';
import SignaturePad from 'signature_pad';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatoMoneda, formatoFecha } from '@/utils/formato';
import Modal from '@/components/ui/Modal';
import type { Cuota, Venta, Cliente, MetodoPago } from '@/types/database.types';

type CuotaConVenta = Cuota & { venta: Venta & { cliente: Pick<Cliente, 'nombre'> } };

export default function CobrosPage() {
  const perfil = useAuthStore((s) => s.perfil);
  const queryClient = useQueryClient();
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<CuotaConVenta | null>(null);
  const [valor, setValor] = useState(0);
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo');
  const [observacion, setObservacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  const { data: cuotasPendientes, isLoading } = useQuery({
    queryKey: ['cuotas-pendientes', perfil?.id],
    enabled: !!perfil,
    queryFn: async () => {
      let query = supabase
        .from('cuotas')
        .select('*, venta:ventas!inner(*, cliente:clientes(nombre))')
        .in('estado', ['pendiente', 'vencida', 'parcial'])
        .order('fecha_vencimiento');

      if (perfil!.rol === 'vendedor') {
        query = query.eq('venta.vendedor_id', perfil!.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as CuotaConVenta[];
    }
  });

  useEffect(() => {
    if (cuotaSeleccionada && canvasRef.current) {
      padRef.current = new SignaturePad(canvasRef.current, { backgroundColor: '#0B1220' });
      setValor(Number(cuotaSeleccionada.saldo));
    }
    return () => padRef.current?.clear();
  }, [cuotaSeleccionada]);

  async function registrarCobro() {
    if (!cuotaSeleccionada || !perfil) return;
    setGuardando(true);
    setError(null);
    try {
      let firma_digital_url: string | null = null;
      if (padRef.current && !padRef.current.isEmpty()) {
        const dataUrl = padRef.current.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        const ruta = `${Date.now()}-firma.png`;
        const { error: subidaError } = await supabase.storage.from('firmas').upload(ruta, blob);
        if (!subidaError) firma_digital_url = supabase.storage.from('firmas').getPublicUrl(ruta).data.publicUrl;
      }

      const { error: cobroError } = await supabase.from('cobros').insert({
        cuota_id: cuotaSeleccionada.id,
        venta_id: cuotaSeleccionada.venta_id,
        cliente_id: cuotaSeleccionada.venta.cliente_id,
        vendedor_id: perfil.id,
        valor,
        metodo,
        observacion: observacion || null,
        firma_digital_url
      });
      if (cobroError) throw cobroError;

      queryClient.invalidateQueries({ queryKey: ['cuotas-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setCuotaSeleccionada(null);
      setObservacion('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-lg font-bold text-slate-50">Cobros</h1>
        <p className="text-sm text-slate-400">Cuotas pendientes por cobrar.</p>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent-500" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cuotasPendientes?.map((c) => (
            <button
              key={c.id}
              onClick={() => setCuotaSeleccionada(c)}
              className="card p-4 text-left hover:border-accent-500/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-200">{c.venta.cliente?.nombre}</p>
                <span className={`badge ${c.estado === 'vencida' ? 'bg-red-500/15 text-red-400' : 'bg-accent-500/15 text-accent-400'}`}>
                  {c.estado}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Cuota #{c.numero} · vence {formatoFecha(c.fecha_vencimiento)}</p>
              <p className="text-lg font-display font-bold text-slate-100 mt-2">{formatoMoneda(Number(c.saldo))}</p>
            </button>
          ))}
          {cuotasPendientes?.length === 0 && (
            <p className="text-sm text-slate-500 col-span-full text-center py-8">No hay cuotas pendientes por cobrar. 🎉</p>
          )}
        </div>
      )}

      <Modal titulo="Registrar cobro" abierto={!!cuotaSeleccionada} onCerrar={() => setCuotaSeleccionada(null)}>
        {cuotaSeleccionada && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-300">{cuotaSeleccionada.venta.cliente?.nombre}</p>
              <p className="text-xs text-slate-500">Cuota #{cuotaSeleccionada.numero} — saldo {formatoMoneda(Number(cuotaSeleccionada.saldo))}</p>
            </div>

            <div>
              <label className="label">Valor a cobrar</label>
              <input
                type="number"
                className="input"
                value={valor}
                max={Number(cuotaSeleccionada.saldo)}
                onChange={(e) => setValor(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="label">Método de pago</label>
              <select className="input" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="label">Observación</label>
              <input className="input" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Firma digital del cliente</label>
                <button type="button" onClick={() => padRef.current?.clear()} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                  <Eraser className="h-3 w-3" /> Limpiar
                </button>
              </div>
              <canvas ref={canvasRef} className="w-full h-32 rounded-lg border border-surface-border bg-surface" />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button onClick={registrarCobro} disabled={guardando || valor <= 0} className="btn-primary w-full">
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Confirmar cobro
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
