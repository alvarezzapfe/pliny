"use client";

import { useState, useEffect } from "react";

// ── Theme System ─────────────────────────────────────────────────────────────
export type ThemeKey = "plinius" | "crowdlink";

export const THEMES = {
  plinius: {
    name: "Plinius",
    accent:      "#00E5A0",
    accentDim:   "rgba(0,229,160,.15)",
    accentGlow:  "rgba(0,229,160,.35)",
    bg:          "#060D1A",
    bgCard:      "#0F172A",
    bgCardAlt:   "#0A1628",
    border:      "#1E293B",
    borderAccent:"rgba(0,229,160,.2)",
    text:        "#F8FAFC",
    textMuted:   "#64748B",
    textDim:     "#334155",
    gradient:    "linear-gradient(160deg,#0F172A 0%,#0A1628 100%)",
    mono:        "'Geist Mono',monospace",
    sans:        "'Geist',sans-serif",
  },
  crowdlink: {
    name: "Crowdlink",
    accent:      "#0066FF",
    accentDim:   "rgba(0,102,255,.15)",
    accentGlow:  "rgba(0,102,255,.35)",
    bg:          "#050A1A",
    bgCard:      "#0A1020",
    bgCardAlt:   "#060D1A",
    border:      "#0F1E35",
    borderAccent:"rgba(0,102,255,.2)",
    text:        "#F0F6FF",
    textMuted:   "#4A6080",
    textDim:     "#1E3050",
    gradient:    "linear-gradient(160deg,#0A1020 0%,#060D1A 100%)",
    mono:        "'Geist Mono',monospace",
    sans:        "'Geist',sans-serif",
  },
} as const;

type Theme = typeof THEMES[ThemeKey];

// ── Types ────────────────────────────────────────────────────────────────────
export type DataSource = "declared" | "syntage" | "buro" | "plinius" | "pending";
export type VarStatus  = "ok" | "warn" | "risk" | "missing" | "pending";

export type ScoreVariable = {
  key: string;
  label: string;
  category: "fiscal" | "financiero" | "operativo" | "credito" | "mercado";
  weight: number;
  value: number | null;
  raw: string | null;
  benchmark?: string;
  status: VarStatus;
  source: DataSource;
  trend?: "up" | "down" | "flat" | null;
};

export type ScoreData = {
  score: number;
  variables: ScoreVariable[];
  syntage_connected: boolean;
  buro_connected: boolean;
  calculated_at: string;
  version: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
export function getGrade(s: number) {
  if (s >= 85) return { letter:"A", label:"Excelente",  color:"#00C48C", glow:"rgba(0,196,140,.4)"  };
  if (s >= 70) return { letter:"B", label:"Bueno",      color:"#4ADE80", glow:"rgba(74,222,128,.35)"};
  if (s >= 55) return { letter:"C", label:"Moderado",   color:"#FACC15", glow:"rgba(250,204,21,.35)"};
  if (s >= 40) return { letter:"D", label:"Bajo",       color:"#FB923C", glow:"rgba(251,146,60,.35)"};
  return             { letter:"E", label:"Alto riesgo", color:"#F87171", glow:"rgba(248,113,113,.4)"};
}

const STATUS_COLOR: Record<VarStatus,  string> = { ok:"#00C48C", warn:"#FACC15", risk:"#FB923C", missing:"#F87171", pending:"#475569" };
const SOURCE_COLOR: Record<DataSource, string> = { syntage:"#3B82F6", declared:"#64748B", buro:"#8B5CF6", plinius:"#00E5A0", pending:"#334155" };
const SOURCE_LABEL: Record<DataSource, string> = { syntage:"SAT/Syntage", declared:"Declarado", buro:"Buró", plinius:"Plinius", pending:"Pendiente" };
const CAT_LABEL: Record<ScoreVariable["category"], string> = { fiscal:"Fiscal", financiero:"Financiero", operativo:"Operativo", credito:"Crédito", mercado:"Mercado" };

// ── Mock data ─────────────────────────────────────────────────────────────────
export const MOCK_DATA: ScoreData = {
  score: 67,
  syntage_connected: false,
  buro_connected: false,
  calculated_at: new Date().toISOString(),
  version: "2.0-beta",
  variables: [
    { key:"rfc",          label:"RFC / CURP validado",          category:"fiscal",     weight:5,  value:100, raw:"Validado",           benchmark:"Requerido",      status:"ok",      source:"syntage",  trend:null   },
    { key:"cumplimiento", label:"Cumplimiento fiscal SAT",      category:"fiscal",     weight:8,  value:75,  raw:"Sin irregularidades", benchmark:">80",            status:"ok",      source:"pending",  trend:"flat" },
    { key:"cfdi",         label:"Ingresos CFDI (12m)",          category:"fiscal",     weight:10, value:70,  raw:"$9.2M MXN",          benchmark:"Mercado medio",  status:"ok",      source:"pending",  trend:"up"   },
    { key:"facturacion",  label:"Facturación anual declarada",  category:"financiero", weight:8,  value:65,  raw:"$8.5M MXN",          benchmark:">$5M MXN",       status:"ok",      source:"declared", trend:null   },
    { key:"dscr",         label:"DSCR",                         category:"financiero", weight:14, value:45,  raw:"1.18x",              benchmark:"≥1.25x",         status:"warn",    source:"declared", trend:"down" },
    { key:"ebitda_vol",   label:"Volatilidad EBITDA (12m)",     category:"financiero", weight:10, value:55,  raw:"±18%",               benchmark:"<15%",           status:"warn",    source:"pending",  trend:"flat" },
    { key:"leverage",     label:"Leverage ratio",               category:"financiero", weight:8,  value:45,  raw:"3.2x",               benchmark:"<3x",            status:"warn",    source:"declared", trend:"down" },
    { key:"current",      label:"Current ratio",                category:"financiero", weight:7,  value:72,  raw:"1.4x",               benchmark:"≥1.2x",          status:"ok",      source:"declared", trend:"flat" },
    { key:"antiguedad",   label:"Antigüedad empresa",           category:"operativo",  weight:6,  value:70,  raw:"4 años",             benchmark:">3 años",        status:"ok",      source:"syntage",  trend:null   },
    { key:"empleados",    label:"Número de empleados",          category:"operativo",  weight:4,  value:60,  raw:"45 empleados",       benchmark:">20",            status:"ok",      source:"declared", trend:"up"   },
    { key:"dso",          label:"DSO (días de cobranza)",       category:"operativo",  weight:6,  value:50,  raw:"48 días",            benchmark:"<45 días",       status:"warn",    source:"pending",  trend:"down" },
    { key:"concentracion",label:"Concentración top 3 clientes", category:"operativo",  weight:5,  value:35,  raw:"78% ingresos",       benchmark:"<60%",           status:"risk",    source:"pending",  trend:null   },
    { key:"tendencia",    label:"Tendencia ingresos (YoY)",     category:"mercado",    weight:4,  value:65,  raw:"+12% anual",         benchmark:">0%",            status:"ok",      source:"pending",  trend:"up"   },
    { key:"sector",       label:"Sector / giro",                category:"mercado",    weight:3,  value:80,  raw:"Manufactura",        benchmark:"Bajo riesgo",    status:"ok",      source:"declared", trend:null   },
    { key:"capacidad",    label:"Monto vs capacidad",           category:"mercado",    weight:5,  value:50,  raw:"72% de capacidad",   benchmark:"<65%",           status:"warn",    source:"declared", trend:null   },
    { key:"garantias",    label:"Garantías ofrecidas",          category:"credito",    weight:8,  value:55,  raw:"Inmueble parcial",   benchmark:"1.5x cobertura", status:"warn",    source:"declared", trend:null   },
    { key:"historial",    label:"Historial pagos Plinius",      category:"credito",    weight:5,  value:0,   raw:"Sin historial",      benchmark:"Requerido",      status:"missing", source:"plinius",  trend:null   },
    { key:"buro",         label:"Buró de Crédito",              category:"credito",    weight:0,  value:null,raw:"Consulta manual",    benchmark:"Score >650",     status:"pending", source:"buro",     trend:null   },
  ],
};

// ── Animated counter ──────────────────────────────────────────────────────────
function useAnimated(target: number, ms = 1500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / ms, 1);
      setV(Math.round((1 - Math.pow(1 - p, 4)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, ms]);
  return v;
}

// ── Gauge ─────────────────────────────────────────────────────────────────────
function Gauge({ score, animate, theme }: { score: number; animate: boolean; theme: Theme }) {
  const disp = useAnimated(animate ? score : 0, 1600);
  const grade = getGrade(score);
  const cx = 130, cy = 115;
  const START = -215, RANGE = 250;
  const ang = START + (disp / 100) * RANGE;

  function pt(deg: number, r: number) {
    const a = deg * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }
  function arc(s: number, e: number, ri: number, ro: number) {
    const a = pt(s,ro), b = pt(e,ro), c = pt(e,ri), d = pt(s,ri);
    const l = e-s>180?1:0;
    return `M${a.x},${a.y} A${ro},${ro} 0 ${l} 1 ${b.x},${b.y} L${c.x},${c.y} A${ri},${ri} 0 ${l} 0 ${d.x},${d.y} Z`;
  }

  const SEGS = [
    {from:-215,to:-172,c:"#F87171",l:"E"},{from:-172,to:-129,c:"#FB923C",l:"D"},
    {from:-129,to:-86, c:"#FACC15",l:"C"},{from:-86, to:-43, c:"#4ADE80",l:"B"},
    {from:-43, to:35,  c:"#00C48C",l:"A"},
  ];

  const needle = pt(ang, 80);

  return (
    <svg viewBox="0 0 260 165" style={{ width:"100%", maxWidth:320, overflow:"visible" }}>
      <defs>
        <radialGradient id={`g_${theme.name}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={grade.color} stopOpacity="0.12"/>
          <stop offset="100%" stopColor={grade.color} stopOpacity="0"/>
        </radialGradient>
        <filter id={`f_${theme.name}`}>
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={cx} cy={cy} r={108} fill={`url(#g_${theme.name})`}/>
      <path d={arc(-215,35,79,101)} fill={theme.bgCardAlt}/>
      {SEGS.map((s,i)=><path key={i} d={arc(s.from,s.to,80,100)} fill={s.c} opacity={0.11}/>)}
      {disp>0 && <path d={arc(-215,START+(disp/100)*RANGE,80,100)} fill={grade.color} opacity={0.88} filter={`url(#f_${theme.name})`}/>}
      {Array.from({length:51}).map((_,i)=>{
        const deg=-215+i*5, maj=i%5===0;
        const p1=pt(deg,102),p2=pt(deg,maj?113:107);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={maj?"#2D3F55":"#1A2A3A"} strokeWidth={maj?1.5:0.8}/>;
      })}
      {SEGS.map((s,i)=>{
        const m=(s.from+s.to)/2, p=pt(m,118);
        return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={s.c} fontSize={8} fontWeight={900} fontFamily={theme.mono} opacity={0.65}>{s.l}</text>;
      })}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={grade.color} strokeWidth={2.5} strokeLinecap="round" style={{filter:`drop-shadow(0 0 5px ${grade.glow})`}}/>
      <circle cx={cx} cy={cy} r={7} fill={grade.color} style={{filter:`drop-shadow(0 0 8px ${grade.glow})`}}/>
      <circle cx={cx} cy={cy} r={3.5} fill="#040A14"/>
      <text x={cx} y={cy+34} textAnchor="middle" fill={grade.color} fontSize={32} fontWeight={900} fontFamily={theme.mono} style={{filter:`drop-shadow(0 0 10px ${grade.glow})`}}>{disp}</text>
      <text x={cx} y={cy+50} textAnchor="middle" fill={theme.textMuted} fontSize={9} fontFamily={theme.mono} letterSpacing="2">DE 100</text>
      <text x={28} y={150} fill="#F87171" fontSize={8} fontFamily={theme.mono} fontWeight={700}>RIESGO</text>
      <text x={192} y={150} fill="#00C48C" fontSize={8} fontFamily={theme.mono} fontWeight={700}>ÓPTIMO</text>
    </svg>
  );
}

// ── Grade badge ───────────────────────────────────────────────────────────────
function GradeBadge({ score, large, theme }: { score:number; large?:boolean; theme:Theme }) {
  const g = getGrade(score);
  const sz = large ? 78 : 50;
  return (
    <div style={{ width:sz, height:sz, borderRadius:large?20:13, flexShrink:0,
      background:`${g.color}10`, border:`2px solid ${g.color}40`,
      boxShadow:`0 0 22px ${g.glow},inset 0 0 14px ${g.color}08`,
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
      <span style={{ fontSize:large?32:18, fontWeight:900, color:g.color, fontFamily:theme.mono, lineHeight:1, textShadow:`0 0 14px ${g.glow}` }}>{g.letter}</span>
      {large && <span style={{ fontSize:9, color:g.color, fontFamily:theme.mono, letterSpacing:".08em", opacity:.75 }}>{g.label.toUpperCase()}</span>}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, status, icon, theme }: { label:string; value:string; sub:string; status:VarStatus; icon:string; theme:Theme }) {
  const color = STATUS_COLOR[status];
  return (
    <div style={{ padding:"13px 15px", borderRadius:13, background:theme.bgCardAlt, border:`1px solid ${color}22`, boxShadow:`0 0 14px ${color}0A` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
        <div style={{ fontSize:9, fontFamily:theme.mono, color:theme.textMuted, letterSpacing:".08em" }}>{label}</div>
        <span style={{ fontSize:13 }}>{icon}</span>
      </div>
      <div style={{ fontSize:22, fontWeight:900, fontFamily:theme.mono, color, letterSpacing:"-0.03em", textShadow:`0 0 14px ${color}55` }}>{value}</div>
      <div style={{ fontSize:9, color:theme.textDim, fontFamily:theme.mono, marginTop:4 }}>{sub}</div>
    </div>
  );
}

// ── Variable row ──────────────────────────────────────────────────────────────
function VarRow({ v, delay, theme }: { v:ScoreVariable; delay:number; theme:Theme }) {
  const [vis, setVis] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVis(true),delay); return()=>clearTimeout(t); },[delay]);
  const sc = STATUS_COLOR[v.status];
  const TREND = { up:"↑", down:"↓", flat:"→", null:"" };
  const TC    = { up:"#00C48C", down:"#F87171", flat:"#64748B", null:"transparent" };

  return (
    <div style={{ marginBottom:11 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5, gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
          <div style={{ width:7,height:7,borderRadius:"50%",background:sc,flexShrink:0,boxShadow:v.status==="ok"?`0 0 6px ${sc}`:"none" }}/>
          <span style={{ fontSize:11, fontWeight:600, color:theme.text, lineHeight:1.3 }}>{v.label}</span>
          {v.trend && <span style={{ fontSize:11, color:TC[v.trend??'null' as keyof typeof TC], fontWeight:700 }}>{TREND[v.trend??'null' as keyof typeof TREND]}</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
          {v.raw && <span style={{ fontSize:10, fontFamily:theme.mono, color:theme.textMuted }}>{v.raw}</span>}
          {v.benchmark && <span style={{ fontSize:9, fontFamily:theme.mono, color:theme.textDim }}>ref:{v.benchmark}</span>}
          <span style={{ fontSize:9, fontFamily:theme.mono, fontWeight:700, color:SOURCE_COLOR[v.source], background:`${SOURCE_COLOR[v.source]}14`, border:`1px solid ${SOURCE_COLOR[v.source]}28`, borderRadius:999, padding:"1px 6px" }}>{SOURCE_LABEL[v.source]}</span>
        </div>
      </div>
      <div style={{ height:5, borderRadius:999, background:theme.border, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:999, background:v.status==="pending"?`repeating-linear-gradient(90deg,${theme.border} 0,${theme.border} 4px,transparent 4px,transparent 8px)`:sc, width:vis&&v.value!==null?`${v.value}%`:"0%", transition:`width .9s cubic-bezier(.16,1,.3,1) ${delay}ms`, boxShadow:v.status==="ok"?`0 0 8px ${sc}55`:"none" }}/>
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────
export function CreditScoreCard({ data=MOCK_DATA, themeKey="plinius" as ThemeKey, logoUrl, showSyntage=true }: {
  data?: ScoreData; themeKey?: ThemeKey; logoUrl?: string; showSyntage?: boolean;
}) {
  const theme = THEMES[themeKey];
  const [mounted, setMounted] = useState(false);
  const [cat, setCat] = useState<ScoreVariable["category"]|"all">("all");
  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),80); return()=>clearTimeout(t); },[]);

  const grade    = getGrade(data.score);
  const filtered = data.variables.filter(v=>cat==="all"||v.category===cat);
  const done     = data.variables.filter(v=>v.status!=="pending"&&v.value!==null).length;
  const pct      = Math.round(done/data.variables.length*100);

  const kv = (k:string) => data.variables.find(v=>v.key===k);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800;900&family=Geist+Mono:wght@400;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
    .fade{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both}
    .cbtn{border:none;cursor:pointer;transition:all .15s;font-family:${theme.sans};}
    .cbtn:hover{opacity:.85}
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-thumb{background:${theme.border};border-radius:999px}
  `;

  return (
    <div style={{ fontFamily:theme.sans, color:theme.text, background:theme.gradient, border:`1px solid ${theme.border}`, borderRadius:24, overflow:"hidden", position:"relative" }}>
      <style>{CSS}</style>
      <div style={{ position:"absolute",inset:0,backgroundImage:`linear-gradient(${theme.textDim}1A 1px,transparent 1px),linear-gradient(90deg,${theme.textDim}1A 1px,transparent 1px)`,backgroundSize:"28px 28px",pointerEvents:"none" }}/>
      <div style={{ position:"absolute",top:-80,right:-80,width:280,height:280,borderRadius:"50%",background:`radial-gradient(circle,${grade.glow} 0%,transparent 70%)`,pointerEvents:"none" }}/>

      <div style={{ position:"relative",zIndex:1 }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${theme.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {logoUrl ? (
                <img src={logoUrl} alt={theme.name} style={{ height:26, objectFit:"contain" }}/>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:theme.accentDim, border:`1px solid ${theme.borderAccent}`, display:"grid", placeItems:"center" }}>
                    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke={theme.accent} strokeWidth="1.5"><path d="M2 12L6 7l3 3 3-4 2 2"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, letterSpacing:"-0.03em" }}>{theme.name}</div>
                    <div style={{ fontSize:9, fontFamily:theme.mono, color:theme.accent, letterSpacing:".12em" }}>SCORE CREDITICIO</div>
                  </div>
                </div>
              )}
            </div>
            <GradeBadge score={data.score} large theme={theme}/>
          </div>
        </div>

        {/* Gauge + KPIs */}
        <div style={{ padding:"20px 24px", display:"flex", gap:20, flexWrap:"wrap" }}>
          <div style={{ flex:"0 0 auto", display:"flex", justifyContent:"center", minWidth:200 }}>
            <Gauge score={data.score} animate={mounted} theme={theme}/>
          </div>
          <div style={{ flex:1, minWidth:200, display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ padding:"14px 16px", borderRadius:14, background:theme.bgCardAlt, border:`1px solid ${grade.color}25` }}>
                <div style={{ fontSize:9, fontFamily:theme.mono, color:theme.textMuted, letterSpacing:".1em", marginBottom:6 }}>PUNTUACIÓN</div>
                <div style={{ fontSize:36, fontWeight:900, fontFamily:theme.mono, color:grade.color, textShadow:`0 0 18px ${grade.glow}`, letterSpacing:"-0.04em" }}>{data.score}</div>
                <div style={{ fontSize:10, color:theme.textMuted, fontFamily:theme.mono }}>/100 · {grade.label}</div>
              </div>
              <div style={{ padding:"14px 16px", borderRadius:14, background:theme.bgCardAlt, border:`1px solid ${theme.border}` }}>
                <div style={{ fontSize:9, fontFamily:theme.mono, color:theme.textMuted, letterSpacing:".1em", marginBottom:6 }}>COMPLETITUD</div>
                <div style={{ fontSize:36, fontWeight:900, fontFamily:theme.mono, color:theme.accent, textShadow:`0 0 18px ${theme.accentGlow}`, letterSpacing:"-0.04em" }}>{pct}%</div>
                <div style={{ height:4, borderRadius:999, background:theme.border, marginTop:7 }}>
                  <div style={{ height:"100%", borderRadius:999, width:`${pct}%`, background:`linear-gradient(90deg,#3B82F6,${theme.accent})`, transition:"width 1.2s cubic-bezier(.16,1,.3,1) 300ms" }}/>
                </div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
              <KPI label="DSCR"         value={kv("dscr")?.raw||"—"}       sub="benchmark ≥1.25x" status={kv("dscr")?.status||"pending"}       icon="💰" theme={theme}/>
              <KPI label="LEVERAGE"     value={kv("leverage")?.raw||"—"}   sub="benchmark <3x"    status={kv("leverage")?.status||"pending"}   icon="📊" theme={theme}/>
              <KPI label="VOL.EBITDA"   value={kv("ebitda_vol")?.raw||"—"} sub="benchmark <15%"   status={kv("ebitda_vol")?.status||"pending"} icon="📈" theme={theme}/>
              <KPI label="DSO"          value={kv("dso")?.raw||"—"}        sub="benchmark <45d"   status={kv("dso")?.status||"pending"}        icon="⏱" theme={theme}/>
            </div>
          </div>
        </div>

        {/* Syntage */}
        {showSyntage && (
          <div style={{ padding:"0 24px 16px" }}>
            {data.syntage_connected ? (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:12, background:"rgba(59,130,246,.08)", border:"1px solid rgba(59,130,246,.2)" }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:"#3B82F6",boxShadow:"0 0 8px rgba(59,130,246,.6)",flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#3B82F6" }}>Syntage conectado · Datos SAT en tiempo real</div>
                  <div style={{ fontSize:9,color:"#1D4ED8",fontFamily:theme.mono }}>CFDIs · Declaraciones · EBITDA real · DSO automático</div>
                </div>
                <span style={{ fontSize:9,fontFamily:theme.mono,color:"#3B82F6",background:"rgba(59,130,246,.12)",border:"1px solid rgba(59,130,246,.2)",borderRadius:999,padding:"2px 8px" }}>ACTIVO</span>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:12, background:"rgba(251,146,60,.06)", border:"1px solid rgba(251,146,60,.18)" }}>
                <div style={{ width:28,height:28,borderRadius:8,background:"rgba(251,146,60,.1)",display:"grid",placeItems:"center",flexShrink:0,fontSize:14 }}>⚡</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#FB923C" }}>Conecta Syntage para datos fiscales reales del SAT</div>
                  <div style={{ fontSize:9,color:"rgba(251,146,60,.6)",fontFamily:theme.mono }}>CFDIs · Declaraciones · EBITDA automático · DSO real</div>
                </div>
                <button style={{ height:26,padding:"0 12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#F97316,#EA580C)",color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:theme.sans,flexShrink:0 }}>Conectar</button>
              </div>
            )}
          </div>
        )}

        {/* Variables */}
        <div style={{ padding:"0 24px 24px" }}>
          <div style={{ borderTop:`1px solid ${theme.border}`, paddingTop:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
              <div style={{ fontSize:9,fontFamily:theme.mono,color:theme.textDim,letterSpacing:".12em" }}>VARIABLES DEL MODELO ({data.variables.length})</div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {(["all","fiscal","financiero","operativo","credito","mercado"] as const).map(c=>(
                  <button key={c} className="cbtn" onClick={()=>setCat(c)}
                    style={{ height:24,padding:"0 10px",borderRadius:999,border:`1px solid ${cat===c?theme.accent:theme.border}`,background:cat===c?theme.accentDim:"transparent",color:cat===c?theme.accent:theme.textMuted,fontSize:10,fontWeight:600 }}>
                    {c==="all"?"Todas":CAT_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
              {(["ok","warn","risk","missing","pending"] as VarStatus[]).map(s=>(
                <div key={s} style={{ display:"flex",alignItems:"center",gap:4 }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:STATUS_COLOR[s] }}/>
                  <span style={{ fontSize:9,fontFamily:theme.mono,color:theme.textDim,textTransform:"uppercase" }}>{s}</span>
                </div>
              ))}
              <div style={{ marginLeft:"auto",display:"flex",gap:8,flexWrap:"wrap" }}>
                {(["syntage","declared","buro","plinius"] as DataSource[]).map(s=>(
                  <div key={s} style={{ display:"flex",alignItems:"center",gap:4 }}>
                    <div style={{ width:6,height:6,borderRadius:2,background:SOURCE_COLOR[s] }}/>
                    <span style={{ fontSize:9,fontFamily:theme.mono,color:theme.textDim }}>{SOURCE_LABEL[s]}</span>
                  </div>
                ))}
              </div>
            </div>
            {filtered.map((v,i)=><VarRow key={v.key} v={v} delay={i*60} theme={theme}/>)}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"12px 24px", borderTop:`1px solid ${theme.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
          <div style={{ fontSize:9,fontFamily:theme.mono,color:theme.textDim }}>
            Calculado {new Date(data.calculated_at).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"})} · v{data.version}
          </div>
          <div style={{ display:"flex",gap:5,alignItems:"center" }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:data.syntage_connected?"#3B82F6":theme.textDim }}/>
            <span style={{ fontSize:9,fontFamily:theme.mono,color:data.syntage_connected?"#3B82F6":theme.textDim }}>
              {data.syntage_connected?"SAT live":"SAT pendiente"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Compact badge ─────────────────────────────────────────────────────────────
export function CreditScoreCompact({ data=MOCK_DATA, themeKey="plinius" as ThemeKey }: { data?:ScoreData; themeKey?:ThemeKey }) {
  const theme = THEMES[themeKey];
  const grade = getGrade(data.score);
  return (
    <div style={{ display:"inline-flex",alignItems:"center",gap:10,padding:"8px 14px",borderRadius:14,background:theme.bgCard,border:`1px solid ${grade.color}30`,boxShadow:`0 0 16px ${grade.glow}` }}>
      <GradeBadge score={data.score} theme={theme}/>
      <div>
        <div style={{ fontSize:10,fontFamily:theme.mono,color:theme.textMuted,marginBottom:2 }}>SCORE {theme.name.toUpperCase()}</div>
        <div style={{ fontSize:22,fontWeight:900,fontFamily:theme.mono,color:grade.color,textShadow:`0 0 10px ${grade.glow}` }}>{data.score}<span style={{ fontSize:11,color:theme.textMuted }}>/100</span></div>
      </div>
    </div>
  );
}

// ── Demo ──────────────────────────────────────────────────────────────────────
export default function CreditScoreDemo() {
  const [score, setScore] = useState(67);
  const [themeKey, setThemeKey] = useState<ThemeKey>("plinius");

  const data: ScoreData = {
    ...MOCK_DATA, score,
    variables: MOCK_DATA.variables.map(v=>({ ...v, value:v.value!==null?Math.min(100,Math.max(0,v.value+(score-67))):null })),
  };

  const accent = themeKey==="plinius"?"#00E5A0":"#0066FF";

  return (
    <div style={{ minHeight:"100vh", background:"#030810", padding:"28px 20px", fontFamily:"'Geist',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800;900&family=Geist+Mono:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ maxWidth:780, margin:"0 auto" }}>
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"#334155", letterSpacing:".15em", marginBottom:4 }}>MOTOR DE SCORING v2.0 · PRIVATE CREDIT</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#F8FAFC", letterSpacing:"-0.04em" }}>Score Crediticio</div>
        </div>

        <div style={{ marginBottom:20, padding:"14px 18px", background:"#0F172A", border:"1px solid #1E293B", borderRadius:14, display:"flex", flexWrap:"wrap", gap:14, alignItems:"center" }}>
          <div style={{ display:"flex", gap:8 }}>
            {(["plinius","crowdlink"] as ThemeKey[]).map(t=>(
              <button key={t} onClick={()=>setThemeKey(t)}
                style={{ height:30,padding:"0 14px",borderRadius:999,border:"none",cursor:"pointer",fontFamily:"'Geist',sans-serif",fontWeight:700,fontSize:11,transition:"all .2s",
                  background:themeKey===t?(t==="plinius"?"#0C1E4A":"#001A4A"):"#1E293B",
                  color:themeKey===t?(t==="plinius"?"#00E5A0":"#0066FF"):"#475569",
                  boxShadow:themeKey===t?`0 0 12px ${t==="plinius"?"rgba(0,229,160,.2)":"rgba(0,102,255,.2)"}`:"none" }}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10,flex:1,minWidth:200 }}>
            <div style={{ fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#475569",whiteSpace:"nowrap" }}>DEMO</div>
            <input type="range" min={0} max={100} value={score} onChange={e=>setScore(Number(e.target.value))} style={{ flex:1,accentColor:accent }}/>
            <div style={{ fontSize:14,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:getGrade(score).color,minWidth:28 }}>{score}</div>
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155",letterSpacing:".12em",marginBottom:10 }}>BADGE COMPACTO · MARKETPLACE</div>
          <CreditScoreCompact data={data} themeKey={themeKey}/>
        </div>

        <CreditScoreCard data={data} themeKey={themeKey} showSyntage/>
      </div>
    </div>
  );
}
