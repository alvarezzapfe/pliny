"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * Valuación Crowdlink (módulo)
 * - 3 enfoques:
 *   1) DCF (Unlevered FCFF)
 *   2) Múltiplos (EV/EBITDA, EV/Ventas)
 *   3) Tech-based (Unit Economics: LTV/CAC + NRR + churn + GM + payback)
 *
 * Export PDF: window.print() (Guardar como PDF)
 * Persistencia: localStorage["crowdlink_valuation_v1"]
 */

type Method = "dcf" | "multiples" | "tech";

type DcfInputs = {
  revenue0: number; // ingresos LTM o Año 0
  ebitMargin: number; // %
  taxRate: number; // %
  daPctRevenue: number; // % sobre ingresos
  capexPctRevenue: number; // % sobre ingresos
  nwchgPctRevenue: number; // % sobre ingresos (ΔNWC)
  years: number; // 3..10
  growthY1: number; // %
  growthDecay: number; // % puntos que baja por año
  wacc: number; // %
  terminalGrowth: number; // %
  netDebt: number; // deuda - caja (puede ser negativo)
};

type MultipleInputs = {
  metric: "ebitda" | "revenue";
  ebitdaLTM: number;
  revenueLTM: number;
  evMultipleLow: number;
  evMultipleBase: number;
  evMultipleHigh: number;
  netDebt: number;
};

type TechInputs = {
  arr: number; // ARR o ingresos recurrentes
  grossMargin: number; // %
  cac: number; // CAC promedio
  arpaMonthly: number; // ARPA mensual (o ARPU)
  churnMonthly: number; // % mensual
  nrr: number; // % anual
  paybackMonths: number;
  growthAnnual: number; // % anual
  ruleOf40Target: number; // default 40
  netDebt: number;
  // “comparables” para rango EV/ARR aproximado
  evArrLow: number;
  evArrBase: number;
  evArrHigh: number;
};

type State = {
  method: Method;
  dcf: DcfInputs;
  mult: MultipleInputs;
  tech: TechInputs;
};

const STORAGE_KEY = "crowdlink_valuation_v1";

const DEFAULTS: State = {
  method: "dcf",
  dcf: {
    revenue0: 35000000, // 35m
    ebitMargin: 18,
    taxRate: 30,
    daPctRevenue: 4,
    capexPctRevenue: 3,
    nwchgPctRevenue: 1,
    years: 5,
    growthY1: 35,
    growthDecay: 5,
    wacc: 18,
    terminalGrowth: 4,
    netDebt: 0,
  },
  mult: {
    metric: "ebitda",
    ebitdaLTM: 6000000,
    revenueLTM: 35000000,
    evMultipleLow: 6,
    evMultipleBase: 9,
    evMultipleHigh: 12,
    netDebt: 0,
  },
  tech: {
    arr: 24000000,
    grossMargin: 70,
    cac: 18000,
    arpaMonthly: 4500,
    churnMonthly: 2.5,
    nrr: 115,
    paybackMonths: 7,
    growthAnnual: 40,
    ruleOf40Target: 40,
    netDebt: 0,
    evArrLow: 3,
    evArrBase: 5,
    evArrHigh: 8,
  },
};

export default function ValuacionCrowdlinkPage() {
  const [mounted, setMounted] = useState(false);
  const [s, setS] = useState<State>(DEFAULTS);

  // print mode
  const [printMode, setPrintMode] = useState<"none" | "report">("none");

  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as State;
        setS({
          ...DEFAULTS,
          ...parsed,
          dcf: { ...DEFAULTS.dcf, ...(parsed.dcf || {}) },
          mult: { ...DEFAULTS.mult, ...(parsed.mult || {}) },
          tech: { ...DEFAULTS.tech, ...(parsed.tech || {}) },
        });
      } catch {
        setS(DEFAULTS);
      }
    }
  }, []);

  const persist = (next: State) => {
    setS(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const companyName = "Crowdlink / PorCuanto S.A. de C.V.";

  // -------------------------
  // CALCS
  // -------------------------

  const dcfOut = useMemo(() => calcDCF(s.dcf), [s.dcf]);

  const multOut = useMemo(() => calcMultiples(s.mult), [s.mult]);

  const techOut = useMemo(() => calcTech(s.tech), [s.tech]);

  const headline = useMemo(() => {
    if (s.method === "dcf") return dcfOut.equityBase;
    if (s.method === "multiples") return multOut.equityBase;
    return techOut.equityBase;
  }, [s.method, dcfOut.equityBase, multOut.equityBase, techOut.equityBase]);

  const printReport = () => {
    setPrintMode("report");
    setTimeout(() => window.print(), 60);
  };

  useEffect(() => {
    const handler = () => setPrintMode("none");
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Print styles */}
      <style>{`
        @media print{
          header, .no-print{ display:none !important; }
          body{ background:#fff !important; }
          .print-only{ display:block !important; }
          .print-report{ display: ${printMode === "report" ? "block" : "none"} !important; }
        }
      `}</style>

      {/* Topbar */}
      <header className="bg-[#0084FF] text-white no-print">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/crowdlink-logo.png"
              alt="Crowdlink"
              className="h-9 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <div className="min-w-0">
              <div className="font-semibold leading-tight truncate">Valuación Crowdlink</div>
              <div className="text-white/85 text-xs truncate">Módulo • DCF / Múltiplos / Tech-based</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="rounded-2xl bg-white/15 border border-white/25 text-white font-semibold px-4 py-2.5 hover:bg-white/20 transition"
            >
              Volver
            </button>
            <button
              onClick={printReport}
              className="rounded-2xl bg-white text-black font-semibold px-4 py-2.5 hover:opacity-90 transition"
            >
              Imprimir / PDF
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-6 no-print">
        {/* Headline */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-stretch">
          <div className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl shadow-sm p-5">
            <div className="text-black/60 text-xs">Empresa</div>
            <div className="mt-1 text-xl font-semibold">{companyName}</div>

            <div className="mt-4 grid md:grid-cols-3 gap-3">
              <Kpi title="Equity (Base)" value={mxn(headline)} hint="Salida del método seleccionado" />
              <Kpi
                title="Rango (Low–High)"
                value={mxn(rangeLow(s, dcfOut, multOut, techOut)) + " – " + mxn(rangeHigh(s, dcfOut, multOut, techOut))}
                hint="Rango sugerido"
              />
              <Kpi title="Método" value={labelMethod(s.method)} hint="Cambia con tabs" />
            </div>

            <div className="mt-4 text-[11px] text-black/45">
              Nota: esto es un módulo financiero (placeholder) para tener un “motor” de valuación. Luego lo conectamos a data real.
            </div>
          </div>

          {/* Method selector */}
          <div className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl shadow-sm p-5">
            <div className="text-black/60 text-xs">Métodos</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <TabBtn active={s.method === "dcf"} onClick={() => persist({ ...s, method: "dcf" })} label="DCF" />
              <TabBtn active={s.method === "multiples"} onClick={() => persist({ ...s, method: "multiples" })} label="Múltiplos" />
              <TabBtn active={s.method === "tech"} onClick={() => persist({ ...s, method: "tech" })} label="Tech" />
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4">
              <div className="text-black/60 text-xs">Resultado (Base)</div>
              <div className="mt-1 text-2xl font-semibold">{mxn(headline)}</div>
              <div className="mt-1 text-[11px] text-black/45">
                EV→Equity se calcula con Net Debt (deuda - caja).
              </div>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="mt-4 grid lg:grid-cols-[1fr_340px] gap-4 items-stretch">
          {/* Left: inputs */}
          <section className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl shadow-sm p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-black font-semibold text-[17px] leading-tight">Inputs</div>
                <div className="text-black/60 text-sm mt-1">
                  Ajusta supuestos → recalcula en vivo.
                </div>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  persist(DEFAULTS);
                }}
                className="rounded-2xl border border-black/10 bg-white/70 px-3.5 py-2 text-xs hover:bg-white transition"
              >
                Reset
              </button>
            </div>

            <div className="mt-4">
              {s.method === "dcf" && (
                <DCFForm
                  v={s.dcf}
                  onChange={(patch) => persist({ ...s, dcf: { ...s.dcf, ...patch } })}
                  out={dcfOut}
                />
              )}

              {s.method === "multiples" && (
                <MultiplesForm
                  v={s.mult}
                  onChange={(patch) => persist({ ...s, mult: { ...s.mult, ...patch } })}
                  out={multOut}
                />
              )}

              {s.method === "tech" && (
                <TechForm
                  v={s.tech}
                  onChange={(patch) => persist({ ...s, tech: { ...s.tech, ...patch } })}
                  out={techOut}
                />
              )}
            </div>
          </section>

          {/* Right: results */}
          <aside className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl shadow-sm p-5 flex flex-col">
            <div className="text-black font-semibold text-[17px] leading-tight">Resultados</div>
            <div className="text-black/60 text-sm mt-1">Low / Base / High</div>

            <div className="mt-4 grid gap-3">
              <ResultCard label="Equity (Low)" value={mxn(pickOut(s.method, dcfOut, multOut, techOut).equityLow)} />
              <ResultCard label="Equity (Base)" value={mxn(pickOut(s.method, dcfOut, multOut, techOut).equityBase)} />
              <ResultCard label="Equity (High)" value={mxn(pickOut(s.method, dcfOut, multOut, techOut).equityHigh)} />
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4">
              <div className="text-black/60 text-xs">Notas rápidas</div>
              <ul className="mt-2 text-sm text-black/70 space-y-1.5">
                <li>• DCF: FCFF descontado + terminal (Gordon).</li>
                <li>• Múltiplos: EV = métrica × múltiplo.</li>
                <li>• Tech: LTV/CAC + EV/ARR (rango) + health score.</li>
              </ul>
            </div>

            <div className="mt-auto pt-4 text-[11px] text-black/35">
              © {new Date().getFullYear()} Crowdlink • valuación v1
            </div>
          </aside>
        </div>
      </div>

      {/* ===========================
          PRINT REPORT
          =========================== */}
      <section className="print-only print-report hidden">
        <div style={{ padding: 28, fontFamily: "Arial, Helvetica, sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Reporte de Valuación • Crowdlink</div>
            <div style={{ fontSize: 12, color: "#444" }}>{new Date().toISOString().slice(0, 10)}</div>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ fontSize: 12, color: "#555" }}>Empresa</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{companyName}</div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <BoxPrint title="Método" value={labelMethod(s.method)} />
            <BoxPrint title="Equity (Base)" value={mxn(headline)} />
            <BoxPrint
              title="Rango (Low–High)"
              value={`${mxn(rangeLow(s, dcfOut, multOut, techOut))} – ${mxn(rangeHigh(s, dcfOut, multOut, techOut))}`}
            />
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ fontWeight: 700, marginBottom: 8 }}>Detalle</div>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: "#333" }}>
            {s.method === "dcf" && (
              <>
                <div><b>DCF:</b> EV = PV(FCFF) + PV(Terminal). Equity = EV - Net Debt.</div>
                <div>WACC: {fmtPct(s.dcf.wacc)} • g terminal: {fmtPct(s.dcf.terminalGrowth)} • Años: {s.dcf.years}</div>
              </>
            )}
            {s.method === "multiples" && (
              <>
                <div><b>Múltiplos:</b> EV = Métrica × Múltiplo. Equity = EV - Net Debt.</div>
                <div>Métrica: {s.mult.metric.toUpperCase()} • Múltiplos: {s.mult.evMultipleLow}/{s.mult.evMultipleBase}/{s.mult.evMultipleHigh}</div>
              </>
            )}
            {s.method === "tech" && (
              <>
                <div><b>Tech:</b> Score de unit economics + rango EV/ARR por comparables. Equity = EV - Net Debt.</div>
                <div>LTV/CAC: {techOut.ltvCac.toFixed(2)} • NRR: {fmtPct(s.tech.nrr)} • Payback: {s.tech.paybackMonths}m</div>
              </>
            )}
          </div>

          <hr style={{ margin: "14px 0" }} />
          <div style={{ fontSize: 11, color: "#666" }}>
            Este reporte es un módulo interno (placeholder). Para uso ejecutivo y calibración; no es asesoría financiera.
          </div>
        </div>
      </section>
    </main>
  );
}

/* ===========================
   FORMS
   =========================== */

function DCFForm({
  v,
  onChange,
  out,
}: {
  v: DcfInputs;
  onChange: (patch: Partial<DcfInputs>) => void;
  out: DcfOutput;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <Num label="Ingresos Año 0 (MXN)" value={v.revenue0} onChange={(x) => onChange({ revenue0: x })} />
      <Num label="Margen EBIT (%)" value={v.ebitMargin} onChange={(x) => onChange({ ebitMargin: x })} />

      <Num label="Tasa impuesto (%)" value={v.taxRate} onChange={(x) => onChange({ taxRate: x })} />
      <Num label="D&A (% ingresos)" value={v.daPctRevenue} onChange={(x) => onChange({ daPctRevenue: x })} />

      <Num label="Capex (% ingresos)" value={v.capexPctRevenue} onChange={(x) => onChange({ capexPctRevenue: x })} />
      <Num label="ΔNWC (% ingresos)" value={v.nwchgPctRevenue} onChange={(x) => onChange({ nwchgPctRevenue: x })} />

      <Num label="Años proyección (3–10)" value={v.years} onChange={(x) => onChange({ years: clampInt(x, 3, 10) })} />
      <Num label="Crecimiento Año 1 (%)" value={v.growthY1} onChange={(x) => onChange({ growthY1: x })} />

      <Num label="Decay (puntos % / año)" value={v.growthDecay} onChange={(x) => onChange({ growthDecay: x })} />
      <Num label="WACC (%)" value={v.wacc} onChange={(x) => onChange({ wacc: x })} />

      <Num label="g terminal (%)" value={v.terminalGrowth} onChange={(x) => onChange({ terminalGrowth: x })} />
      <Num label="Net Debt (MXN)" value={v.netDebt} onChange={(x) => onChange({ netDebt: x })} />

      <div className="md:col-span-2 rounded-3xl border border-black/10 bg-white/70 p-4">
        <div className="text-black/60 text-xs">Resumen DCF</div>
        <div className="mt-2 grid sm:grid-cols-3 gap-3">
          <Mini label="EV (Base)" value={mxn(out.evBase)} />
          <Mini label="PV FCFF" value={mxn(out.pvFcff)} />
          <Mini label="PV Terminal" value={mxn(out.pvTerminal)} />
        </div>
        <div className="mt-3 text-[11px] text-black/45">
  FCFF = EBIT(1-T) + D&amp;A - Capex - ΔNWC. Terminal = FCFF_{"{n+1}"} / (WACC - g).
</div>

      </div>
    </div>
  );
}

function MultiplesForm({
  v,
  onChange,
  out,
}: {
  v: MultipleInputs;
  onChange: (patch: Partial<MultipleInputs>) => void;
  out: MultOutput;
}) {
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <SelectMetric value={v.metric} onChange={(m) => onChange({ metric: m })} />
        <Num label="Net Debt (MXN)" value={v.netDebt} onChange={(x) => onChange({ netDebt: x })} />

        <Num label="EBITDA LTM (MXN)" value={v.ebitdaLTM} onChange={(x) => onChange({ ebitdaLTM: x })} />
        <Num label="Ventas LTM (MXN)" value={v.revenueLTM} onChange={(x) => onChange({ revenueLTM: x })} />

        <Num label="EV Multiple Low" value={v.evMultipleLow} onChange={(x) => onChange({ evMultipleLow: x })} />
        <Num label="EV Multiple Base" value={v.evMultipleBase} onChange={(x) => onChange({ evMultipleBase: x })} />
        <Num label="EV Multiple High" value={v.evMultipleHigh} onChange={(x) => onChange({ evMultipleHigh: x })} />
      </div>

      <div className="rounded-3xl border border-black/10 bg-white/70 p-4">
        <div className="text-black/60 text-xs">Resumen Múltiplos</div>
        <div className="mt-2 grid sm:grid-cols-3 gap-3">
          <Mini label="EV (Base)" value={mxn(out.evBase)} />
          <Mini label="Equity (Base)" value={mxn(out.equityBase)} />
          <Mini label="Métrica" value={v.metric === "ebitda" ? "EBITDA" : "Ventas"} />
        </div>
        <div className="mt-3 text-[11px] text-black/45">
          EV = Métrica × Múltiplo. Equity = EV - Net Debt.
        </div>
      </div>
    </div>
  );
}

function TechForm({
  v,
  onChange,
  out,
}: {
  v: TechInputs;
  onChange: (patch: Partial<TechInputs>) => void;
  out: TechOutput;
}) {
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <Num label="ARR (MXN)" value={v.arr} onChange={(x) => onChange({ arr: x })} />
        <Num label="Gross Margin (%)" value={v.grossMargin} onChange={(x) => onChange({ grossMargin: x })} />

        <Num label="CAC (MXN)" value={v.cac} onChange={(x) => onChange({ cac: x })} />
        <Num label="ARPA mensual (MXN)" value={v.arpaMonthly} onChange={(x) => onChange({ arpaMonthly: x })} />

        <Num label="Churn mensual (%)" value={v.churnMonthly} onChange={(x) => onChange({ churnMonthly: x })} />
        <Num label="NRR anual (%)" value={v.nrr} onChange={(x) => onChange({ nrr: x })} />

        <Num label="Payback (meses)" value={v.paybackMonths} onChange={(x) => onChange({ paybackMonths: x })} />
        <Num label="Growth anual (%)" value={v.growthAnnual} onChange={(x) => onChange({ growthAnnual: x })} />

        <Num label="Rule of 40 target" value={v.ruleOf40Target} onChange={(x) => onChange({ ruleOf40Target: x })} />
        <Num label="Net Debt (MXN)" value={v.netDebt} onChange={(x) => onChange({ netDebt: x })} />

        <Num label="EV/ARR Low" value={v.evArrLow} onChange={(x) => onChange({ evArrLow: x })} />
        <Num label="EV/ARR Base" value={v.evArrBase} onChange={(x) => onChange({ evArrBase: x })} />
        <Num label="EV/ARR High" value={v.evArrHigh} onChange={(x) => onChange({ evArrHigh: x })} />
      </div>

      <div className="rounded-3xl border border-black/10 bg-white/70 p-4">
        <div className="text-black/60 text-xs">Resumen Tech (unit economics)</div>

        <div className="mt-2 grid sm:grid-cols-3 gap-3">
          <Mini label="LTV/CAC" value={out.ltvCac.toFixed(2)} />
          <Mini label="Health Score (0–100)" value={String(out.healthScore)} />
          <Mini label="EV/ARR (Base)" value={out.evArrBase.toFixed(2) + "x"} />
        </div>

        <div className="mt-3 text-[11px] text-black/45">
          LTV ≈ (ARPA × GM) / churn. EV ≈ ARR × (EV/ARR). El “Health Score” mezcla LTV/CAC, NRR, churn, payback y growth.
        </div>
      </div>
    </div>
  );
}

/* ===========================
   CALCULATORS
   =========================== */

type DcfOutput = {
  pvFcff: number;
  pvTerminal: number;
  evBase: number;
  equityLow: number;
  equityBase: number;
  equityHigh: number;
};

function calcDCF(i: DcfInputs): DcfOutput {
  const years = clampInt(i.years, 3, 10);

  const revenue: number[] = [];
  const fcff: number[] = [];
  const disc: number[] = [];

  const wacc = pct(i.wacc);
  const gT = pct(i.terminalGrowth);

  let rev = Math.max(0, i.revenue0 || 0);

  for (let t = 1; t <= years; t++) {
    const g = Math.max(-0.8, pct(i.growthY1) - (t - 1) * pct(i.growthDecay)); // decay en puntos, convertimos a proporción
    rev = rev * (1 + g);
    revenue.push(rev);

    const ebit = rev * pct(i.ebitMargin);
    const nopat = ebit * (1 - pct(i.taxRate));
    const da = rev * pct(i.daPctRevenue);
    const capex = rev * pct(i.capexPctRevenue);
    const dNWC = rev * pct(i.nwchgPctRevenue);

    const f = nopat + da - capex - dNWC;
    fcff.push(f);

    const df = 1 / Math.pow(1 + wacc, t);
    disc.push(df);
  }

  const pvFcff = sum(fcff.map((f, idx) => f * disc[idx]));

  // Terminal value: FCFF_{n+1}/(WACC-g)
  const fcffN = fcff[years - 1] || 0;
  const fcffNext = fcffN * (1 + gT);

  const denom = Math.max(0.0001, wacc - gT);
  const tv = fcffNext / denom;
  const pvTerminal = tv * disc[years - 1];

  const evBase = pvFcff + pvTerminal;

  // Sensitivity range: tweak WACC ±150bps and terminal g ±100bps
  const evLow = dcfSensitivity(i, years, i.wacc + 1.5, Math.max(-5, i.terminalGrowth - 1));
  const evHigh = dcfSensitivity(i, years, Math.max(1, i.wacc - 1.5), i.terminalGrowth + 1);

  const equityBase = evBase - (i.netDebt || 0);
  const equityLow = evLow - (i.netDebt || 0);
  const equityHigh = evHigh - (i.netDebt || 0);

  return {
    pvFcff,
    pvTerminal,
    evBase,
    equityLow,
    equityBase,
    equityHigh,
  };
}

function dcfSensitivity(i: DcfInputs, years: number, waccPct: number, gTPct: number): number {
  const wacc = pct(waccPct);
  const gT = pct(gTPct);

  let rev = Math.max(0, i.revenue0 || 0);
  const fcff: number[] = [];
  const disc: number[] = [];

  for (let t = 1; t <= years; t++) {
    const g = Math.max(-0.8, pct(i.growthY1) - (t - 1) * pct(i.growthDecay));
    rev = rev * (1 + g);

    const ebit = rev * pct(i.ebitMargin);
    const nopat = ebit * (1 - pct(i.taxRate));
    const da = rev * pct(i.daPctRevenue);
    const capex = rev * pct(i.capexPctRevenue);
    const dNWC = rev * pct(i.nwchgPctRevenue);

    const f = nopat + da - capex - dNWC;
    fcff.push(f);

    disc.push(1 / Math.pow(1 + wacc, t));
  }

  const pvFcff = sum(fcff.map((f, idx) => f * disc[idx]));
  const fcffN = fcff[years - 1] || 0;
  const fcffNext = fcffN * (1 + gT);
  const denom = Math.max(0.0001, wacc - gT);
  const tv = fcffNext / denom;
  const pvTerminal = tv * disc[years - 1];
  return pvFcff + pvTerminal;
}

type MultOutput = {
  evLow: number;
  evBase: number;
  evHigh: number;
  equityLow: number;
  equityBase: number;
  equityHigh: number;
};

function calcMultiples(i: MultipleInputs): MultOutput {
  const metricVal = i.metric === "ebitda" ? i.ebitdaLTM : i.revenueLTM;

  const evLow = metricVal * (i.evMultipleLow || 0);
  const evBase = metricVal * (i.evMultipleBase || 0);
  const evHigh = metricVal * (i.evMultipleHigh || 0);

  const nd = i.netDebt || 0;

  return {
    evLow,
    evBase,
    evHigh,
    equityLow: evLow - nd,
    equityBase: evBase - nd,
    equityHigh: evHigh - nd,
  };
}

type TechOutput = {
  ltv: number;
  ltvCac: number;
  healthScore: number;
  evLow: number;
  evBase: number;
  evHigh: number;
  evArrBase: number;
  equityLow: number;
  equityBase: number;
  equityHigh: number;
};

function calcTech(i: TechInputs): TechOutput {
  const gm = pct(i.grossMargin);
  const churnM = Math.max(0.0001, pct(i.churnMonthly)); // mensual
  const arpaM = Math.max(0, i.arpaMonthly || 0);
  const cac = Math.max(0.0001, i.cac || 0);

  // LTV ≈ (ARPA * GM) / churn
  const ltv = (arpaM * gm) / churnM;
  const ltvCac = ltv / cac;

  const score = techHealthScore({
    ltvCac,
    nrr: i.nrr || 0,
    churnMonthly: i.churnMonthly || 0,
    paybackMonths: i.paybackMonths || 0,
    growthAnnual: i.growthAnnual || 0,
    grossMargin: i.grossMargin || 0,
    ruleOf40Target: i.ruleOf40Target || 40,
  });

  // EV ~ ARR * (EV/ARR)
  const arr = Math.max(0, i.arr || 0);
  const evLow = arr * (i.evArrLow || 0);
  const evBase = arr * (i.evArrBase || 0);
  const evHigh = arr * (i.evArrHigh || 0);

  const nd = i.netDebt || 0;

  return {
    ltv,
    ltvCac,
    healthScore: score,
    evLow,
    evBase,
    evHigh,
    evArrBase: i.evArrBase || 0,
    equityLow: evLow - nd,
    equityBase: evBase - nd,
    equityHigh: evHigh - nd,
  };
}

function techHealthScore(x: {
  ltvCac: number;
  nrr: number;
  churnMonthly: number;
  paybackMonths: number;
  growthAnnual: number;
  grossMargin: number;
  ruleOf40Target: number;
}): number {
  // Normalizaciones: (simple pero útil)
  const sLtv = clamp01((x.ltvCac - 1) / 3); // 1..4 -> 0..1
  const sNrr = clamp01((x.nrr - 90) / 40); // 90..130 -> 0..1
  const sChurn = clamp01(1 - (x.churnMonthly / 6)); // 0..6% -> 1..0
  const sPayback = clamp01(1 - (x.paybackMonths / 18)); // 0..18 -> 1..0
  const sGM = clamp01((x.grossMargin - 40) / 40); // 40..80 -> 0..1
  // rule of 40 proxy: growth + (gross margin - 50) "ish"
  const rule40 = x.growthAnnual + (x.grossMargin - 50);
  const sR40 = clamp01(rule40 / Math.max(1, x.ruleOf40Target));

  const score = 100 * (0.22 * sLtv + 0.18 * sNrr + 0.18 * sChurn + 0.14 * sPayback + 0.14 * sGM + 0.14 * sR40);
  return Math.round(score);
}

/* ===========================
   UI atoms
   =========================== */

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-2xl border px-3 py-2 text-sm font-semibold transition",
        active ? "border-black/15 bg-white text-black" : "border-black/10 bg-white/60 hover:bg-white text-black/80",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Kpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/70 p-4">
      <div className="text-black/60 text-xs">{title}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      <div className="mt-1 text-[11px] text-black/45">{hint}</div>
    </div>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/70 p-4">
      <div className="text-black/60 text-xs">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="text-black/55 text-[11px]">{label}</div>
      <div className="mt-1 font-semibold text-black">{value}</div>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] text-black/60 mb-1">{label}</label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(toNum(e.target.value))}
        className="w-full rounded-2xl bg-white border border-black/10 text-black px-3 py-2 outline-none focus:border-black/25 text-sm"
      />
    </div>
  );
}

function SelectMetric({
  value,
  onChange,
}: {
  value: "ebitda" | "revenue";
  onChange: (m: "ebitda" | "revenue") => void;
}) {
  return (
    <div>
      <label className="block text-[11px] text-black/60 mb-1">Métrica</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as any)}
        className="w-full rounded-2xl bg-white border border-black/10 text-black px-3 py-2 outline-none focus:border-black/25 text-sm"
      >
        <option value="ebitda">EV / EBITDA</option>
        <option value="revenue">EV / Ventas</option>
      </select>
    </div>
  );
}

function BoxPrint({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 11, color: "#666" }}>{title}</div>
      <div style={{ fontWeight: 800, fontSize: 14 }}>{value}</div>
    </div>
  );
}

/* ===========================
   Helpers
   =========================== */

function labelMethod(m: Method) {
  if (m === "dcf") return "DCF";
  if (m === "multiples") return "Múltiplos";
  return "Tech-based";
}

function pickOut(m: Method, d: DcfOutput, mu: MultOutput, t: TechOutput) {
  if (m === "dcf") return d;
  if (m === "multiples") return mu;
  return t;
}

function rangeLow(s: State, d: DcfOutput, mu: MultOutput, t: TechOutput) {
  return pickOut(s.method, d, mu, t).equityLow;
}

function rangeHigh(s: State, d: DcfOutput, mu: MultOutput, t: TechOutput) {
  return pickOut(s.method, d, mu, t).equityHigh;
}

function pct(x: number) {
  return (x || 0) / 100;
}

function fmtPct(x: number) {
  return `${(x || 0).toFixed(1)}%`;
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}

function toNum(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clampInt(n: number, a: number, b: number) {
  const x = Math.round(n);
  return Math.max(a, Math.min(b, x));
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function mxn(n: number) {
  const x = Number.isFinite(n) ? n : 0;
  return x.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}
