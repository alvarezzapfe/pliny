// lib/cartera/types.ts — Shared types for cartera valuation

export type ValuacionFull = {
  id: string;
  user_id: string;
  created_at: string;
  nombre: string | null;
  status: string;
  discount_rate: number;
  n_creditos: number;
  n_creditos_calculados: number | null;
  npv_total_mxn: number | null;
  saldo_total_mxn: number | null;
  el_total_mxn: number | null;
  yield_ponderado: number | null;
  duration_ponderada: number | null;
  wal_ponderado: number | null;
  stress_grid: StressGridRow[] | null;
  concentracion: ConcentracionData | null;
};

export type StressGridRow = {
  discount_rate: number;
  pd_scenarios: { pd_multiplier: number; npv: number }[];
};

export type ConcentracionData = {
  top_10_deudores?: { deudor: string; saldo: number; pct: number }[];
  hhi_sector?: number;
  sector_distribution?: Record<string, number>;
  dpd_buckets?: Record<string, number>;
};
