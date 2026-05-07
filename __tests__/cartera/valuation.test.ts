// __tests__/cartera/valuation.test.ts — TDD tests for financial calculation engine
import { describe, it, expect } from "vitest";
import {
  calcPMT,
  generateSchedule,
  calcNPV,
  calcYTM,
  calcMacaulayDuration,
  calcModifiedDuration,
  calcWAL,
  calcExpectedLoss,
  calcRiskAdjustedNPV,
  aggregatePortfolio,
  calcStressGrid,
  calcConcentration,
  calculateCredit,
} from "@/lib/cartera/valuation";

// Helper: generate date N months in the future from today
function futureDate(monthsAhead: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().slice(0, 10);
}
const TODAY = new Date().toISOString().slice(0, 10);

// ═══════════════════════════════════════════════════
// PMT
// ═══════════════════════════════════════════════════

describe("calcPMT", () => {
  it("calculates monthly payment for 1M at 12% annual over 12 months", () => {
    // Excel PMT(0.01, 12, -1000000) = 88,848.79
    const pmt = calcPMT(1_000_000, 0.12 / 12, 12);
    expect(pmt).toBeCloseTo(88848.79, 0);
  });

  it("calculates PMT for 5M at 18% annual over 36 months", () => {
    // Exact: P*r/(1-(1+r)^-n) with r=0.015, n=36, P=5M = 180,761.98
    const pmt = calcPMT(5_000_000, 0.18 / 12, 36);
    expect(pmt).toBeCloseTo(180761.98, 2);
  });

  it("plazo = 1 mes devuelve P*(1+r)", () => {
    const pmt = calcPMT(1_000_000, 0.01, 1);
    expect(pmt).toBeCloseTo(1_010_000, 0);
  });

  it("handles zero interest rate (simple division)", () => {
    const pmt = calcPMT(1_200_000, 0, 12);
    expect(pmt).toBeCloseTo(100_000, 0);
  });
});

// ═══════════════════════════════════════════════════
// Schedule generation
// ═══════════════════════════════════════════════════

describe("generateSchedule", () => {
  it("generates correct number of payments for Term Loan monthly", () => {
    const schedule = generateSchedule({
      tipo_credito: "Term Loan",
      saldo_insoluto_mxn: 1_000_000,
      tasa_nominal_anual: 0.12,
      fecha_vencimiento: futureDate(12),
      fecha_originacion: TODAY,
      periodicidad_pago: "Mensual",
      plazo_meses_original: 12,
    });
    expect(schedule.length).toBe(12);
    // Last payment should bring balance to ~0
    const totalPrincipal = schedule.reduce((s, p) => s + p.principal, 0);
    expect(totalPrincipal).toBeCloseTo(1_000_000, 0);
  });

  it("generates bullet payment schedule (interest only + principal at end)", () => {
    const schedule = generateSchedule({
      tipo_credito: "Revolvente",
      saldo_insoluto_mxn: 2_000_000,
      tasa_nominal_anual: 0.18,
      fecha_vencimiento: futureDate(12),
      fecha_originacion: TODAY,
      periodicidad_pago: "Mensual",
      plazo_meses_original: 12,
    });
    // All payments except last should have principal = 0
    for (let i = 0; i < schedule.length - 1; i++) {
      expect(schedule[i].principal).toBeCloseTo(0, 2);
    }
    // Last payment has full principal
    expect(schedule[schedule.length - 1].principal).toBeCloseTo(2_000_000, 0);
  });

  it("caps schedule at 60 payments (truncation for >120)", () => {
    const schedule = generateSchedule({
      tipo_credito: "Term Loan",
      saldo_insoluto_mxn: 10_000_000,
      tasa_nominal_anual: 0.10,
      fecha_vencimiento: futureDate(180),
      fecha_originacion: TODAY,
      periodicidad_pago: "Mensual",
      plazo_meses_original: 180,
    });
    expect(schedule.length).toBeLessThanOrEqual(60);
  });

  it("generates trimestral payments correctly", () => {
    const schedule = generateSchedule({
      tipo_credito: "Term Loan",
      saldo_insoluto_mxn: 3_000_000,
      tasa_nominal_anual: 0.12,
      fecha_vencimiento: futureDate(24),
      fecha_originacion: TODAY,
      periodicidad_pago: "Trimestral",
      plazo_meses_original: 24,
    });
    // 24 months / 3 = 8 quarterly payments
    expect(schedule.length).toBe(8);
  });

  it("credito que vence hoy mismo → schedule de 1 pago", () => {
    const schedule = generateSchedule({
      tipo_credito: "Term Loan",
      saldo_insoluto_mxn: 1_000_000,
      tasa_nominal_anual: 0.12,
      fecha_vencimiento: TODAY,
      fecha_originacion: TODAY,
      periodicidad_pago: "Mensual",
      plazo_meses_original: 1,
    });
    expect(schedule.length).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════
// NPV
// ═══════════════════════════════════════════════════

describe("calcNPV", () => {
  it("discounts known cash flows correctly", () => {
    // Bond: -1000 today, 100 at t=1yr, 100 at t=2yr, 1100 at t=3yr, r=10%
    // NPV = 100/1.1 + 100/1.21 + 1100/1.331 = 90.91 + 82.64 + 826.45 = 1000
    // So NPV of just the future flows at 10% should equal ~1000
    const flows = [
      { month: 12, cashflow: 100 },
      { month: 24, cashflow: 100 },
      { month: 36, cashflow: 1100 },
    ];
    const npv = calcNPV(flows, 0.10);
    expect(npv).toBeCloseTo(1000, -1); // within $10
  });

  it("NPV with 0 discount rate equals sum of flows", () => {
    const flows = [
      { month: 6, cashflow: 500 },
      { month: 12, cashflow: 500 },
      { month: 18, cashflow: 500 },
    ];
    const npv = calcNPV(flows, 0);
    expect(npv).toBeCloseTo(1500, 2);
  });

  it("higher discount rate produces lower NPV", () => {
    const flows = [
      { month: 12, cashflow: 1000 },
      { month: 24, cashflow: 1000 },
    ];
    const npv5 = calcNPV(flows, 0.05);
    const npv15 = calcNPV(flows, 0.15);
    expect(npv5).toBeGreaterThan(npv15);
  });
});

// ═══════════════════════════════════════════════════
// YTM
// ═══════════════════════════════════════════════════

describe("calcYTM", () => {
  it("bond at par: YTM equals coupon rate", () => {
    // 1M bond, 12% annual coupon monthly, 12 months, price = 1M
    // YTM should be ~12% annual
    const flows = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      cashflow: i < 11 ? 10000 : 1010000, // interest + final principal
    }));
    const ytm = calcYTM(flows, 1_000_000);
    expect(ytm).toBeCloseTo(0.12, 1); // within 1% of 12%
  });

  it("bond at discount: YTM > coupon rate", () => {
    const flows = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      cashflow: i < 11 ? 10000 : 1010000,
    }));
    // Bought at 950K (discount)
    const ytm = calcYTM(flows, 950_000);
    expect(ytm).toBeGreaterThan(0.12);
  });

  it("returns null for non-convergent case", () => {
    // All zero flows — no possible YTM
    const flows = [{ month: 12, cashflow: 0 }];
    const ytm = calcYTM(flows, 1_000_000);
    expect(ytm).toBeNull();
  });
});

// ═══════════════════════════════════════════════════
// Duration
// ═══════════════════════════════════════════════════

describe("calcMacaulayDuration", () => {
  it("bullet bond duration ≈ maturity", () => {
    // 12-month bullet: all cash flow at month 12
    const flows = [{ month: 12, cashflow: 1_100_000 }];
    const dur = calcMacaulayDuration(flows, 0.10);
    expect(dur).toBeCloseTo(1.0, 1); // ~1 year
  });

  it("amortized loan duration < maturity", () => {
    // Uniform payments over 12 months
    const flows = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      cashflow: 88849, // ~PMT for 1M/12%/12m
    }));
    const dur = calcMacaulayDuration(flows, 0.12);
    // Duration of amortized ~0.5 years (weighted average timing)
    expect(dur).toBeGreaterThan(0.4);
    expect(dur).toBeLessThan(0.6);
  });
});

describe("calcModifiedDuration", () => {
  it("modified = macaulay / (1 + ytm)", () => {
    const macaulay = 2.5;
    const ytm = 0.10;
    const modified = calcModifiedDuration(macaulay, ytm);
    expect(modified).toBeCloseTo(2.5 / 1.10, 4);
  });
});

// ═══════════════════════════════════════════════════
// WAL
// ═══════════════════════════════════════════════════

describe("calcWAL", () => {
  it("bullet WAL = maturity", () => {
    const flows = [{ month: 24, principal: 1_000_000 }];
    const wal = calcWAL(flows);
    expect(wal).toBeCloseTo(2.0, 2); // 24 months = 2 years
  });

  it("uniform amortization WAL ≈ maturity/2", () => {
    const flows = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      principal: 1_000_000 / 12,
    }));
    const wal = calcWAL(flows);
    // Average of months 1..12 = 6.5 months = 0.542 years
    expect(wal).toBeCloseTo(0.542, 1);
  });
});

// ═══════════════════════════════════════════════════
// Expected Loss
// ═══════════════════════════════════════════════════

describe("calcExpectedLoss", () => {
  it("basic EL without guarantee", () => {
    // PD=5%, LGD=45%, EAD=1M (no guarantee)
    const el = calcExpectedLoss(0.05, 0.45, 1_000_000, 0);
    expect(el).toBeCloseTo(22500, 0); // 0.05 * 0.45 * 1M = 22,500
  });

  it("EL with guarantee reduces EAD by 70% of guarantee value", () => {
    // Saldo=1M, guarantee=1M → EAD = 1M - min(1M*0.7, 1M) = 1M - 700K = 300K
    const el = calcExpectedLoss(0.05, 0.45, 1_000_000, 1_000_000);
    const expectedEAD = 1_000_000 - 700_000; // 300K
    expect(el).toBeCloseTo(0.05 * 0.45 * expectedEAD, 0); // 6,750
  });

  it("guarantee capped at saldo (no negative EAD)", () => {
    // Guarantee worth more than saldo
    const el = calcExpectedLoss(0.05, 0.45, 500_000, 2_000_000);
    // EAD = 500K - min(2M*0.7, 500K) = 500K - 500K = 0
    expect(el).toBeCloseTo(0, 2);
  });

  it("saldo zero returns EL zero", () => {
    const el = calcExpectedLoss(0.05, 0.45, 0, 0);
    expect(el).toBe(0);
  });

  it("PD = 1 (default cierto) sin garantía → EL = saldo * lgd", () => {
    const el = calcExpectedLoss(1.0, 0.45, 1_000_000, 0);
    expect(el).toBeCloseTo(450_000, 0);
  });

  it("PD = 0 → EL = 0 sin importar otros params", () => {
    const el = calcExpectedLoss(0, 0.99, 1_000_000, 0);
    expect(el).toBe(0);
  });
});

// ═══════════════════════════════════════════════════
// Stress Grid
// ═══════════════════════════════════════════════════

describe("calcStressGrid", () => {
  it("returns 5×4 grid", () => {
    const mockCreditos = [
      { saldo_insoluto_mxn: 1_000_000, tasa_nominal_anual: 0.12, fecha_vencimiento: futureDate(12), fecha_originacion: TODAY, periodicidad_pago: "Mensual", tipo_credito: "Term Loan", plazo_meses_original: 12, pd: 0.05, lgd: 0.45, garantia_valor_mxn: 0, dpd: 0 },
    ];
    const grid = calcStressGrid(mockCreditos as any, 0.10);
    expect(grid.length).toBe(5); // 5 discount rate scenarios
    expect(grid[0].pd_scenarios.length).toBe(4); // 4 PD multipliers each
  });
});

// ═══════════════════════════════════════════════════
// Concentration
// ═══════════════════════════════════════════════════

describe("calcConcentration", () => {
  it("HHI with single debtor = 10000", () => {
    const creditos = [
      { deudor: "Empresa A", saldo_insoluto_mxn: 1_000_000, sector: "Comercio", dpd: 0 },
    ];
    const conc = calcConcentration(creditos as any);
    expect(conc.hhi_sector).toBe(10000); // 100%² = 10000
  });

  it("HHI with two equal debtors = 5000", () => {
    const creditos = [
      { deudor: "A", saldo_insoluto_mxn: 500_000, sector: "Comercio", dpd: 0 },
      { deudor: "B", saldo_insoluto_mxn: 500_000, sector: "Industria", dpd: 0 },
    ];
    const conc = calcConcentration(creditos as any);
    // HHI by sector: Comercio 50%² + Industria 50%² = 2500 + 2500 = 5000
    expect(conc.hhi_sector).toBe(5000);
  });

  it("top 10 debtors calculation", () => {
    const creditos = Array.from({ length: 20 }, (_, i) => ({
      deudor: `Empresa ${i}`,
      saldo_insoluto_mxn: (20 - i) * 100_000, // decreasing
      sector: "Comercio",
      dpd: 0,
    }));
    const conc = calcConcentration(creditos as any);
    expect(conc.top_10_deudores.length).toBe(10);
    // First debtor has highest balance
    expect(conc.top_10_deudores[0].deudor).toBe("Empresa 0");
  });

  it("DPD buckets are correct", () => {
    const creditos = [
      { deudor: "A", saldo_insoluto_mxn: 100, sector: "Comercio", dpd: 0 },
      { deudor: "B", saldo_insoluto_mxn: 200, sector: "Comercio", dpd: 15 },
      { deudor: "C", saldo_insoluto_mxn: 300, sector: "Comercio", dpd: 45 },
      { deudor: "D", saldo_insoluto_mxn: 400, sector: "Comercio", dpd: 75 },
      { deudor: "E", saldo_insoluto_mxn: 500, sector: "Comercio", dpd: 100 },
    ];
    const conc = calcConcentration(creditos as any);
    expect(conc.dpd_buckets["0"]).toBe(100);
    expect(conc.dpd_buckets["1-30"]).toBe(200);
    expect(conc.dpd_buckets["31-60"]).toBe(300);
    expect(conc.dpd_buckets["61-90"]).toBe(400);
    expect(conc.dpd_buckets["90+"]).toBe(500);
  });
});

// ═══════════════════════════════════════════════════
// calculateCredit (integration)
// ═══════════════════════════════════════════════════

describe("calculateCredit", () => {
  it("calculates all metrics for a standard term loan without error", () => {
    const credito = {
      saldo_insoluto_mxn: 1_000_000,
      tasa_nominal_anual: 0.12,
      fecha_vencimiento: futureDate(12),
      fecha_originacion: TODAY,
      periodicidad_pago: "Mensual",
      tipo_credito: "Term Loan",
      plazo_meses_original: 12,
      pd: 0.05,
      lgd: 0.45,
      garantia_valor_mxn: 0,
      dpd: 0,
    };
    const result = calculateCredit(credito as any, 0.10);
    expect(result.calc_error).toBeNull();
    expect(result.npv).toBeGreaterThan(0);
    expect(result.ytm).toBeGreaterThan(0);
    expect(result.duration_macaulay).toBeGreaterThan(0);
    expect(result.duration_modified).toBeGreaterThan(0);
    expect(result.wal).toBeGreaterThan(0);
    expect(result.expected_loss).toBeGreaterThanOrEqual(0);
    expect(result.risk_adjusted_npv).toBeLessThanOrEqual(result.npv);
    expect(result.schedule.length).toBeGreaterThan(0);
  });

  it("handles saldo=0 without crashing", () => {
    const credito = {
      saldo_insoluto_mxn: 0,
      tasa_nominal_anual: 0.12,
      fecha_vencimiento: futureDate(12),
      fecha_originacion: TODAY,
      periodicidad_pago: "Mensual",
      tipo_credito: "Term Loan",
      plazo_meses_original: 12,
      pd: 0.05,
      lgd: 0.45,
      garantia_valor_mxn: 0,
      dpd: 0,
    };
    const result = calculateCredit(credito as any, 0.10);
    expect(result.calc_error).toBeNull();
    expect(result.npv).toBe(0);
  });
});
