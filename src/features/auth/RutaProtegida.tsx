import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSesion } from './useSesion';
import type { UserRole } from '@/types/database.types';

interface Props {
  rolesPermitidos?: UserRole[];
}

export default function RutaProtegida({ rolesPermitidos }: Props) {
  const { perfil, cargando } = useSesion();

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
      </div>
    );
  }

  if (!perfil) {
    return <Navigate to="/ingresar" replace />;
  }

  if (perfil.estado === 'inactivo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="card p-6 max-w-sm text-center">
          <p className="text-slate-200 font-medium">Tu usuario está inactivo.</p>
          <p className="text-sm text-slate-400 mt-1">Contacta a tu administrador para más información.</p>
        </div>
      </div>
    );
  }

  if (rolesPermitidos && !rolesPermitidos.includes(perfil.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
