import { describe, it, expect } from "vitest";
import { CreditoInputSchema, CreditoUpdateSchema } from "@/lib/cartera-gestion/zod-schema";

describe("API contract — zod schemas matching endpoints", () => {
  it("input mínimo válido pasa CreditoInputSchema", () => {
    const result = CreditoInputSchema.safeParse({
      deudor: "ACME SA",
      tipo_credito: "Crédito simple",
      monto_original: 1500000,
      saldo_actual: 1500000,
    });
    expect(result.success).toBe(true);
  });

  it("input completo pasa CreditoInputSchema", () => {
    const result = CreditoInputSchema.safeParse({
      deudor: "Constructora del Norte SA de CV",
      rfc: "CDN200101ABC",
      tipo_credito: "Arrendamiento financiero",
      amortiza: "BULLET",
      monto_original: 5000000,
      saldo_actual: 4200000,
      tasa_anual: 18.5,
      plazo_meses: 48,
      garantia: "Hipotecaria",
      fecha_inicio: "2025-03-01",
      fecha_vencimiento: "2029-03-01",
      dpd: 0,
      estatus: "vigente",
      sector: "Construcción",
      notas: "Cliente referido",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza deudor vacío", () => {
    const result = CreditoInputSchema.safeParse({
      deudor: "",
      tipo_credito: "Crédito simple",
      monto_original: 1000000,
      saldo_actual: 1000000,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza tipo_credito inválido", () => {
    const result = CreditoInputSchema.safeParse({
      deudor: "Test",
      tipo_credito: "Hipotecario",
      monto_original: 1000000,
      saldo_actual: 1000000,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza monto negativo", () => {
    const result = CreditoInputSchema.safeParse({
      deudor: "Test",
      tipo_credito: "Crédito simple",
      monto_original: -500000,
      saldo_actual: 500000,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza tasa mayor a 200%", () => {
    const result = CreditoInputSchema.safeParse({
      deudor: "Test",
      tipo_credito: "Crédito simple",
      monto_original: 1000000,
      saldo_actual: 1000000,
      tasa_anual: 250,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza RFC con formato inválido", () => {
    const result = CreditoInputSchema.safeParse({
      deudor: "Test",
      tipo_credito: "Crédito simple",
      monto_original: 1000000,
      saldo_actual: 1000000,
      rfc: "INVALIDO",
    });
    expect(result.success).toBe(false);
  });

  it("acepta RFC vacío (se trata como opcional)", () => {
    const result = CreditoInputSchema.safeParse({
      deudor: "Test",
      tipo_credito: "Crédito simple",
      monto_original: 1000000,
      saldo_actual: 1000000,
      rfc: "",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza fecha con formato incorrecto", () => {
    const result = CreditoInputSchema.safeParse({
      deudor: "Test",
      tipo_credito: "Crédito simple",
      monto_original: 1000000,
      saldo_actual: 1000000,
      fecha_inicio: "01/03/2025",
    });
    expect(result.success).toBe(false);
  });

  it("aplica defaults (amortiza=SI, dpd=0, estatus=vigente)", () => {
    const result = CreditoInputSchema.safeParse({
      deudor: "Test",
      tipo_credito: "Crédito simple",
      monto_original: 1000000,
      saldo_actual: 1000000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amortiza).toBe("SI");
      expect(result.data.dpd).toBe(0);
      expect(result.data.estatus).toBe("vigente");
    }
  });

  // ── CreditoUpdateSchema (parcial) ─────────────────────────

  it("CreditoUpdateSchema acepta updates parciales", () => {
    expect(CreditoUpdateSchema.safeParse({ saldo_actual: 800000 }).success).toBe(true);
    expect(CreditoUpdateSchema.safeParse({ estatus: "mora_30" }).success).toBe(true);
    expect(CreditoUpdateSchema.safeParse({ dpd: 15 }).success).toBe(true);
  });

  it("CreditoUpdateSchema acepta objeto vacío (endpoint lo bloquea)", () => {
    expect(CreditoUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rechaza estatus inválido en update", () => {
    expect(CreditoUpdateSchema.safeParse({ estatus: "activo" }).success).toBe(false);
    expect(CreditoUpdateSchema.safeParse({ estatus: "mora" }).success).toBe(false);
  });

  it("rechaza amortiza inválido en update", () => {
    expect(CreditoUpdateSchema.safeParse({ amortiza: "MENSUAL" }).success).toBe(false);
  });
});
