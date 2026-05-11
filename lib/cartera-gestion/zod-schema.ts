import { z } from "zod";
import {
  ESTATUS_VALUES,
  AMORTIZA_VALUES,
  TIPO_CREDITO_VALUES,
} from "./types";
import type { CreditoEstatus, CreditoAmortiza, CreditoTipo } from "./types";

// ── Schemas base ───────────────────────────────────────────────

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado: YYYY-MM-DD")
  .nullable()
  .optional();

const uuidStr = z
  .string()
  .uuid("UUID inválido")
  .nullable()
  .optional();

// ── CreditoInput: crear crédito ────────────────────────────────

export const CreditoInputSchema = z.object({
  client_id: uuidStr,
  solicitud_id: uuidStr,
  deudor: z
    .string()
    .min(1, "Deudor es requerido")
    .max(200, "Máximo 200 caracteres"),
  rfc: z
    .string()
    .max(13)
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, "RFC inválido")
    .nullable()
    .optional()
    .or(z.literal("")),
  tipo_credito: z.enum(TIPO_CREDITO_VALUES as [CreditoTipo, ...CreditoTipo[]]),
  amortiza: z
    .enum(AMORTIZA_VALUES as [CreditoAmortiza, ...CreditoAmortiza[]])
    .default("SI"),
  monto_original: z
    .number()
    .positive("Monto debe ser positivo")
    .max(1e12, "Monto excede el máximo"),
  saldo_actual: z
    .number()
    .min(0, "Saldo no puede ser negativo")
    .max(1e12, "Saldo excede el máximo"),
  tasa_anual: z
    .number()
    .min(0, "Tasa no puede ser negativa")
    .max(200, "Tasa excede 200%")
    .nullable()
    .optional(),
  plazo_meses: z
    .number()
    .int("Plazo debe ser entero")
    .min(1, "Plazo mínimo 1 mes")
    .max(600, "Plazo máximo 600 meses")
    .nullable()
    .optional(),
  garantia: z.string().max(500).nullable().optional(),
  fecha_inicio: dateStr,
  fecha_vencimiento: dateStr,
  ultimo_pago: dateStr,
  dpd: z
    .number()
    .int()
    .min(0, "DPD no puede ser negativo")
    .default(0),
  estatus: z
    .enum(ESTATUS_VALUES as [CreditoEstatus, ...CreditoEstatus[]])
    .default("vigente"),
  notas: z.string().max(2000).nullable().optional(),
  sector: z.string().max(100).nullable().optional(),
});

export type CreditoInputParsed = z.infer<typeof CreditoInputSchema>;

// ── CreditoUpdate: edición parcial ─────────────────────────────

export const CreditoUpdateSchema = CreditoInputSchema.partial();

export type CreditoUpdateParsed = z.infer<typeof CreditoUpdateSchema>;

// ── Helpers ────────────────────────────────────────────────────

/** Limpia RFC: uppercase, strip whitespace, empty → null */
export function normalizeRFC(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase();
  return cleaned === "" ? null : cleaned;
}

/** Limpia string numérico con comas: "1,500,000" → 1500000 */
export function parseMoneyString(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}
