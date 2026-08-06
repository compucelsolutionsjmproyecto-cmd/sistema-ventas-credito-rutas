import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/database.types';

interface Props {
  roles: UserRole[];
}

export default function RequiereRol({ roles }: Props) {
  const perfil = useAuthStore((s) => s.perfil);

  if (!perfil || !roles.includes(perfil.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
