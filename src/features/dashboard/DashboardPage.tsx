import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  DollarSign,
  Wallet,
  TrendingUp,
  Users,
  AlertTriangle,
  Package,
  Route as RouteIcon,
  UserCircle,
  Loader2
} from 'lucide-react';
import TarjetaEstadistica from '@/components/ui/TarjetaEstadistica';
import { useDashboardData } from './useDashboardData';
import { useAuthStore } from '@/store/authStore';
import { formatoMoneda, formatoFechaHora } from '@/utils/formato';

export default function DashboardPage() {
  const { data, isLoading } = useDashboardData();
  const perfil = useAuthStore((s) => s.perfil);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-slate-50">
          Hola, {perfil?.nombre_completo?.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Este es el resumen general del sistema hoy.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <TarjetaEstadistica titulo="Ventas del día" valor={formatoMoneda(data.ventasHoy)} icono={DollarSign} />
        <TarjetaEstadistica titulo="Cobros del día" valor={formatoMoneda(data.cobrosHoy)} icono={Wallet} colorIcono="bg-emerald-500/15 text-emerald-400" />
        <TarjetaEstadistica titulo="Ingresos de la semana" valor={formatoMoneda(data.gananciaSemana)} icono={TrendingUp} colorIcono="bg-brand-400/15 text-brand-300" />
        <TarjetaEstadistica titulo="Ingresos del mes" valor={formatoMoneda(data.gananciaMes)} icono={TrendingUp} colorIcono="bg-brand-400/15 text-brand-300" />

        <TarjetaEstadistica titulo="Clientes registrados" valor={String(data.clientesRegistrados)} icono={Users} />
        <TarjetaEstadistica
          titulo="Clientes morosos"
          valor={String(data.clientesMorosos)}
          icono={AlertTriangle}
          colorIcono="bg-red-500/15 text-red-400"
        />
        <TarjetaEstadistica titulo="Productos disponibles" valor={String(data.productosDisponibles)} icono={Package} />
        <TarjetaEstadistica titulo="Cuotas vencidas" valor={String(data.cuotasVencidas)} icono={AlertTriangle} colorIcono="bg-accent-500/15 text-accent-400" />

        <TarjetaEstadistica titulo="Rutas activas" valor={String(data.rutasActivas)} icono={RouteIcon} />
        <TarjetaEstadistica titulo="Vendedores activos" valor={String(data.vendedoresActivos)} icono={UserCircle} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:p-5 lg:col-span-2">
          <p className="text-sm font-semibold text-slate-200 mb-4">Ventas vs. cobros — últimos 7 días</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.serieDias}>
              <defs>
                <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97e0a" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f97e0a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cobrosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2557f5" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#2557f5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="dia" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: '#111A2E', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }}
                formatter={(valor: number) => formatoMoneda(valor)}
              />
              <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#f97e0a" fill="url(#ventasGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="cobros" name="Cobros" stroke="#2557f5" fill="url(#cobrosGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4 lg:p-5">
          <p className="text-sm font-semibold text-slate-200 mb-4">Últimos cobros registrados</p>
          <div className="space-y-3">
            {data.ultimosCobros.length === 0 && (
              <p className="text-sm text-slate-500">Aún no hay cobros registrados.</p>
            )}
            {data.ultimosCobros.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="text-slate-200 truncate">{c.clientes?.nombre ?? 'Cliente'}</p>
                  <p className="text-xs text-slate-500">{formatoFechaHora(c.creado_en)}</p>
                </div>
                <p className="font-semibold text-emerald-400 shrink-0 ml-2">{formatoMoneda(Number(c.valor))}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
