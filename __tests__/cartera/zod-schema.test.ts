import { describe, it, expect } from "vitest";
import { parseRawRow, validateRows, applyDefaults, PD_LGD_DEFAULTS } from "@/lib/cartera/zod-schema";

const VALID_ROW = [
  "CR-001",             // folio
  "Empresa Test SA",    // deudor
  "Comercio",           // sector
  "Term Loan",          // tipo_credito
  5000000,              // monto_original
  3000000,              // saldo_insoluto
  0.18,                 // tasa_nominal_anual
  "2024-01-15",         // fecha_originacion
  "2027-01-15",         // fecha_vencimiento
  36,                   // plazo_meses
  "Mensual",            // periodicidad
  0,                    // dpd
  0.05,                 // pd
  0.45,                 // lgd
  "Hipotecaria",        // garantia_tipo
  8000000,              // garantia_valor
];

describe("parseRawRow", () => {
  it("parses a valid row correctly", () => {
    const parsed = parseRawRow(VALID_ROW);
    expect(parsed.folio_credito).toBe("CR-001");
    expect(parsed.deudor).toBe("Empresa Test SA");
    expect(parsed.monto_original_mxn).toBe(5000000);
    expect(parsed.tasa_nominal_anual).toBe(0.18);
    expect(parsed.fecha_vencimiento).toBe("2027-01-15");
    expect(parsed.pd).toBe(0.05);
  });

  it("handles null pd/lgd", () => {
    const row = [...VALID_ROW];
    row[12] = null; // pd
    row[13] = null; // lgd
    const parsed = parseRawRow(row);
    expect(parsed.pd).toBeNull();
    expect(parsed.lgd).toBeNull();
  });

  it("handles empty garantia", () => {
    const row = [...VALID_ROW];
    row[14] = ""; // garantia_tipo
    row[15] = null; // garantia_valor
    const parsed = parseRawRow(row);
    expect(parsed.garantia_tipo).toBeNull();
    expect(parsed.garantia_valor_mxn).toBeNull();
  });
});

describe("validateRows", () => {
  it("validates a valid row", () => {
    const parsed = parseRawRow(VALID_ROW);
    const { valid, errors } = validateRows([parsed]);
    expect(valid.length).toBe(1);
    expect(errors.length).toBe(0);
  });

  it("rejects row with missing folio", () => {
    const row = [...VALID_ROW];
    row[0] = ""; // empty folio
    const parsed = parseRawRow(row);
    const { valid, errors } = validateRows([parsed]);
    expect(valid.length).toBe(0);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].row).toBe(2); // first data row = Excel row 2
    expect(errors[0].field).toBe("folio_credito");
  });

  it("rejects row with invalid sector", () => {
    const row = [...VALID_ROW];
    row[2] = "InvalidSector";
    const parsed = parseRawRow(row);
    const { valid, errors } = validateRows([parsed]);
    expect(valid.length).toBe(0);
    expect(errors.some(e => e.field === "sector")).toBe(true);
  });

  it("rejects row with tasa > 2", () => {
    const row = [...VALID_ROW];
    row[6] = 3.5; // tasa > 2
    const parsed = parseRawRow(row);
    const { valid, errors } = validateRows([parsed]);
    expect(valid.length).toBe(0);
    expect(errors.some(e => e.field === "tasa_nominal_anual")).toBe(true);
  });

  it("rejects row where fecha_vencimiento < today", () => {
    const row = [...VALID_ROW];
    row[8] = "2020-01-01"; // past date
    const parsed = parseRawRow(row);
    const { valid, errors } = validateRows([parsed]);
    expect(valid.length).toBe(0);
    expect(errors.some(e => e.field === "fecha_vencimiento")).toBe(true);
  });

  it("rejects row where vencimiento < originacion", () => {
    const row = [...VALID_ROW];
    row[7] = "2028-01-01"; // originacion after vencimiento
    row[8] = "2027-01-15"; // vencimiento
    const parsed = parseRawRow(row);
    const { valid, errors } = validateRows([parsed]);
    expect(valid.length).toBe(0);
    expect(errors.some(e => e.message.includes("posterior"))).toBe(true);
  });

  it("requires fecha_originacion OR plazo_meses", () => {
    const row = [...VALID_ROW];
    row[7] = null; // no fecha_originacion
    row[9] = null; // no plazo_meses
    const parsed = parseRawRow(row);
    const { valid, errors } = validateRows([parsed]);
    expect(valid.length).toBe(0);
    expect(errors.some(e => e.message.includes("fecha_originacion o plazo"))).toBe(true);
  });

  it("row index is 1-indexed (Excel row number)", () => {
    const rows = [
      parseRawRow(VALID_ROW), // row index 0 → Excel row 2
      parseRawRow([...VALID_ROW].map((v, i) => i === 0 ? "" : v)), // row index 1 → Excel row 3
    ];
    const { errors } = validateRows(rows);
    expect(errors[0].row).toBe(3); // second data row = Excel row 3
  });
});

describe("applyDefaults", () => {
  it("applies sector defaults when pd/lgd null", () => {
    const row = [...VALID_ROW];
    row[12] = null; // pd
    row[13] = null; // lgd
    const parsed = parseRawRow(row);
    const { valid } = validateRows([parsed]);

    // Need to handle the case where parsed has null pd/lgd but still validates
    // Let's test directly with a manually constructed valid row
    const validRow = {
      folio_credito: "CR-001",
      deudor: "Test",
      sector: "Comercio" as const,
      tipo_credito: "Term Loan" as const,
      monto_original_mxn: 5000000,
      saldo_insoluto_mxn: 3000000,
      tasa_nominal_anual: 0.18,
      fecha_originacion: "2024-01-15",
      fecha_vencimiento: "2027-01-15",
      plazo_meses_original: 36,
      periodicidad_pago: "Mensual" as const,
      dpd: 0,
      pd: null,
      lgd: null,
      garantia_tipo: null,
      garantia_valor_mxn: null,
    };

    const result = applyDefaults(validRow);
    expect(result.pd).toBe(PD_LGD_DEFAULTS.Comercio.pd);
    expect(result.lgd).toBe(PD_LGD_DEFAULTS.Comercio.lgd);
    expect(result.pd_lgd_source).toBe("estimated");
  });

  it("keeps provided values when pd/lgd present", () => {
    const validRow = {
      folio_credito: "CR-001",
      deudor: "Test",
      sector: "Agro" as const,
      tipo_credito: "Term Loan" as const,
      monto_original_mxn: 5000000,
      saldo_insoluto_mxn: 3000000,
      tasa_nominal_anual: 0.18,
      fecha_originacion: "2024-01-15",
      fecha_vencimiento: "2027-01-15",
      plazo_meses_original: 36,
      periodicidad_pago: "Mensual" as const,
      dpd: 0,
      pd: 0.03,
      lgd: 0.25,
      garantia_tipo: null,
      garantia_valor_mxn: null,
    };

    const result = applyDefaults(validRow);
    expect(result.pd).toBe(0.03);
    expect(result.lgd).toBe(0.25);
    expect(result.pd_lgd_source).toBe("provided");
  });

  it("infers fecha_originacion from plazo + vencimiento", () => {
    const validRow = {
      folio_credito: "CR-001",
      deudor: "Test",
      sector: "Industria" as const,
      tipo_credito: "Term Loan" as const,
      monto_original_mxn: 5000000,
      saldo_insoluto_mxn: 3000000,
      tasa_nominal_anual: 0.18,
      fecha_originacion: null,
      fecha_vencimiento: "2027-06-15",
      plazo_meses_original: 36,
      periodicidad_pago: "Mensual" as const,
      dpd: 0,
      pd: 0.04,
      lgd: 0.40,
      garantia_tipo: null,
      garantia_valor_mxn: null,
    };

    const result = applyDefaults(validRow);
    expect(result.originacion_inferred).toBe(true);
    expect(result.fecha_originacion).toBe("2024-06-15");
  });
});
