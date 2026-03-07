"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ── Score engine ─────────────────────────────────────────────────────────────
type VarStatus = "ok" | "warn" | "risk" | "missing" | "pending";
type DataSource = "declared" | "syntage" | "buro" | "plinius" | "pending";

type ScoreVar = {
  key: string; label: string; cat: string; w: number;
  value: number | null; raw: string; status: VarStatus;
  source: DataSource; benchmark: string; trend?: "up"|"down"|"flat"|null;
};

const SCOLOR: Record<VarStatus, string> = {
  ok:"#00C48C", warn:"#FACC15", risk:"#FB923C", missing:"#F87171", pending:"#334155"
};
const SRCCOLOR: Record<DataSource, string> = {
  syntage:"#3B82F6", declared:"#64748B", buro:"#8B5CF6", plinius:"#00E5A0", pending:"#334155"
};
const SRCLABEL: Record<DataSource, string> = {
  syntage:"SAT/Syntage", declared:"Declarado", buro:"Buró", plinius:"Plinius", pending:"Pendiente"
};

function scoreGrade(s: number) {
  if (s>=85) return {l:"A",label:"Excelente", c:"#00C48C",g:"rgba(0,196,140,.4)"};
  if (s>=70) return {l:"B",label:"Bueno",     c:"#4ADE80",g:"rgba(74,222,128,.3)"};
  if (s>=55) return {l:"C",label:"Moderado",  c:"#FACC15",g:"rgba(250,204,21,.3)"};
  if (s>=40) return {l:"D",label:"Bajo",      c:"#FB923C",g:"rgba(251,146,60,.3)"};
  return           {l:"E",label:"Alto riesgo",c:"#F87171",g:"rgba(248,113,113,.4)"};
}

function calcScore(b: any): { score: number; vars: ScoreVar[] } {
  function norm(val: number, min: number, max: number) {
    return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
  }
  const vars: ScoreVar[] = [
    { key:"rfc",         label:"RFC validado",              cat:"Fiscal",     w:5,  value:b?.rfc?100:0,              raw:b?.rfc||"Sin RFC",                         status:b?.rfc?"ok":"missing",                                                              source:"declared", benchmark:"Requerido",      trend:null  },
    { key:"antiguedad",  label:"Antigüedad empresa",        cat:"Fiscal",     w:8,  value:b?.fin_antiguedad?norm(Number(b.fin_antiguedad),0,10):0, raw:b?.fin_antiguedad?`${b.fin_antiguedad} años`:"—", status:b?.fin_antiguedad?(Number(b.fin_antiguedad)>=3?"ok":"warn"):"missing", source:"declared", benchmark:">3 años",       trend:null  },
    { key:"facturacion", label:"Facturación anual",         cat:"Financiero", w:14, value:b?.fin_facturacion_anual?norm(Number(b.fin_facturacion_anual),0,50_000_000):0, raw:b?.fin_facturacion_anual?`$${(Number(b.fin_facturacion_anual)/1_000_000).toFixed(1)}M`:"—", status:b?.fin_facturacion_anual?(Number(b.fin_facturacion_anual)>=5_000_000?"ok":"warn"):"missing", source:"declared", benchmark:">$5M MXN",       trend:"up"  },
    { key:"empleados",   label:"Empleados",                 cat:"Operativo",  w:6,  value:b?.fin_num_empleados?norm(Number(b.fin_num_empleados),0,200):0, raw:b?.fin_num_empleados?`${b.fin_num_empleados}`:"—", status:b?.fin_num_empleados?(Number(b.fin_num_empleados)>=20?"ok":"warn"):"missing", source:"declared", benchmark:">20",           trend:null  },
    { key:"sector",      label:"Sector / giro",             cat:"Mercado",    w:6,  value:b?.fin_sector?75:0,        raw:b?.fin_sector||"—",                        status:b?.fin_sector?"ok":"missing",                                                       source:"declared", benchmark:"Bajo riesgo",    trend:null  },
    { key:"garantias",   label:"Garantías ofrecidas",       cat:"Crédito",    w:12, value:b?.fin_garantias?65:20,    raw:b?.fin_garantias||"Sin garantías",         status:b?.fin_garantias?"ok":"warn",                                                       source:"declared", benchmark:"1.5x cobertura", trend:null  },
    { key:"dscr",        label:"DSCR",                      cat:"Financiero", w:14, value:null,                      raw:"Requiere Syntage",                        status:"pending",                                                                          source:"pending",  benchmark:"≥1.25x",         trend:null  },
    { key:"ebitda_vol",  label:"Volatilidad EBITDA (12m)",  cat:"Financiero", w:10, value:null,                      raw:"Requiere Syntage",                        status:"pending",                                                                          source:"pending",  benchmark:"<15%",           trend:null  },
    { key:"dso",         label:"DSO días cobranza",         cat:"Operativo",  w:8,  value:null,                      raw:"Requiere Syntage",                        status:"pending",                                                                          source:"pending",  benchmark:"<45 días",       trend:null  },
    { key:"concentracion",label:"Concentración clientes",   cat:"Operativo",  w:5,  value:null,                      raw:"Requiere Syntage",                        status:"pending",                                                                          source:"pending",  benchmark:"<60%",           trend:null  },
    { key:"tendencia",   label:"Tendencia ingresos YoY",    cat:"Mercado",    w:4,  value:null,                      raw:"Requiere Syntage",                        status:"pending",                                                                          source:"pending",  benchmark:">0%",            trend:null  },
    { key:"historial",   label:"Historial pagos Plinius",   cat:"Crédito",    w:8,  value:0,                         raw:"Sin historial",                           status:"missing",                                                                          source:"plinius",  benchmark:"Requerido",      trend:null  },
    { key:"buro",        label:"Buró de Crédito",           cat:"Crédito",    w:0,  value:null,                      raw:"Consulta pendiente",                      status:"pending",                                                                          source:"buro",     benchmark:"Score >650",     trend:null  },
  ];
  const activeVars = vars.filter(v=>v.value!==null && v.status!=="pending");
  const totalW = activeVars.reduce((s,v)=>s+v.w,0);
  const weighted = activeVars.reduce((s,v)=>s+(v.value!*v.w),0);
  const score = totalW>0 ? Math.round(weighted/totalW) : 0;
  return { score, vars };
}

// ── Animated counter ──────────────────────────────────────────────────────────
function useAnimated(target: number, ms=1600) {
  const [v,setV] = useState(0);
  useEffect(()=>{
    let start: number|null=null;
    const step=(ts:number)=>{
      if(!start) start=ts;
      const p=Math.min((ts-start)/ms,1);
      setV(Math.round((1-Math.pow(1-p,4))*target));
      if(p<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },[target,ms]);
  return v;
}

// ── Big Gauge ─────────────────────────────────────────────────────────────────
function BigGauge({ score }: { score: number }) {
  const disp = useAnimated(score, 1800);
  const g = scoreGrade(score);
  const cx=200,cy=170,START=-215,RANGE=250;
  const ang = START+(disp/100)*RANGE;

  function pt(deg:number,r:number){ const a=deg*Math.PI/180; return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}; }
  function arc(s:number,e:number,ri:number,ro:number){
    const a=pt(s,ro),b=pt(e,ro),c=pt(e,ri),d=pt(s,ri);const l=e-s>180?1:0;
    return `M${a.x},${a.y} A${ro},${ro} 0 ${l} 1 ${b.x},${b.y} L${c.x},${c.y} A${ri},${ri} 0 ${l} 0 ${d.x},${d.y} Z`;
  }
  const SEGS=[
    {f:-215,t:-173,c:"#F87171",l:"E"},{f:-173,t:-131,c:"#FB923C",l:"D"},
    {f:-131,t:-89, c:"#FACC15",l:"C"},{f:-89, t:-47, c:"#4ADE80",l:"B"},
    {f:-47, t:35,  c:"#00C48C",l:"A"},
  ];
  const needle=pt(ang,115);

  return (
    <svg viewBox="0 0 400 240" style={{width:"100%",maxWidth:480,overflow:"visible"}}>
      <defs>
        <radialGradient id="bglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={g.c} stopOpacity="0.12"/>
          <stop offset="100%" stopColor={g.c} stopOpacity="0"/>
        </radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow2"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx={cx} cy={cy} r={160} fill="url(#bglow)"/>
      <path d={arc(-215,35,110,148)} fill="#0A1628"/>
      {SEGS.map((s,i)=><path key={i} d={arc(s.f,s.t,112,146)} fill={s.c} opacity={0.1}/>)}
      {disp>0&&<path d={arc(-215,START+(disp/100)*RANGE,112,146)} fill={g.c} opacity={0.9} filter="url(#glow)"/>}
      {Array.from({length:51}).map((_,i)=>{
        const deg=-215+i*5,maj=i%5===0;
        const p1=pt(deg,149),p2=pt(deg,maj?164:157);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={maj?"#1E293B":"#0F1E2E"} strokeWidth={maj?1.5:0.8}/>;
      })}
      {SEGS.map((s,i)=>{
        const m=(s.f+s.t)/2,p=pt(m,172);
        return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill={s.c} fontSize={11} fontWeight={900} fontFamily="'Geist Mono',monospace" opacity={0.65}>{s.l}</text>;
      })}
      {/* Tick value labels */}
      {[0,25,50,75,100].map(v=>{
        const deg=START+(v/100)*RANGE,p=pt(deg,180);
        return <text key={v} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="#1E293B" fontSize={8} fontFamily="'Geist Mono',monospace">{v}</text>;
      })}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={g.c} strokeWidth={3.5} strokeLinecap="round" style={{filter:`drop-shadow(0 0 8px ${g.g})`}}/>
      <circle cx={cx} cy={cy} r={10} fill={g.c} filter="url(#glow)"/>
      <circle cx={cx} cy={cy} r={4.5} fill="#040C18"/>
      <text x={cx} y={cy+32} textAnchor="middle" fill={g.c} fontSize={52} fontWeight={900} fontFamily="'Geist Mono',monospace" style={{filter:`drop-shadow(0 0 16px ${g.g})`}}>{disp}</text>
      <text x={cx} y={cy+52} textAnchor="middle" fill="#334155" fontSize={12} fontFamily="'Geist Mono',monospace" letterSpacing="3">DE 100</text>
      <text x={40} y={218} fill="#F87171" fontSize={10} fontFamily="'Geist Mono',monospace" fontWeight={700}>RIESGO</text>
      <text x={298} y={218} fill="#00C48C" fontSize={10} fontFamily="'Geist Mono',monospace" fontWeight={700}>EXCELENTE</text>
    </svg>
  );
}

// ── Download helpers ──────────────────────────────────────────────────────────
function downloadCSV(vars: ScoreVar[], score: number, empresa: string) {
  const rows=[
    ["Empresa",empresa],["Score",score],["Fecha",new Date().toLocaleDateString("es-MX")],[""],
    ["Variable","Categoría","Peso","Valor (0-100)","Valor real","Benchmark","Status","Fuente"],
    ...vars.map(v=>[v.label,v.cat,`${v.w}%`,v.value??"-",v.raw,v.benchmark,v.status,SRCLABEL[v.source]]),
  ];
  const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  a.download=`score_${empresa.replace(/\s+/g,"_")}_${Date.now()}.csv`;
  a.click();
}

function printPDF(vars: ScoreVar[], score: number, empresa: string) {
  const g=scoreGrade(score);
  const rows=vars.map(v=>`<tr><td>${v.label}</td><td>${v.cat}</td><td style="text-align:center">${v.w}%</td><td style="font-weight:700;color:${SCOLOR[v.status]}">${v.raw}</td><td>${v.benchmark}</td><td style="color:${SCOLOR[v.status]};font-weight:700;text-transform:uppercase">${v.status}</td></tr>`).join("");
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Score ${empresa}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1E293B;padding:40px;background:#fff}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #E2E8F0}
  h1{font-size:24px;font-weight:900;color:#0C1E4A;letter-spacing:-0.04em}
  .meta{font-size:11px;color:#94A3B8;margin-top:6px;font-family:monospace}
  .score-section{display:flex;align-items:center;gap:24px;padding:24px;background:#F8FAFC;border-radius:16px;border:2px solid ${g.c}30;margin-bottom:24px}
  .grade{width:72px;height:72px;border-radius:16px;background:${g.c}18;border:2px solid ${g.c}50;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:${g.c};font-family:monospace}
  .score-num{font-size:56px;font-weight:900;color:${g.c};font-family:monospace;line-height:1}
  .score-label{font-size:14px;font-weight:700;color:${g.c};margin-top:4px}
  .score-sub{font-size:11px;color:#94A3B8;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#0C1E4A;color:#fff;padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em}
  td{padding:9px 12px;border-bottom:1px solid #F1F5F9}tr:nth-child(even) td{background:#F8FAFC}
  .notice{margin-top:20px;padding:12px 16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;font-size:11px;color:#9A3412}
  .footer{margin-top:28px;font-size:10px;color:#94A3B8;border-top:1px solid #E2E8F0;padding-top:16px;display:flex;justify-content:space-between}
  @media print{body{padding:24px}.notice{break-inside:avoid}}</style></head>
  <body>
  <div class="header">
    <div><h1>Score Crediticio Plinius</h1><div class="meta">${empresa} · ${new Date().toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"})} · Modelo v2.0-beta</div></div>
    <div style="font-size:22px;font-weight:900;color:#0C1E4A;letter-spacing:-0.04em">Plinius</div>
  </div>
  <div class="score-section">
    <div class="grade">${g.l}</div>
    <div><div class="score-num">${score}</div><div class="score-label">Grado ${g.l} · ${g.label}</div><div class="score-sub">Score sobre 100 puntos · Evaluación parcial (Syntage y Buró pendientes)</div></div>
  </div>
  <table><thead><tr><th>Variable</th><th>Categoría</th><th>Peso</th><th>Valor</th><th>Benchmark</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="notice">⚠ Reporte preliminar. DSCR, EBITDA, DSO y Concentración de clientes requieren conexión Syntage (SAT). Buró de Crédito requiere consulta manual ($299 MXN por empresa).</div>
  <div class="footer"><span>Generado por Plinius · plinius.mx</span><span>Confidencial · No constituye dictamen crediticio definitivo</span></div>
  </body></html>`;
  const w=window.open("","_blank");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminUserScorePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [borrower, setBorrower]   = useState<any>(null);
  const [userData, setUserData]   = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"variables"|"solicitudes">("overview");
  const [scanState, setScanState] = useState<"idle"|"loading"|"done">("idle");
  const [filterCat, setFilterCat] = useState<string>("all");

  useEffect(()=>{
    (async()=>{
      const {data:auth}=await supabase.auth.getUser();
      if(!auth.user){router.push("/admin/login");return;}
      const {data:sa}=await supabase.from("super_admins").select("user_id").eq("user_id",auth.user.id).maybeSingle();
      if(!sa){router.push("/dashboard");return;}

      const [{data:b},{data:s}] = await Promise.all([
        supabase.from("borrowers_profile").select("*").eq("owner_id",userId).maybeSingle(),
        supabase.from("solicitudes").select("id,destino,monto,status,created_at,plazo_meses,tasa_interes").eq("owner_id",userId).order("created_at",{ascending:false}),
      ]);
      setBorrower(b);
      setUserData({solicitudes:s??[]});
      setLoading(false);
    })();
  },[userId,router]);

  const {score,vars} = calcScore(borrower);
  const grade = scoreGrade(score);
  const empresa = borrower?.razon_social||borrower?.nombre_completo||"Usuario";
  const completeness = Math.round(vars.filter(v=>v.value!==null&&v.status!=="pending").length/vars.length*100);

  const cats = ["all","Fiscal","Financiero","Operativo","Crédito","Mercado"];
  const filteredVars = filterCat==="all" ? vars : vars.filter(v=>v.cat===filterCat);

  const SSTAT: Record<string,{bg:string;c:string}> = {
    enviada:{bg:"#EFF6FF",c:"#1E40AF"},en_revision:{bg:"#FFF7ED",c:"#9A3412"},
    ofertada:{bg:"#F0FDF9",c:"#065F46"},aceptada:{bg:"#ECFDF5",c:"#065F46"},
    rechazada:{bg:"#FFF1F2",c:"#9F1239"},pendiente:{bg:"#FFF7ED",c:"#9A3412"},
  };

  function fmt(n:number){if(!n)return"—";if(n>=1_000_000)return`$${(n/1_000_000).toFixed(1)}M`;if(n>=1_000)return`$${(n/1_000).toFixed(0)}K`;return`$${n}`;}

  async function requestScan(){
    setScanState("loading");
    // TODO: insert into scan_requests table + notify admin
    await supabase.from("scan_requests").upsert({
      user_id: userId, type:"buro_sat", status:"pending",
      amount: 299, requested_at: new Date().toISOString()
    }).then(()=>{});
    await new Promise(r=>setTimeout(r,1500));
    setScanState("done");
  }

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
    .tab-btn{border:none;cursor:pointer;transition:all .15s;font-family:'Geist',sans-serif;}
    .cat-btn{border:none;cursor:pointer;transition:all .15s;font-family:'Geist',sans-serif;}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1E293B;border-radius:999px}
  `;

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#040C18",display:"grid",placeItems:"center",fontFamily:"'Geist',sans-serif"}}>
      <style>{CSS}</style>
      <div style={{display:"flex",alignItems:"center",gap:12,color:"#334155"}}>
        <svg style={{animation:"spin .8s linear infinite"}} width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2a8 8 0 018 8"/></svg>
        <span style={{fontSize:13,fontFamily:"'Geist Mono',monospace"}}>Cargando score...</span>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#040C18",fontFamily:"'Geist',sans-serif",color:"#F8FAFC"}}>
      <style>{CSS}</style>

      {/* Top nav */}
      <div style={{padding:"14px 32px",borderBottom:"1px solid #0F1E2E",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(4,12,24,.95)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <button onClick={()=>router.push("/admin")}
            style={{display:"flex",alignItems:"center",gap:7,height:32,padding:"0 12px",borderRadius:8,border:"1px solid #1E293B",background:"transparent",color:"#64748B",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Geist',sans-serif",transition:"all .15s"}}>
            <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L4 6l4 4"/></svg>
            Admin
          </button>
          <div style={{width:1,height:16,background:"#1E293B"}}/>
          <div>
            <span style={{fontSize:12,fontWeight:700,color:"#F8FAFC"}}>{empresa}</span>
            <span style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#334155",marginLeft:8}}>Score Crediticio</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Grade badge */}
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px 6px 8px",borderRadius:10,background:`${grade.c}12`,border:`1px solid ${grade.c}30`}}>
            <div style={{width:28,height:28,borderRadius:7,background:`${grade.c}18`,border:`1.5px solid ${grade.c}40`,display:"grid",placeItems:"center",fontSize:14,fontWeight:900,color:grade.c,fontFamily:"'Geist Mono',monospace"}}>{grade.l}</div>
            <div>
              <div style={{fontSize:14,fontWeight:900,color:grade.c,fontFamily:"'Geist Mono',monospace",lineHeight:1}}>{score}<span style={{fontSize:10,color:"#334155"}}>/100</span></div>
              <div style={{fontSize:9,color:`${grade.c}99`,fontFamily:"'Geist Mono',monospace"}}>{grade.label}</div>
            </div>
          </div>
          <button onClick={()=>downloadCSV(vars,score,empresa)}
            style={{height:32,padding:"0 12px",borderRadius:8,border:"1px solid #1E293B",background:"transparent",color:"#64748B",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Geist',sans-serif",display:"flex",alignItems:"center",gap:6}}>
            ⬇ CSV
          </button>
          <button onClick={()=>printPDF(vars,score,empresa)}
            style={{height:32,padding:"0 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Geist',sans-serif",display:"flex",alignItems:"center",gap:6,boxShadow:"0 2px 12px rgba(12,30,74,.4)"}}>
            📄 PDF
          </button>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"32px 32px 64px"}}>

        {/* Header info row */}
        <div className="fade" style={{display:"flex",alignItems:"flex-start",gap:24,marginBottom:32,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:280}}>
            <div style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#334155",letterSpacing:".15em",marginBottom:8}}>EVALUACIÓN CREDITICIA · ADMIN VIEW</div>
            <div style={{fontSize:28,fontWeight:900,letterSpacing:"-0.04em",color:"#F8FAFC",marginBottom:6}}>{empresa}</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {borrower?.rfc&&<span style={{fontSize:11,fontFamily:"'Geist Mono',monospace",color:"#64748B",background:"#0F1E2E",border:"1px solid #1E293B",borderRadius:999,padding:"3px 10px"}}>RFC: {borrower.rfc}</span>}
              {borrower?.fin_sector&&<span style={{fontSize:11,fontFamily:"'Geist Mono',monospace",color:"#64748B",background:"#0F1E2E",border:"1px solid #1E293B",borderRadius:999,padding:"3px 10px"}}>{borrower.fin_sector}</span>}
              <span style={{fontSize:11,fontFamily:"'Geist Mono',monospace",color:"#334155",background:"#0F1E2E",border:"1px solid #1E293B",borderRadius:999,padding:"3px 10px"}}>ID: {userId?.slice(0,8)}…</span>
            </div>
          </div>
          {/* Completeness */}
          <div style={{padding:"16px 20px",borderRadius:14,background:"#0A1628",border:"1px solid #1E293B",minWidth:200}}>
            <div style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155",letterSpacing:".1em",marginBottom:8}}>COMPLETITUD DEL MODELO</div>
            <div style={{fontSize:28,fontWeight:900,fontFamily:"'Geist Mono',monospace",color:"#00E5A0",textShadow:"0 0 16px rgba(0,229,160,.4)",marginBottom:8}}>{completeness}%</div>
            <div style={{height:5,borderRadius:999,background:"#0F1E2E"}}>
              <div style={{height:"100%",borderRadius:999,width:`${completeness}%`,background:"linear-gradient(90deg,#3B82F6,#00E5A0)",transition:"width 1.2s cubic-bezier(.16,1,.3,1) 300ms"}}/>
            </div>
            <div style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155",marginTop:6}}>{vars.filter(v=>v.status==="pending").length} variables pendientes</div>
          </div>
          {/* KPI mini cards */}
          {[
            {l:"SAT/Syntage",v:"No conectado",c:"#FB923C",i:"⚡"},
            {l:"Buró",v:"Pendiente",c:"#8B5CF6",i:"🏦"},
            {l:"Historial",v:"Sin datos",c:"#F87171",i:"📋"},
          ].map(k=>(
            <div key={k.l} style={{padding:"16px 18px",borderRadius:14,background:"#0A1628",border:`1px solid ${k.c}20`,minWidth:130}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155",letterSpacing:".1em"}}>{k.l.toUpperCase()}</div>
                <span style={{fontSize:14}}>{k.i}</span>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Scan CTA */}
        <div className="fade" style={{marginBottom:28,padding:"16px 20px",borderRadius:14,background:scanState==="done"?"rgba(0,196,140,.06)":"rgba(99,102,241,.06)",border:`1px solid ${scanState==="done"?"rgba(0,196,140,.2)":"rgba(99,102,241,.2)"}`,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          {scanState==="done" ? (
            <>
              <div style={{width:36,height:36,borderRadius:10,background:"rgba(0,196,140,.1)",display:"grid",placeItems:"center",flexShrink:0}}>
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#00C48C" strokeWidth="2"><path d="M2 8l4 4 8-8"/></svg>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#00C48C"}}>Solicitud de scan enviada</div>
                <div style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"rgba(0,196,140,.5)"}}>Equipo notificado · Consulta Buró + SAT/Syntage · $299 MXN por empresa</div>
              </div>
            </>
          ) : (
            <>
              <div style={{width:36,height:36,borderRadius:10,background:"rgba(99,102,241,.1)",display:"grid",placeItems:"center",flexShrink:0,fontSize:18}}>🔍</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"#818CF8"}}>Solicitar Scan Completo · Buró + SAT</div>
                <div style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"rgba(129,140,248,.5)"}}>Activa DSCR · Volatilidad EBITDA · DSO · Concentración · Historial Buró · +40pts potenciales al score</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:18,fontWeight:900,fontFamily:"'Geist Mono',monospace",color:"#818CF8"}}>$299</div>
                  <div style={{fontSize:9,color:"rgba(129,140,248,.5)",fontFamily:"'Geist Mono',monospace"}}>MXN / empresa</div>
                </div>
                <button onClick={requestScan} disabled={scanState==="loading"||!borrower?.rfc}
                  style={{height:38,padding:"0 20px",borderRadius:10,border:"none",background:borrower?.rfc?"linear-gradient(135deg,#4F46E5,#7C3AED)":"#1E293B",color:borrower?.rfc?"#fff":"#334155",fontSize:12,fontWeight:700,cursor:borrower?.rfc?"pointer":"not-allowed",fontFamily:"'Geist',sans-serif",boxShadow:borrower?.rfc?"0 4px 16px rgba(99,102,241,.3)":"none",opacity:scanState==="loading"?.7:1,whiteSpace:"nowrap"}}>
                  {scanState==="loading"?"Enviando…":"Solicitar scan →"}
                </button>
                {!borrower?.rfc&&<div style={{fontSize:9,color:"#F87171",fontFamily:"'Geist Mono',monospace",maxWidth:80}}>RFC requerido</div>}
              </div>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="fade" style={{display:"flex",gap:2,marginBottom:24,borderBottom:"1px solid #0F1E2E",paddingBottom:0}}>
          {([["overview","Resumen"],["variables","Variables ("+vars.length+")"],["solicitudes","Solicitudes"]] as const).map(([id,label])=>(
            <button key={id} className="tab-btn" onClick={()=>setActiveTab(id)}
              style={{padding:"10px 18px",background:"transparent",color:activeTab===id?"#F8FAFC":"#334155",fontSize:12,fontWeight:activeTab===id?700:500,borderBottom:activeTab===id?"2px solid #00E5A0":"2px solid transparent",marginBottom:-1,transition:"all .15s"}}>
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB OVERVIEW ── */}
        {activeTab==="overview" && (
          <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,alignItems:"start"}}>
            {/* Gauge */}
            <div style={{background:"linear-gradient(160deg,#0A1628,#060D1A)",border:`1px solid ${grade.c}20`,borderRadius:20,padding:"28px 24px",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-60,right:-60,width:220,height:220,borderRadius:"50%",background:`radial-gradient(circle,${grade.g} 0%,transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(#1E293B18 1px,transparent 1px),linear-gradient(90deg,#1E293B18 1px,transparent 1px)",backgroundSize:"24px 24px",pointerEvents:"none"}}/>
              <div style={{position:"relative",zIndex:1}}>
                <div style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155",letterSpacing:".12em",marginBottom:16}}>PUNTUACIÓN CREDITICIA</div>
                <BigGauge score={score}/>
                <div style={{display:"flex",justifyContent:"center",gap:10,marginTop:8,flexWrap:"wrap"}}>
                  {(["ok","warn","missing","pending"] as VarStatus[]).map(s=>(
                    <div key={s} style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:SCOLOR[s]}}/>
                      <span style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#1E293B",textTransform:"uppercase"}}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right col */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {/* Grade card */}
              <div style={{padding:"20px",borderRadius:16,background:"#0A1628",border:`1px solid ${grade.c}25`}}>
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                  <div style={{width:58,height:58,borderRadius:14,background:`${grade.c}14`,border:`2px solid ${grade.c}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:900,color:grade.c,fontFamily:"'Geist Mono',monospace",boxShadow:`0 0 24px ${grade.g}`}}>
                    {grade.l}
                  </div>
                  <div>
                    <div style={{fontSize:32,fontWeight:900,fontFamily:"'Geist Mono',monospace",color:grade.c,textShadow:`0 0 20px ${grade.g}`,letterSpacing:"-0.04em"}}>{score}</div>
                    <div style={{fontSize:13,color:grade.c,fontWeight:600}}>{grade.label}</div>
                  </div>
                </div>
                {/* Category scores */}
                {["Fiscal","Financiero","Operativo","Crédito","Mercado"].map(cat=>{
                  const catVars=vars.filter(v=>v.cat===cat&&v.value!==null&&v.status!=="pending");
                  if(catVars.length===0) return null;
                  const avg=Math.round(catVars.reduce((s,v)=>s+(v.value!*v.w),0)/catVars.reduce((s,v)=>s+v.w,0));
                  const g2=scoreGrade(avg);
                  return (
                    <div key={cat} style={{marginBottom:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                        <span style={{fontSize:11,fontWeight:600,color:"#64748B"}}>{cat}</span>
                        <span style={{fontSize:11,fontFamily:"'Geist Mono',monospace",color:g2.c,fontWeight:700}}>{avg}</span>
                      </div>
                      <div style={{height:4,borderRadius:999,background:"#0F1E2E"}}>
                        <div style={{height:"100%",borderRadius:999,width:`${avg}%`,background:g2.c,transition:"width 1s cubic-bezier(.16,1,.3,1) 500ms",boxShadow:g2.g?`0 0 6px ${g2.c}55`:"none"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Data sources */}
              <div style={{padding:"16px 18px",borderRadius:14,background:"#0A1628",border:"1px solid #0F1E2E"}}>
                <div style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155",letterSpacing:".1em",marginBottom:12}}>FUENTES DE DATOS</div>
                {(["declared","syntage","buro","plinius"] as DataSource[]).map(src=>{
                  const srcVars=vars.filter(v=>v.source===src);
                  const connected=src==="declared"?true:src==="plinius"?false:false;
                  return (
                    <div key={src} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:connected?SRCCOLOR[src]:"#1E293B",boxShadow:connected?`0 0 6px ${SRCCOLOR[src]}`:"none"}}/>
                        <span style={{fontSize:12,color:"#64748B"}}>{SRCLABEL[src]}</span>
                      </div>
                      <span style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:connected?SRCCOLOR[src]:"#1E293B",background:connected?`${SRCCOLOR[src]}14`:"#0F1E2E",border:`1px solid ${connected?SRCCOLOR[src]+"28":"#1E293B"}`,borderRadius:999,padding:"2px 8px"}}>
                        {src==="declared"?"Activo":"Pendiente"} · {srcVars.length} vars
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Borrower key data */}
              {borrower && (
                <div style={{padding:"16px 18px",borderRadius:14,background:"#0A1628",border:"1px solid #0F1E2E"}}>
                  <div style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155",letterSpacing:".1em",marginBottom:12}}>DATOS CLAVE</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {[
                      ["Facturación",borrower.fin_facturacion_anual?`$${(Number(borrower.fin_facturacion_anual)/1_000_000).toFixed(1)}M`:"—"],
                      ["Antigüedad",borrower.fin_antiguedad?`${borrower.fin_antiguedad} años`:"—"],
                      ["Sector",borrower.fin_sector||"—"],
                      ["Empleados",borrower.fin_num_empleados||"—"],
                    ].map(([l,v])=>(
                      <div key={l}>
                        <div style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155",marginBottom:3}}>{l.toUpperCase()}</div>
                        <div style={{fontSize:13,fontWeight:700,color:"#F8FAFC"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB VARIABLES ── */}
        {activeTab==="variables" && (
          <div className="fade">
            {/* Filter */}
            <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
              {cats.map(c=>(
                <button key={c} className="cat-btn" onClick={()=>setFilterCat(c)}
                  style={{height:28,padding:"0 12px",borderRadius:999,border:`1px solid ${filterCat===c?"#00E5A0":"#1E293B"}`,background:filterCat===c?"rgba(0,229,160,.1)":"transparent",color:filterCat===c?"#00E5A0":"#334155",fontSize:11,fontWeight:600}}>
                  {c==="all"?"Todas":c}
                </button>
              ))}
            </div>
            <div style={{display:"grid",gap:10}}>
              {filteredVars.map((v,i)=>{
                const sc=SCOLOR[v.status];
                return (
                  <div key={v.key} style={{padding:"14px 18px",borderRadius:14,background:"#0A1628",border:`1px solid ${v.status==="ok"?sc+"20":"#0F1E2E"}`,animation:`fadeUp .3s cubic-bezier(.16,1,.3,1) ${i*40}ms both`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,gap:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:sc,flexShrink:0,boxShadow:v.status==="ok"?`0 0 6px ${sc}`:"none"}}/>
                        <span style={{fontSize:13,fontWeight:700,color:"#F8FAFC"}}>{v.label}</span>
                        <span style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155",background:"#0F1E2E",borderRadius:999,padding:"1px 7px"}}>{v.cat}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                        <span style={{fontSize:12,fontFamily:"'Geist Mono',monospace",color:"#64748B"}}>{v.raw}</span>
                        <span style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155"}}>ref: {v.benchmark}</span>
                        <span style={{fontSize:9,fontFamily:"'Geist Mono',monospace",fontWeight:700,color:SRCCOLOR[v.source],background:`${SRCCOLOR[v.source]}14`,border:`1px solid ${SRCCOLOR[v.source]}28`,borderRadius:999,padding:"1px 7px"}}>{SRCLABEL[v.source]}</span>
                        <span style={{fontSize:11,fontFamily:"'Geist Mono',monospace",fontWeight:900,color:"#334155"}}>{v.w}%</span>
                      </div>
                    </div>
                    <div style={{height:6,borderRadius:999,background:"#060D1A",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:999,background:v.status==="pending"?`repeating-linear-gradient(90deg,#0F1E2E 0,#0F1E2E 5px,transparent 5px,transparent 10px)`:sc,width:v.value!==null?`${v.value}%`:"0%",transition:"width 1s cubic-bezier(.16,1,.3,1) 200ms",boxShadow:v.status==="ok"?`0 0 8px ${sc}55`:"none"}}/>
                    </div>
                    {v.value!==null&&v.status!=="pending"&&(
                      <div style={{display:"flex",justifyContent:"flex-end",marginTop:5}}>
                        <span style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:sc,fontWeight:700}}>{v.value}/100</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB SOLICITUDES ── */}
        {activeTab==="solicitudes" && (
          <div className="fade">
            {userData?.solicitudes?.length>0 ? (
              <div style={{borderRadius:16,background:"#0A1628",border:"1px solid #0F1E2E",overflow:"hidden"}}>
                <div style={{padding:"12px 18px",borderBottom:"1px solid #0F1E2E",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#334155",letterSpacing:".1em"}}>SOLICITUDES DE CRÉDITO</div>
                  <span style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#334155"}}>{userData.solicitudes.length} registros</span>
                </div>
                {userData.solicitudes.map((s:any)=>{
                  const sc=SSTAT[s.status]??{bg:"#F8FAFC",c:"#475569"};
                  return (
                    <div key={s.id} style={{padding:"13px 18px",borderBottom:"1px solid #060D1A",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"#F8FAFC"}}>{s.destino||"—"}</div>
                        <div style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#334155",marginTop:2}}>
                          {new Date(s.created_at).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"})} · {s.plazo_meses}m
                          {s.tasa_interes?` · ${s.tasa_interes}% tasa`:""}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                        <div style={{fontSize:16,fontWeight:900,fontFamily:"'Geist Mono',monospace",color:"#F8FAFC"}}>{fmt(s.monto)}</div>
                        <span style={{fontSize:10,fontWeight:700,fontFamily:"'Geist Mono',monospace",background:sc.bg,color:sc.c,borderRadius:999,padding:"3px 10px"}}>{s.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{padding:48,textAlign:"center",color:"#334155",fontFamily:"'Geist Mono',monospace",fontSize:12}}>Sin solicitudes registradas</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
