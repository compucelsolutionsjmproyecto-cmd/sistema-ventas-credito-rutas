import { Link } from 'react-router-dom';

export default function NoEncontradoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface text-center px-4">
      <p className="font-display text-5xl font-bold text-slate-100">404</p>
      <p className="text-slate-400 mt-2">La página que buscas no existe.</p>
      <Link to="/" className="btn-primary mt-6">Volver al inicio</Link>
    </div>
  );
}
