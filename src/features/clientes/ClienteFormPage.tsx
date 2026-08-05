import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Ruta } from '@/types/database.types';

interface FormValores {
  nombre: string;
  cedula: string;
  celular: string;
  direccion: string;
  barrio: string;
  municipio: string;
  referencia: string;
  observaciones: string;
  ruta_id: string;
}

export default function ClienteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const perfil = useAuthStore((s) => s.perfil);

  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [fotoCasa, setFotoCasa] = useState<File | null>(null);
  const [fotoCliente, setFotoCliente] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<FormValores>();

  const { data: rutas } = useQuery({
    queryKey: ['rutas-lista'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rutas').select('id, nombre').eq('estado', 'activo');
      if (error) throw error;
      return data as Pick<Ruta, 'id' | 'nombre'>[];
    }
  });

  useEffect(() => {
    if (!id) return;
    supabase.from('clientes').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        reset({
          nombre: data.nombre,
          cedula: data.cedula ?? '',
          celular: data.celular ?? '',
          direccion: data.direccion ?? '',
          barrio: data.barrio ?? '',
          municipio: data.municipio ?? '',
          referencia: data.referencia ?? '',
          observaciones: data.observaciones ?? '',
          ruta_id: data.ruta_id ?? ''
        });
        if (data.ubicacion_lat && data.ubicacion_lng) {
          setUbicacion({ lat: data.ubicacion_lat, lng: data.ubicacion_lng });
        }
      }
    });
  }, [id, reset]);

  function capturarGps() {
    setObteniendoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setObteniendoGps(false);
      },
      () => setObteniendoGps(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function subirFoto(bucket: string, archivo: File) {
    const ruta = `${Date.now()}-${archivo.name}`;
    const { error: subidaError } = await supabase.storage.from(bucket).upload(ruta, archivo);
    if (subidaError) throw subidaError;
    return supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl;
  }

  async function onSubmit(valores: FormValores) {
    setGuardando(true);
    setError(null);
    try {
      let foto_casa_url: string | undefined;
      let foto_cliente_url: string | undefined;
      if (fotoCasa) foto_casa_url = await subirFoto('clientes', fotoCasa);
      if (fotoCliente) foto_cliente_url = await subirFoto('clientes', fotoCliente);

      const payload = {
        ...valores,
        ruta_id: valores.ruta_id || null,
        ubicacion_lat: ubicacion?.lat ?? null,
        ubicacion_lng: ubicacion?.lng ?? null,
        ...(foto_casa_url && { foto_casa_url }),
        ...(foto_cliente_url && { foto_cliente_url }),
        ...(!id && { registrado_por: perfil?.id })
      };

      if (id) {
        const { error: updateError } = await supabase.from('clientes').update(payload).eq('id', id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('clientes').insert(payload);
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      navigate('/clientes');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => navigate('/clientes')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </button>

      <h1 className="font-display text-lg font-bold text-slate-50">{id ? 'Editar cliente' : 'Nuevo cliente'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" {...register('nombre', { required: true })} />
          </div>
          <div>
            <label className="label">Cédula</label>
            <input className="input" {...register('cedula')} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Celular</label>
            <input className="input" {...register('celular')} />
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

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Barrio</label>
            <input className="input" {...register('barrio')} />
          </div>
          <div>
            <label className="label">Municipio</label>
            <input className="input" {...register('municipio')} />
          </div>
        </div>

        <div>
          <label className="label">Referencia (punto conocido cercano)</label>
          <input className="input" {...register('referencia')} />
        </div>

        <div>
          <label className="label">Ubicación GPS</label>
          <button type="button" onClick={capturarGps} className="btn-secondary w-full sm:w-auto">
            {obteniendoGps ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            {ubicacion ? 'Actualizar ubicación' : 'Capturar ubicación actual'}
          </button>
          {ubicacion && (
            <p className="text-xs text-slate-500 mt-1.5">
              Lat: {ubicacion.lat.toFixed(6)}, Lng: {ubicacion.lng.toFixed(6)}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Foto de la casa</label>
            <input type="file" accept="image/*" capture="environment" className="input" onChange={(e) => setFotoCasa(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <label className="label">Foto del cliente (opcional)</label>
            <input type="file" accept="image/*" capture="user" className="input" onChange={(e) => setFotoCliente(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div>
          <label className="label">Observaciones</label>
          <textarea className="input" rows={3} {...register('observaciones')} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => navigate('/clientes')} className="btn-secondary flex-1">Cancelar</button>
          <button type="submit" disabled={guardando} className="btn-primary flex-1">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Guardar cliente
          </button>
        </div>
      </form>
    </div>
  );
}
