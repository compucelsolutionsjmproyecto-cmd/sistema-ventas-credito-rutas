import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/types/database.types';

export default function ClientesPage() {
  const [busqueda, setBusqueda] = useState('');

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*, ruta:rutas(nombre)')
        .order('creado_en', { ascending: false });
      if (error) throw error;
      return data as (Cliente & { ruta: { nombre: string } | null })[];
    }
  });

  const filtrados = clientes?.filter((c) =>
    [c.nombre, c.cedula, c.barrio, c.municipio].join(' ').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-50">Clientes</h1>
          <p className="text-sm text-slate-400">Consulta y registra los clientes de tu ruta.</p>
        </div>
        <Link to="/clientes/nuevo" className="btn-primary">
          <Plus className="h-4 w-4" /> Nuevo cliente
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          className="input pl-9"
          placeholder="Buscar por nombre, cédula o barrio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent-500" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados?.map((c) => (
            <Link key={c.id} to={`/clientes/${c.id}/editar`} className="card p-4 hover:border-accent-500/50 transition-colors">
              <div className="flex items-start gap-3">
                {c.foto_cliente_url ? (
                  <img src={c.foto_cliente_url} className="h-11 w-11 rounded-full object-cover" alt={c.nombre} />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-200 truncate">{c.nombre}</p>
                  <p className="text-xs text-slate-500">{c.celular || 'Sin celular'}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {c.barrio || '—'}, {c.municipio || '—'}
                  </p>
                </div>
              </div>
              {c.ruta && <span className="badge bg-brand-500/15 text-brand-300 mt-3">{c.ruta.nombre}</span>}
            </Link>
          ))}
          {filtrados?.length === 0 && (
            <p className="text-slate-500 text-sm col-span-full text-center py-8">No se encontraron clientes.</p>
          )}
        </div>
      )}
    </div>
  );
}
