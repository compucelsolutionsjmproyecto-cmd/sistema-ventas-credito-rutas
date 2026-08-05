import type { UserRole } from '@/types/database.types';
import {
  LayoutDashboard,
  Route,
  Users,
  Package,
  ClipboardList,
  UserCircle,
  ShoppingCart,
  Wallet,
  BarChart3,
  Bell,
  ShieldCheck,
  MapPinned
} from 'lucide-react';

export interface ItemNavegacion {
  etiqueta: string;
  ruta: string;
  icono: typeof LayoutDashboard;
  roles: UserRole[];
}

export const itemsNavegacion: ItemNavegacion[] = [
  { etiqueta: 'Panel general', ruta: '/', icono: LayoutDashboard, roles: ['administrador', 'supervisor', 'vendedor'] },
  { etiqueta: 'Rutas', ruta: '/rutas', icono: Route, roles: ['administrador', 'supervisor'] },
  { etiqueta: 'Vendedores', ruta: '/vendedores', icono: UserCircle, roles: ['administrador', 'supervisor'] },
  { etiqueta: 'Inventario', ruta: '/inventario', icono: Package, roles: ['administrador', 'supervisor'] },
  { etiqueta: 'Asignaciones', ruta: '/asignaciones', icono: ClipboardList, roles: ['administrador', 'supervisor'] },
  { etiqueta: 'Clientes', ruta: '/clientes', icono: Users, roles: ['administrador', 'supervisor', 'vendedor'] },
  { etiqueta: 'Ventas', ruta: '/ventas', icono: ShoppingCart, roles: ['administrador', 'supervisor', 'vendedor'] },
  { etiqueta: 'Cobros', ruta: '/cobros', icono: Wallet, roles: ['administrador', 'supervisor', 'vendedor'] },
  { etiqueta: 'Mi jornada', ruta: '/jornada', icono: MapPinned, roles: ['vendedor'] },
  { etiqueta: 'Reportes', ruta: '/reportes', icono: BarChart3, roles: ['administrador', 'supervisor'] },
  { etiqueta: 'Notificaciones', ruta: '/notificaciones', icono: Bell, roles: ['administrador', 'supervisor', 'vendedor'] },
  { etiqueta: 'Auditoría', ruta: '/auditoria', icono: ShieldCheck, roles: ['administrador'] }
];
