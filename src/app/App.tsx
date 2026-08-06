import { Routes, Route } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import RutaProtegida from '@/features/auth/RutaProtegida';
import RequiereRol from '@/features/auth/RequiereRol';
import LoginPage from '@/features/auth/LoginPage';

import DashboardPage from '@/features/dashboard/DashboardPage';
import RutasPage from '@/features/rutas/RutasPage';
import VendedoresPage from '@/features/vendedores/VendedoresPage';
import InventarioPage from '@/features/inventario/InventarioPage';
import AsignacionesPage from '@/features/asignaciones/AsignacionesPage';
import ClientesPage from '@/features/clientes/ClientesPage';
import ClienteFormPage from '@/features/clientes/ClienteFormPage';
import VentasPage from '@/features/ventas/VentasPage';
import VentaNuevaPage from '@/features/ventas/VentaNuevaPage';
import CobrosPage from '@/features/cobros/CobrosPage';
import JornadaPage from '@/features/seguimiento/JornadaPage';
import ReportesPage from '@/features/reportes/ReportesPage';
import NotificacionesPage from '@/features/notificaciones/NotificacionesPage';
import AuditoriaPage from '@/features/auditoria/AuditoriaPage';
import NoEncontradoPage from '@/features/common/NoEncontradoPage';

export default function App() {
  return (
    <Routes>
      <Route path="/ingresar" element={<LoginPage />} />

      <Route element={<RutaProtegida />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />

          <Route element={<RequiereRol roles={['administrador', 'supervisor']} />}>
            <Route path="/rutas" element={<RutasPage />} />
            <Route path="/vendedores" element={<VendedoresPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/asignaciones" element={<AsignacionesPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
          </Route>

          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/nuevo" element={<ClienteFormPage />} />
          <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />

          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/ventas/nueva" element={<VentaNuevaPage />} />

          <Route path="/cobros" element={<CobrosPage />} />

          <Route element={<RequiereRol roles={['vendedor']} />}>
            <Route path="/jornada" element={<JornadaPage />} />
          </Route>

          <Route path="/notificaciones" element={<NotificacionesPage />} />

          <Route element={<RequiereRol roles={['administrador']} />}>
            <Route path="/auditoria" element={<AuditoriaPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NoEncontradoPage />} />
    </Routes>
  );
}
