// ============================================================
// Types para el módulo Cartera de gestión (créditos vivos)
// No confundir con Calculadora (cartera_valuaciones)
// ============================================================

export type CreditoEstatus =
  | "vigente"
  | "mora_30"
  | "mora_60"
  | "mora_90"
  | "liquidado"
  | "castigado";

export const ESTATUS_VALUES: CreditoEstatus[] = [
  "vigente", "mora_30", "mora_60", "mora_90", "liquidado", "castigado",
];

export type CreditoAmortiza = "SI" | "BULLET" | "NO";
export const AMORTIZA_VALUES: CreditoAmortiza[] = ["SI", "BULLET", "NO"];

export type CreditoTipo =
  | "Crédito simple"
  | "Crédito revolvente"
  | "Arrendamiento puro"
  | "Arrendamiento financiero";
export const TIPO_CREDITO_VALUES: CreditoTipo[] = [
  "Crédito simple", "Crédito revolvente", "Arrendamiento puro", "Arrendamiento financiero",
];

export type CreditoFuente = "manual" | "excel" | "solicitud" | "api";

// Row directo de la tabla credits
export interface Credito {
  id: string;
  folio: string | null;
  created_by: string;
  client_id: string | null;
  solicitud_id: string | null;
  deudor: string;
  rfc: string | null;
  tipo_credito: CreditoTipo;
  amortiza: CreditoAmortiza | null;
  monto_original: number;
  saldo_actual: number;
  tasa_anual: number | null;
  plazo_meses: number | null;
  garantia: string | null;
  fecha_inicio: string | null;   // YYYY-MM-DD
  fecha_vencimiento: string | null;
  ultimo_pago: string | null;
  dpd: number | null;
  estatus: CreditoEstatus;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // Columnas nuevas (Step 1)
  fuente: CreditoFuente | null;
  sector: string | null;
  npv_mxn: number | null;
  expected_loss_mxn: number | null;
  ytm: number | null;
  duration_modified: number | null;
  last_valuation_at: string | null;
  last_valuation_id: string | null;
}

// Input para crear un crédito (sin campos auto-generados)
export interface CreditoInput {
  client_id?: string | null;
  solicitud_id?: string | null;
  deudor: string;
  rfc?: string | null;
  tipo_credito: CreditoTipo;
  amortiza?: CreditoAmortiza;
  monto_original: number;
  saldo_actual: number;
  tasa_anual?: number | null;
  plazo_meses?: number | null;
  garantia?: string | null;
  fecha_inicio?: string | null;
  fecha_vencimiento?: string | null;
  ultimo_pago?: string | null;
  dpd?: number;
  estatus?: CreditoEstatus;
  notas?: string | null;
  sector?: string | null;
}

// Input parcial para edición
export type CreditoUpdate = Partial<CreditoInput>;

// KPIs hero
export interface CarteraKPIs {
  // Totales
  total_creditos: number;
  creditos_vigentes: number;
  cartera_viva_mxn: number;
  mora_30_plus_mxn: number;
  mora_30_plus_count: number;

  // Promedios
  ticket_promedio_mxn: number | null;
  yield_promedio_ponderado: number | null;
  plazo_promedio_meses: number | null;

  // Distribución por estatus
  distribucion_estatus: Record<CreditoEstatus, { count: number; saldo_mxn: number }>;

  // Distribución por tipo
  distribucion_tipo: Record<string, { count: number; saldo_mxn: number }>;
}
