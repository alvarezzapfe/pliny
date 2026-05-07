// lib/cartera/valuation.ts — Motor de cálculo financiero para valuación de cartera

// ══════════════════════════════════════════════��════
// Types
// ═══════════════════════════════════════════════════

export type SchedulePayment = {
  month: number;       // months from today
  date: string;        // YYYY-MM-DD
  principal: number;
  interest: number;
  cashflow: number;    // principal + interest
  balance: number;     // remaining balance after this payment
};

export type CreditInput = {
  saldo_insoluto_mxn: number;
  tasa_nominal_anual: number;
  fecha_vencimiento: string;
  fecha_originacion: string | null;
  periodicidad_pago: string;
  tipo_credito: string;
  plazo_meses_original: number | null;
  pd: number;
  lgd: number;
  garantia_valor_mxn: number | null;
  dpd: number;
};

export type CreditResult = {
  npv: number;
  ytm: number | null;
  duration_macaulay: number;
  duration_modified: number;
  wal: number;
  expected_loss: number;
  risk_adjusted_npv: number;
  schedule: SchedulePayment[];
  calc_error: string | null;
};

export type StressGridRow = {
  discount_rate: number;
  pd_scenarios: { pd_multiplier: number; npv: number }[];
};

export type ConcentrationResult = {
  top_10_deudores: { deudor: string; saldo: number; pct: number }[];
  hhi_sector: number;
  sector_distribution: Record<string, number>;
  dpd_buckets: Record<string, number>;
};

// ═══════════════════════════════════════════════════
// PMT — Payment for an amortizing loan
// ═══════════════════════════════════════════════════

/**
 * Calculate fixed periodic payment (like Excel PMT).
 * @param principal - loan amount
 * @param ratePerPeriod - interest rate per period (e.g. annual/12 for monthly)
 * @param nPeriods - total number of periods
 */
export function calcPMT(principal: number, ratePerPeriod: number, nPeriods: number): number {
  if (principal === 0) return 0;
  if (ratePerPeriod === 0) return principal / nPeriods;
  const factor = Math.pow(1 + ratePerPeriod, nPeriods);
  return principal * (ratePerPeriod * factor) / (factor - 1);
}

// ═══════════════════════════════════════════════════
// Schedule Generation
// ═══════════════════════════════════════════════════

const PERIODS_PER_YEAR: Record<string, number> = {
  Mensual: 12,
  Bimestral: 6,
  Trimestral: 4,
  Semestral: 2,
  Anual: 1,
  Bullet: 12, // interest monthly, principal at end
};

const MAX_SCHEDULE_PAYMENTS = 60;

export function generateSchedule(credito: {
  tipo_credito: string;
  saldo_insoluto_mxn: number;
  tasa_nominal_anual: number;
  fecha_vencimiento: string;
  fecha_originacion: string | null;
  periodicidad_pago: string;
  plazo_meses_original: number | null;
}): SchedulePayment[] {
  const balance = credito.saldo_insoluto_mxn;
  if (balance <= 0) return [];

  const periodsPerYear = PERIODS_PER_YEAR[credito.periodicidad_pago] ?? 12;
  const monthsPerPeriod = 12 / periodsPerYear;
  const annualRate = credito.tasa_nominal_anual;
  const ratePerPeriod = annualRate / periodsPerYear;

  // Calculate remaining months from today to vencimiento
  const today = new Date();
  const venc = new Date(credito.fecha_vencimiento + "T12:00:00Z");
  const remainingMonths = Math.max(1, Math.round((venc.getTime() - today.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
  const nPeriods = Math.max(1, Math.round(remainingMonths / monthsPerPeriod));

  // Cap at MAX_SCHEDULE_PAYMENTS
  const cappedPeriods = Math.min(nPeriods, MAX_SCHEDULE_PAYMENTS);

  const isBullet = credito.tipo_credito === "Revolvente" || credito.tipo_credito === "Arrend. Puro" || credito.periodicidad_pago === "Bullet";

  const schedule: SchedulePayment[] = [];
  let remainingBalance = balance;

  if (isBullet) {
    // Interest-only payments + bullet principal at end
    for (let i = 1; i <= cappedPeriods; i++) {
      const interest = remainingBalance * ratePerPeriod;
      const isLast = i === cappedPeriods;
      const principal = isLast ? remainingBalance : 0;
      const cf = interest + principal;
      remainingBalance = isLast ? 0 : remainingBalance;

      const payDate = new Date(today);
      payDate.setMonth(payDate.getMonth() + i * monthsPerPeriod);

      schedule.push({
        month: Math.round(i * monthsPerPeriod),
        date: payDate.toISOString().slice(0, 10),
        principal,
        interest,
        cashflow: cf,
        balance: remainingBalance,
      });
    }
  } else {
    // Amortizing (Term Loan, Arrend. Fin.)
    const pmt = calcPMT(balance, ratePerPeriod, nPeriods);

    for (let i = 1; i <= cappedPeriods; i++) {
      const interest = remainingBalance * ratePerPeriod;
      let principal: number;

      if (i === cappedPeriods && cappedPeriods < nPeriods) {
        // Truncated schedule — last shown payment doesn't zero out
        principal = pmt - interest;
      } else if (i === nPeriods) {
        // Last real payment — pay remaining
        principal = remainingBalance;
      } else {
        principal = pmt - interest;
      }

      principal = Math.min(principal, remainingBalance);
      remainingBalance = Math.max(0, remainingBalance - principal);

      const payDate = new Date(today);
      payDate.setMonth(payDate.getMonth() + i * monthsPerPeriod);

      schedule.push({
        month: Math.round(i * monthsPerPeriod),
        date: payDate.toISOString().slice(0, 10),
        principal,
        interest,
        cashflow: principal + interest,
        balance: remainingBalance,
      });
    }
  }

  return schedule;
}

// ═══════════════════════════════════════════════════
// NPV
// ═══════════════════════════════════════════════════

/**
 * Calculate Net Present Value of cash flows.
 * @param flows - array of { month, cashflow }
 * @param annualDiscountRate - annual rate (e.g. 0.10 = 10%)
 */
export function calcNPV(flows: { month: number; cashflow: number }[], annualDiscountRate: number): number {
  if (flows.length === 0) return 0;
  let npv = 0;
  for (const f of flows) {
    const years = f.month / 12;
    const discountFactor = Math.pow(1 + annualDiscountRate, years);
    npv += f.cashflow / discountFactor;
  }
  return npv;
}

// ═══════════════════════════════════════════════════
// YTM — Newton-Raphson + bisection fallback
// ═══════════════════════════════════════════════════

/**
 * Calculate Yield to Maturity (annual) that makes NPV(flows) = currentBalance.
 * Returns null if non-convergent.
 */
export function calcYTM(flows: { month: number; cashflow: number }[], currentBalance: number): number | null {
  if (currentBalance <= 0 || flows.length === 0) return null;
  const totalCF = flows.reduce((s, f) => s + f.cashflow, 0);
  if (totalCF <= 0) return null;

  // f(r) = NPV(flows, r) - currentBalance = 0
  function f(r: number): number {
    return calcNPV(flows, r) - currentBalance;
  }

  function fPrime(r: number): number {
    let deriv = 0;
    for (const flow of flows) {
      const t = flow.month / 12;
      deriv -= t * flow.cashflow / Math.pow(1 + r, t + 1);
    }
    return deriv;
  }

  // Newton-Raphson
  let guess = flows.length > 0 ? 0.10 : 0.01; // reasonable starting point
  // Try to use a smarter guess: if total CF / balance suggests a rate
  const impliedRate = (totalCF / currentBalance - 1) / (flows[flows.length - 1].month / 12);
  if (Number.isFinite(impliedRate) && impliedRate > -0.5 && impliedRate < 5) {
    guess = Math.max(0.001, impliedRate);
  }

  for (let i = 0; i < 100; i++) {
    const fVal = f(guess);
    const fDer = fPrime(guess);

    if (Math.abs(fVal) < 1e-7) return guess;
    if (fDer === 0 || !Number.isFinite(fDer)) break;

    const next = guess - fVal / fDer;
    if (!Number.isFinite(next)) break;

    guess = next;

    // Clamp to prevent divergence
    if (guess < -0.5) guess = -0.5;
    if (guess > 5.0) guess = 5.0;
  }

  // Bisection fallback [-0.5, 5.0]
  let lo = -0.5;
  let hi = 5.0;
  let fLo = f(lo);

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);

    if (Math.abs(fMid) < 1e-7) return mid;

    if ((fLo > 0 && fMid > 0) || (fLo < 0 && fMid < 0)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }

    if (hi - lo < 1e-9) return mid;
  }

  return null; // Did not converge
}

// ═══════════════════════════════════════════════════
// Duration
// ═══════════════════════════════════════════════════

/**
 * Macaulay Duration in years.
 */
export function calcMacaulayDuration(flows: { month: number; cashflow: number }[], annualRate: number): number {
  if (flows.length === 0) return 0;

  let numerator = 0;
  let denominator = 0;

  for (const f of flows) {
    const years = f.month / 12;
    const pv = f.cashflow / Math.pow(1 + annualRate, years);
    numerator += years * pv;
    denominator += pv;
  }

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Modified Duration = Macaulay / (1 + YTM)
 */
export function calcModifiedDuration(macaulayDuration: number, ytm: number): number {
  if (1 + ytm === 0) return 0;
  return macaulayDuration / (1 + ytm);
}

// ═══════════════════════════════════════════════════
// WAL — Weighted Average Life
// ═══════════════════════════════════════════════════

/**
 * WAL in years. Uses principal component only.
 */
export function calcWAL(flows: { month: number; principal: number }[]): number {
  let numerator = 0;
  let denominator = 0;

  for (const f of flows) {
    const years = f.month / 12;
    numerator += years * f.principal;
    denominator += f.principal;
  }

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ═══════════════════════════════════════════════════
// Expected Loss
// ═══════════════════════════════════════════════════

/**
 * EL = PD × LGD × EAD
 * where EAD = saldo - min(garantia_valor × 0.7, saldo)
 */
export function calcExpectedLoss(pd: number, lgd: number, saldo: number, garantiaValor: number): number {
  if (saldo <= 0) return 0;
  const haircut = 0.7;
  const garantiaEffective = Math.min(garantiaValor * haircut, saldo);
  const ead = saldo - garantiaEffective;
  return pd * lgd * ead;
}

// ═══════════════════════════════════════════════════
// Risk-Adjusted NPV
// ═══════════════════════════════════════════════════

/**
 * Risk-Adjusted NPV = NPV - PV(Expected Loss)
 */
export function calcRiskAdjustedNPV(npv: number, expectedLoss: number, discountRate: number, monthsToMaturity: number): number {
  const years = monthsToMaturity / 12;
  const pvEL = expectedLoss / Math.pow(1 + discountRate, years / 2); // Discount EL to mid-life
  return npv - pvEL;
}

// ═══════════════════════════════════════════════════
// calculateCredit — orchestrator per credit
// ═══════════════════════════════════════════════════

export function calculateCredit(credito: CreditInput, discountRate: number): CreditResult {
  try {
    if (credito.saldo_insoluto_mxn <= 0) {
      return {
        npv: 0, ytm: null, duration_macaulay: 0, duration_modified: 0,
        wal: 0, expected_loss: 0, risk_adjusted_npv: 0, schedule: [], calc_error: null,
      };
    }

    const schedule = generateSchedule(credito);
    if (schedule.length === 0) {
      return {
        npv: 0, ytm: null, duration_macaulay: 0, duration_modified: 0,
        wal: 0, expected_loss: 0, risk_adjusted_npv: 0, schedule: [], calc_error: null,
      };
    }

    const flows = schedule.map(p => ({ month: p.month, cashflow: p.cashflow }));
    const npv = calcNPV(flows, discountRate);
    const ytm = calcYTM(flows, credito.saldo_insoluto_mxn);
    const rateForDuration = ytm ?? discountRate;
    const duration_macaulay = calcMacaulayDuration(flows, rateForDuration);
    const duration_modified = calcModifiedDuration(duration_macaulay, rateForDuration);
    const wal = calcWAL(schedule);
    const expected_loss = calcExpectedLoss(credito.pd, credito.lgd, credito.saldo_insoluto_mxn, credito.garantia_valor_mxn ?? 0);

    const lastMonth = schedule[schedule.length - 1].month;
    const risk_adjusted_npv = calcRiskAdjustedNPV(npv, expected_loss, discountRate, lastMonth);

    return {
      npv,
      ytm,
      duration_macaulay,
      duration_modified,
      wal,
      expected_loss,
      risk_adjusted_npv,
      schedule,
      calc_error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de cálculo";
    return {
      npv: 0, ytm: null, duration_macaulay: 0, duration_modified: 0,
      wal: 0, expected_loss: 0, risk_adjusted_npv: 0, schedule: [],
      calc_error: message,
    };
  }
}

// ═══════════════════════════════════════════════════
// Portfolio Aggregation
// ═══════════════════════════════════════════════════

export function aggregatePortfolio(creditos: (CreditInput & CreditResult)[]): {
  npv_total: number;
  el_total: number;
  saldo_total: number;
  yield_ponderado: number;
  duration_ponderada: number;
  wal_ponderado: number;
} {
  const valid = creditos.filter(c => c.calc_error === null && c.npv > 0);

  const npv_total = valid.reduce((s, c) => s + c.npv, 0);
  const el_total = valid.reduce((s, c) => s + c.expected_loss, 0);
  const saldo_total = valid.reduce((s, c) => s + c.saldo_insoluto_mxn, 0);

  // Yield weighted by saldo
  const yield_ponderado = saldo_total > 0
    ? valid.reduce((s, c) => s + (c.ytm ?? c.tasa_nominal_anual) * c.saldo_insoluto_mxn, 0) / saldo_total
    : 0;

  // Duration weighted by NPV
  const duration_ponderada = npv_total > 0
    ? valid.reduce((s, c) => s + c.duration_macaulay * c.npv, 0) / npv_total
    : 0;

  // WAL weighted by NPV
  const wal_ponderado = npv_total > 0
    ? valid.reduce((s, c) => s + c.wal * c.npv, 0) / npv_total
    : 0;

  return { npv_total, el_total, saldo_total, yield_ponderado, duration_ponderada, wal_ponderado };
}

// ═══════════════════════════════════════════════════
// Stress Grid — 5 rates × 4 PD multipliers
// ═══════════════════════════════════════════════════

export function calcStressGrid(creditos: CreditInput[], baseRate: number): StressGridRow[] {
  const rateDeltas = [0, 0.01, 0.02, 0.03, 0.05]; // +0, +100bps, +200, +300, +500
  const pdMultipliers = [1, 1.5, 2, 3];

  return rateDeltas.map(delta => {
    const rate = baseRate + delta;
    const pd_scenarios = pdMultipliers.map(mult => {
      let totalNPV = 0;
      for (const c of creditos) {
        if (c.saldo_insoluto_mxn <= 0) continue;
        const stressed = { ...c, pd: Math.min(c.pd * mult, 1) };
        const result = calculateCredit(stressed, rate);
        if (result.calc_error === null) {
          totalNPV += result.risk_adjusted_npv;
        }
      }
      return { pd_multiplier: mult, npv: totalNPV };
    });
    return { discount_rate: rate, pd_scenarios };
  });
}

// ═══════════════════════════════════════════════════
// Concentration Analysis
// ═══════════════════════════════════════════════════

export function calcConcentration(creditos: { deudor: string; saldo_insoluto_mxn: number; sector: string; dpd: number }[]): ConcentrationResult {
  const totalSaldo = creditos.reduce((s, c) => s + c.saldo_insoluto_mxn, 0);
  if (totalSaldo === 0) {
    return { top_10_deudores: [], hhi_sector: 0, sector_distribution: {}, dpd_buckets: { "0": 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 } };
  }

  // Top 10 debtors by saldo
  const deudorTotals = new Map<string, number>();
  for (const c of creditos) {
    deudorTotals.set(c.deudor, (deudorTotals.get(c.deudor) ?? 0) + c.saldo_insoluto_mxn);
  }
  const sorted = [...deudorTotals.entries()].sort((a, b) => b[1] - a[1]);
  const top_10_deudores = sorted.slice(0, 10).map(([deudor, saldo]) => ({
    deudor, saldo, pct: (saldo / totalSaldo) * 100,
  }));

  // HHI by sector
  const sectorTotals = new Map<string, number>();
  for (const c of creditos) {
    sectorTotals.set(c.sector, (sectorTotals.get(c.sector) ?? 0) + c.saldo_insoluto_mxn);
  }
  let hhi_sector = 0;
  const sector_distribution: Record<string, number> = {};
  for (const [sector, saldo] of sectorTotals) {
    const pct = (saldo / totalSaldo) * 100;
    sector_distribution[sector] = saldo;
    hhi_sector += pct * pct; // HHI = sum of squared market shares
  }
  hhi_sector = Math.round(hhi_sector);

  // DPD buckets
  const dpd_buckets: Record<string, number> = { "0": 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  for (const c of creditos) {
    if (c.dpd === 0) dpd_buckets["0"] += c.saldo_insoluto_mxn;
    else if (c.dpd <= 30) dpd_buckets["1-30"] += c.saldo_insoluto_mxn;
    else if (c.dpd <= 60) dpd_buckets["31-60"] += c.saldo_insoluto_mxn;
    else if (c.dpd <= 90) dpd_buckets["61-90"] += c.saldo_insoluto_mxn;
    else dpd_buckets["90+"] += c.saldo_insoluto_mxn;
  }

  return { top_10_deudores, hhi_sector, sector_distribution, dpd_buckets };
}
