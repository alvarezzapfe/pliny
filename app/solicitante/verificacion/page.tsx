"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function Gauge({ score }: { score: number }) {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      let cur = 0;
      const iv = setInterval(() => {
        cur += 1;
        setDisp(cur);
        if (cur >= score) clearInterval(iv);
      }, 1200 / Math.max(score, 1));
      return () => clearInterval(iv);
    }, 300);
    return () => clearTimeout(t);
  }, [score]);

  const pct    = disp / 100;
  const radius = 54;
  const cx     = 80;
  const cy     = 72;
  const startA = Math.PI * 0.85;
  const endA   = Math.PI * 0.15;
  const totalA = (2 * Math.PI) - startA + endA;
  const angle  = startA + pct * totalA;

  const polar  = (a: number, r: number) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  const arcD   = (a1: number, a2: number, r: number) => {
    const s = polar(a1, r), e = polar(a2, r);
    const large = (a2 - a1 + 2 * Math.PI) % (2 * Math.PI) > Math.PI ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const color = disp >= 70 ? "#059669" : disp >= 50 ? "#F59E0B" : disp >= 30 ? "#F97316" : "#EF4444";
  const label = disp >= 70 ? "Bueno" : disp >= 50 ? "Moderado" : disp >= 30 ? "Bajo" : "Riesgo";
  const tip   = polar(angle, radius - 8);

  const STOPS = [
    { a1: startA, a2: startA + totalA * 0.25, c: "#EF4444" },
    { a1: startA + totalA * 0.25, a2: startA + totalA * 0.50, c: "#F97316" },
    { a1: startA + totalA * 0.50, a2: startA + totalA * 0.75, c: "#F59E0B" },
    { a1: startA + totalA * 0.75, a2: startA + totalA * 1.00, c: "#059669" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg viewBox="0 0 160 100" style={{ width:"100%", maxWidth:200, overflow:"visible" }}>
        {/* Track */}
        <path d={arcD(startA, startA + totalA, radius)} fill="none" stroke="#F1F5F9" strokeWidth={10} strokeLinecap="round"/>
        {/* Color segments */}
        {STOPS.map((s,i) => (
          <path key={i} d={arcD(s.a1, s.a2, radius)} fill="none" stroke={s.c} strokeWidth={10} strokeLinecap="round" opacity={0.2}/>
        ))}
        {/* Progress */}
        {disp > 0 && (
          <path d={arcD(startA, angle, radius)} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"/>
        )}
        {/* Needle dot */}
        <circle cx={tip.x} cy={tip.y} r={5} fill={color}/>
        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize={28} fontWeight={900} fontFamily="Geist Mono,monospace">{disp}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94A3B8" fontSize={9} fontFamily="Geist Mono,monospace">DE 100</text>
        <text x={cx} y={cy + 24} textAnchor="middle" fill={color} fontSize={8} fontFamily="Geist,sans-serif" fontWeight={700}>{label.toUpperCase()}</text>
        {/* Labels */}
        <text x={18} y={96} fill="#EF4444" fontSize={7} fontFamily="Geist Mono,monospace" fontWeight={700}>0</text>
        <text x={134} y={96} fill="#059669" fontSize={7} fontFamily="Geist Mono,monospace" fontWeight={700}>100</text>
      </svg>
    </div>
  );
}

function Ic({d,s=16,c="currentColor"}:{d:string;s?:number;c?:string}){
  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

export default function VerificacionPage() {
  const router = useRouter();
  const [profile,  setProfile]  = useState<any>(null);
  const [userId,   setUserId]   = useState<string|null>(null);
  const [request,  setRequest]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState<string|null>(null);
  const [rfc,      setRfc]      = useState("");
  const [score,    setScore]    = useState(0);

  useEffect(()=>{
    (async()=>{
      const {data:auth} = await supabase.auth.getUser();
      if(!auth.user){router.push("/login");return;}
      setUserId(auth.user.id);
      const {data:prof} = await supabase.from("borrowers_profile").select("*").eq("owner_id",auth.user.id).maybeSingle();
      if(prof){
        setProfile(prof);
        setRfc(prof.company_rfc??"");
        const fields=["company_name","company_rfc","rep_first_names","rep_last_name","fin_facturacion_anual","company_giro"];
        const filled=fields.filter((f:string)=>prof[f]).length;
        setScore(Math.round((filled/fields.length)*40)+(prof.ekatena_verificado?50:0));
      }
      const {data:reqs} = await supabase.from("ekatena_requests").select("*").eq("owner_id",auth.user.id).order("created_at",{ascending:false}).limit(1);
      if(reqs&&reqs.length>0) setRequest(reqs[0]);
      setLoading(false);
    })();
  },[]);

  useEffect(()=>{
    if(!request?.id) return;
    if(["completed","failed"].includes(request.status)) return;
    const iv = setInterval(async()=>{
      const {data} = await supabase.from("ekatena_requests").select("*").eq("id",request.id).maybeSingle();
      if(data&&data.status!==request.status){
        setRequest(data);
        if(data.status==="completed") setScore((s:number)=>Math.min(s+50,100));
      }
    },5000);
    return ()=>clearInterval(iv);
  },[request]);

  async function solicitarVerificacion(){
    if(!rfc||!userId) return;
    setSending(true); setError(null);
    try{
      const res = await fetch("/api/ekatena/request",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({rfc, ciec:"N/A", owner_id:userId, borrower_id:profile?.id??null}),
      });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error??"Error");
      setRequest(data.request);
    }catch(e:any){setError(e.message);}
    setSending(false);
  }

  const perfilOk   = !!(profile?.company_name&&profile?.company_rfc);
  const verificado = request?.status==="completed"||profile?.ekatena_verificado;
  const st         = request?.status??null;

  const wizardStep = !request ? 1
    : st==="pending_approval" ? 2
    : st==="approved"         ? 3
    : st==="payment_confirmed" ? 4
    : st==="link_enviado"     ? 5
    : st==="processing"       ? 6
    : st==="completed"        ? 7
    : 1;

  const CSS = `
    @import url("https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap");
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
    .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;}
    .d1{animation-delay:.06s}.d2{animation-delay:.12s}.d3{animation-delay:.18s}.d4{animation-delay:.24s}
    .spinner{animation:spin .7s linear infinite}
    .pulse{animation:pulse 2s ease-in-out infinite}
    .card{background:#fff;border:1px solid #E8EDF5;border-radius:18px;padding:22px;}
    .lbl{display:block;font-size:10px;font-weight:700;color:#94A3B8;margin-bottom:6px;letter-spacing:.06em;}
    .inp{width:100%;height:50px;border:1.5px solid #E2E8F0;border-radius:11px;background:#F8FAFF;padding:0 14px;font-size:14px;font-family:Geist,sans-serif;color:#0F172A;outline:none;transition:all .15s;}
    .inp:focus{border-color:#059669;background:#fff;box-shadow:0 0 0 3px rgba(5,150,105,.10);}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:linear-gradient(135deg,#064E3B,#059669);color:#fff;border:none;border-radius:11px;font-family:Geist,sans-serif;font-size:14px;font-weight:700;padding:14px 24px;cursor:pointer;box-shadow:0 4px 14px rgba(6,78,59,.22);transition:all .15s;width:100%;}
    .btn:hover{opacity:.92;transform:translateY(-1px);}
    .btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none;}
    .step{display:flex;align-items:center;gap:10;padding:10px 12px;border-radius:10px;border:1px solid #E8EDF5;}
  `;

  if(loading) return(
    <div style={{display:"grid",placeItems:"center",minHeight:400}}>
      <style>{CSS}</style>
      <svg className="spinner" width={22} height={22} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
    </div>
  );

  return(
    <div style={{fontFamily:"Geist,sans-serif",color:"#0F172A"}}>
      <style>{CSS}</style>
      <div className="fade" style={{marginBottom:22}}>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:"-0.04em",marginBottom:3}}>Verificacion de identidad</div>
        <div style={{fontSize:12,color:"#94A3B8"}}>Powered by <span style={{fontWeight:700,color:"#059669"}}>Ekatena</span> · Resultado en 24 hrs hábiles</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

        {/* BOX 1 — Score */}
        <div className="card fade d1" style={{display:"flex",flexDirection:"column",gap:16}}>
          <div className="lbl">SCORE PLINIUS</div>
          <div style={{display:"flex",justifyContent:"center"}}>
            <Gauge score={score}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {label:"Perfil completo", done:perfilOk,  pts:40, href:"/solicitante/datos"},
              {label:"Verificacion",    done:verificado, pts:50, href:null},
              {label:"Documentos",      done:false,      pts:10, href:"/solicitante/datos"},
            ].map(item=>(
              <div key={item.label} style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:16,height:16,borderRadius:"50%",background:item.done?"#059669":"#F1F5F9",border:`2px solid ${item.done?"#059669":"#E2E8F0"}`,display:"grid",placeItems:"center",flexShrink:0}}>
                  {item.done&&<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{fontSize:12,color:item.done?"#065F46":"#94A3B8",fontWeight:item.done?600:400,flex:1}}>{item.label}</span>
                <span style={{fontSize:11,fontWeight:700,color:item.done?"#059669":"#CBD5E1",fontFamily:"Geist Mono,monospace"}}>+{item.pts}</span>
                {!item.done&&item.href&&<a href={item.href} style={{fontSize:10,color:"#3B82F6",textDecoration:"none"}}>→</a>}
              </div>
            ))}
          </div>
        </div>

        {/* BOX 2 — Estado */}
        <div className="card fade d2" style={{display:"flex",flexDirection:"column",gap:12}}>
          <div className="lbl">ESTADO DE VERIFICACION</div>

          {wizardStep===1&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,textAlign:"center",padding:"24px 0"}}>
              <div style={{width:52,height:52,borderRadius:16,background:"#F8FAFF",border:"1px solid #EEF2FF",display:"grid",placeItems:"center"}}>
                <Ic d="M8 2a6 6 0 100 12M8 5v3l2 2" s={24} c="#CBD5E1"/>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:"#475569"}}>Sin verificacion activa</div>
              <div style={{fontSize:12,color:"#94A3B8",lineHeight:1.7,maxWidth:220}}>Ingresa tu RFC en el box de abajo para solicitar tu verificacion Ekatena</div>
            </div>
          )}

          {wizardStep===2&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{padding:"14px 16px",background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:12,display:"flex",gap:10,alignItems:"center"}}>
                <svg className="pulse" width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="1.5"><path d="M8 2a6 6 0 016 6"/></svg>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#92400E"}}>En revision</div>
                  <div style={{fontSize:11,color:"#B45309"}}>El equipo Plinius revisara tu solicitud</div>
                </div>
              </div>
              {[["RFC",request?.rfc],["ID",request?.id?.slice(0,8).toUpperCase()],["Monto","$400 MXN"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"#F8FAFC",border:"1px solid #E8EDF5",borderRadius:9}}>
                  <span style={{fontSize:11,color:"#94A3B8"}}>{l}</span>
                  <span style={{fontSize:11,fontWeight:700,fontFamily:"Geist Mono,monospace"}}>{v}</span>
                </div>
              ))}
              <div style={{padding:"10px 12px",background:"#F0FDF9",border:"1px solid #A7F3D0",borderRadius:10,fontSize:11,color:"#065F46",lineHeight:1.7}}>
                Te notificaremos cuando tu solicitud sea aprobada y recibas las instrucciones de pago.
              </div>
            </div>
          )}

          {wizardStep===3&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{padding:"12px 14px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#065F46",marginBottom:2}}>Solicitud aprobada</div>
                <div style={{fontSize:11,color:"#059669"}}>Realiza el pago SPEI para continuar</div>
              </div>
              <div style={{padding:"14px 16px",background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:12}}>
                <div style={{fontSize:11,fontWeight:700,color:"#92400E",marginBottom:10}}>Datos para transferencia SPEI</div>
                {[
                  ["Monto",       "$400 MXN"],
                  ["Banco",       "CUENCA"],
                  ["CLABE",       "646180157000000001"],
                  ["Beneficiario","Infraestructura en Finanzas AI"],
                  ["Concepto",    `EKAT-${request?.id?.slice(0,8).toUpperCase()}`],
                ].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px dashed #FDE68A"}}>
                    <span style={{fontSize:11,color:"#78350F"}}>{l}</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#92400E",fontFamily:"Geist Mono,monospace"}}>{v}</span>
                  </div>
                ))}
              </div>
              <a href={`mailto:luis@plinius.mx?subject=Comprobante SPEI verificacion - ${request?.rfc}&body=Hola,%0D%0A%0D%0AAdjunto comprobante de pago SPEI por $400 MXN.%0D%0A%0D%0ARFC: ${request?.rfc}%0D%0AID: ${request?.id?.slice(0,8).toUpperCase()}%0D%0AConcepto: EKAT-${request?.id?.slice(0,8).toUpperCase()}`} style={{textDecoration:"none"}}>
                <button className="btn" style={{background:"linear-gradient(135deg,#1E40AF,#3B82F6)",fontSize:13}}>
                  <Ic d="M2 3h12l-6 7zM2 3l6 7v6" s={13} c="#fff"/> Enviar comprobante por mail
                </button>
              </a>
            </div>
          )}

          {wizardStep===4&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{padding:"12px 14px",background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#5B21B6",marginBottom:2}}>Pago confirmado</div>
                <div style={{fontSize:11,color:"#7C3AED"}}>Pronto recibiras un email con el link de Ekatena</div>
              </div>
              <div style={{padding:"10px 12px",background:"#F8FAFC",border:"1px solid #E8EDF5",borderRadius:9,fontSize:11,color:"#64748B",textAlign:"center"}}>
                El equipo Plinius te enviara el link en breve
              </div>
            </div>
          )}

          {wizardStep===5&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{padding:"12px 14px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:12}}>
                <div style={{fontSize:12,fontWeight:700,color:"#065F46",marginBottom:2}}>Link de Ekatena enviado</div>
                <div style={{fontSize:11,color:"#059669"}}>Revisa tu email e ingresa tus datos en el portal de Ekatena</div>
              </div>
              {request?.ekatena_link&&(
                <a href={request.ekatena_link} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                  <button style={{width:"100%",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,background:"linear-gradient(135deg,#1E40AF,#3B82F6)",color:"#fff",border:"none",borderRadius:11,fontFamily:"Geist,sans-serif",fontSize:13,fontWeight:700,padding:"13px 24px",cursor:"pointer"}}>
                    Abrir portal Ekatena →
                  </button>
                </a>
              )}
            </div>
          )}

          {wizardStep===6&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{padding:"12px 14px",background:"#EDE9FE",border:"1px solid #DDD6FE",borderRadius:12,display:"flex",gap:10,alignItems:"center"}}>
                <svg className="pulse spinner" width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#7C3AED" strokeWidth="1.5"><path d="M8 2a6 6 0 016 6"/></svg>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#5B21B6"}}>Procesando verificacion</div>
                  <div style={{fontSize:11,color:"#7C3AED"}}>Esta pantalla se actualiza automaticamente</div>
                </div>
              </div>
              <div style={{padding:"10px 12px",background:"#F8FAFC",border:"1px solid #E8EDF5",borderRadius:9,fontSize:11,color:"#64748B",textAlign:"center"}}>
                Tiempo estimado: menos de 24 hrs habiles
              </div>
            </div>
          )}

          {wizardStep===7&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,textAlign:"center",padding:"16px 0"}}>
              <div style={{width:56,height:56,borderRadius:18,background:"#ECFDF5",border:"1px solid #A7F3D0",display:"grid",placeItems:"center"}}>
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l5 5L21 7"/></svg>
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:"#065F46",marginBottom:2}}>Identidad verificada</div>
                <div style={{fontSize:12,color:"#059669"}}>Tu empresa esta verificada con Ekatena</div>
              </div>
            </div>
          )}
        </div>

        {/* BOX 3 — Solicitar */}
        <div className="card fade d3">
          <div className="lbl" style={{marginBottom:14}}>SOLICITAR VERIFICACION</div>

          {wizardStep===1&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label className="lbl">RFC DE LA EMPRESA</label>
                <input className="inp" value={rfc} onChange={e=>setRfc(e.target.value.toUpperCase())} placeholder="GIX900101ABC" maxLength={13}/>
                {profile?.company_rfc&&<div style={{fontSize:10,color:"#059669",marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                  <Ic d="M2 8l4 4 8-8" s={11} c="#059669"/> Pre-llenado desde tu perfil
                </div>}
              </div>
              {error&&<div style={{padding:"9px 12px",background:"#FFF1F2",border:"1px solid #FECDD3",borderRadius:9,fontSize:12,color:"#9F1239"}}>{error}</div>}
              <button className="btn" onClick={solicitarVerificacion} disabled={!rfc||rfc.length<12||sending}>
                {sending
                  ? <><svg className="spinner" width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg> Enviando...</>
                  : <>Solicitar verificacion <Ic d="M3.5 8h9M9 4.5l3.5 3.5L9 11.5" s={13} c="#fff"/></>
                }
              </button>
              <div style={{padding:"10px 14px",background:"#F0FDF9",border:"1px solid #A7F3D0",borderRadius:10,display:"flex",gap:8,alignItems:"flex-start"}}>
                <Ic d="M8 2a6 6 0 100 12M8 5v3" s={14} c="#059669"/>
                <div style={{fontSize:11,color:"#065F46",lineHeight:1.7}}>
                  El equipo Plinius revisara tu solicitud y te enviara instrucciones de pago por este medio y por email.
                </div>
              </div>
            </div>
          )}

          {wizardStep===2&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:13,fontWeight:600,color:"#475569",marginBottom:4}}>Pasos del proceso</div>
              {[
                {n:1, label:"Solicitud enviada",           done:true,  active:false},
                {n:2, label:"Revision por Plinius",        done:false, active:true},
                {n:3, label:"Pago SPEI",                   done:false, active:false},
                {n:4, label:"Link Ekatena por email",      done:false, active:false},
                {n:5, label:"Ingresas datos en Ekatena",   done:false, active:false},
                {n:6, label:"Reporte disponible",          done:false, active:false},
              ].map(s=>(
                <div key={s.n} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:s.done?"#ECFDF5":s.active?"#FFFBEB":"#F8FAFC",border:`1px solid ${s.done?"#A7F3D0":s.active?"#FDE68A":"#E8EDF5"}`,borderRadius:10}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:s.done?"#059669":s.active?"#F59E0B":"#E2E8F0",display:"grid",placeItems:"center",flexShrink:0,fontSize:10,fontWeight:700,color:"#fff"}}>
                    {s.done?"✓":s.n}
                  </div>
                  <span style={{fontSize:12,fontWeight:s.active?700:400,color:s.done?"#065F46":s.active?"#92400E":"#94A3B8"}}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {wizardStep===3&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontSize:13,fontWeight:600,color:"#475569",marginBottom:4}}>Pasos del proceso</div>
              {[
                {n:1, label:"Solicitud enviada",           done:true,  active:false},
                {n:2, label:"Aprobado por Plinius",        done:true,  active:false},
                {n:3, label:"Pago SPEI pendiente",         done:false, active:true},
                {n:4, label:"Procesamiento Ekatena",       done:false, active:false},
                {n:5, label:"Reporte disponible",          done:false, active:false},
              ].map(s=>(
                <div key={s.n} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:s.done?"#ECFDF5":s.active?"#FFFBEB":"#F8FAFC",border:`1px solid ${s.done?"#A7F3D0":s.active?"#FDE68A":"#E8EDF5"}`,borderRadius:10}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:s.done?"#059669":s.active?"#F59E0B":"#E2E8F0",display:"grid",placeItems:"center",flexShrink:0,fontSize:10,fontWeight:700,color:"#fff"}}>
                    {s.done?"✓":s.n}
                  </div>
                  <span style={{fontSize:12,fontWeight:s.active?700:400,color:s.done?"#065F46":s.active?"#92400E":"#94A3B8"}}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {wizardStep===4&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[
                {n:1,label:"Solicitud enviada",     done:true, active:false},
                {n:2,label:"Aprobado por Plinius",  done:true, active:false},
                {n:3,label:"Pago SPEI confirmado",  done:true, active:false},
                {n:4,label:"Procesamiento Ekatena", done:false,active:true},
                {n:5,label:"Reporte disponible",    done:false,active:false},
              ].map(s=>(
                <div key={s.n} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:s.done?"#ECFDF5":s.active?"#F5F3FF":"#F8FAFC",border:`1px solid ${s.done?"#A7F3D0":s.active?"#DDD6FE":"#E8EDF5"}`,borderRadius:10}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:s.done?"#059669":s.active?"#7C3AED":"#E2E8F0",display:"grid",placeItems:"center",flexShrink:0,fontSize:10,fontWeight:700,color:"#fff"}}>
                    {s.done?"✓":s.active?<svg className="spinner" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M5 1a4 4 0 014 4"/></svg>:s.n}
                  </div>
                  <span style={{fontSize:12,fontWeight:s.active?700:400,color:s.done?"#065F46":s.active?"#5B21B6":"#94A3B8"}}>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {wizardStep===5&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[
                {n:1,label:"Solicitud enviada",    done:true},
                {n:2,label:"Aprobado por Plinius", done:true},
                {n:3,label:"Pago confirmado",      done:true},
                {n:4,label:"Ekatena procesado",    done:true},
                {n:5,label:"Reporte disponible",   done:true},
              ].map(s=>(
                <div key={s.n} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:10}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:"#059669",display:"grid",placeItems:"center",flexShrink:0,fontSize:10,fontWeight:700,color:"#fff"}}>✓</div>
                  <span style={{fontSize:12,color:"#065F46",fontWeight:600}}>{s.label}</span>
                </div>
              ))}
              {request?.ekatena_link&&(
                <a href={request.ekatena_link} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",marginTop:4}}>
                  <button className="btn">
                    <Ic d="M4 2h8l2 2v10H4zM4 2v12M8 6h3M8 9h3" s={14} c="#fff"/> Ver reporte Ekatena
                  </button>
                </a>
              )}
            </div>
          )}

          {wizardStep===6&&(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{padding:"12px 14px",background:"#EDE9FE",border:"1px solid #DDD6FE",borderRadius:12,display:"flex",gap:10,alignItems:"center"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#5B21B6",marginBottom:2}}>Procesando verificacion</div>
              </div>
              <div style={{fontSize:11,color:"#94A3B8",textAlign:"center"}}>Esta pantalla se actualiza automaticamente</div>
            </div>
          )}

          {wizardStep===7&&(
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {request?.reporte_url ? (
                <>
                  <div style={{padding:"12px 14px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:12}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#065F46",marginBottom:2}}>Reporte disponible</div>
                    <div style={{fontSize:11,color:"#059669"}}>Tu reporte Ekatena esta listo para descargar</div>
                  </div>
                  <a href={request.reporte_url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                    <button className="btn">
                      <Ic d="M8 2v9M4 8l4 4 4-4M2 14h12" s={14} c="#fff"/> Descargar reporte PDF
                    </button>
                  </a>
                </>
              ) : (
                <div style={{padding:"12px 14px",background:"#F8FAFC",border:"1px solid #E8EDF5",borderRadius:12}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#475569",marginBottom:2}}>Verificacion completada</div>
                  <div style={{fontSize:11,color:"#94A3B8"}}>El reporte PDF estara disponible pronto.</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOX 4 — Que incluye */}
        <div className="card fade d4">
          <div className="lbl" style={{marginBottom:14}}>QUE INCLUYE LA VERIFICACION</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[
              {icon:"M2 8l4 4 8-8",                                    label:"RFC valido SAT"},
              {icon:"M8 2a4 4 0 100 8M2 14c0-3 2.7-5 6-5s6 2 6 5",   label:"Identidad RENAPO"},
              {icon:"M2 12L6 7l3 3 3-4 2 2",                           label:"Score crediticio"},
              {icon:"M4 2h8v12H4zM6 6h4M6 9h4",                       label:"Reporte PDF"},
              {icon:"M2 8l4 4 8-8",                                    label:"Lista negra PLD"},
              {icon:"M2 3h12v10H2zM2 7h12",                            label:"CFDIs 12 meses"},
            ].map(item=>(
              <div key={item.label} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"#F8FAFF",border:"1px solid #EEF2FF",borderRadius:10}}>
                <div style={{width:24,height:24,borderRadius:6,background:"#ECFDF5",display:"grid",placeItems:"center",flexShrink:0}}>
                  <Ic d={item.icon} s={12} c="#059669"/>
                </div>
                <span style={{fontSize:11,fontWeight:500,color:"#475569"}}>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={{padding:"12px 14px",background:"linear-gradient(135deg,#ECFDF5,#F0FDF9)",border:"1px solid #6EE7B7",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#065F46",marginBottom:2}}>Costo unico</div>
              <div style={{fontSize:10,color:"#059669"}}>Sin suscripcion · Pago por SPEI</div>
            </div>
            <div style={{fontSize:24,fontWeight:900,color:"#059669",fontFamily:"Geist Mono,monospace"}}>$400 MXN</div>
          </div>
        </div>
      </div>
    </div>
  );
}
