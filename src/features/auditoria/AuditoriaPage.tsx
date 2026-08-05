import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatoFechaHora } from '@/utils/formato';

export default function AuditoriaPage() {
  const { data: registros, isLoading } = useQuery({
    queryKey: ['auditoria'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auditoria')
        .select('*, usuario:perfiles(nombre_completo)')
        .order('creado_en', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-lg font-bold text-slate-50">Auditoría</h1>
        <p className="text-sm text-slate-400">Historial de acciones realizadas en el sistema.</p>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-surface-border">
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                  <th className="px-4 py-3 font-medium">Entidad</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {registros?.map((r) => (
                  <tr key={r.id} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-2.5 text-slate-200">{r.usuario?.nombre_completo ?? 'Sistema'}</td>
                    <td className="px-4 py-2.5">
                      <span className="badge bg-brand-500/15 text-brand-300">{r.accion}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{r.entidad}</td>
                    <td className="px-4 py-2.5 text-slate-400">{formatoFechaHora(r.creado_en)}</td>
                  </tr>
                ))}
                {registros?.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Sin registros de auditoría aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
