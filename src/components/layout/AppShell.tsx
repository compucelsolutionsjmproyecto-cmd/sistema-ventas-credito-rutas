import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X, LogOut, Route as RouteIcon } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { itemsNavegacion } from './navegacion';
import CampanaNotificaciones from './CampanaNotificaciones';

export default function AppShell() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const perfil = useAuthStore((s) => s.perfil);

  const items = itemsNavegacion.filter((item) => perfil && item.roles.includes(perfil.rol));

  async function cerrarSesion() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Overlay móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-surface-card border-r border-surface-border flex flex-col transition-transform duration-200 lg:translate-x-0',
          menuAbierto ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-surface-border">
          <div className="h-8 w-8 rounded-lg bg-accent-500 flex items-center justify-center shrink-0">
            <RouteIcon className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-display font-bold text-sm text-slate-100 leading-tight">
            Ventas a Crédito<br /><span className="text-slate-400 font-medium">por Rutas</span>
          </span>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setMenuAbierto(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.ruta}
              to={item.ruta}
              end={item.ruta === '/'}
              onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent-500/15 text-accent-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )
              }
            >
              <item.icono className="h-4.5 w-4.5" />
              {item.etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-surface-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
              {perfil?.nombre_completo?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 truncate">{perfil?.nombre_completo}</p>
              <p className="text-xs text-slate-500 capitalize">{perfil?.rol}</p>
            </div>
            <button
              onClick={cerrarSesion}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-surface-border bg-surface-card/60 backdrop-blur flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <button className="lg:hidden text-slate-300" onClick={() => setMenuAbierto(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <CampanaNotificaciones />
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
