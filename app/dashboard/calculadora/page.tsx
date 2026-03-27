"use client";

import React, { useState, useMemo, useCallback } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type AssetType = "term_loan" | "revolvente" | "arrendamiento_puro" | "arrendamiento_financiero";
type StressScenario = "base" | "moderado" | "severo" | "extremo";

interface Inputs {
  assetType: AssetType;
  // Common
  monto: number;
  tasa: number;
  plazoMeses: number;
  tasaDescuento: number;
  // Credit risk
  pd: number;      // Probability of Default %
  lgd: number;     // Loss Given Default %
  // Revolvente
  utilizacion: number;
  lineaTotal: number;
  // Arrendamiento
  valorResidual: number;
  rentaMensual: number;
  // Stress
  stressScenario: StressScenario;
}

interface Results {
  vpn: number;
  tir: number;
  duration: number;
  convexity: number;
  expectedLoss: number;
  ead: number;
  riskAdjustedReturn: number;
  cashFlows: number[];
  stressVpn: Record<StressScenario, number>;
  stressTir: Record<StressScenario, number>;
  spreadBps: number;
}

// ─── MATH ENGINE ─────────────────────────────────────────────────────────────
function calcTIR(cashFlows: number[], guess = 0.01): number {
  let rate = guess;
  for (let i = 0; i < 200; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const disc = Math.pow(1 + rate, t);
      npv  += cashFlows[t] / disc;
      dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
    }
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < 1e-10) return newRate;
    rate = newRate;
  }
  return rate;
}

function calcVPN(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

function calcDuration(cashFlows: number[], rate: number): number {
  const price = calcVPN(cashFlows.slice(1).map((cf, i) => cf), rate);
  if (price === 0) return 0;
  let weightedTime = 0;
  for (let t = 1; t < cashFlows.length; t++) {
    weightedTime += t * cashFlows[t] / Math.pow(1 + rate, t);
  }
  return weightedTime / price;
}

function calcConvexity(cashFlows: number[], rate: number): number {
  const price = cashFlows.slice(1).reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i + 1), 0);
  if (price === 0) return 0;
  let conv = 0;
  for (let t = 1; t < cashFlows.length; t++) {
    conv += t * (t + 1) * cashFlows[t] / Math.pow(1 + rate, t + 2);
  }
  return conv / price;
}

function generateCashFlows(inputs: Inputs): number[] {
  const { assetType, monto, tasa, plazoMeses, valorResidual, rentaMensual, utilizacion, lineaTotal } = inputs;
  const r = tasa / 100 / 12;
  const flows: number[] = [];

  if (assetType === "term_loan") {
    const cuota = monto * r / (1 - Math.pow(1 + r, -plazoMeses));
    flows.push(-monto);
    for (let t = 1; t <= plazoMeses; t++) flows.push(cuota);

  } else if (assetType === "revolvente") {
    const used = lineaTotal * utilizacion / 100;
    const cuota = used * r / (1 - Math.pow(1 + r, -plazoMeses));
    flows.push(-used);
    for (let t = 1; t < plazoMeses; t++) flows.push(cuota);
    flows.push(cuota + (used - cuota * plazoMeses + monto * 0.01)); // undrawn fee

  } else if (assetType === "arrendamiento_puro") {
    flows.push(-monto);
    for (let t = 1; t <= plazoMeses; t++) flows.push(rentaMensual);

  } else { // arrendamiento_financiero
    const vr = monto * valorResidual / 100;
    const base = (monto - vr / Math.pow(1 + r, plazoMeses));
    const cuota = base * r / (1 - Math.pow(1 + r, -plazoMeses));
    flows.push(-monto);
    for (let t = 1; t < plazoMeses; t++) flows.push(cuota);
    flows.push(cuota + vr);
  }

  return flows;
}

function applyStress(flows: number[], scenario: StressScenario, pd: number, lgd: number): number[] {
  const haircut: Record<StressScenario, number> = {
    base: 0,
    moderado: 0.15,
    severo: 0.30,
    extremo: 0.55,
  };
  const stressPD: Record<StressScenario, number> = {
    base: pd,
    moderado: pd * 1.5,
    severo: pd * 2.5,
    extremo: pd * 4,
  };
  const h = haircut[scenario];
  const sPD = Math.min(stressPD[scenario], 100) / 100;
  return flows.map((cf, t) => t === 0 ? cf : cf * (1 - h) * (1 - sPD * lgd / 100));
}

function compute(inputs: Inputs): Results {
  const flows = generateCashFlows(inputs);
  const r = inputs.tasaDescuento / 100 / 12;

  const vpn = calcVPN(flows, r);
  const tirMonthly = calcTIR(flows);
  const tirAnual = (Math.pow(1 + tirMonthly, 12) - 1) * 100;
  const duration = calcDuration(flows, r) / 12; // in years
  const convexity = calcConvexity(flows, r);

  const ead = inputs.assetType === "revolvente"
    ? inputs.lineaTotal * inputs.utilizacion / 100
    : inputs.monto;
  const expectedLoss = ead * (inputs.pd / 100) * (inputs.lgd / 100);
  const riskAdjustedReturn = tirAnual - (inputs.pd / 100) * (inputs.lgd / 100) * 100;

  const scenarios: StressScenario[] = ["base", "moderado", "severo", "extremo"];
  const stressVpn = {} as Record<StressScenario, number>;
  const stressTir = {} as Record<StressScenario, number>;
  for (const sc of scenarios) {
    const sf = applyStress(flows, sc, inputs.pd, inputs.lgd);
    stressVpn[sc] = calcVPN(sf, r);
    const tirM = calcTIR(sf);
    stressTir[sc] = (Math.pow(1 + tirM, 12) - 1) * 100;
  }

  const riskFreeRate = 10.5; // TIIE approx
  const spreadBps = (tirAnual - riskFreeRate) * 100;

  return {
    vpn, tir: tirAnual, duration, convexity,
    expectedLoss, ead, riskAdjustedReturn,
    cashFlows: flows,
    stressVpn, stressTir, spreadBps,
  };
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const fmt = (n: number, dec = 2) =>
  new Intl.NumberFormat("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
const fmtM = (n: number) => {
  if (Math.abs(n) >= 1e6) return `$${fmt(n / 1e6, 2)}M`;
  if (Math.abs(n) >= 1e3) return `$${fmt(n / 1e3, 1)}K`;
  return `$${fmt(n, 0)}`;
};

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULTS: Inputs = {
  assetType: "term_loan",
  monto: 5_000_000,
  tasa: 18,
  plazoMeses: 36,
  tasaDescuento: 12,
  pd: 3.5,
  lgd: 45,
  utilizacion: 70,
  lineaTotal: 7_000_000,
  valorResidual: 20,
  rentaMensual: 85_000,
  stressScenario: "base",
};

// ─── MINI CHART COMPONENTS ────────────────────────────────────────────────────
function CashFlowBar({ flows, height = 80 }: { flows: number[]; height?: number }) {
  const visible = flows.slice(1, 37); // max 36 bars
  const max = Math.max(...visible);
  const min = Math.min(...visible, 0);
  const range = max - min || 1;
  const barW = Math.max(2, Math.floor(360 / visible.length) - 1);

  return (
    <svg width="100%" height={height} viewBox={`0 0 360 ${height}`} preserveAspectRatio="none" style={{ display:"block" }}>
      <line x1="0" y1={height * (max / range)} x2="360" y2={height * (max / range)} stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
      {visible.map((cf, i) => {
        const pct = (cf - min) / range;
        const barH = Math.max(2, pct * (height - 4));
        const x = (i / visible.length) * 360;
        const y = height - barH - 2;
        const color = cf >= 0 ? "#059669" : "#DC2626";
        return <rect key={i} x={x} y={y} width={barW} height={barH} fill={color} opacity={0.8} rx={1}/>;
      })}
    </svg>
  );
}

function StressChart({ stressVpn }: { stressVpn: Record<StressScenario, number> }) {
  const scenarios: StressScenario[] = ["base", "moderado", "severo", "extremo"];
  const labels = ["Base", "Moderado", "Severo", "Extremo"];
  const colors = ["#059669", "#D97706", "#EA580C", "#DC2626"];
  const vals = scenarios.map(s => stressVpn[s]);
  const max = Math.max(...vals.map(Math.abs), 1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {scenarios.map((sc, i) => {
        const val = stressVpn[sc];
        const pct = Math.abs(val) / max;
        const positive = val >= 0;
        return (
          <div key={sc} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:64, fontFamily:"var(--mono)", fontSize:10, color:"var(--fg3)", letterSpacing:"0.06em", textAlign:"right", flexShrink:0 }}>{labels[i]}</div>
            <div style={{ flex:1, height:20, background:"rgba(13,20,38,.05)", borderRadius:4, overflow:"hidden", position:"relative" }}>
              <div style={{
                position:"absolute",
                left: positive ? "50%" : `${50 - pct * 50}%`,
                width: `${pct * 50}%`,
                height:"100%",
                background: colors[i],
                opacity: 0.75,
                borderRadius:4,
                transition:"all .4s cubic-bezier(.16,1,.3,1)",
              }}/>
              <div style={{ position:"absolute", left:0, top:0, right:0, bottom:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontFamily:"var(--mono)", fontSize:10, color: val >= 0 ? colors[i] : "#F87171", fontWeight:600 }}>
                  {fmtM(val)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SLIDER INPUT ─────────────────────────────────────────────────────────────
function SliderInput({ label, value, min, max, step, unit, onChange, mono }: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void; mono?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <label style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--fg3)", letterSpacing:"0.08em" }}>{label}</label>
        <span style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--fg1)", fontWeight:600 }}>
          {mono ? fmtM(value) : `${fmt(value, step < 1 ? 1 : 0)}${unit || ""}`}
        </span>
      </div>
      <div style={{ position:"relative", height:4, background:"rgba(255,255,255,.08)", borderRadius:2 }}>
        <div style={{ position:"absolute", left:0, width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#8B5CF6,#4F8EF7)", borderRadius:2 }}/>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ position:"absolute", inset:0, width:"100%", opacity:0, cursor:"pointer", height:"100%", margin:0 }}
        />
        <div style={{ position:"absolute", left:`${pct}%`, top:"50%", transform:"translate(-50%,-50%)", width:12, height:12, borderRadius:"50%", background:"#fff", boxShadow:"0 0 0 2px rgba(139,92,246,.6)", pointerEvents:"none" }}/>
      </div>
    </div>
  );
}

// ─── NUMBER INPUT ─────────────────────────────────────────────────────────────
function NumInput({ label, value, onChange, prefix, suffix, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; step?: number;
}) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--fg3)", letterSpacing:"0.08em" }}>{label}</label>
      <div style={{ display:"flex", alignItems:"center", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:8, overflow:"hidden" }}>
        {prefix && <span style={{ padding:"0 10px", fontFamily:"var(--mono)", fontSize:11, color:"var(--fg3)", borderRight:"1px solid rgba(255,255,255,.07)", whiteSpace:"nowrap" }}>{prefix}</span>}
        <input
          type="number" value={value} step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ flex:1, background:"transparent", border:"none", outline:"none", padding:"9px 12px", fontFamily:"var(--mono)", fontSize:13, color:"var(--fg1)", width:0 }}
        />
        {suffix && <span style={{ padding:"0 10px", fontFamily:"var(--mono)", fontSize:11, color:"var(--fg3)", borderLeft:"1px solid rgba(255,255,255,.07)" }}>{suffix}</span>}
      </div>
    </div>
  );
}

// ─── KPI TILE ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, color, delta }: {
  label: string; value: string; sub?: string; color?: string; delta?: number;
}) {
  return (
    <div style={{ background:"#fff", border:"1px solid rgba(13,20,38,.09)", borderRadius:12, padding:"16px 18px", transition:"all .2s" }}>
      <div style={{ fontFamily:"var(--mono)", fontSize:9.5, color:"var(--fg3)", letterSpacing:"0.1em", marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.05em", color: color || "var(--fg1)", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--fg3)", marginTop:5 }}>{sub}</div>}
      {delta !== undefined && (
        <div style={{ fontFamily:"var(--mono)", fontSize:10, color: delta >= 0 ? "#00E5A0" : "#F87171", marginTop:4 }}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)} bps vs TIIE
        </div>
      )}
    </div>
  );
}

// ─── ASSET TYPE SELECTOR ──────────────────────────────────────────────────────
const ASSET_TYPES: { id: AssetType; label: string; icon: string }[] = [
  { id:"term_loan",               label:"Term Loan",           icon:"M2 8h12M8 2v12" },
  { id:"revolvente",              label:"Revolvente",          icon:"M2 6h3M11 6h3M2 10h3M11 10h3M5 6v4M11 6v4" },
  { id:"arrendamiento_puro",      label:"Arrend. Puro",        icon:"M3 3h10v10H3zM7 7h2v2H7z" },
  { id:"arrendamiento_financiero",label:"Arrend. Financiero",  icon:"M3 13l4-4 3 3 4-6" },
];

const STRESS_LABELS: Record<StressScenario, string> = {
  base:"Base", moderado:"Moderado", severo:"Severo", extremo:"Extremo"
};
const STRESS_COLORS: Record<StressScenario, string> = {
  base:"#059669", moderado:"#D97706", severo:"#EA580C", extremo:"#DC2626"
};


// ─── CARTERA TYPES ────────────────────────────────────────────────────────────
interface CartRow {
  id: string;
  acreditado: string;
  monto: number;
  tasa: number;
  plazo: number;
  mora: number;
  garantia: string;
  sector: string;
  score: number;
  rating: string;
  el: number;
  vpn: number;
  status: 'vigente'|'vencido'|'cartera_vencida';
}

function calcRating(score: number, mora: number, garantia: string): string {
  if (mora > 180) return 'D';
  if (mora > 90)  return mora > 120 ? 'CC' : 'CCC';
  const g = garantia?.toLowerCase() || '';
  const hasGarantia = g.includes('hipotec') || g.includes('prend') || g.includes('aval');
  if (score >= 85 && mora === 0 && hasGarantia) return 'AAA';
  if (score >= 80 && mora === 0) return 'AA';
  if (score >= 75 && mora < 10) return 'A';
  if (score >= 68 && mora < 30) return 'BBB';
  if (score >= 58 && mora < 60) return 'BB';
  if (score >= 48 && mora < 90) return 'B';
  if (score >= 35) return 'CCC';
  return 'CC';
}

const RATING_COLOR: Record<string, string> = {
  AAA:'#065F46', AA:'#065F46', A:'#059669',
  BBB:'#1D4ED8', BB:'#D97706', B:'#EA580C',
  CCC:'#DC2626', CC:'#991B1B', D:'#7F1D1D',
};
const RATING_BG: Record<string, string> = {
  AAA:'#D1FAE5', AA:'#D1FAE5', A:'#ECFDF5',
  BBB:'#DBEAFE', BB:'#FEF3C7', B:'#FFEDD5',
  CCC:'#FEE2E2', CC:'#FEE2E2', D:'#FEE2E2',
};

function autoDetectFields(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  const aliases: Record<string, string[]> = {
    acreditado:  ['acreditado','nombre','cliente','empresa','razon_social','deudor','borrower','name'],
    monto:       ['monto','saldo','capital','principal','amount','balance','saldo_insoluto','saldo_capital'],
    tasa:        ['tasa','rate','tasa_interes','tasa_anual','interest_rate','rendimiento'],
    plazo:       ['plazo','term','meses','months','plazo_meses','plazo_restante'],
    mora:        ['mora','dias_mora','days_past_due','dpd','atraso','vencido','overdue'],
    garantia:    ['garantia','colateral','collateral','garantia_tipo','tipo_garantia'],
    sector:      ['sector','industria','industry','giro','actividad'],
    score:       ['score','calificacion_interna','puntaje','credit_score','scoring'],
    status:      ['status','estatus','estado','situacion','credito_status'],
  };
  for (const [field, keys] of Object.entries(aliases)) {
    for (const h of headers) {
      const hn = h.toLowerCase().replace(/[^a-z0-9_]/g,'_');
      if (keys.some(k => hn.includes(k) || k.includes(hn))) {
        if (!map[field]) map[field] = h;
        break;
      }
    }
  }
  return map;
}

function parseCartRows(rows: Record<string, unknown>[], fieldMap: Record<string, string>): CartRow[] {
  return rows.map((r, i) => {
    const g = (f: string) => fieldMap[f] ? (r[fieldMap[f]] ?? '') : '';
    const monto   = parseFloat(String(g('monto')).replace(/[,$]/g,'')) || 0;
    const tasa    = parseFloat(String(g('tasa')).replace(/[%]/g,'')) || 15;
    const plazo   = parseInt(String(g('plazo'))) || 12;
    const mora    = parseInt(String(g('mora'))) || 0;
    const score   = parseInt(String(g('score'))) || Math.max(30, Math.min(95, 80 - mora/3));
    const garantia= String(g('garantia')) || 'Sin garantía';
    const sector  = String(g('sector')) || 'General';
    const acreditado = String(g('acreditado')) || `Crédito ${i+1}`;
    const statusRaw  = String(g('status')).toLowerCase();
    const status: CartRow['status'] = statusRaw.includes('venc') ? 'vencido' : statusRaw.includes('carta') ? 'cartera_vencida' : 'vigente';
    const rating  = calcRating(score, mora, garantia);
    const pd      = mora > 180 ? 0.95 : mora > 90 ? 0.45 : mora > 30 ? 0.18 : mora > 0 ? 0.08 : 0.025;
    const lgd     = garantia.toLowerCase().includes('hipotec') ? 0.35 : garantia.toLowerCase().includes('prend') ? 0.45 : 0.60;
    const el      = monto * pd * lgd;
    const rM      = tasa / 100 / 12;
    const vpn     = rM > 0 ? monto * rM / (1 - Math.pow(1+rM, -plazo)) * ((1 - Math.pow(1+rM,-plazo))/rM) - monto * 0.02 : monto * 0.98;
    return { id:`row-${i}`, acreditado, monto, tasa, plazo, mora, garantia, sector, score, rating, el, vpn, status };
  });
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function CalculadoraPage() {
  const [activeMainTab, setActiveMainTab] = useState<'instrumento'|'cartera'|'reporte'>('instrumento');
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [cartData, setCartData] = useState<CartRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const set = useCallback(<K extends keyof Inputs>(k: K, v: Inputs[K]) =>
    setInputs(p => ({ ...p, [k]: v })), []);

  const results = useMemo(() => {
    try { return compute(inputs); }
    catch { return null; }
  }, [inputs]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    :root {
      --sans: 'DM Sans', system-ui, sans-serif;
      --mono: 'JetBrains Mono', monospace;
      --bg:   #F4F6FB;
      --bg2:  #FFFFFF;
      --bg3:  #F0F2F8;
      --fg1:  #0D1426;
      --fg2:  rgba(13,20,38,.62);
      --fg3:  rgba(13,20,38,.38);
      --bdr:  rgba(13,20,38,.09);
      --bdr2: rgba(13,20,38,.18);
      --pur:  #7C3AED;
      --blu:  #1D4ED8;
      --cyn:  #0891B2;
      --grn:  #059669;
      --red:  #DC2626;
      --amb:  #D97706;
    }
    body { font-family:var(--sans); background:var(--bg); color:var(--fg1); }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:#1D4ED8; cursor:pointer; box-shadow:0 0 0 2px #fff, 0 0 0 3px rgba(29,78,216,.2); }
    input[type=range]::-webkit-slider-runnable-track { height:4px; background:transparent; }
    input[type=number]::-webkit-inner-spin-button { opacity:.3; }
    .scroll { scrollbar-width:thin; scrollbar-color:rgba(13,20,38,.12) transparent; }
    .scroll::-webkit-scrollbar { width:4px; }
    .scroll::-webkit-scrollbar-thumb { background:rgba(13,20,38,.12); border-radius:2px; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    .fade { animation:fadeUp .4s cubic-bezier(.16,1,.3,1) forwards; }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
    .asset-btn { background:#fff; border:1.5px solid var(--bdr); border-radius:10px; padding:10px 14px; cursor:pointer; transition:all .2s; display:flex; flex-direction:column; align-items:center; gap:7px; }
    .asset-btn:hover { background:#EEF2FF; border-color:rgba(29,78,216,.35); box-shadow:0 2px 8px rgba(29,78,216,.1); }
    .asset-btn.active { background:#EEF2FF; border-color:#1D4ED8; box-shadow:0 0 0 3px rgba(29,78,216,.1); }
    .stress-btn { padding:6px 14px; border-radius:8px; font-family:var(--mono); font-size:10px; font-weight:600; border:1px solid var(--bdr); background:#fff; color:var(--fg3); cursor:pointer; transition:all .18s; letter-spacing:.05em; box-shadow:0 1px 2px rgba(13,20,38,.05); }
    .stress-btn.active { color:#fff; border-color:transparent; }
    .section-title { font-family:var(--mono); font-size:9.5px; color:var(--fg3); letter-spacing:.14em; text-transform:uppercase; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
    .section-title::after { content:''; flex:1; height:1px; background:var(--bdr); }
    .panel { background:#fff; border:1px solid var(--bdr); border-radius:14px; padding:20px; box-shadow:0 1px 4px rgba(13,20,38,.05); }
    .grad-text { background:linear-gradient(135deg,#7C3AED,#1D4ED8,#0891B2); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .main-tab { padding:9px 22px; border-radius:9px; font-family:var(--sans); font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .18s; letter-spacing:-.01em; background:transparent; color:rgba(13,20,38,.45); }
    .main-tab:hover { background:rgba(13,20,38,.05); color:#0D1426; }
    .main-tab.active { background:#fff; color:#0D1426; box-shadow:0 1px 4px rgba(13,20,38,.1); }
    .drop-zone { border:2px dashed rgba(13,20,38,.15); border-radius:14px; padding:48px 32px; text-align:center; cursor:pointer; transition:all .2s; background:#fff; }
    .drop-zone:hover, .drop-zone.over { border-color:#1D4ED8; background:#EEF2FF; }
    .rating-badge { display:inline-flex; align-items:center; justify-content:center; padding:2px 8px; border-radius:5px; font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:.04em; }
    .cart-tbl { width:100%; border-collapse:collapse; font-size:12.5px; }
    .cart-tbl th { padding:9px 12px; text-align:left; font-family:var(--mono); font-size:9px; color:rgba(13,20,38,.38); letter-spacing:.1em; text-transform:uppercase; border-bottom:1px solid rgba(13,20,38,.08); background:rgba(13,20,38,.02); font-weight:500; }
    .cart-tbl td { padding:10px 12px; border-bottom:1px solid rgba(13,20,38,.05); color:#0D1426; }
    .cart-tbl tr:hover td { background:rgba(29,78,216,.025); }
    .cart-tbl tr:last-child td { border-bottom:none; }
    .sort-btn { background:none; border:none; cursor:pointer; font-family:var(--mono); font-size:9px; color:rgba(13,20,38,.38); letter-spacing:.1em; text-transform:uppercase; padding:0; display:flex; align-items:center; gap:4px; }
    .sort-btn:hover { color:#0D1426; }

  `;

  return (
    <div style={{ fontFamily:"var(--sans)", background:"#F4F6FB", color:"#0D1426", minHeight:"100vh", padding:"0 0 60px" }}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div style={{ borderBottom:"1px solid rgba(13,20,38,.09)", padding:"18px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(244,246,251,.97)", backdropFilter:"blur(20px)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <a href="/dashboard" style={{ display:"flex", alignItems:"center", gap:6, textDecoration:"none", color:"rgba(13,20,38,.45)", fontSize:13, fontFamily:"var(--mono)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 4L6 8l4 4"/></svg>
            Dashboard
          </a>
          <span style={{ color:"rgba(13,20,38,.25)" }}>/</span>
          <span style={{ fontFamily:"var(--mono)", fontSize:13, color:"rgba(13,20,38,.7)" }}>Calculadora de Cartera</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", background:"rgba(29,78,216,.06)", border:"1px solid rgba(29,78,216,.18)", borderRadius:8 }}>
            <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--grn)", display:"inline-block", animation:"pulse 2s ease-in-out infinite" }}/>
            <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"#1D4ED8" }}>CREDIT ANALYTICS v2</span>
          </div>
          <button
            onClick={() => {
              const r = results;
              if (!r) return;
              const data = `Calculadora Plinius\n\nTipo: ${inputs.assetType}\nMonto: ${fmtM(inputs.monto)}\nTasa: ${inputs.tasa}%\nPlazo: ${inputs.plazoMeses}m\n\nVPN: ${fmtM(r.vpn)}\nTIR: ${r.tir.toFixed(2)}%\nDuración: ${r.duration.toFixed(2)} años\nConvexidad: ${r.convexity.toFixed(4)}\nPérdida Esperada: ${fmtM(r.expectedLoss)}\nRAROC: ${r.riskAdjustedReturn.toFixed(2)}%\nSpread: ${r.spreadBps.toFixed(0)} bps`;
              navigator.clipboard?.writeText(data);
            }}
            style={{ padding:"7px 14px", background:"#fff", border:"1px solid rgba(13,20,38,.12)", borderRadius:8, color:"rgba(13,20,38,.55)", fontFamily:"var(--mono)", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="4" y="4" width="9" height="9" rx="1"/><path d="M3 12H2a1 1 0 01-1-1V3a1 1 0 011-1h8a1 1 0 011 1v1"/></svg>
            Copiar resultados
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"28px 32px" }}>

        {/* ── PAGE TITLE + TABS ── */}
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:"-0.045em", marginBottom:6 }}>
            Valuación de <span className="grad-text">Cartera de Crédito</span>
          </h1>
          <p style={{ fontSize:14, color:"var(--fg3)", fontFamily:"var(--mono)" }}>
            Análisis cuantitativo · DCF · Risk-Adjusted Returns · Stress Testing
          </p>
        </div>

        {/* ── MAIN TABS ── */}
        <div style={{ display:"inline-flex", background:"rgba(13,20,38,.05)", border:"1px solid rgba(13,20,38,.08)", borderRadius:12, padding:4, gap:3, marginBottom:24 }}>
          {([
            { id:'instrumento', label:'Instrumento', icon:'M8 2a6 6 0 100 12' },
            { id:'cartera',     label:'Cartera Excel', icon:'M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z' },
            { id:'reporte',     label:'Reporte PDF', icon:'M4 2h8l2 2v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z' },
          ] as const).map(t => (
            <button key={t.id} className={`main-tab${activeMainTab===t.id?' active':''}`}
              onClick={() => setActiveMainTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:7 }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon}/></svg>
              {t.label}
            </button>
          ))}
        </div>

        {activeMainTab === 'instrumento' && (
        <div style={{ display:"grid", gridTemplateColumns:"380px 1fr", gap:20, alignItems:"start" }}>

          {/* ══ LEFT PANEL — INPUTS ══ */}
          <div style={{ display:"flex", flexDirection:"column", gap:16, position:"sticky", top:88 }}>

            {/* Asset type */}
            <div className="panel">
              <div className="section-title">Tipo de activo</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {ASSET_TYPES.map(at => (
                  <button key={at.id} className={`asset-btn${inputs.assetType === at.id ? " active" : ""}`}
                    onClick={() => set("assetType", at.id)}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke={inputs.assetType === at.id ? "#A78BFA" : "var(--fg3)"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d={at.icon}/>
                    </svg>
                    <span style={{ fontFamily:"var(--mono)", fontSize:9.5, color: inputs.assetType === at.id ? "#A78BFA" : "var(--fg3)", letterSpacing:"0.06em", textAlign:"center" }}>
                      {at.label.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Core params */}
            <div className="panel" style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div className="section-title">Parámetros del instrumento</div>

              {inputs.assetType === "revolvente" ? (
                <>
                  <NumInput label="LÍNEA TOTAL" value={inputs.lineaTotal} onChange={v => set("lineaTotal", v)} prefix="MXN $" step={100000}/>
                  <SliderInput label="UTILIZACIÓN" value={inputs.utilizacion} min={10} max={100} step={5} unit="%" onChange={v => set("utilizacion", v)}/>
                </>
              ) : inputs.assetType === "arrendamiento_puro" ? (
                <>
                  <NumInput label="VALOR DEL ACTIVO" value={inputs.monto} onChange={v => set("monto", v)} prefix="MXN $" step={100000}/>
                  <NumInput label="RENTA MENSUAL" value={inputs.rentaMensual} onChange={v => set("rentaMensual", v)} prefix="MXN $" step={1000}/>
                </>
              ) : inputs.assetType === "arrendamiento_financiero" ? (
                <>
                  <NumInput label="VALOR DEL ACTIVO" value={inputs.monto} onChange={v => set("monto", v)} prefix="MXN $" step={100000}/>
                  <SliderInput label="VALOR RESIDUAL" value={inputs.valorResidual} min={0} max={50} step={1} unit="%" onChange={v => set("valorResidual", v)}/>
                </>
              ) : (
                <NumInput label="MONTO PRINCIPAL" value={inputs.monto} onChange={v => set("monto", v)} prefix="MXN $" step={100000}/>
              )}

              <SliderInput label="TASA NOMINAL ANUAL" value={inputs.tasa} min={5} max={60} step={0.5} unit="%" onChange={v => set("tasa", v)}/>
              <SliderInput label="PLAZO" value={inputs.plazoMeses} min={3} max={120} step={3} unit=" meses" onChange={v => set("plazoMeses", v)}/>
              <SliderInput label="TASA DE DESCUENTO" value={inputs.tasaDescuento} min={5} max={30} step={0.5} unit="%" onChange={v => set("tasaDescuento", v)}/>
            </div>

            {/* Credit risk */}
            <div className="panel" style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div className="section-title">Riesgo crediticio</div>
              <SliderInput label="PD — PROB. DEFAULT" value={inputs.pd} min={0.1} max={30} step={0.1} unit="%" onChange={v => set("pd", v)}/>
              <SliderInput label="LGD — PÉRDIDA EN DEFAULT" value={inputs.lgd} min={5} max={95} step={1} unit="%" onChange={v => set("lgd", v)}/>
              {results && (
                <div style={{ background:"rgba(220,38,38,.04)", border:"1px solid rgba(220,38,38,.12)", borderRadius:9, padding:"10px 12px", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--fg3)" }}>EL ANUALIZADA</span>
                  <span style={{ fontFamily:"var(--mono)", fontSize:11, color:"#F87171", fontWeight:600 }}>
                    {((inputs.pd / 100) * (inputs.lgd / 100) * 100).toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            {/* Stress scenario */}
            <div className="panel">
              <div className="section-title">Escenario de estrés</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {(["base","moderado","severo","extremo"] as StressScenario[]).map(sc => (
                  <button key={sc} className={`stress-btn${inputs.stressScenario === sc ? " active" : ""}`}
                    style={inputs.stressScenario === sc ? { background: STRESS_COLORS[sc], borderColor: STRESS_COLORS[sc] } : {}}
                    onClick={() => set("stressScenario", sc)}>
                    {STRESS_LABELS[sc].toUpperCase()}
                  </button>
                ))}
              </div>
              <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:6 }}>
                {([
                  { sc:"moderado", pd:"1.5×", haircut:"15%" },
                  { sc:"severo",   pd:"2.5×", haircut:"30%" },
                  { sc:"extremo",  pd:"4.0×", haircut:"55%" },
                ] as { sc: StressScenario; pd: string; haircut: string }[]).map(s => (
                  <div key={s.sc} style={{ display:"flex", justifyContent:"space-between", padding:"5px 10px", background:"rgba(13,20,38,.02)", borderRadius:7 }}>
                    <span style={{ fontFamily:"var(--mono)", fontSize:9.5, color: STRESS_COLORS[s.sc] }}>{STRESS_LABELS[s.sc].toUpperCase()}</span>
                    <span style={{ fontFamily:"var(--mono)", fontSize:9.5, color:"var(--fg3)" }}>PD {s.pd} · haircut {s.haircut}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ══ RIGHT PANEL — RESULTS ══ */}
          {results ? (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }} className="fade">

              {/* KPI Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                <KpiTile
                  label="VPN"
                  value={fmtM(results.vpn)}
                  sub={results.vpn >= 0 ? "Valor positivo" : "Valor negativo"}
                  color={results.vpn >= 0 ? "#00E5A0" : "#F87171"}
                />
                <KpiTile
                  label="TIR ANUAL"
                  value={`${results.tir.toFixed(2)}%`}
                  sub={`Spread ${results.spreadBps.toFixed(0)} bps`}
                  color="#60A5FA"
                  delta={results.spreadBps}
                />
                <KpiTile
                  label="DURACIÓN MACAULAY"
                  value={`${results.duration.toFixed(2)} años`}
                  sub={`Convexidad ${results.convexity.toFixed(3)}`}
                  color="#A78BFA"
                />
                <KpiTile
                  label="RAROC"
                  value={`${results.riskAdjustedReturn.toFixed(2)}%`}
                  sub="Risk-Adj. Return"
                  color={results.riskAdjustedReturn >= 12 ? "#00E5A0" : "#FBBF24"}
                />
              </div>

              {/* Expected Loss & EAD */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                <KpiTile label="EAD" value={fmtM(results.ead)} sub="Exposure at Default" color="var(--fg1)"/>
                <KpiTile label="PÉRDIDA ESPERADA" value={fmtM(results.expectedLoss)} sub={`PD ${inputs.pd}% × LGD ${inputs.lgd}%`} color="#F87171"/>
                <KpiTile
                  label="PÉRDIDA INESPERADA (1σ)"
                  value={fmtM(results.ead * Math.sqrt(inputs.pd/100 * (1 - inputs.pd/100)) * inputs.lgd/100)}
                  sub="Capital económico aprox."
                  color="#FBBF24"
                />
              </div>

              {/* Cash Flow Chart */}
              <div className="panel">
                <div className="section-title">Flujos de caja proyectados</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:12 }}>
                  <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--fg3)" }}>
                    {results.cashFlows.length - 1} períodos · mensual
                  </span>
                  <div style={{ display:"flex", gap:16 }}>
                    <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"#059669", display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ width:8, height:8, borderRadius:2, background:"#059669", display:"inline-block" }}/>Positivo
                    </span>
                    <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"#DC2626", display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ width:8, height:8, borderRadius:2, background:"#DC2626", display:"inline-block" }}/>Negativo
                    </span>
                  </div>
                </div>
                <CashFlowBar flows={results.cashFlows} height={90}/>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
                  <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--fg3)" }}>T+1</span>
                  <span style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--fg3)" }}>T+{Math.min(results.cashFlows.length - 1, 36)}</span>
                </div>
              </div>

              {/* Stress Testing */}
              <div className="panel">
                <div className="section-title">Stress testing — VPN por escenario</div>
                <StressChart stressVpn={results.stressVpn}/>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginTop:16 }}>
                  {(["base","moderado","severo","extremo"] as StressScenario[]).map(sc => (
                    <div key={sc} style={{ textAlign:"center", padding:"10px 8px", background:"rgba(13,20,38,.02)", borderRadius:8, border:`1.5px solid ${STRESS_COLORS[sc]}33` }}>
                      <div style={{ fontFamily:"var(--mono)", fontSize:9, color: STRESS_COLORS[sc], letterSpacing:"0.08em", marginBottom:5 }}>{STRESS_LABELS[sc].toUpperCase()}</div>
                      <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.04em", color: results.stressVpn[sc] >= 0 ? STRESS_COLORS[sc] : "#F87171" }}>
                        {fmtM(results.stressVpn[sc])}
                      </div>
                      <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--fg3)", marginTop:3 }}>
                        TIR {results.stressTir[sc].toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration / Convexity Table */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

                <div className="panel">
                  <div className="section-title">Sensibilidad al precio</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                    {[
                      { label:"-200 bps", dP: results.duration * 2 - results.convexity * 4 },
                      { label:"-100 bps", dP: results.duration * 1 - results.convexity * 1 },
                      { label:  "Base",   dP: 0 },
                      { label:"+100 bps", dP: -results.duration * 1 + results.convexity * 1 },
                      { label:"+200 bps", dP: -results.duration * 2 + results.convexity * 4 },
                    ].map((row, i) => (
                      <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 12px", background: i === 2 ? "rgba(29,78,216,.06)" : "rgba(13,20,38,.02)", borderBottom: i < 4 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                        <span style={{ fontFamily:"var(--mono)", fontSize:11, color: i < 2 ? "#059669" : i > 2 ? "#DC2626" : "rgba(13,20,38,.7)" }}>{row.label}</span>
                        <span style={{ fontFamily:"var(--mono)", fontSize:11, fontWeight:600, color: row.dP >= 0 ? "#059669" : "#DC2626" }}>
                          {row.dP === 0 ? "—" : `${row.dP >= 0 ? "+" : ""}${row.dP.toFixed(2)}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="section-title">Resumen del instrumento</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                    {[
                      { label:"Tipo",          val: ASSET_TYPES.find(a => a.id === inputs.assetType)?.label || "" },
                      { label:"Monto",         val: fmtM(inputs.assetType === "revolvente" ? inputs.lineaTotal : inputs.monto) },
                      { label:"Tasa",          val: `${inputs.tasa}% NAE` },
                      { label:"Plazo",         val: `${inputs.plazoMeses} meses` },
                      { label:"Tasa desc.",    val: `${inputs.tasaDescuento}%` },
                      { label:"PD / LGD",      val: `${inputs.pd}% / ${inputs.lgd}%` },
                      { label:"EL anual",      val: `${((inputs.pd/100)*(inputs.lgd/100)*100).toFixed(2)}%` },
                    ].map((row, i) => (
                      <div key={row.label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", borderBottom: i < 6 ? "1px solid rgba(255,255,255,.04)" : "none", background:"rgba(13,20,38,.025)" }}>
                        <span style={{ fontFamily:"var(--mono)", fontSize:10.5, color:"var(--fg3)" }}>{row.label.toUpperCase()}</span>
                        <span style={{ fontFamily:"var(--mono)", fontSize:10.5, color:"rgba(13,20,38,.7)", fontWeight:600 }}>{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Cash Flow Table */}
              <div className="panel">
                <div className="section-title">Tabla de flujos — primeros 24 períodos</div>
                <div style={{ overflowX:"auto" }} className="scroll">
                  <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"var(--mono)", fontSize:11 }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid rgba(255,255,255,.08)" }}>
                        {["Período","Flujo","VP del flujo","% del total","Acumulado"].map(h => (
                          <th key={h} style={{ padding:"8px 12px", textAlign:"right", color:"var(--fg3)", fontSize:9.5, letterSpacing:"0.08em", fontWeight:500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.cashFlows.slice(1, 25).map((cf, i) => {
                        const t = i + 1;
                        const r = inputs.tasaDescuento / 100 / 12;
                        const pv = cf / Math.pow(1 + r, t);
                        const totalPV = results.cashFlows.slice(1).reduce((acc, c, j) => acc + c / Math.pow(1 + r, j + 1), 0);
                        const pctOfTotal = totalPV !== 0 ? (pv / totalPV) * 100 : 0;
                        const accum = results.cashFlows.slice(0, t + 1).reduce((a, b) => a + b, 0);
                        return (
                          <tr key={t} style={{ borderBottom:"1px solid rgba(255,255,255,.03)", transition:"background .1s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.025)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <td style={{ padding:"7px 12px", textAlign:"right", color:"var(--fg3)" }}>T+{t}</td>
                            <td style={{ padding:"7px 12px", textAlign:"right", color: cf >= 0 ? "#00E5A0" : "#F87171" }}>{fmtM(cf)}</td>
                            <td style={{ padding:"7px 12px", textAlign:"right", color:"rgba(13,20,38,.7)" }}>{fmtM(pv)}</td>
                            <td style={{ padding:"7px 12px", textAlign:"right", color:"var(--fg3)" }}>{pctOfTotal.toFixed(1)}%</td>
                            <td style={{ padding:"7px 12px", textAlign:"right", color: accum >= 0 ? "#1D4ED8" : "#DC2626" }}>{fmtM(accum)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:400, color:"var(--fg3)", fontFamily:"var(--mono)", fontSize:12 }}>
              Ajusta los parámetros para ver resultados
            </div>
          )}
        </div>
        )}

        {/* ── CARTERA TAB ── */}
        {activeMainTab === 'cartera' && (
          <CarteraTab
            cartData={cartData} setCartData={setCartData}
            fileName={fileName} setFileName={setFileName}
            dragging={dragging} setDragging={setDragging}
          />
        )}

        {/* ── REPORTE TAB ── */}
        {activeMainTab === 'reporte' && (
          <ReporteTab cartData={cartData} results={results} inputs={inputs}/>
        )}

      </div>
    </div>
  );
}

// ─── CARTERA TAB ──────────────────────────────────────────────────────────────
function CarteraTab({ cartData, setCartData, fileName, setFileName, dragging, setDragging }: {
  cartData: CartRow[]; setCartData: (d: CartRow[]) => void;
  fileName: string; setFileName: (s: string) => void;
  dragging: boolean; setDragging: (b: boolean) => void;
}) {
  const [sortCol, setSortCol] = React.useState<keyof CartRow>('monto');
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('desc');
  const [fieldMap, setFieldMap] = React.useState<Record<string,string>>({});
  const [rawHeaders, setRawHeaders] = React.useState<string[]>([]);
  const [filterRating, setFilterRating] = React.useState('');

  async function processFile(file: File) {
    setFileName(file.name);
    const XLSX = await import('xlsx');
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type:'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval:'' }) as Record<string, unknown>[];
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    setRawHeaders(headers);
    const fm = autoDetectFields(headers);
    setFieldMap(fm);
    const parsed = parseCartRows(rows, fm);
    setCartData(parsed);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  const sorted = [...cartData].sort((a,b) => {
    const av = a[sortCol], bv = b[sortCol];
    if (typeof av === 'number' && typeof bv === 'number') return sortDir==='desc' ? bv-av : av-bv;
    return sortDir==='desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  }).filter(r => !filterRating || r.rating === filterRating);

  const totalMonto   = cartData.reduce((s,r) => s+r.monto, 0);
  const totalEL      = cartData.reduce((s,r) => s+r.el, 0);
  const avgScore     = cartData.length ? cartData.reduce((s,r) => s+r.score, 0)/cartData.length : 0;
  const avgTasa      = cartData.length ? cartData.reduce((s,r) => s+r.tasa, 0)/cartData.length : 0;
  const ratingDist   = cartData.reduce((acc, r) => { acc[r.rating] = (acc[r.rating]||0)+1; return acc; }, {} as Record<string,number>);
  const byRating     = Object.entries(ratingDist).sort((a,b) => {
    const ord = ['AAA','AA','A','BBB','BB','B','CCC','CC','D'];
    return ord.indexOf(a[0]) - ord.indexOf(b[0]);
  });

  const fmtM = (n: number) => n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(0)}K` : `$${n.toFixed(0)}`;
  const fmt  = (n: number, d=2) => new Intl.NumberFormat('es-MX',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);

  function toggleSort(col: keyof CartRow) {
    if (sortCol === col) setSortDir(d => d==='desc'?'asc':'desc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Upload zone */}
      {!cartData.length ? (
        <div
          className={`drop-zone${dragging?' over':''}`}
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={handleDrop}
          onClick={()=>{ const i=document.createElement('input'); i.type='file'; i.accept='.xlsx,.xls,.csv'; i.onchange=(e:Event)=>{ const f=(e.target as HTMLInputElement).files?.[0]; if(f) processFile(f); }; i.click(); }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="rgba(13,20,38,.25)" strokeWidth="1.5" strokeLinecap="round" style={{margin:'0 auto 16px',display:'block'}}>
            <rect x="6" y="6" width="28" height="28" rx="4"/>
            <path d="M14 20h12M20 14v12"/>
          </svg>
          <div style={{fontSize:15,fontWeight:700,color:'#0D1426',marginBottom:6}}>Arrastra tu cartera en Excel aquí</div>
          <div style={{fontSize:13,color:'rgba(13,20,38,.45)',marginBottom:16}}>o haz click para seleccionar · .xlsx, .xls, .csv</div>
          <div style={{display:'inline-flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
            {['Cualquier formato','Auto-detección de columnas','CNBV · SOFOM · Libre'].map(t=>(
              <span key={t} style={{fontSize:11,fontFamily:'JetBrains Mono,monospace',color:'rgba(13,20,38,.38)',background:'rgba(13,20,38,.04)',border:'1px solid rgba(13,20,38,.08)',borderRadius:6,padding:'3px 10px'}}>{t}</span>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
            {[
              {label:'Cartera total',  val:fmtM(totalMonto),     color:'#0D1426'},
              {label:'No. créditos',   val:String(cartData.length), color:'#1D4ED8'},
              {label:'Score promedio', val:fmt(avgScore,1),       color:'#7C3AED'},
              {label:'Tasa promedio',  val:`${fmt(avgTasa,1)}%`,  color:'#0891B2'},
              {label:'Pérdida esperada',val:fmtM(totalEL),       color:'#DC2626'},
            ].map(k=>(
              <div key={k.label} style={{background:'#fff',border:'1px solid rgba(13,20,38,.09)',borderRadius:12,padding:'14px 16px',boxShadow:'0 1px 4px rgba(13,20,38,.05)'}}>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,color:'rgba(13,20,38,.38)',letterSpacing:'.12em',textTransform:'uppercase',marginBottom:7}}>{k.label}</div>
                <div style={{fontSize:22,fontWeight:800,letterSpacing:'-0.045em',color:k.color}}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Rating distribution */}
          <div style={{background:'#fff',border:'1px solid rgba(13,20,38,.09)',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(13,20,38,.05)'}}>
            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,color:'rgba(13,20,38,.38)',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:12}}>Distribución por rating S&P/Moody's</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              {byRating.map(([r,c])=>(
                <button key={r} onClick={()=>setFilterRating(filterRating===r?'':r)}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,border:`1.5px solid ${filterRating===r?RATING_COLOR[r]:'rgba(13,20,38,.1)'}`,background:filterRating===r?RATING_BG[r]:'#fff',cursor:'pointer',transition:'all .15s'}}>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:700,color:RATING_COLOR[r]}}>{r}</span>
                  <span style={{fontSize:11,color:'rgba(13,20,38,.45)',fontWeight:600}}>{c}</span>
                </button>
              ))}
              {filterRating && <button onClick={()=>setFilterRating('')} style={{fontSize:11,color:'rgba(13,20,38,.45)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>limpiar filtro</button>}
            </div>
          </div>

          {/* Table */}
          <div style={{background:'#fff',border:'1px solid rgba(13,20,38,.09)',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 4px rgba(13,20,38,.05)'}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(13,20,38,.07)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{fontSize:13,fontWeight:700}}>{sorted.length} créditos {filterRating?`· Rating ${filterRating}`:''}</div>
              <div style={{display:'flex',gap:8}}>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,color:'rgba(13,20,38,.38)',background:'rgba(13,20,38,.04)',border:'1px solid rgba(13,20,38,.08)',borderRadius:6,padding:'3px 10px'}}>{fileName}</span>
                <button onClick={()=>{setCartData([]);setFileName('');}} style={{fontSize:11,color:'#DC2626',background:'none',border:'1px solid rgba(220,38,38,.2)',borderRadius:6,padding:'3px 10px',cursor:'pointer',fontFamily:'JetBrains Mono,monospace'}}>Reemplazar</button>
              </div>
            </div>
            <div style={{overflowX:'auto',maxHeight:520,overflowY:'auto'}}>
              <table className="cart-tbl">
                <thead style={{position:'sticky',top:0}}>
                  <tr>
                    {([
                      {col:'acreditado',label:'Acreditado'},
                      {col:'monto',label:'Monto'},
                      {col:'tasa',label:'Tasa'},
                      {col:'plazo',label:'Plazo'},
                      {col:'mora',label:'Mora'},
                      {col:'garantia',label:'Garantía'},
                      {col:'sector',label:'Sector'},
                      {col:'score',label:'Score'},
                      {col:'rating',label:'Rating'},
                      {col:'el',label:'Perd. Esp.'},
                    ] as {col: keyof CartRow, label: string}[]).map(({col,label})=>(
                      <th key={col}><button className="sort-btn" onClick={()=>toggleSort(col)}>{label}{sortCol===col?(sortDir==='desc'?' ↓':' ↑'):''}</button></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(r=>(
                    <tr key={r.id}>
                      <td style={{fontWeight:600,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.acreditado}</td>
                      <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{fmtM(r.monto)}</td>
                      <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{fmt(r.tasa,1)}%</td>
                      <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:12}}>{r.plazo}m</td>
                      <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:r.mora>90?'#DC2626':r.mora>30?'#D97706':'rgba(13,20,38,.55)'}}>{r.mora}d</td>
                      <td style={{fontSize:11,color:'rgba(13,20,38,.55)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.garantia}</td>
                      <td style={{fontSize:11,color:'rgba(13,20,38,.55)'}}>{r.sector}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:40,height:4,borderRadius:2,background:'rgba(13,20,38,.08)',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${r.score}%`,background:r.score>=70?'#059669':r.score>=50?'#D97706':'#DC2626',borderRadius:2}}/>
                          </div>
                          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11}}>{r.score}</span>
                        </div>
                      </td>
                      <td>
                        <span className="rating-badge" style={{background:RATING_BG[r.rating]||'#F3F4F6',color:RATING_COLOR[r.rating]||'#374151'}}>
                          {r.rating}
                        </span>
                      </td>
                      <td style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'#DC2626'}}>{fmtM(r.el)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REPORTE TAB ──────────────────────────────────────────────────────────────
function ReporteTab({ cartData, results, inputs }: { cartData: CartRow[]; results: Results|null; inputs: Inputs }) {
  const [generating, setGenerating] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const fmtM = (n: number) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;
  const fmt  = (n: number, d=2) => new Intl.NumberFormat('es-MX',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);

  const totalMonto = cartData.reduce((s,r)=>s+r.monto,0);
  const totalEL    = cartData.reduce((s,r)=>s+r.el,0);
  const avgScore   = cartData.length ? cartData.reduce((s,r)=>s+r.score,0)/cartData.length : 0;
  const ratingDist = cartData.reduce((acc,r)=>{acc[r.rating]=(acc[r.rating]||0)+1;return acc;},{} as Record<string,number>);

  async function generatePDF() {
    setGenerating(true);
    try {
      const jsPDFMod = await import('jspdf');
      const jsPDF = jsPDFMod.default || jsPDFMod.jsPDF;
      const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const W = 210, M = 18;
      let y = 0;

      // ── COVER PAGE ──
      // Header bar
      doc.setFillColor(13, 20, 38);
      doc.rect(0, 0, W, 38, 'F');

      // Logo text
      doc.setFont('helvetica','bold');
      doc.setFontSize(22);
      doc.setTextColor(240, 244, 255);
      doc.text('Plinius.', M, 22);
      doc.setFontSize(8);
      doc.setFont('helvetica','normal');
      doc.setTextColor(0, 229, 160);
      doc.text('CREDIT OS  ·  CREDIT ANALYTICS v2', M, 30);

      // Date
      doc.setFontSize(8);
      doc.setTextColor(180, 190, 220);
      const dateStr = new Date().toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'});
      doc.text(dateStr, W - M, 22, {align:'right'});

      y = 56;

      // Title
      doc.setFont('helvetica','bold');
      doc.setFontSize(26);
      doc.setTextColor(13, 20, 38);
      doc.text('Reporte de Cartera Calificada', M, y); y += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica','normal');
      doc.setTextColor(100, 110, 130);
      doc.text('Analisis cuantitativo · Calificacion S&P/Moody\'s · Risk Analytics', M, y); y += 16;

      // Divider
      doc.setDrawColor(220, 225, 240);
      doc.setLineWidth(0.4);
      doc.line(M, y, W-M, y); y += 12;

      // ── RESUMEN EJECUTIVO ──
      doc.setFont('helvetica','bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 110, 130);
      doc.text('RESUMEN EJECUTIVO', M, y); y += 7;

      const kpis = [
        {label:'Cartera Total',       val: fmtM(totalMonto)},
        {label:'No. Créditos',        val: String(cartData.length || '—')},
        {label:'Score Promedio',      val: cartData.length ? fmt(avgScore,1) : '—'},
        {label:'Pérdida Esperada',    val: fmtM(totalEL)},
        {label:'% Pérdida / Cartera', val: totalMonto > 0 ? `${((totalEL/totalMonto)*100).toFixed(2)}%` : '—'},
      ];

      if (results) {
        kpis.push(
          {label:'VPN (instrumento)',  val: fmtM(results.vpn)},
          {label:'TIR Anual',          val: `${results.tir.toFixed(2)}%`},
          {label:'RAROC',              val: `${results.riskAdjustedReturn.toFixed(2)}%`},
          {label:'Duración',           val: `${results.duration.toFixed(2)} años`},
          {label:'Spread vs TIIE',     val: `${results.spreadBps.toFixed(0)} bps`},
        );
      }

      // KPI grid 2 cols
      const colW = (W - 2*M - 8) / 2;
      kpis.forEach((k, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = M + col * (colW + 8);
        const ky = y + row * 18;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, ky, colW, 14, 2, 2, 'F');
        doc.setDrawColor(220, 225, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, ky, colW, 14, 2, 2, 'S');
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 130, 150);
        doc.text(k.label.toUpperCase(), x+5, ky+5.5);
        doc.setFont('helvetica','bold');
        doc.setFontSize(11);
        doc.setTextColor(13, 20, 38);
        doc.text(k.val, x+5, ky+11);
      });

      y += Math.ceil(kpis.length / 2) * 18 + 12;

      // ── DISTRIBUCIÓN POR RATING ──
      if (cartData.length) {
        doc.setDrawColor(220, 225, 240);
        doc.setLineWidth(0.4);
        doc.line(M, y, W-M, y); y += 10;

        doc.setFont('helvetica','bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 110, 130);
        doc.text("DISTRIBUCIÓN POR RATING S&P / MOODY'S", M, y); y += 8;

        const ratings = ['AAA','AA','A','BBB','BB','B','CCC','CC','D'];
        const rColors: Record<string,[number,number,number]> = {
          AAA:[6,95,70], AA:[6,95,70], A:[5,150,105],
          BBB:[29,78,216], BB:[217,119,6], B:[234,88,12],
          CCC:[220,38,38], CC:[153,27,27], D:[127,29,29],
        };
        const barW = (W - 2*M) / ratings.length - 3;
        ratings.forEach((r, i) => {
          const count = ratingDist[r] || 0;
          const x = M + i * (barW + 3);
          const [cr,cg,cb] = rColors[r] || [100,100,100];
          const maxH = 20;
          const h = cartData.length ? Math.max(2, (count/cartData.length) * maxH) : 0;
          if (count > 0) {
            doc.setFillColor(cr,cg,cb);
            doc.roundedRect(x, y + maxH - h, barW, h, 1, 1, 'F');
          }
          doc.setFont('helvetica','bold');
          doc.setFontSize(7);
          doc.setTextColor(cr,cg,cb);
          doc.text(r, x + barW/2, y + maxH + 5, {align:'center'});
          doc.setFont('helvetica','normal');
          doc.setTextColor(100,110,130);
          doc.text(String(count), x + barW/2, y + maxH + 9, {align:'center'});
        });
        y += 36;
      }

      // ── TABLA DE CRÉDITOS ──
      if (cartData.length) {
        // new page
        doc.addPage();
        y = 20;

        // header bar on page 2
        doc.setFillColor(13, 20, 38);
        doc.rect(0, 0, W, 14, 'F');
        doc.setFont('helvetica','bold');
        doc.setFontSize(8);
        doc.setTextColor(240,244,255);
        doc.text('PLINIUS CREDIT OS  ·  CARTERA CALIFICADA', M, 9);
        doc.text(dateStr, W-M, 9, {align:'right'});
        y = 22;

        doc.setFont('helvetica','bold');
        doc.setFontSize(10);
        doc.setTextColor(13,20,38);
        doc.text('Tabla de Créditos Calificados', M, y); y += 8;

        // Table headers
        const cols = [
          {label:'Acreditado',  w:44},
          {label:'Monto',       w:22},
          {label:'Tasa',        w:14},
          {label:'Plazo',       w:12},
          {label:'Mora',        w:12},
          {label:'Sector',      w:24},
          {label:'Score',       w:14},
          {label:'Rating',      w:14},
          {label:'Pérd. Esp.',  w:22},
        ];
        const rowH = 7.5;
        let cx = M;

        // Header row
        doc.setFillColor(13, 20, 38);
        doc.rect(M, y, W-2*M, rowH, 'F');
        cols.forEach(col => {
          doc.setFont('helvetica','bold');
          doc.setFontSize(6.5);
          doc.setTextColor(180,190,220);
          doc.text(col.label.toUpperCase(), cx+2, y+5);
          cx += col.w;
        });
        y += rowH;

        // Data rows
        cartData.slice(0,50).forEach((r, ri) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
            doc.setFillColor(13,20,38);
            doc.rect(0,0,W,14,'F');
            doc.setFont('helvetica','bold');
            doc.setFontSize(8);
            doc.setTextColor(240,244,255);
            doc.text('PLINIUS CREDIT OS  ·  CARTERA CALIFICADA', M, 9);
            doc.text(dateStr, W-M, 9, {align:'right'});
            y = 20;
          }
          doc.setFillColor(ri%2===0 ? 250 : 245, ri%2===0 ? 251 : 246, ri%2===0 ? 253 : 251);
          doc.rect(M, y, W-2*M, rowH, 'F');
          cx = M;

          const cells = [
            r.acreditado.substring(0,20),
            fmtM(r.monto),
            `${r.tasa.toFixed(1)}%`,
            `${r.plazo}m`,
            `${r.mora}d`,
            r.sector.substring(0,14),
            String(r.score),
            r.rating,
            fmtM(r.el),
          ];

          const ratingColors: Record<string,[number,number,number]> = {
            AAA:[6,95,70],AA:[6,95,70],A:[5,150,105],BBB:[29,78,216],BB:[217,119,6],B:[234,88,12],CCC:[220,38,38],CC:[153,27,27],D:[127,29,29]
          };

          cells.forEach((cell, ci) => {
            doc.setFont('helvetica', ci===7?'bold':'normal');
            doc.setFontSize(7);
            if (ci===7) {
              const [cr2,cg2,cb2] = ratingColors[r.rating] || [100,100,100];
              doc.setTextColor(cr2,cg2,cb2);
            } else if (ci===4 && r.mora>90) {
              doc.setTextColor(220,38,38);
            } else if (ci===8) {
              doc.setTextColor(220,38,38);
            } else {
              doc.setTextColor(30,40,60);
            }
            doc.text(cell, cx+2, y+5.2);
            cx += cols[ci].w;
          });
          y += rowH;
        });

        if (cartData.length > 50) {
          y += 4;
          doc.setFont('helvetica','italic');
          doc.setFontSize(7);
          doc.setTextColor(130,140,160);
          doc.text(`... y ${cartData.length-50} créditos adicionales`, M, y);
          y += 8;
        }
      }

      // ── STRESS TESTING (if results available) ──
      // Footer on all pages
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        doc.setTextColor(160,170,190);
        doc.line(M, 285, W-M, 285);
        doc.text('Plinius Technologies Mexico LLC · plinius.mx · Confidencial — Solo para uso interno', M, 290);
        doc.text(`Página ${p} de ${totalPages}`, W-M, 290, {align:'right'});
      }

      doc.save(`plinius_cartera_calificada_${new Date().toISOString().slice(0,10)}.pdf`);
      setDone(true);
      setTimeout(()=>setDone(false), 3000);
    } catch(e) {
      console.error(e);
      alert('Error generando PDF. Asegúrate de tener créditos en la cartera.');
    }
    setGenerating(false);
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20,maxWidth:800}}>
      <div style={{background:'#fff',border:'1px solid rgba(13,20,38,.09)',borderRadius:14,padding:'28px',boxShadow:'0 1px 4px rgba(13,20,38,.05)'}}>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:9,color:'rgba(13,20,38,.38)',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:16}}>Contenido del reporte</div>
        {[
          {icon:'M4 2h8l2 2v10H4V2z',  title:'Portada institucional',       desc:'Logo Plinius, fecha, tipo de análisis'},
          {icon:'M2 8h12M6 4l4 4-4 4', title:'Resumen ejecutivo KPIs',      desc:'Cartera total, score promedio, pérdida esperada, TIR, RAROC, spread'},
          {icon:'M2 12L6 7l3 3 3-4 2 2',title:'Distribución por rating',   desc:"Calificación S&P/Moody's: AAA, AA, A, BBB, BB, B, CCC, CC, D"},
          {icon:'M2 2h12v12H2z',        title:'Tabla de créditos calificados', desc:'Hasta 50 créditos con rating individual, mora, score, pérdida esperada'},
          {icon:'M2 14L8 2l6 12',       title:'Pie de página',              desc:'Plinius · Confidencial · Número de páginas'},
        ].map(item=>(
          <div key={item.title} style={{display:'flex',gap:14,padding:'12px 0',borderBottom:'1px solid rgba(13,20,38,.06)'}}>
            <div style={{width:36,height:36,borderRadius:9,background:'rgba(29,78,216,.06)',border:'1px solid rgba(29,78,216,.12)',display:'grid',placeItems:'center',flexShrink:0}}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#1D4ED8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,marginBottom:3}}>{item.title}</div>
              <div style={{fontSize:12,color:'rgba(13,20,38,.45)'}}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{background:'rgba(29,78,216,.04)',border:'1px solid rgba(29,78,216,.12)',borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:10}}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#1D4ED8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2a6 6 0 100 12"/></svg>
        <span style={{fontSize:13,color:'rgba(13,20,38,.6)'}}>
          {cartData.length ? <><span style={{fontWeight:700,color:'#059669'}}>{cartData.length} créditos cargados</span> · Reporte listo para generar</> : <><span style={{color:'#D97706',fontWeight:700}}>Sin cartera</span> · Carga tu Excel en el tab "Cartera Excel" para incluir la tabla de créditos</>}
          {results ? <> · <span style={{fontWeight:700,color:'#1D4ED8'}}>Análisis de instrumento disponible</span></> : ''}
        </span>
      </div>

      <button onClick={generatePDF} disabled={generating}
        style={{padding:'14px 28px',background:done?'#059669':'linear-gradient(135deg,#7C3AED,#1D4ED8)',color:'#fff',border:'none',borderRadius:12,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:10,justifyContent:'center',boxShadow:'0 4px 16px rgba(29,78,216,.3)',transition:'all .2s',opacity:generating?0.7:1,alignSelf:'flex-start'}}>
        {generating ? (
          <><svg style={{animation:'spin .7s linear infinite'}} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>Generando PDF...</>
        ) : done ? (
          <><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l4 4 6-6"/></svg>¡Descargado!</>
        ) : (
          <><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 2v8M5 7l3 3 3-3M2 12h12"/></svg>Generar Cartera Calificada PDF</>
        )}
      </button>
    </div>
  );
}
