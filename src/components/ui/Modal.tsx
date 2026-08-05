import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: string;
}

export default function Modal({ titulo, abierto, onCerrar, children, ancho = 'max-w-lg' }: Props) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onCerrar} />
      <div className={`relative w-full ${ancho} card p-5 max-h-[90vh] overflow-y-auto m-0 sm:m-4 rounded-b-none sm:rounded-b-xl`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-slate-100">{titulo}</h2>
          <button onClick={onCerrar} className="text-slate-500 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
