"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type VarStatus = "ok" | "warn" | "risk" | "missing" | "pending";
type DataSource = "declared" | "syntage" | "buro" | "plinius" | "pending";
type ScoreVar = {
  key: string; label: string; cat: string; w: number;
  value: number | null; raw: string; status: VarStatus;
  source: DataSource; benchmark: string;
};

const SCOLOR: Record<VarStatus, string> = {
  ok:"#059669", warn:"#D97706", risk:"#DC2626", missing:"#EF4444", pending:"#94A3B8"
};
const SRCCOLOR: Record<DataSource, string> = {
  syntage:"#3B82F6", declared:"#64748B", buro:"#8B5CF6", plinius:"#059669", pending:"#94A3B8"
};
const SRCLABEL: Record<DataSource, string> = {
  syntage:"SAT/Syntage", declared:"Declarado", buro:"Buró", plinius:"Plinius", pending:"Pendiente"
};

function scoreGrade(s: number) {
  if (s>=85) return {l:"A",label:"Excelente",   c:"#059669", bg:"#ECFDF5", border:"#A7F3D0"};
  if (s>=70) return {l:"B",label:"Bueno",        c:"#0284C7", bg:"#EFF6FF", border:"#BAE6FD"};
  if (s>=55) return {l:"C",label:"Moderado",     c:"#D97706", bg:"#FFFBEB", border:"#FDE68A"};
  if (s>=40) return {l:"D",label:"Bajo",         c:"#EA580C", bg:"#FFF7ED", border:"#FED7AA"};
  return           {l:"E",label:"Alto riesgo",   c:"#DC2626", bg:"#FEF2F2", border:"#FECACA"};
}

function calcScore(b: any): { score: number; vars: ScoreVar[] } {
  function norm(val: number, min: number, max: number) {
    return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
  }
  function parseAntiguedad(v: string|null): number|null {
    if (!v) return null;
    const map: Record<string,number> = { "menos_1":0.5,"1_2":1.5,"2_5":3.5,"5_10":7.5,"mas_10":12 };
    return map[v] ?? parseFloat(v) ?? null;
  }
  function parseFacturacion(v: string|null): number|null {
    if (!v) return null;
    const map: Record<string,number> = { "menos_500k":250000,"500k_1m":750000,"1m_5m":3000000,"5m_20m":12500000,"20m_50m":35000000,"mas_50m":75000000 };
    return map[v] ?? parseFloat(v) ?? null;
  }
  function parseEmpleados(v: string|null): number|null {
    if (!v) return null;
    const map: Record<string,number> = { "1_5":3,"6_10":8,"11_50":30,"51_200":125,"mas_200":300 };
    return map[v] ?? parseFloat(v) ?? null;
  }
  const ant  = parseAntiguedad(b?.fin_antiguedad);
  const fact = parseFacturacion(b?.fin_facturacion_anual);
  const emp  = parseEmpleados(b?.fin_num_empleados);
  const rfc  = b?.rfc || b?.company_rfc;
  const vars: ScoreVar[] = [
    { key:"rfc",          label:"RFC validado",            cat:"Fiscal",     w:5,  value:rfc?100:0,              raw:rfc||"Sin RFC",              status:rfc?"ok":"missing",                         source:"declared", benchmark:"Requerido"      },
    { key:"antiguedad",   label:"Antigüedad empresa",      cat:"Fiscal",     w:8,  value:ant?norm(ant,0,10):0,   raw:ant?`${ant} años`:"—",       status:ant?(ant>=3?"ok":"warn"):"missing",          source:"declared", benchmark:">3 años"       },
    { key:"facturacion",  label:"Facturación anual",       cat:"Financiero", w:14, value:fact?norm(fact,0,50000000):0, raw:fact?`$${(fact/1000000).toFixed(1)}M`:"—", status:fact?(fact>=5000000?"ok":"warn"):"missing", source:"declared", benchmark:">$5M MXN" },
    { key:"empleados",    label:"Empleados",               cat:"Operativo",  w:6,  value:emp?norm(emp,0,200):0,  raw:emp?`${emp}`:"—",            status:emp?(emp>=20?"ok":"warn"):"missing",         source:"declared", benchmark:">20"           },
    { key:"sector",       label:"Sector / giro",           cat:"Mercado",    w:6,  value:b?.fin_sector?75:0,     raw:b?.fin_sector||"—",          status:b?.fin_sector?"ok":"missing",                source:"declared", benchmark:"Bajo riesgo"   },
    { key:"garantias",    label:"Garantías ofrecidas",     cat:"Crédito",    w:12, value:b?.fin_garantias?65:20, raw:b?.fin_garantias||"Sin garantías", status:b?.fin_garantias?"ok":"warn",           source:"declared", benchmark:"1.5x cobertura"},
    { key:"dscr",         label:"DSCR (estimado)",         cat:"Financiero", w:14, value:null, raw:"Requiere Syntage", status:"pending", source:"pending", benchmark:"≥1.25x"    },
    { key:"ebitda_vol",   label:"Volatilidad EBITDA",      cat:"Financiero", w:10, value:null, raw:"Requiere Syntage", status:"pending", source:"pending", benchmark:"<15%"      },
    { key:"dso",          label:"DSO días cobranza",       cat:"Operativo",  w:8,  value:null, raw:"Requiere Syntage", status:"pending", source:"pending", benchmark:"<45 días"  },
    { key:"concentracion",label:"Concentración clientes",  cat:"Operativo",  w:5,  value:null, raw:"Requiere Syntage", status:"pending", source:"pending", benchmark:"<60%"      },
    { key:"tendencia",    label:"Tendencia ingresos YoY",  cat:"Mercado",    w:4,  value:null, raw:"Requiere Syntage", status:"pending", source:"pending", benchmark:">0%"       },
    { key:"historial",    label:"Historial pagos Plinius", cat:"Crédito",    w:8,  value:0,    raw:"Sin historial",    status:"missing", source:"plinius", benchmark:"Requerido" },
    { key:"buro",         label:"Buró de Crédito",         cat:"Crédito",    w:9,  value:null, raw:"Consulta pendiente", status:"pending", source:"buro",  benchmark:"Score >650"},
  ];
  const active = vars.filter(v => v.value !== null && v.status !== "pending");
  const tw = active.reduce((s,v) => s+v.w, 0);
  const score = tw > 0 ? Math.round(active.reduce((s,v) => s+v.value!*v.w, 0) / tw) : 0;
  return { score, vars };
}

function downloadCSV(vars: ScoreVar[], score: number, empresa: string) {
  const rows = [
    ["Empresa",empresa],["Score",score],["Fecha",new Date().toLocaleDateString("es-MX")],[""],
    ["Variable","Categoría","Peso","Valor","Benchmark","Status","Fuente"],
    ...vars.map(v=>[v.label,v.cat,`${v.w}%`,v.raw,v.benchmark,v.status,SRCLABEL[v.source]]),
  ];
  const csv = rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  a.download = `score_${empresa.replace(/\s+/g,"_")}_${Date.now()}.csv`;
  a.click();
}

function printPDF(vars: ScoreVar[], score: number, empresa: string) {
  const g = scoreGrade(score);
  const rows = vars.map(v=>`<tr><td>${v.label}</td><td>${v.cat}</td><td>${v.w}%</td><td style="color:${SCOLOR[v.status]};font-weight:700">${v.raw}</td><td>${v.benchmark}</td><td style="color:${SCOLOR[v.status]};font-weight:700;text-transform:uppercase">${v.status}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1E293B;padding:40px}h1{font-size:22px;font-weight:900;color:#0B1F4B}.meta{font-size:11px;color:#94A3B8;margin-top:4px;font-family:monospace}.score-box{display:inline-flex;align-items:center;gap:20px;margin:20px 0;padding:18px 24px;border-radius:14px;background:${g.bg};border:2px solid ${g.border}}.grade{width:52px;height:52px;border-radius:12px;background:${g.bg};border:2px solid ${g.border};display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:${g.c};font-family:monospace}.score-num{font-size:48px;font-weight:900;color:${g.c};font-family:monospace}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}th{background:#0B1F4B;color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em}td{padding:8px 10px;border-bottom:1px solid #F1F5F9}tr:nth-child(even) td{background:#F8FAFC}.notice{margin-top:16px;padding:10px 14px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;font-size:11px;color:#9A3412}.footer{margin-top:28px;font-size:10px;color:#94A3B8;border-top:1px solid #E2E8F0;padding-top:14px;display:flex;justify-content:space-between}</style></head><body><h1>Score Crediticio Plinius</h1><div class="meta">${empresa} · ${new Date().toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"})} · Modelo v2.0-beta</div><div class="score-box"><div class="grade">${g.l}</div><div><div class="score-num">${score}</div><div style="font-size:13px;font-weight:700;color:${g.c}">${g.label} · Grado ${g.l}</div></div></div><table><thead><tr><th>Variable</th><th>Categoría</th><th>Peso</th><th>Valor</th><th>Benchmark</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="notice">⚠ Reporte preliminar. DSCR, EBITDA y DSO requieren Syntage. Buró pendiente ($299 MXN).</div><div class="footer"><span>Generado por Plinius · plinius.mx</span><span>No constituye dictamen crediticio definitivo</span></div></body></html>`;
  const w = window.open("","_blank");
  if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),500);}
}

export default function AdminUserScorePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;
  const [borrower, setBorrower] = useState<any>(null);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"variables"|"solicitudes">("overview");
  const [filterCat, setFilterCat] = useState("all");
  const [scanState, setScanState] = useState<"idle"|"loading"|"done">("idle");

  useEffect(()=>{
    (async()=>{
      const {data:auth} = await supabase.auth.getUser();
      if(!auth.user){router.push("/admin/login");return;}
      const {data:sa} = await supabase.from("super_admins").select("user_id").eq("user_id",auth.user.id).maybeSingle();
      if(!sa){router.push("/dashboard");return;}
      const [{data:b},{data:lender},{data:s}] = await Promise.all([
        supabase.from("borrowers_profile").select("*").eq("owner_id",userId).maybeSingle(),
        supabase.from("lenders_profile").select("*").eq("owner_id",userId).maybeSingle(),
        supabase.from("solicitudes").select("id,destino,monto,status,created_at,plazo_meses,tasa_interes").eq("owner_id",userId).order("created_at",{ascending:false}),
      ]);
      setBorrower(b ?? lender);
      setSolicitudes(s ?? []);
      setLoading(false);
    })();
  },[userId,router]);

  const {score,vars} = calcScore(borrower);
  const grade = scoreGrade(score);
  const empresa = borrower?.company_razon_social||borrower?.institution_name||borrower?.razon_social||borrower?.company_name||"Usuario";
  const rfc = borrower?.rfc||borrower?.company_rfc;
  const completeness = Math.round(vars.filter(v=>v.value!==null&&v.status!=="pending").length/vars.length*100);
  const cats = ["all","Fiscal","Financiero","Operativo","Crédito","Mercado"];
  const filteredVars = filterCat==="all" ? vars : vars.filter(v=>v.cat===filterCat);

  function fmtM(n:number){if(!n)return"—";if(n>=1000000)return`$${(n/1000000).toFixed(1)}M`;if(n>=1000)return`$${(n/1000).toFixed(0)}K`;return`$${n}`;}

  async function requestScan(){
    setScanState("loading");
    await supabase.from("scan_requests").upsert({user_id:userId,type:"buro_sat",status:"pending",amount:299,requested_at:new Date().toISOString()});
    await new Promise(r=>setTimeout(r,1200));
    setScanState("done");
  }

  const SSTAT: Record<string,{bg:string;c:string}> = {
    enviada:{bg:"#EFF6FF",c:"#1E40AF"},en_revision:{bg:"#FFF7ED",c:"#9A3412"},
    ofertada:{bg:"#F0FDF4",c:"#065F46"},aceptada:{bg:"#ECFDF5",c:"#065F46"},
    rechazada:{bg:"#FEF2F2",c:"#9F1239"},pendiente:{bg:"#FFF7ED",c:"#9A3412"},
  };

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#F8FAFC",display:"grid",placeItems:"center",fontFamily:"Arial,sans-serif"}}>
      <div style={{color:"#94A3B8",fontSize:13}}>Cargando score...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFC",fontFamily:"Arial,sans-serif",color:"#1E293B"}}>

      {/* NAV */}
      <div style={{background:"#fff",borderBottom:"1px solid #E2E8F0",padding:"0 32px",display:"flex",justifyContent:"space-between",alignItems:"center",height:52,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>router.push("/admin")} style={{display:"flex",alignItems:"center",gap:6,height:30,padding:"0 12px",borderRadius:7,border:"1px solid #E2E8F0",background:"#F8FAFC",color:"#64748B",fontSize:11,fontWeight:600,cursor:"pointer"}}>← Admin</button>
          <div style={{width:1,height:16,background:"#E2E8F0"}}/>
          <span style={{fontSize:13,fontWeight:700,color:"#0B1F4B"}}>{empresa}</span>
          <span style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace"}}>Score Crediticio</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 12px",borderRadius:8,background:grade.bg,border:`1px solid ${grade.border}`}}>
            <div style={{width:28,height:28,borderRadius:7,background:"#fff",border:`1.5px solid ${grade.border}`,display:"grid",placeItems:"center",fontSize:14,fontWeight:900,color:grade.c,fontFamily:"monospace"}}>{grade.l}</div>
            <div>
              <div style={{fontSize:15,fontWeight:900,color:grade.c,fontFamily:"monospace",lineHeight:1}}>{score}<span style={{fontSize:9,color:"#94A3B8"}}>/100</span></div>
              <div style={{fontSize:8,color:grade.c,fontFamily:"monospace"}}>{grade.label}</div>
            </div>
          </div>
          <button onClick={()=>downloadCSV(vars,score,empresa)} style={{height:30,padding:"0 12px",borderRadius:7,border:"1px solid #E2E8F0",background:"#fff",color:"#64748B",fontSize:11,fontWeight:600,cursor:"pointer"}}>↓ CSV</button>
          <button onClick={()=>printPDF(vars,score,empresa)} style={{height:30,padding:"0 14px",borderRadius:7,border:"none",background:"#0B1F4B",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>📄 PDF</button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 24px 64px"}}>

        {/* HEADER */}
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:20,marginBottom:24,alignItems:"start"}}>
          <div>
            <div style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace",letterSpacing:".12em",marginBottom:6}}>EVALUACIÓN CREDITICIA · ADMIN VIEW</div>
            <div style={{fontSize:24,fontWeight:900,color:"#0B1F4B",letterSpacing:"-0.03em",marginBottom:8}}>{empresa}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {rfc&&<span style={{fontSize:11,fontFamily:"monospace",color:"#64748B",background:"#F1F5F9",borderRadius:999,padding:"3px 10px",border:"1px solid #E2E8F0"}}>RFC: {rfc}</span>}
              {borrower?.fin_sector&&<span style={{fontSize:11,color:"#64748B",background:"#F1F5F9",borderRadius:999,padding:"3px 10px",border:"1px solid #E2E8F0"}}>{borrower.fin_sector}</span>}
              <span style={{fontSize:11,fontFamily:"monospace",color:"#94A3B8",background:"#F1F5F9",borderRadius:999,padding:"3px 10px",border:"1px solid #E2E8F0"}}>ID: {userId?.slice(0,8)}…</span>
            </div>
          </div>
          <div style={{padding:"14px 18px",borderRadius:12,background:"#fff",border:"1px solid #E2E8F0",minWidth:180,textAlign:"center"}}>
            <div style={{fontSize:9,color:"#94A3B8",fontFamily:"monospace",letterSpacing:".1em",marginBottom:6}}>COMPLETITUD</div>
            <div style={{fontSize:28,fontWeight:900,color:"#0B1F4B",marginBottom:6}}>{completeness}%</div>
            <div style={{height:4,borderRadius:999,background:"#F1F5F9"}}>
              <div style={{height:"100%",borderRadius:999,width:`${completeness}%`,background:completeness>=70?"#059669":completeness>=40?"#D97706":"#EF4444",transition:"width 1s ease"}}/>
            </div>
            <div style={{fontSize:9,color:"#94A3B8",fontFamily:"monospace",marginTop:5}}>{vars.filter(v=>v.status==="pending").length} pendientes</div>
          </div>
        </div>

        {/* KPI ROW */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {[
            {l:"Score",       v:`${score}/100`,       c:grade.c,  bg:grade.bg,  border:grade.border},
            {l:"Grado",       v:`${grade.l} · ${grade.label}`, c:grade.c, bg:grade.bg, border:grade.border},
            {l:"SAT/Syntage", v:"No conectado",       c:"#D97706",bg:"#FFFBEB",border:"#FDE68A"},
            {l:"Buró",        v:"Pendiente",           c:"#7C3AED",bg:"#F5F3FF",border:"#DDD6FE"},
          ].map(k=>(
            <div key={k.l} style={{padding:"12px 14px",borderRadius:10,background:k.bg,border:`1px solid ${k.border}`}}>
              <div style={{fontSize:9,color:"#94A3B8",fontFamily:"monospace",letterSpacing:".08em",marginBottom:4}}>{k.l.toUpperCase()}</div>
              <div style={{fontSize:14,fontWeight:700,color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* SCAN CTA */}
        <div style={{marginBottom:20,padding:"14px 18px",borderRadius:12,background:scanState==="done"?"#ECFDF5":"#EFF6FF",border:`1px solid ${scanState==="done"?"#A7F3D0":"#BFDBFE"}`,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          {scanState==="done" ? (
            <span style={{fontSize:13,fontWeight:700,color:"#059669"}}>✓ Solicitud enviada — Equipo notificado</span>
          ) : (
            <>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1E40AF"}}>Solicitar Scan Completo · Buró + SAT</div>
                <div style={{fontSize:11,color:"#3B82F6",marginTop:2}}>Activa DSCR · EBITDA · DSO · Historial Buró · +40pts potenciales</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontSize:18,fontWeight:900,color:"#1E40AF"}}>$299 <span style={{fontSize:10,color:"#94A3B8"}}>MXN</span></div>
                <button onClick={requestScan} disabled={scanState==="loading"||!rfc}
                  style={{height:34,padding:"0 16px",borderRadius:8,border:"none",background:rfc?"#1E40AF":"#E2E8F0",color:rfc?"#fff":"#94A3B8",fontSize:12,fontWeight:700,cursor:rfc?"pointer":"not-allowed"}}>
                  {scanState==="loading"?"Enviando…":"Solicitar →"}
                </button>
                {!rfc&&<span style={{fontSize:10,color:"#EF4444"}}>RFC requerido</span>}
              </div>
            </>
          )}
        </div>

        {/* TABS */}
        <div style={{display:"flex",borderBottom:"1px solid #E2E8F0",marginBottom:20}}>
          {([["overview","Resumen"],["variables",`Variables (${vars.length})`],["solicitudes","Solicitudes"]] as const).map(([id,label])=>(
            <button key={id} onClick={()=>setActiveTab(id)}
              style={{padding:"10px 20px",background:"transparent",border:"none",borderBottom:activeTab===id?"2px solid #0B1F4B":"2px solid transparent",color:activeTab===id?"#0B1F4B":"#94A3B8",fontSize:13,fontWeight:activeTab===id?700:500,cursor:"pointer",marginBottom:-1}}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB OVERVIEW */}
        {activeTab==="overview" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            <div style={{padding:"24px",borderRadius:16,background:"#fff",border:`2px solid ${grade.border}`}}>
              <div style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace",letterSpacing:".1em",marginBottom:16}}>PUNTUACIÓN CREDITICIA</div>
              <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:24}}>
                <div style={{width:72,height:72,borderRadius:16,background:grade.bg,border:`2px solid ${grade.border}`,display:"grid",placeItems:"center",fontSize:32,fontWeight:900,color:grade.c,fontFamily:"monospace"}}>{grade.l}</div>
                <div>
                  <div style={{fontSize:48,fontWeight:900,color:grade.c,fontFamily:"monospace",lineHeight:1}}>{score}</div>
                  <div style={{fontSize:13,color:grade.c,fontWeight:600}}>{grade.label}</div>
                </div>
              </div>
              {["Fiscal","Financiero","Operativo","Crédito","Mercado"].map(cat=>{
                const cv=vars.filter(v=>v.cat===cat&&v.value!==null&&v.status!=="pending");
                if(!cv.length) return null;
                const tw=cv.reduce((s,v)=>s+v.w,0);
                const avg=Math.round(cv.reduce((s,v)=>s+v.value!*v.w,0)/tw);
                const g2=scoreGrade(avg);
                return (
                  <div key={cat} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:11,color:"#64748B",fontWeight:600}}>{cat}</span>
                      <span style={{fontSize:11,fontFamily:"monospace",color:g2.c,fontWeight:700}}>{avg}</span>
                    </div>
                    <div style={{height:5,borderRadius:999,background:"#F1F5F9"}}>
                      <div style={{height:"100%",borderRadius:999,width:`${avg}%`,background:g2.c,transition:"width 1s ease"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {borrower&&(
                <div style={{padding:"18px",borderRadius:14,background:"#fff",border:"1px solid #E2E8F0"}}>
                  <div style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace",letterSpacing:".1em",marginBottom:14}}>DATOS CLAVE</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {([
                      ["Empresa", empresa],
                      ["RFC", rfc||"—"],
                      ["Facturación", borrower.fin_facturacion_anual||"—"],
                      ["Antigüedad", borrower.fin_antiguedad||"—"],
                      ["Sector", borrower.fin_sector||"—"],
                      ["Empleados", borrower.fin_num_empleados||"—"],
                      ["KYC", borrower.kyc_status||"—"],
                      ["Rep. Legal", [borrower.rep_first_names||borrower.legal_rep_first_names, borrower.rep_last_name||borrower.legal_rep_last_name_paternal].filter(Boolean).join(" ")||"—"],
                    ] as [string,string][]).map(([l,v])=>(
                      <div key={l}>
                        <div style={{fontSize:9,color:"#94A3B8",fontFamily:"monospace",marginBottom:2,letterSpacing:".06em"}}>{l.toUpperCase()}</div>
                        <div style={{fontSize:12,fontWeight:600,color:"#1E293B",wordBreak:"break-all"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{padding:"18px",borderRadius:14,background:"#fff",border:"1px solid #E2E8F0"}}>
                <div style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace",letterSpacing:".1em",marginBottom:14}}>FUENTES DE DATOS</div>
                {(["declared","syntage","buro","plinius"] as DataSource[]).map(src=>{
                  const sv=vars.filter(v=>v.source===src);
                  const active=src==="declared";
                  return (
                    <div key={src} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:active?SRCCOLOR[src]:"#E2E8F0"}}/>
                        <span style={{fontSize:12,color:"#64748B"}}>{SRCLABEL[src]}</span>
                      </div>
                      <span style={{fontSize:10,fontFamily:"monospace",color:active?SRCCOLOR[src]:"#94A3B8",background:active?`${SRCCOLOR[src]}14`:"#F8FAFC",border:`1px solid ${active?SRCCOLOR[src]+"28":"#E2E8F0"}`,borderRadius:999,padding:"2px 8px"}}>
                        {active?"Activo":"Pendiente"} · {sv.length} vars
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB VARIABLES */}
        {activeTab==="variables" && (
          <div>
            <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setFilterCat(c)}
                  style={{height:28,padding:"0 12px",borderRadius:999,border:`1px solid ${filterCat===c?"#0B1F4B":"#E2E8F0"}`,background:filterCat===c?"#0B1F4B":"#fff",color:filterCat===c?"#fff":"#64748B",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  {c==="all"?"Todas":c}
                </button>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:14,border:"1px solid #E2E8F0",overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 80px",padding:"10px 16px",borderBottom:"1px solid #F1F5F9",background:"#F8FAFC"}}>
                {["Variable","Categoría","Valor","Benchmark","Fuente","Status"].map(h=>(
                  <div key={h} style={{fontSize:9,color:"#94A3B8",fontFamily:"monospace",letterSpacing:".08em",fontWeight:700}}>{h.toUpperCase()}</div>
                ))}
              </div>
              {filteredVars.map((v,i)=>(
                <div key={v.key} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 80px",padding:"12px 16px",borderBottom:i<filteredVars.length-1?"1px solid #F8FAFC":"none",background:i%2===0?"#fff":"#F8FAFC",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:SCOLOR[v.status],flexShrink:0}}/>
                    <span style={{fontSize:12,fontWeight:600,color:"#1E293B"}}>{v.label}</span>
                    <span style={{fontSize:9,color:"#94A3B8",fontFamily:"monospace"}}>{v.w}%</span>
                  </div>
                  <span style={{fontSize:11,color:"#64748B"}}>{v.cat}</span>
                  <span style={{fontSize:12,fontWeight:600,color:SCOLOR[v.status]}}>{v.raw}</span>
                  <span style={{fontSize:11,color:"#94A3B8"}}>{v.benchmark}</span>
                  <span style={{fontSize:10,color:SRCCOLOR[v.source],fontFamily:"monospace"}}>{SRCLABEL[v.source]}</span>
                  <span style={{fontSize:10,fontWeight:700,fontFamily:"monospace",color:SCOLOR[v.status],textTransform:"uppercase"}}>{v.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB SOLICITUDES */}
        {activeTab==="solicitudes" && (
          <div>
            {solicitudes.length>0 ? (
              <div style={{background:"#fff",borderRadius:14,border:"1px solid #E2E8F0",overflow:"hidden"}}>
                <div style={{padding:"12px 18px",borderBottom:"1px solid #F1F5F9",display:"flex",justifyContent:"space-between"}}>
                  <div style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace",letterSpacing:".1em"}}>SOLICITUDES DE CRÉDITO</div>
                  <span style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace"}}>{solicitudes.length} registros</span>
                </div>
                {solicitudes.map((s:any,i:number)=>{
                  const sc=SSTAT[s.status]??{bg:"#F8FAFC",c:"#475569"};
                  return (
                    <div key={s.id} style={{padding:"13px 18px",borderBottom:i<solicitudes.length-1?"1px solid #F8FAFC":"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"#1E293B"}}>{s.destino||"—"}</div>
                        <div style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace",marginTop:2}}>{new Date(s.created_at).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"})} · {s.plazo_meses}m</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{fontSize:15,fontWeight:700,color:"#0B1F4B"}}>{fmtM(s.monto)}</div>
                        <span style={{fontSize:10,fontWeight:700,fontFamily:"monospace",background:sc.bg,color:sc.c,borderRadius:999,padding:"3px 10px"}}>{s.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{padding:48,textAlign:"center",color:"#94A3B8",fontSize:13}}>Sin solicitudes registradas</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
