import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  titulo: string;
  valor: string;
  icono: LucideIcon;
  tendencia?: { valor: string; positiva: boolean };
  colorIcono?: string;
}

export default function TarjetaEstadistica({ titulo, valor, icono: Icono, tendencia, colorIcono }: Props) {
  return (
    <div className="card p-4 lg:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{titulo}</p>
          <p className="font-display text-2xl font-bold text-slate-50 mt-1.5">{valor}</p>
        </div>
        <div
          className={clsx(
            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
            colorIcono ?? 'bg-accent-500/15 text-accent-400'
          )}
        >
          <Icono className="h-4.5 w-4.5" />
        </div>
      </div>
      {tendencia && (
        <p className={clsx('text-xs mt-2 font-medium', tendencia.positiva ? 'text-emerald-400' : 'text-red-400')}>
          {tendencia.positiva ? '▲' : '▼'} {tendencia.valor}
        </p>
      )}
    </div>
  );
}
