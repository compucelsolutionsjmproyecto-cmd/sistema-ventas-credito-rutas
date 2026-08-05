import { create } from 'zustand';
import type { Perfil } from '@/types/database.types';

interface AuthState {
  perfil: Perfil | null;
  cargando: boolean;
  setPerfil: (perfil: Perfil | null) => void;
  setCargando: (cargando: boolean) => void;
  cerrarSesionLocal: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  perfil: null,
  cargando: true,
  setPerfil: (perfil) => set({ perfil }),
  setCargando: (cargando) => set({ cargando }),
  cerrarSesionLocal: () => set({ perfil: null })
}));
