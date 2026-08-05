import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatoMoneda, formatoFecha } from '@/utils/formato';
import type { Venta, Cliente } from '@/types/database.types';

const coloresEstado: Record<string, string> = {
  vigente: 'bg-brand-500/15 text-brand-300',
  pagada: 'bg-emerald-500/15 text-emerald-400',
  mora: 'bg-red-500/15 text-red-400',
  anulada: 'bg-slate-500/15 text-slate-400'
};

export default function VentasPage() {
  const { data: ventas, isLoading } = useQuery({
    queryKey: ['ventas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ventas')
        .select('*, cliente:clientes(nombre)')
        .order('creado_en', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as (Venta & { cliente: Pick<Cliente, 'nombre'> })[];
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-50">Ventas</h1>
          <p className="text-sm text-slate-400">Registra nuevas ventas a crédito y consulta su estado.</p>
        </div>
        <Link to="/ventas/nueva" className="btn-primary">
          <Plus className="h-4 w-4" /> Nueva venta
        </Link>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-surface-border">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Modalidad</th>
                  <th className="px-4 py-3 font-medium">Cuotas</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventas?.map((v) => (
                  <tr key={v.id} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-200">{v.cliente?.nombre}</td>
                    <td className="px-4 py-3 text-slate-200">{formatoMoneda(v.total)}</td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{v.modalidad}</td>
                    <td className="px-4 py-3 text-slate-400">{v.numero_cuotas}</td>
                    <td className="px-4 py-3 text-slate-400">{formatoFecha(v.creado_en)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${coloresEstado[v.estado]}`}>{v.estado}</span>
                    </td>
                  </tr>
                ))}
                {ventas?.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No hay ventas registradas aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
