import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Route as RouteIcon, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const esquema = z.object({
  correo: z.string().email('Ingresa un correo válido'),
  contrasena: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

type FormValues = z.infer<typeof esquema>;

export default function LoginPage() {
  const [mostrarClave, setMostrarClave] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(esquema) });

  async function onSubmit(valores: FormValues) {
    setErrorGeneral(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: valores.correo,
      password: valores.contrasena
    });
    if (error) {
      setErrorGeneral(
        error.message === 'Invalid login credentials'
          ? 'Usuario o contraseña incorrectos.'
          : error.message
      );
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-accent-500 flex items-center justify-center mb-4 shadow-card">
            <RouteIcon className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-xl font-bold text-slate-50 text-center">
            Ventas a Crédito por Rutas
          </h1>
          <p className="text-sm text-slate-400 mt-1 text-center">
            Ingresa con tu usuario asignado
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="correo">Correo</label>
            <input
              id="correo"
              type="email"
              autoComplete="username"
              className="input"
              placeholder="tuusuario@empresa.com"
              {...register('correo')}
            />
            {errors.correo && (
              <p className="text-xs text-red-400 mt-1">{errors.correo.message}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="contrasena">Contraseña</label>
            <div className="relative">
              <input
                id="contrasena"
                type={mostrarClave ? 'text' : 'password'}
                autoComplete="current-password"
                className="input pr-10"
                placeholder="••••••••"
                {...register('contrasena')}
              />
              <button
                type="button"
                onClick={() => setMostrarClave((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {mostrarClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.contrasena && (
              <p className="text-xs text-red-400 mt-1">{errors.contrasena.message}</p>
            )}
          </div>

          {errorGeneral && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-300">
              {errorGeneral}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Iniciar sesión
          </button>
        </form>

        <p className="text-xs text-slate-500 text-center mt-6">
          ¿Olvidaste tu contraseña? Contacta a tu administrador.
        </p>
      </div>
    </div>
  );
}
