"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type VarStatus = "ok"|"warn"|"risk"|"missing"|"pending";
type DataSource = "declared"|"syntage"|"buro"|"plinius"|"pending";
type ScoreVar = { key:string;label:string;cat:string;w:number;value:number|null;raw:string;status:VarStatus;source:DataSource;benchmark:string; };

const SCOLOR:Record<VarStatus,string>={ok:"#00C48C",warn:"#FACC15",risk:"#FB923C",missing:"#F87171",pending:"#334155"};

function scoreGrade(s:number){
  if(s>=85)return{l:"A",label:"Excelente", c:"#00C48C",g:"rgba(0,196,140,.4)"};
  if(s>=70)return{l:"B",label:"Bueno",     c:"#4ADE80",g:"rgba(74,222,128,.3)"};
  if(s>=55)return{l:"C",label:"Moderado",  c:"#FACC15",g:"rgba(250,204,21,.3)"};
  if(s>=40)return{l:"D",label:"Bajo",      c:"#FB923C",g:"rgba(251,146,60,.3)"};
  return         {l:"E",label:"Alto riesgo",c:"#F87171",g:"rgba(248,113,113,.4)"};
}

// Mappers para campos enum
function mapFacturacion(v:string):number{
  const m:Record<string,number>={menos_1m:500_000,"1m_5m":3_000_000,"5m_20m":12_000_000,"20m_50m":35_000_000,"50m_100m":75_000_000,mas_100m:150_000_000};
  return m[v]??0;
}
function mapFacturacionLabel(v:string):string{
  const m:Record<string,string>={menos_1m:"< $1M","1m_5m":"$1M–$5M","5m_20m":"$5M–$20M","20m_50m":"$20M–$50M","50m_100m":"$50M–$100M",mas_100m:"> $100M"};
  return m[v]??"—";
}
function mapAntiguedad(v:string):number{
  const m:Record<string,number>={"0_1":0.5,"1_2":1.5,"2_5":3.5,"5_10":7.5,mas_10:12};
  return m[v]??0;
}
function mapAntiguedadLabel(v:string):string{
  const m:Record<string,string>={"0_1":"< 1 año","1_2":"1–2 años","2_5":"2–5 años","5_10":"5–10 años",mas_10:"> 10 años"};
  return m[v]??"—";
}
function mapEmpleados(v:string):number{
  const m:Record<string,number>={"1_10":5,"11_50":30,"51_200":100,"201_500":300,mas_500:600};
  return m[v]??0;
}
function mapEmpleadosLabel(v:string):string{
  const m:Record<string,string>={"1_10":"1–10","11_50":"11–50","51_200":"51–200","201_500":"201–500",mas_500:"> 500"};
  return m[v]??"—";
}

function calcScore(b:any):{score:number;vars:ScoreVar[]}{
  function norm(v:number,min:number,max:number){return Math.min(100,Math.max(0,((v-min)/(max-min))*100));}
  const vars:ScoreVar[]=[
    {key:"rfc",        label:"RFC validado",             cat:"Fiscal",     w:5,  value:b?.company_rfc?100:0,      raw:b?.company_rfc||"Sin RFC",  status:b?.company_rfc?"ok":"missing", source:"declared", benchmark:"Requerido"   },
    {key:"antiguedad", label:"Antigüedad empresa",       cat:"Fiscal",     w:8,  value:b?.fin_antiguedad?norm(mapAntiguedad(b.fin_antiguedad),0,10):0, raw:b?.fin_antiguedad?mapAntiguedadLabel(b.fin_antiguedad):"—", status:b?.fin_antiguedad?(mapAntiguedad(b.fin_antiguedad)>=3?"ok":"warn"):"missing", source:"declared", benchmark:">3 años" },
    {key:"facturacion",label:"Facturación anual",        cat:"Financiero", w:14, value:b?.fin_facturacion_anual?norm(mapFacturacion(b.fin_facturacion_anual),0,50_000_000):0, raw:b?.fin_facturacion_anual?mapFacturacionLabel(b.fin_facturacion_anual):"—", status:b?.fin_facturacion_anual?(mapFacturacion(b.fin_facturacion_anual)>=5_000_000?"ok":"warn"):"missing", source:"declared", benchmark:">$5M MXN" },
    {key:"empleados",  label:"Empleados",                cat:"Operativo",  w:6,  value:b?.fin_num_empleados?norm(mapEmpleados(b.fin_num_empleados),0,200):0, raw:b?.fin_num_empleados?mapEmpleadosLabel(b.fin_num_empleados):"—", status:b?.fin_num_empleados?(mapEmpleados(b.fin_num_empleados)>=20?"ok":"warn"):"missing", source:"declared", benchmark:">20" },
    {key:"sector",     label:"Sector / giro",            cat:"Mercado",    w:6,  value:b?.fin_sector?75:0,        raw:b?.fin_sector||"—",         status:b?.fin_sector?"ok":"missing", source:"declared", benchmark:"Bajo riesgo" },
    {key:"garantias",  label:"Garantías ofrecidas",      cat:"Crédito",    w:12, value:b?.fin_garantias?65:20,    raw:b?.fin_garantias||"Sin garantías", status:b?.fin_garantias?"ok":"warn", source:"declared", benchmark:"1.5x cobertura" },
    {key:"dscr",       label:"DSCR",                     cat:"Financiero", w:14, value:null, raw:"Conecta SAT",   status:"pending", source:"pending", benchmark:"≥1.25x"   },
    {key:"ebitda_vol", label:"Volatilidad EBITDA",       cat:"Financiero", w:10, value:null, raw:"Conecta SAT",   status:"pending", source:"pending", benchmark:"<15%"     },
    {key:"dso",        label:"DSO días cobranza",        cat:"Operativo",  w:8,  value:null, raw:"Conecta SAT",   status:"pending", source:"pending", benchmark:"<45 días" },
    {key:"historial",  label:"Historial pagos Plinius",  cat:"Crédito",    w:8,  value:0,    raw:"Sin historial", status:"missing", source:"plinius", benchmark:"Requerido" },
    {key:"buro",       label:"Buró de Crédito",          cat:"Crédito",    w:0,  value:null, raw:"Pendiente",     status:"pending", source:"buro",    benchmark:"Score >650"},
  ];
  const active=vars.filter(v=>v.value!==null&&v.status!=="pending");
  const tw=active.reduce((s,v)=>s+v.w,0);
  const ws=active.reduce((s,v)=>s+(v.value!*v.w),0);
  return{score:tw>0?Math.round(ws/tw):0,vars};
}

function useAnimated(target:number,ms=1600){
  const[v,setV]=useState(0);
  useEffect(()=>{let start:number|null=null;const step=(ts:number)=>{if(!start)start=ts;const p=Math.min((ts-start)/ms,1);setV(Math.round((1-Math.pow(1-p,4))*target));if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);},[target,ms]);
  return v;
}

function GaugeSm({score}:{score:number}){
  const disp=useAnimated(score,1600);
  const g=scoreGrade(score);
  const cx=140,cy=120,START=-215,RANGE=250;
  const ang=START+(disp/100)*RANGE;
  function pt(deg:number,r:number){const a=deg*Math.PI/180;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)};}
  function arc(s:number,e:number,ri:number,ro:number){const a=pt(s,ro),b=pt(e,ro),c=pt(e,ri),d=pt(s,ri);const l=e-s>180?1:0;return`M${a.x},${a.y} A${ro},${ro} 0 ${l} 1 ${b.x},${b.y} L${c.x},${c.y} A${ri},${ri} 0 ${l} 0 ${d.x},${d.y} Z`;}
  const SEGS=[{f:-215,t:-173,c:"#F87171"},{f:-173,t:-131,c:"#FB923C"},{f:-131,t:-89,c:"#FACC15"},{f:-89,t:-47,c:"#4ADE80"},{f:-47,t:35,c:"#00C48C"}];
  const needle=pt(ang,80);
  return(
    <svg viewBox="0 0 280 165" style={{width:"100%",maxWidth:340,overflow:"visible"}}>
      <defs><radialGradient id="sg"><stop offset="0%" stopColor={g.c} stopOpacity=".12"/><stop offset="100%" stopColor={g.c} stopOpacity="0"/></radialGradient>
      <filter id="sglow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx={cx} cy={cy} r={115} fill="url(#sg)"/>
      <path d={arc(-215,35,76,100)} fill="#0A1628"/>
      {SEGS.map((s,i)=><path key={i} d={arc(s.f,s.t,77,99)} fill={s.c} opacity={0.12}/>)}
      {disp>0&&<path d={arc(-215,ang,77,99)} fill={g.c} opacity={0.9} filter="url(#sglow)"/>}
      {Array.from({length:51}).map((_,i)=>{const deg=-215+i*5,maj=i%5===0;const p1=pt(deg,101),p2=pt(deg,maj?112:107);return<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={maj?"#1E293B":"#0F1E2E"} strokeWidth={maj?1.5:0.8}/>;})}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={g.c} strokeWidth={2.8} strokeLinecap="round" style={{filter:`drop-shadow(0 0 5px ${g.g})`}}/>
      <circle cx={cx} cy={cy} r={7} fill={g.c}/>
      <circle cx={cx} cy={cy} r={3} fill="#040C18"/>
      <text x={cx} y={cy+30} textAnchor="middle" fill={g.c} fontSize={34} fontWeight={900} fontFamily="'Geist Mono',monospace" style={{filter:`drop-shadow(0 0 10px ${g.g})`}}>{disp}</text>
      <text x={cx} y={cy+46} textAnchor="middle" fill="#334155" fontSize={9} fontFamily="'Geist Mono',monospace" letterSpacing="2">DE 100</text>
      <text x={26} y={152} fill="#F87171" fontSize={8} fontFamily="'Geist Mono',monospace" fontWeight={700}>RIESGO</text>
      <text x={210} y={152} fill="#00C48C" fontSize={8} fontFamily="'Geist Mono',monospace" fontWeight={700}>ÓPTIMO</text>
    </svg>
  );
}

export default function ScorePage(){
  const router=useRouter();
  const[borrower,setBorrower]=useState<any>(null);
  const[user,setUser]=useState<any>(null);
  const[plan,setPlan]=useState<string>("free");
  const[loading,setLoading]=useState(true);
  const[scanState,setScanState]=useState<"idle"|"loading"|"done">("idle");
  const[tab,setTab]=useState<"score"|"mejoras">("score");

  useEffect(()=>{
    (async()=>{
      const{data:auth}=await supabase.auth.getUser();
      if(!auth.user){router.push("/login");return;}
      setUser(auth.user);
      const[{data:b},{data:p},{data:r}]=await Promise.all([
        supabase.from("borrowers_profile").select("*").eq("owner_id",auth.user.id).maybeSingle(),
        supabase.from("plinius_profiles").select("plan").eq("user_id",auth.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id",auth.user.id).maybeSingle(),
      ]);
      if(r?.role==="otorgante"){router.push("/dashboard");return;}
      setBorrower(b);
      setPlan(p?.plan||"free");
      setLoading(false);
    })();
  },[router]);

  const{score,vars}=calcScore(borrower);
  const grade=scoreGrade(score);
  const completeness=Math.round(vars.filter(v=>v.value!==null&&v.status!=="pending").length/vars.length*100);
  const missing=vars.filter(v=>v.status==="missing");
  const pending=vars.filter(v=>v.status==="pending");

  // What user can improve
  const improvements=[
    {id:"sat",  icon:"⚡",label:"Conectar SAT / Syntage",   desc:"Desbloquea DSCR, EBITDA, DSO, Concentración de clientes",pts:"+35 pts potenciales",  cost:"Incluido en scan $299 MXN", action:"scan"},
    {id:"buro", icon:"🏦",label:"Consultar Buró de Crédito",desc:"Historial crediticio empresarial, score Buró",             pts:"+15 pts potenciales",  cost:"Incluido en scan $299 MXN", action:"scan"},
    {id:"kyc",  icon:"📋",label:"Completar perfil y KYC",   desc:"RFC, CURP, documentos, garantías",                         pts:"+20 pts potenciales",  cost:"Gratis",                    action:"kyc"},
    {id:"hist", icon:"🔄",label:"Generar historial Plinius", desc:"Completa y paga tu primera solicitud",                    pts:"+8 pts potenciales",   cost:"Al pagar primer crédito",   action:"sol"},
  ];

  async function requestScan(){
    setScanState("loading");
    await supabase.from("scan_requests").upsert({user_id:user?.id,type:"buro_sat",status:"pending",amount:299,requested_at:new Date().toISOString()}).then(()=>{});
    await new Promise(r=>setTimeout(r,1600));
    setScanState("done");
  }

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
    .tbtn{border:none;cursor:pointer;transition:all .15s;font-family:'Geist',sans-serif;}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1E293B;border-radius:999px}
  `;

  if(loading) return(
    <div style={{minHeight:"100vh",background:"#040C18",display:"grid",placeItems:"center"}}>
      <style>{CSS}</style>
      <svg style={{animation:"spin .8s linear infinite"}} width={20} height={20} viewBox="0 0 20 20" fill="none" stroke="#334155" strokeWidth="2"><path d="M10 2a8 8 0 018 8"/></svg>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#040C18",fontFamily:"'Geist',sans-serif",color:"#F8FAFC"}}>
      <style>{CSS}</style>

      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px 80px"}}>

        {/* Page header */}
        <div className="fade" style={{marginBottom:28}}>
          <div style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#334155",letterSpacing:".15em",marginBottom:6}}>MI PERFIL CREDITICIO</div>
          <div style={{fontSize:24,fontWeight:900,letterSpacing:"-0.04em"}}>Score Crediticio</div>
          <div style={{fontSize:13,color:"#334155",marginTop:4}}>Así te ven los inversionistas en el marketplace</div>
        </div>

        {/* Main score card */}
        <div className="fade" style={{borderRadius:20,background:"linear-gradient(160deg,#0A1628,#060D1A)",border:`1px solid ${grade.c}25`,padding:"24px",marginBottom:20,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-60,right:-60,width:220,height:220,borderRadius:"50%",background:`radial-gradient(circle,${grade.g} 0%,transparent 70%)`,pointerEvents:"none"}}/>
          <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(#1E293B14 1px,transparent 1px),linear-gradient(90deg,#1E293B14 1px,transparent 1px)",backgroundSize:"24px 24px",pointerEvents:"none"}}/>
          <div style={{position:"relative",zIndex:1,display:"flex",gap:24,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{flex:"0 0 auto",display:"flex",justifyContent:"center",minWidth:220}}>
              <GaugeSm score={score}/>
            </div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                <div style={{width:60,height:60,borderRadius:15,background:`${grade.c}14`,border:`2px solid ${grade.c}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:900,color:grade.c,fontFamily:"'Geist Mono',monospace",boxShadow:`0 0 24px ${grade.g}`}}>
                  {grade.l}
                </div>
                <div>
                  <div style={{fontSize:36,fontWeight:900,fontFamily:"'Geist Mono',monospace",color:grade.c,textShadow:`0 0 20px ${grade.g}`,letterSpacing:"-0.04em",lineHeight:1}}>{score}</div>
                  <div style={{fontSize:13,color:grade.c,fontWeight:600,marginTop:3}}>{grade.label}</div>
                </div>
              </div>
              {/* Completeness */}
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#334155"}}>COMPLETITUD DEL PERFIL</span>
                  <span style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"#00E5A0",fontWeight:700}}>{completeness}%</span>
                </div>
                <div style={{height:6,borderRadius:999,background:"#0F1E2E"}}>
                  <div style={{height:"100%",borderRadius:999,width:`${completeness}%`,background:"linear-gradient(90deg,#3B82F6,#00E5A0)",transition:"width 1.2s cubic-bezier(.16,1,.3,1) 400ms"}}/>
                </div>
              </div>
              {/* Stat pills */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{padding:"6px 12px",borderRadius:10,background:"rgba(0,229,160,.06)",border:"1px solid rgba(0,229,160,.14)"}}>
                  <span style={{fontSize:10,color:"#00E5A0",fontFamily:"'Geist Mono',monospace"}}>✓ {vars.filter(v=>v.status==="ok").length} variables ok</span>
                </div>
                <div style={{padding:"6px 12px",borderRadius:10,background:"rgba(248,113,113,.06)",border:"1px solid rgba(248,113,113,.14)"}}>
                  <span style={{fontSize:10,color:"#F87171",fontFamily:"'Geist Mono',monospace"}}>✗ {missing.length} faltantes</span>
                </div>
                <div style={{padding:"6px 12px",borderRadius:10,background:"rgba(51,65,85,.3)",border:"1px solid #1E293B"}}>
                  <span style={{fontSize:10,color:"#64748B",fontFamily:"'Geist Mono',monospace"}}>⏳ {pending.length} pendientes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scan CTA */}
        <div className="fade" style={{marginBottom:20,borderRadius:16,overflow:"hidden"}}>
          {scanState==="done"?(
            <div style={{padding:"16px 20px",background:"rgba(0,196,140,.06)",border:"1px solid rgba(0,196,140,.2)",borderRadius:16,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:"rgba(0,196,140,.1)",display:"grid",placeItems:"center",flexShrink:0}}>
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#00C48C" strokeWidth="2.5"><path d="M2 8l4 4 8-8"/></svg>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#00C48C"}}>¡Solicitud enviada! Procesando scan Buró + SAT</div>
                <div style={{fontSize:10,fontFamily:"'Geist Mono',monospace",color:"rgba(0,196,140,.55)"}}>Te notificaremos por email cuando tu score se actualice · $299 MXN</div>
              </div>
            </div>
          ):(
            <div style={{padding:"18px 20px",background:"linear-gradient(135deg,rgba(99,102,241,.08),rgba(124,58,237,.08))",border:"1px solid rgba(99,102,241,.2)",borderRadius:16}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <span style={{fontSize:18}}>🔍</span>
                    <div style={{fontSize:14,fontWeight:800,color:"#818CF8"}}>Scan Completo · Buró + SAT</div>
                    <span style={{fontSize:10,fontFamily:"'Geist Mono',monospace",fontWeight:700,color:"#818CF8",background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",borderRadius:999,padding:"2px 8px"}}>+50 PTS POTENCIALES</span>
                  </div>
                  <div style={{fontSize:11,color:"rgba(129,140,248,.6)",fontFamily:"'Geist Mono',monospace",marginBottom:12}}>
                    Desbloquea · DSCR · Volatilidad EBITDA · DSO · Concentración de clientes · Score Buró oficial
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {["Consulta Buró Empresarial","Extracción CFDIs SAT","Análisis fiscal 12 meses","Reporte PDF descargable"].map(f=>(
                      <span key={f} style={{fontSize:10,color:"rgba(129,140,248,.7)",background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.15)",borderRadius:999,padding:"3px 10px",fontFamily:"'Geist Mono',monospace"}}>✓ {f}</span>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:28,fontWeight:900,fontFamily:"'Geist Mono',monospace",color:"#818CF8",lineHeight:1}}>$299</div>
                    <div style={{fontSize:10,color:"rgba(129,140,248,.5)",fontFamily:"'Geist Mono',monospace"}}>MXN · pago único</div>
                  </div>
                  <button onClick={requestScan} disabled={scanState==="loading"||!borrower?.rfc}
                    style={{height:42,padding:"0 24px",borderRadius:11,border:"none",background:borrower?.rfc?"linear-gradient(135deg,#4F46E5,#7C3AED)":"#1E293B",color:borrower?.rfc?"#fff":"#334155",fontSize:13,fontWeight:700,cursor:borrower?.rfc?"pointer":"not-allowed",fontFamily:"'Geist',sans-serif",boxShadow:borrower?.rfc?"0 4px 20px rgba(99,102,241,.35)":"none",opacity:scanState==="loading"?.7:1,whiteSpace:"nowrap"}}>
                    {scanState==="loading"?"Enviando…":"Solicitar scan →"}
                  </button>
                  {!borrower?.rfc&&<div style={{fontSize:9,color:"#F87171",fontFamily:"'Geist Mono',monospace",textAlign:"center"}}>Completa tu RFC primero</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:2,marginBottom:20,borderBottom:"1px solid #0F1E2E"}}>
          {([["score","Variables del score"],["mejoras","Cómo mejorar"]] as const).map(([id,label])=>(
            <button key={id} className="tbtn" onClick={()=>setTab(id)}
              style={{padding:"9px 16px",background:"transparent",color:tab===id?"#F8FAFC":"#334155",fontSize:12,fontWeight:tab===id?700:500,borderBottom:tab===id?"2px solid #00E5A0":"2px solid transparent",marginBottom:-1}}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB: Variables */}
        {tab==="score"&&(
          <div className="fade" style={{display:"flex",flexDirection:"column",gap:8}}>
            {vars.map((v,i)=>{
              const sc=SCOLOR[v.status];
              return(
                <div key={v.key} style={{padding:"13px 16px",borderRadius:13,background:"#0A1628",border:`1px solid ${v.status==="ok"?sc+"1A":"#0F1E2E"}`,animation:`fadeUp .3s cubic-bezier(.16,1,.3,1) ${i*45}ms both`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:10}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:sc,flexShrink:0,boxShadow:v.status==="ok"?`0 0 6px ${sc}`:"none"}}/>
                      <span style={{fontSize:12,fontWeight:600,color:"#F8FAFC"}}>{v.label}</span>
                      <span style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#334155",background:"#060D1A",borderRadius:999,padding:"1px 7px"}}>{v.cat}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
                      <span style={{fontSize:11,fontFamily:"'Geist Mono',monospace",color:"#64748B"}}>{v.raw}</span>
                      <span style={{fontSize:9,fontFamily:"'Geist Mono',monospace",color:"#1E293B"}}>ref:{v.benchmark}</span>
                      <span style={{fontSize:9,fontWeight:700,fontFamily:"'Geist Mono',monospace",color:sc,background:`${sc}14`,border:`1px solid ${sc}28`,borderRadius:999,padding:"1px 6px",textTransform:"uppercase"}}>{v.status}</span>
                    </div>
                  </div>
                  <div style={{height:5,borderRadius:999,background:"#060D1A",overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:999,background:v.status==="pending"?`repeating-linear-gradient(90deg,#0F1E2E 0,#0F1E2E 5px,transparent 5px,transparent 10px)`:sc,width:v.value!==null?`${v.value}%`:"0%",transition:"width 1s cubic-bezier(.16,1,.3,1) 200ms",boxShadow:v.status==="ok"?`0 0 7px ${sc}55`:"none"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: Mejoras */}
        {tab==="mejoras"&&(
          <div className="fade" style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:12,color:"#334155",marginBottom:8,fontFamily:"'Geist Mono',monospace"}}>ACCIONES PARA MEJORAR TU SCORE</div>
            {improvements.map((imp,i)=>(
              <div key={imp.id} style={{padding:"16px 18px",borderRadius:14,background:"#0A1628",border:"1px solid #0F1E2E",display:"flex",alignItems:"center",gap:14,animation:`fadeUp .3s cubic-bezier(.16,1,.3,1) ${i*60}ms both`,flexWrap:"wrap"}}>
                <div style={{width:42,height:42,borderRadius:11,background:"rgba(255,255,255,.04)",display:"grid",placeItems:"center",fontSize:20,flexShrink:0}}>{imp.icon}</div>
                <div style={{flex:1,minWidth:160}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#F8FAFC",marginBottom:3}}>{imp.label}</div>
                  <div style={{fontSize:11,color:"#334155",fontFamily:"'Geist Mono',monospace",marginBottom:6}}>{imp.desc}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,fontWeight:700,color:"#00E5A0",background:"rgba(0,229,160,.08)",border:"1px solid rgba(0,229,160,.2)",borderRadius:999,padding:"2px 8px",fontFamily:"'Geist Mono',monospace"}}>{imp.pts}</span>
                    <span style={{fontSize:10,color:"#64748B",background:"#0F1E2E",border:"1px solid #1E293B",borderRadius:999,padding:"2px 8px",fontFamily:"'Geist Mono',monospace"}}>{imp.cost}</span>
                  </div>
                </div>
                <button onClick={()=>{
                  if(imp.action==="scan") requestScan();
                  if(imp.action==="kyc") router.push("/dashboard/kyc");
                  if(imp.action==="sol") router.push("/dashboard/solicitudes");
                }}
                  style={{height:34,padding:"0 16px",borderRadius:9,border:"none",background:imp.action==="scan"?"linear-gradient(135deg,#4F46E5,#7C3AED)":"#1E293B",color:imp.action==="scan"?"#fff":"#64748B",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Geist',sans-serif",flexShrink:0,whiteSpace:"nowrap",boxShadow:imp.action==="scan"?"0 2px 12px rgba(99,102,241,.3)":"none"}}>
                  {imp.action==="scan"?scanState==="done"?"Enviado ✓":scanState==="loading"?"...":"Solicitar →":imp.action==="kyc"?"Completar →":"Ver solicitudes →"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
