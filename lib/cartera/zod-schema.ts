// lib/cartera/zod-schema.ts — Zod validation for cartera upload rows
import { z } from "zod";
import { sanitizeCell, parseDate, validateNumber } from "./sanitize";

const SECTORES = ["Agro", "Comercio", "Industria", "Servicios", "Inmobiliario", "Transporte", "Otro"] as const;
const TIPOS_CREDITO = ["Term Loan", "Revolvente", "Arrend. Puro", "Arrend. Fin."] as const;
const PERIODICIDADES = ["Mensual", "Bimestral", "Trimestral", "Semestral", "Anual", "Bullet"] as const;

// PD/LGD defaults by sector
export const PD_LGD_DEFAULTS: Record<string, { pd: number; lgd: number }> = {
  Agro:         { pd: 0.06, lgd: 0.50 },
  Comercio:     { pd: 0.05, lgd: 0.45 },
  Industria:    { pd: 0.04, lgd: 0.40 },
  Servicios:    { pd: 0.05, lgd: 0.50 },
  Inmobiliario: { pd: 0.03, lgd: 0.30 },
  Transporte:   { pd: 0.06, lgd: 0.45 },
  Otro:         { pd: 0.07, lgd: 0.55 },
};

export type CreditoRow = z.infer<typeof CreditoRowSchema>;

export type ValidationError = {
  row: number;  // 1-indexed Excel row (header=1, first data=2)
  field: string;
  message: string;
};

// Helper to get today's date as YYYY-MM-DD
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const CreditoRowSchema = z.object({
  folio_credito:       z.string().min(1, "Folio es obligatorio"),
  deudor:              z.string().min(1, "Deudor es obligatorio"),
  sector:              z.enum(SECTORES, { errorMap: () => ({ message: `Sector debe ser: ${SECTORES.join(", ")}` }) }),
  tipo_credito:        z.enum(TIPOS_CREDITO, { errorMap: () => ({ message: `Tipo debe ser: ${TIPOS_CREDITO.join(", ")}` }) }),
  monto_original_mxn:  z.number().positive("Monto original debe ser > 0"),
  saldo_insoluto_mxn:  z.number().min(0, "Saldo insoluto debe ser >= 0"),
  tasa_nominal_anual:  z.number().min(0, "Tasa debe ser >= 0").max(2, "Tasa debe ser <= 2 (200%)"),
  fecha_originacion:   z.string().nullable(),
  fecha_vencimiento:   z.string().min(1, "Fecha de vencimiento es obligatoria"),
  plazo_meses_original: z.number().int().positive("Plazo debe ser > 0").nullable(),
  periodicidad_pago:   z.enum(PERIODICIDADES, { errorMap: () => ({ message: `Periodicidad debe ser: ${PERIODICIDADES.join(", ")}` }) }),
  dpd:                 z.number().int().min(0, "DPD debe ser >= 0"),
  pd:                  z.number().min(0).max(1).nullable(),
  lgd:                 z.number().min(0).max(1).nullable(),
  garantia_tipo:       z.string().nullable(),
  garantia_valor_mxn:  z.number().min(0).nullable(),
}).refine(
  (row) => row.fecha_originacion !== null || row.plazo_meses_original !== null,
  { message: "Se requiere fecha_originacion o plazo_meses_original", path: ["fecha_originacion"] }
).refine(
  (row) => row.fecha_vencimiento >= today(),
  { message: "Fecha de vencimiento debe ser >= hoy (crédito vigente)", path: ["fecha_vencimiento"] }
).refine(
  (row) => {
    if (row.fecha_originacion && row.fecha_vencimiento) {
      return row.fecha_vencimiento > row.fecha_originacion;
    }
    return true;
  },
  { message: "Fecha de vencimiento debe ser posterior a fecha de originación", path: ["fecha_vencimiento"] }
);

/**
 * Parse a raw row from SheetJS into the shape expected by CreditoRowSchema.
 * Columns are 0-indexed matching the Excel template: A=0, B=1, ..., P=15
 */
export function parseRawRow(raw: unknown[]): Record<string, unknown> {
  return {
    folio_credito:       sanitizeCell(raw[0]),
    deudor:              sanitizeCell(raw[1]),
    sector:              sanitizeCell(raw[2]),
    tipo_credito:        sanitizeCell(raw[3]),
    monto_original_mxn:  validateNumber(raw[4], 0, 1e12),
    saldo_insoluto_mxn:  validateNumber(raw[5], 0, 1e12),
    tasa_nominal_anual:  validateNumber(raw[6], 0, 2),
    fecha_originacion:   parseDate(raw[7]),
    fecha_vencimiento:   parseDate(raw[8]) ?? "",
    plazo_meses_original: validateNumber(raw[9], 1, 1200) ? Math.round(Number(raw[9])) : null,
    periodicidad_pago:   sanitizeCell(raw[10]),
    dpd:                 validateNumber(raw[11], 0, 99999) ?? 0,
    pd:                  validateNumber(raw[12], 0, 1),
    lgd:                 validateNumber(raw[13], 0, 1),
    garantia_tipo:       sanitizeCell(raw[14]) || null,
    garantia_valor_mxn:  validateNumber(raw[15], 0, 1e12),
  };
}

/**
 * Validate an array of parsed rows. Returns valid rows + all errors.
 */
export function validateRows(rows: Record<string, unknown>[]): {
  valid: CreditoRow[];
  errors: ValidationError[];
} {
  const valid: CreditoRow[] = [];
  const errors: ValidationError[] = [];
  const MAX_ERRORS = 100;

  for (let i = 0; i < rows.length; i++) {
    const excelRow = i + 2; // 1-indexed, header is row 1, data starts row 2
    const result = CreditoRowSchema.safeParse(rows[i]);

    if (result.success) {
      valid.push(result.data);
    } else {
      for (const issue of result.error.issues) {
        if (errors.length >= MAX_ERRORS) break;
        errors.push({
          row: excelRow,
          field: issue.path.join(".") || "general",
          message: issue.message,
        });
      }
    }
    if (errors.length >= MAX_ERRORS) break;
  }

  return { valid, errors };
}

/**
 * Apply PD/LGD defaults by sector for rows where pd/lgd are null.
 * Returns the row with pd_lgd_source flag.
 */
export function applyDefaults(row: CreditoRow): CreditoRow & { pd_lgd_source: "provided" | "estimated"; originacion_inferred: boolean } {
  let pd = row.pd;
  let lgd = row.lgd;
  let pdLgdSource: "provided" | "estimated" = "provided";

  if (pd === null || lgd === null) {
    const defaults = PD_LGD_DEFAULTS[row.sector] ?? PD_LGD_DEFAULTS.Otro;
    pd = pd ?? defaults.pd;
    lgd = lgd ?? defaults.lgd;
    pdLgdSource = "estimated";
  }

  // Infer fecha_originacion if missing
  let fechaOrig = row.fecha_originacion;
  let origInferred = false;
  if (!fechaOrig && row.plazo_meses_original) {
    const venc = new Date(row.fecha_vencimiento + "T12:00:00Z");
    venc.setMonth(venc.getMonth() - row.plazo_meses_original);
    fechaOrig = venc.toISOString().slice(0, 10);
    origInferred = true;
  }

  return {
    ...row,
    pd,
    lgd,
    fecha_originacion: fechaOrig,
    pd_lgd_source: pdLgdSource,
    originacion_inferred: origInferred,
  };
}
