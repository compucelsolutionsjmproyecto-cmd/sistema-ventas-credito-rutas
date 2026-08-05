// Tipos de la base de datos. Si tienes la Supabase CLI instalada, puedes
// regenerarlos automáticamente con:
//   supabase gen types typescript --project-id TU-PROYECTO > src/types/database.types.ts

export type UserRole = 'administrador' | 'supervisor' | 'vendedor';
export type EstadoGeneral = 'activo' | 'inactivo';
export type ModalidadPago = 'diario' | 'semanal' | 'quincenal' | 'mensual';
export type EstadoVenta = 'vigente' | 'pagada' | 'mora' | 'anulada';
export type EstadoCuota = 'pendiente' | 'pagada' | 'vencida' | 'parcial';
export type MetodoPago = 'efectivo' | 'transferencia' | 'otro';
export type TipoNotificacion =
  | 'pago_vencido'
  | 'producto_agotado'
  | 'stock_bajo'
  | 'cobro_pendiente';

export interface Perfil {
  id: string;
  rol: UserRole;
  nombre_completo: string;
  cedula: string | null;
  celular: string | null;
  direccion: string | null;
  foto_url: string | null;
  estado: EstadoGeneral;
  ruta_id: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Ruta {
  id: string;
  nombre: string;
  descripcion: string | null;
  vendedor_id: string | null;
  municipios: string[];
  barrios: string[];
  estado: EstadoGeneral;
  creado_por: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  creado_en: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  foto_url: string | null;
  marca: string | null;
  categoria_id: string | null;
  precio_compra: number;
  precio_venta: number;
  ganancia: number;
  cantidad: number;
  stock_minimo: number;
  fecha_vencimiento: string | null;
  estado: EstadoGeneral;
  creado_en: string;
  actualizado_en: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  cedula: string | null;
  celular: string | null;
  direccion: string | null;
  barrio: string | null;
  municipio: string | null;
  referencia: string | null;
  foto_casa_url: string | null;
  foto_cliente_url: string | null;
  ubicacion_lat: number | null;
  ubicacion_lng: number | null;
  observaciones: string | null;
  ruta_id: string | null;
  registrado_por: string | null;
  estado: EstadoGeneral;
  creado_en: string;
  actualizado_en: string;
}

export interface Venta {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  ruta_id: string | null;
  subtotal: number;
  descuento: number;
  total: number;
  modalidad: ModalidadPago;
  numero_cuotas: number;
  valor_cuota: number;
  fecha_primera_cuota: string;
  estado: EstadoVenta;
  creado_en: string;
  actualizado_en: string;
}

export interface VentaDetalle {
  id: string;
  venta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
}

export interface Cuota {
  id: string;
  venta_id: string;
  numero: number;
  valor: number;
  saldo: number;
  fecha_vencimiento: string;
  estado: EstadoCuota;
  creado_en: string;
}

export interface Cobro {
  id: string;
  cuota_id: string;
  venta_id: string;
  cliente_id: string;
  vendedor_id: string;
  fecha: string;
  hora: string;
  valor: number;
  metodo: MetodoPago;
  observacion: string | null;
  firma_digital_url: string | null;
  foto_comprobante_url: string | null;
  ubicacion_lat: number | null;
  ubicacion_lng: number | null;
  creado_en: string;
}

export interface Jornada {
  id: string;
  vendedor_id: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  gps_inicio_lat: number | null;
  gps_inicio_lng: number | null;
  gps_fin_lat: number | null;
  gps_fin_lng: number | null;
  clientes_visitados: number;
  ventas_realizadas: number;
  total_cobrado: number;
  creado_en: string;
}

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  destinatario_id: string | null;
  entidad_tipo: string | null;
  entidad_id: string | null;
  leida: boolean;
  creado_en: string;
}

export interface InventarioVendedor {
  vendedor_id: string;
  producto_id: string;
  cantidad: number;
  actualizado_en: string;
}

export interface Auditoria {
  id: string;
  usuario_id: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: string | null;
  detalle: Record<string, unknown> | null;
  ip: string | null;
  creado_en: string;
}

// Estructura mínima compatible con el genérico Database de @supabase/supabase-js.
// Para autocompletado completo de .from('tabla'), se recomienda generar este
// archivo con la Supabase CLI como se indica arriba.
export interface Database {
  public: {
    Tables: {
      perfiles: { Row: Perfil; Insert: Partial<Perfil>; Update: Partial<Perfil> };
      rutas: { Row: Ruta; Insert: Partial<Ruta>; Update: Partial<Ruta> };
      categorias: { Row: Categoria; Insert: Partial<Categoria>; Update: Partial<Categoria> };
      productos: { Row: Producto; Insert: Partial<Producto>; Update: Partial<Producto> };
      clientes: { Row: Cliente; Insert: Partial<Cliente>; Update: Partial<Cliente> };
      ventas: { Row: Venta; Insert: Partial<Venta>; Update: Partial<Venta> };
      ventas_detalle: { Row: VentaDetalle; Insert: Partial<VentaDetalle>; Update: Partial<VentaDetalle> };
      cuotas: { Row: Cuota; Insert: Partial<Cuota>; Update: Partial<Cuota> };
      cobros: { Row: Cobro; Insert: Partial<Cobro>; Update: Partial<Cobro> };
      jornadas: { Row: Jornada; Insert: Partial<Jornada>; Update: Partial<Jornada> };
      notificaciones: { Row: Notificacion; Insert: Partial<Notificacion>; Update: Partial<Notificacion> };
      inventario_vendedor: { Row: InventarioVendedor; Insert: Partial<InventarioVendedor>; Update: Partial<InventarioVendedor> };
      auditoria: { Row: Auditoria; Insert: Partial<Auditoria>; Update: Partial<Auditoria> };
    };
  };
}
