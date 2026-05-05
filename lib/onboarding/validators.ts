// lib/onboarding/validators.ts — Validaciones y sanitización para onboarding white-label

export const PATTERNS = {
  rfc_pm: /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i,
  rfc_pf: /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/i,
  cp_mx: /^\d{5}$/,
  phone_mx: /^\d{10}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  text_safe: /^[\p{L}\p{N}\s.,\-&'()/]+$/u,
};

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, 500).replace(/[<>]/g, "");
}

export function sanitizePayload(data: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "string") clean[k] = sanitizeText(v);
    else if (typeof v === "number") clean[k] = v;
    else if (v === null || v === undefined) clean[k] = null;
    else clean[k] = v;
  }
  return clean;
}

type FieldSchema = {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  pattern?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  options?: unknown[];
};

export function validateField(
  field: FieldSchema,
  value: unknown,
): { ok: boolean; error?: string } {
  const str = typeof value === "string" ? value.trim() : "";
  const num = typeof value === "number" ? value : null;

  // Required check
  if (field.required) {
    if (value === null || value === undefined || str === "") {
      return { ok: false, error: `${field.label} es obligatorio` };
    }
  }

  // If not required and empty, skip further validation
  if (!value && !field.required) return { ok: true };

  // Pattern checks
  if (field.pattern && typeof value === "string") {
    const pat = PATTERNS[field.pattern as keyof typeof PATTERNS];
    if (pat && !pat.test(str)) {
      return { ok: false, error: `${field.label} tiene formato inválido` };
    }
  }

  // Type-specific
  if (field.type === "email" && str && !PATTERNS.email.test(str)) {
    return { ok: false, error: "Email inválido" };
  }
  if (field.type === "phone_mx" && str && !PATTERNS.phone_mx.test(str.replace(/\D/g, ""))) {
    return { ok: false, error: "Teléfono debe tener 10 dígitos" };
  }

  // Numeric range
  if ((field.type === "number" || field.type === "currency") && num !== null) {
    if (field.min !== undefined && num < field.min) {
      return { ok: false, error: `${field.label} debe ser al menos ${field.min}` };
    }
    if (field.max !== undefined && num > field.max) {
      return { ok: false, error: `${field.label} no puede exceder ${field.max}` };
    }
  }

  // MaxLength
  if (field.maxLength && str.length > field.maxLength) {
    return { ok: false, error: `${field.label} excede el máximo de ${field.maxLength} caracteres` };
  }

  return { ok: true };
}

// Evaluate approval rules against applicant data
export type ApprovalRule = {
  id: string;
  field: string;
  operator: ">=" | "<=" | ">" | "<" | "==" | "!=" | "in";
  value: unknown;
  message: string;
};

export function evaluateRules(
  rules: ApprovalRule[],
  data: Record<string, unknown>,
): { passed: boolean; failed: { field: string; message: string }[] } {
  const failed: { field: string; message: string }[] = [];

  for (const rule of rules) {
    let fieldVal = data[rule.field];

    // Special case: ventas_rango → use the min value of the range
    if (rule.field === "ventas_anuales" && data.ventas_rango_min != null) {
      fieldVal = data.ventas_rango_min;
    }

    const numVal = typeof fieldVal === "number" ? fieldVal : Number(fieldVal);
    const ruleVal = typeof rule.value === "number" ? rule.value : Number(rule.value);
    let pass = false;

    switch (rule.operator) {
      case ">=": pass = numVal >= ruleVal; break;
      case "<=": pass = numVal <= ruleVal; break;
      case ">": pass = numVal > ruleVal; break;
      case "<": pass = numVal < ruleVal; break;
      case "==": pass = String(fieldVal) === String(rule.value); break;
      case "!=": pass = String(fieldVal) !== String(rule.value); break;
      case "in":
        if (Array.isArray(rule.value)) pass = rule.value.includes(fieldVal);
        break;
    }

    if (!pass) failed.push({ field: rule.field, message: rule.message });
  }

  return { passed: failed.length === 0, failed };
}
