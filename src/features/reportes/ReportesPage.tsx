import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { formatoMoneda, formatoFecha } from '@/utils/formato';

type TipoReporte = 'ventas' | 'cobros' | 'morosos' | 'inventario' | 'rendimiento_vendedor';

const opciones: { valor: TipoReporte; etiqueta: string }[] = [
  { valor: 'ventas', etiqueta: 'Ventas' },
  { valor: 'cobros', etiqueta: 'Cobros' },
  { valor: 'morosos', etiqueta: 'Clientes morosos' },
  { valor: 'inventario', etiqueta: 'Inventario' },
  { valor: 'rendimiento_vendedor', etiqueta: 'Rendimiento por vendedor' }
];

async function obtenerFilas(tipo: TipoReporte) {
  switch (tipo) {
    case 'ventas': {
      const { data } = await supabase.from('ventas').select('creado_en, total, modalidad, estado, cliente:clientes(nombre)').order('creado_en', { ascending: false }).limit(500);
      return (data ?? []).map((v: any) => ({
        Fecha: formatoFecha(v.creado_en),
        Cliente: v.cliente?.nombre ?? '',
        Total: v.total,
        Modalidad: v.modalidad,
        Estado: v.estado
      }));
    }
    case 'cobros': {
      const { data } = await supabase.from('cobros').select('fecha, valor, metodo, cliente:clientes(nombre)').order('fecha', { ascending: false }).limit(500);
      return (data ?? []).map((c: any) => ({
        Fecha: formatoFecha(c.fecha),
        Cliente: c.cliente?.nombre ?? '',
        Valor: c.valor,
        Método: c.metodo
      }));
    }
    case 'morosos': {
      const { data } = await supabase.from('ventas').select('total, cliente:clientes(nombre, celular, barrio)').eq('estado', 'mora').limit(500);
      return (data ?? []).map((v: any) => ({
        Cliente: v.cliente?.nombre ?? '',
        Celular: v.cliente?.celular ?? '',
        Barrio: v.cliente?.barrio ?? '',
        'Total adeudado': v.total
      }));
    }
    case 'inventario': {
      const { data } = await supabase.from('productos').select('codigo, nombre, cantidad, stock_minimo, precio_venta').order('nombre');
      return (data ?? []).map((p: any) => ({
        Código: p.codigo,
        Producto: p.nombre,
        Cantidad: p.cantidad,
        'Stock mínimo': p.stock_minimo,
        'Precio venta': p.precio_venta
      }));
    }
    case 'rendimiento_vendedor': {
      const { data } = await supabase.from('cobros').select('valor, vendedor:perfiles(nombre_completo)').limit(1000);
      const agrupado = new Map<string, number>();
      (data ?? []).forEach((c: any) => {
        const nombre = c.vendedor?.nombre_completo ?? 'Sin nombre';
        agrupado.set(nombre, (agrupado.get(nombre) ?? 0) + Number(c.valor));
      });
      return Array.from(agrupado.entries()).map(([Vendedor, Total]) => ({ Vendedor, 'Total cobrado': Total }));
    }
  }
}

export default function ReportesPage() {
  const [tipo, setTipo] = useState<TipoReporte>('ventas');
  const [generando, setGenerando] = useState<'pdf' | 'excel' | null>(null);

  const { data: previa, isLoading } = useQuery({
    queryKey: ['reporte-previa', tipo],
    queryFn: () => obtenerFilas(tipo)
  });

  async function exportarPDF() {
    setGenerando('pdf');
    const filas = await obtenerFilas(tipo);
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Reporte: ${opciones.find((o) => o.valor === tipo)?.etiqueta}`, 14, 16);
    doc.setFontSize(9);
    doc.text(`Generado el ${new Date().toLocaleString('es-CO')}`, 14, 22);

    if (filas.length > 0) {
      autoTable(doc, {
        startY: 28,
        head: [Object.keys(filas[0])],
        body: filas.map((f) => Object.values(f).map((v) => (typeof v === 'number' ? formatoMoneda(v) : String(v)))),
        styles: { fontSize: 8 }
      });
    }
    doc.save(`reporte-${tipo}.pdf`);
    setGenerando(null);
  }

  async function exportarExcel() {
    setGenerando('excel');
    const filas = await obtenerFilas(tipo);
    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Reporte');
    XLSX.writeFile(libro, `reporte-${tipo}.xlsx`);
    setGenerando(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-lg font-bold text-slate-50">Reportes</h1>
        <p className="text-sm text-slate-400">Genera reportes y expórtalos a PDF o Excel.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {opciones.map((o) => (
          <button
            key={o.valor}
            onClick={() => setTipo(o.valor)}
            className={`btn ${tipo === o.valor ? 'bg-accent-500 text-white' : 'bg-surface-card border border-surface-border text-slate-300'}`}
          >
            {o.etiqueta}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={exportarPDF} disabled={generando !== null} className="btn-secondary">
          {generando === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Exportar PDF
        </button>
        <button onClick={exportarExcel} disabled={generando !== null} className="btn-secondary">
          {generando === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Exportar Excel
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-accent-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-surface-border">
                  {previa && previa[0] && Object.keys(previa[0]).map((k) => <th key={k} className="px-4 py-3 font-medium">{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {previa?.slice(0, 20).map((fila, i) => (
                  <tr key={i} className="border-b border-surface-border last:border-0">
                    {Object.values(fila).map((v, j) => (
                      <td key={j} className="px-4 py-2.5 text-slate-300">
                        {typeof v === 'number' ? formatoMoneda(v) : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
                {previa?.length === 0 && (
                  <tr><td className="px-4 py-8 text-center text-slate-500">Sin datos para este reporte.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
