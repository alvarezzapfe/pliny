"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-MX")}`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day:"numeric", month:"short" });
}
const FACTURACION_LABEL: Record<string, string> = {
  menos_1m:"< $1M", "1m_5m":"$1M–$5M", "5m_20m":"$5M–$20M",
  "20m_50m":"$20M–$50M", "50m_100m":"$50M–$100M", mas_100m:"> $100M",
};
const GARANTIA_COLOR: Record<string, { bg:string; color:string; border:string }> = {
  hipotecaria: { bg:"#EFF6FF", color:"#1E40AF", border:"#BFDBFE" },
  prendaria:   { bg:"#F5F3FF", color:"#5B21B6", border:"#DDD6FE" },
  aval:        { bg:"#FFF7ED", color:"#9A3412", border:"#FED7AA" },
  sin_garantia:{ bg:"#F8FAFC", color:"#475569", border:"#E2E8F0" },
};

function PlanBadge({ plan, ofertasMes, chatsMes }: { plan:string; ofertasMes:number; chatsMes:number }) {
  const L = 4;
  if (plan === "pro") return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:8, background:"linear-gradient(135deg,#EEF2FF,#E0E7FF)", border:"1px solid #C7D2FE" }}>
      <span style={{ fontSize:10, fontWeight:800, color:"#4338CA", fontFamily:"monospace" }}>PRO</span>
      <span style={{ fontSize:10, color:"#6366F1" }}>Ofertas y chats ilimitados</span>
    </div>
  );
  if (plan === "basic") return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px", borderRadius:8, background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
      <span style={{ fontSize:10, fontWeight:800, color:"#475569", fontFamily:"monospace" }}>BASIC</span>
      <span style={{ fontSize:10, color:"#94A3B8" }}>Ofertas {ofertasMes}/{L} · Chats {chatsMes}/{L}</span>
      <div style={{ height:4, width:50, borderRadius:999, background:"#E2E8F0" }}>
        <div style={{ height:"100%", width:`${Math.min(100,(ofertasMes/L)*100)}%`, borderRadius:999, background:ofertasMes>=L?"#EF4444":"#0B1F4B" }}/>
      </div>
    </div>
  );
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", borderRadius:8, background:"#FFF7ED", border:"1px solid #FED7AA" }}>
      <span style={{ fontSize:10, fontWeight:800, color:"#9A3412", fontFamily:"monospace" }}>FREE</span>
      <span style={{ fontSize:10, color:"#C2410C" }}>Actualiza para enviar ofertas</span>
    </div>
  );
}

function PaywallModal({ onClose, reason }: { onClose:()=>void; reason?:string }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.5)", backdropFilter:"blur(6px)" }}/>
      <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:420, overflow:"hidden", boxShadow:"0 32px 80px rgba(15,23,42,.22)" }}>
        <div style={{ background:"linear-gradient(135deg,#0B1F4B,#1B3A6B)", padding:"28px 24px 20px", textAlign:"center" }}>
          <div style={{ fontSize:20, fontWeight:900, color:"#fff", marginBottom:6 }}>{reason==="limit"?"Límite alcanzado":"Plinius Pro"}</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.65)", lineHeight:1.6 }}>{reason==="limit"?"Has alcanzado el límite de 4 ofertas/chats este mes. Actualiza a Pro para continuar sin límites.":"Accede a chats cifrados, envía ofertas y ve el RFC del solicitante."}</div>
        </div>
        <div style={{ padding:"20px 24px" }}>
          {["RFC y nombre del solicitante","Chats y ofertas ilimitadas","Dashboard de cartera avanzado","Soporte prioritario"].map(f=>(
            <div key={f} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:"#ECFDF5", border:"1px solid #A7F3D0", display:"grid", placeItems:"center", flexShrink:0 }}>
                <svg width={10} height={10} viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#059669" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontSize:12, color:"#374151" }}>{f}</span>
            </div>
          ))}
          <button style={{ width:"100%", height:42, borderRadius:10, border:"none", background:"linear-gradient(135deg,#0B1F4B,#1B3A6B)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", marginTop:12 }}>Actualizar a Pro →</button>
          <button onClick={onClose} style={{ width:"100%", marginTop:8, padding:"8px", background:"transparent", color:"#94A3B8", border:"none", borderRadius:8, fontSize:12, cursor:"pointer" }}>Ahora no</button>
        </div>
      </div>
    </div>
  );
}

function OfertaModal({ solicitud, userId, onClose, onSent }: { solicitud:any; userId:string; onClose:()=>void; onSent:()=>void }) {
  const [tasa, setTasa] = useState("");
  const [plazo, setPlazo] = useState("");
  const [saving, setSaving] = useState(false);
  async function handleSubmit() {
    if (!tasa||!plazo) return;
    setSaving(true);
    await supabase.from("ofertas").insert({ solicitud_id:solicitud.id, otorgante_id:userId, solicitante_id:solicitud.borrower_id, monto_ofertado:solicitud.monto, tasa_anual:parseFloat(tasa), plazo_meses:parseInt(plazo), status:"enviada" });
    onSent(); onClose();
  }
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.45)", backdropFilter:"blur(5px)" }}/>
      <div style={{ position:"relative", background:"#fff", borderRadius:18, width:"100%", maxWidth:400, padding:"24px", boxShadow:"0 24px 60px rgba(15,23,42,.18)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div><div style={{ fontSize:16, fontWeight:800, color:"#0B1F4B" }}>Enviar oferta</div><div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{solicitud.destino||"Solicitud"} · {fmt(solicitud.monto)}</div></div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:"1px solid #E2E8F0", background:"#F8FAFC", cursor:"pointer", fontSize:14, color:"#94A3B8" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:18 }}>
          <div><label style={{ fontSize:11, fontWeight:600, color:"#64748B", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:".06em" }}>Tasa anual (%)</label><input type="number" value={tasa} onChange={e=>setTasa(e.target.value)} placeholder="ej. 18.5" style={{ width:"100%", height:40, borderRadius:9, border:"1.5px solid #E2E8F0", padding:"0 12px", fontSize:13, outline:"none", fontFamily:"monospace" }}/></div>
          <div><label style={{ fontSize:11, fontWeight:600, color:"#64748B", display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:".06em" }}>Plazo (meses)</label><input type="number" value={plazo} onChange={e=>setPlazo(e.target.value)} placeholder="ej. 24" style={{ width:"100%", height:40, borderRadius:9, border:"1.5px solid #E2E8F0", padding:"0 12px", fontSize:13, outline:"none", fontFamily:"monospace" }}/></div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, height:40, borderRadius:9, border:"1.5px solid #E2E8F0", background:"#F8FAFC", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!tasa||!plazo||saving} style={{ flex:2, height:40, borderRadius:9, border:"none", background:"linear-gradient(135deg,#0B1F4B,#1B3A6B)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:(!tasa||!plazo||saving)?0.6:1 }}>{saving?"Enviando…":"Enviar oferta →"}</button>
        </div>
      </div>
    </div>
  );
}

function ExpandedRow({ s, plan, ofertasMes, chatsMes, yaOferto, onOfertar, onConectar, onClose }: any) {
  const L = 4;
  const canAct = plan==="pro"||(plan==="basic"&&ofertasMes<L);
  const showRfc = plan==="pro";
  const gColor = GARANTIA_COLOR[s.garantia_tipo]??GARANTIA_COLOR.sin_garantia;
  return (
    <div style={{ background:"#F8FAFF", borderBottom:"1px solid #E2E8F0", padding:"16px 20px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
        <div style={{ background:"#fff", borderRadius:12, padding:"14px 16px", border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#94A3B8", fontFamily:"monospace", letterSpacing:".08em", marginBottom:10 }}>SOLICITUD</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[["Destino",s.destino||"—"],["Monto",fmt(s.monto)],["Plazo",`${s.plazo_meses}m`],["Tasa máx",s.tasa_solicitada?`${s.tasa_solicitada}%`:"—"],["Sector",s.fin_sector||"—"],["Fecha",fmtDate(s.created_at)]].map(([l,v])=>(
              <div key={l as string}><div style={{ fontSize:8, color:"#94A3B8", fontFamily:"monospace", marginBottom:2, letterSpacing:".06em" }}>{(l as string).toUpperCase()}</div><div style={{ fontSize:12, fontWeight:600, color:"#1E293B" }}>{v as string}</div></div>
            ))}
          </div>
        </div>
        <div style={{ background:"#fff", borderRadius:12, padding:"14px 16px", border:"1px solid #E2E8F0" }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#94A3B8", fontFamily:"monospace", letterSpacing:".08em", marginBottom:10 }}>EMPRESA</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[["RFC",showRfc?(s.rfc||"—"):"••••••••"],["Facturación",FACTURACION_LABEL[s.fin_facturacion_anual]||"—"],["Antigüedad",s.fin_antiguedad?.replace(/_/g," ")||"—"],["Empleados",s.fin_num_empleados||"—"],["Garantía",(s.garantia_tipo||"—").replace("_"," ")]].map(([l,v])=>(
              <div key={l as string}><div style={{ fontSize:8, color:"#94A3B8", fontFamily:"monospace", marginBottom:2, letterSpacing:".06em" }}>{(l as string).toUpperCase()}</div><div style={{ fontSize:12, fontWeight:600, color:l==="RFC"&&!showRfc?"#CBD5E1":"#1E293B", filter:l==="RFC"&&!showRfc?"blur(4px)":"none" }}>{v as string}</div></div>
            ))}
          </div>
          {!showRfc&&<div style={{ marginTop:8, fontSize:10, color:"#6366F1", background:"#EEF2FF", borderRadius:6, padding:"4px 8px", textAlign:"center" }}>🔒 RFC visible solo en Plan Pro</div>}
        </div>
        <div style={{ background:"#fff", borderRadius:12, padding:"14px 16px", border:"1px solid #E2E8F0", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#94A3B8", fontFamily:"monospace", letterSpacing:".08em" }}>ACCIONES</div>
          {s.descripcion&&<div style={{ fontSize:11, color:"#64748B", lineHeight:1.6, background:"#F8FAFC", borderRadius:8, padding:"8px 10px", border:"1px solid #F1F5F9" }}>{s.descripcion}</div>}
          <button onClick={()=>onConectar(s)} style={{ height:36, borderRadius:8, border:"1.5px solid #E2E8F0", background:"#F8FAFC", color:"#475569", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            💬 Chat {plan==="basic"?`(${chatsMes}/${L})`:""}
          </button>
          {yaOferto
            ?<div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"8px", borderRadius:8, background:"#ECFDF5", border:"1px solid #A7F3D0" }}><span style={{ fontSize:12, fontWeight:700, color:"#059669" }}>✓ Oferta enviada</span></div>
            :<button onClick={()=>canAct?onOfertar(s):null} style={{ height:36, borderRadius:8, border:"none", background:canAct?"linear-gradient(135deg,#0B1F4B,#1B3A6B)":"#E2E8F0", color:canAct?"#fff":"#94A3B8", fontSize:12, fontWeight:700, cursor:canAct?"pointer":"not-allowed" }}>
              {plan==="free"?"🔒 Requiere Pro":ofertasMes>=L?`Límite (${L}/mes)`:`+ Ofertar${plan==="basic"?` (${ofertasMes}/${L})`:""}` }
            </button>
          }
          <button onClick={onClose} style={{ height:28, borderRadius:7, border:"1px solid #E2E8F0", background:"transparent", color:"#94A3B8", fontSize:11, cursor:"pointer" }}>Cerrar ▲</button>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [misOfertas,  setMisOfertas]  = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [userId,      setUserId]      = useState<string|null>(null);
  const [plan,        setPlan]        = useState<"free"|"basic"|"pro">("free");
  const [userEmail,   setUserEmail]   = useState("");
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string|undefined>();
  const [ofertando,   setOfertando]   = useState<any>(null);
  const [expanded,    setExpanded]    = useState<string|null>(null);
  const [ofertasMes,  setOfertasMes]  = useState(0);
  const [chatsMes,    setChatsMes]    = useState(0);
  const [sort,        setSort]        = useState<"fecha"|"monto_asc"|"monto_desc">("fecha");
  const [filtros, setFiltros] = useState({ sector:"", garantia:"", monto_min:"", monto_max:"", plazo:"" });
  const [search, setSearch] = useState("");
  const [vista, setVista] = useState<"cards"|"tabla">("cards");
  const LIMIT = 4;

  useEffect(()=>{
    (async()=>{
      const { data:auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      const uid = auth.user.id;
      setUserId(uid); setUserEmail(auth.user.email??"");
      const { data:prof } = await supabase.from("plinius_profiles").select("plan").eq("user_id",uid).maybeSingle();
      setPlan((prof?.plan as "free"|"basic"|"pro")??"free");
      const som = new Date(); som.setDate(1); som.setHours(0,0,0,0);
      const [{ data:sols },{ data:ofertas },{ data:om },{ data:cm }] = await Promise.all([
        supabase.from("solicitudes").select("id,borrower_id,tipo,monto,plazo_meses,tasa_solicitada,destino,descripcion,garantia_tipo,fin_sector,fin_facturacion_anual,fin_antiguedad,fin_num_empleados,created_at").eq("tipo","subasta").in("status",["enviada","en_revision"]).order("created_at",{ascending:false}),
        supabase.from("ofertas").select("solicitud_id").eq("otorgante_id",uid),
        supabase.from("ofertas").select("id",{count:"exact"}).eq("otorgante_id",uid).gte("created_at",som.toISOString()),
        supabase.from("conversaciones").select("id",{count:"exact"}).eq("otorgante_id",uid).gte("created_at",som.toISOString()),
      ]);
      setSolicitudes(sols??[]); setMisOfertas((ofertas??[]).map((o:any)=>o.solicitud_id));
      setOfertasMes(om?.length??0); setChatsMes(cm?.length??0); setLoading(false);
    })();
  },[router]);

  const filtered = useMemo(()=>{
    let arr = solicitudes.filter(s=>{
      if (filtros.sector&&s.fin_sector!==filtros.sector) return false;
      if (filtros.garantia&&s.garantia_tipo!==filtros.garantia) return false;
      if (filtros.plazo&&s.plazo_meses?.toString()!==filtros.plazo) return false;
      if (filtros.monto_min&&s.monto<parseFloat(filtros.monto_min)) return false;
      if (filtros.monto_max&&s.monto>parseFloat(filtros.monto_max)) return false;
      if (search) { const q=search.toLowerCase(); return (s.destino||"").toLowerCase().includes(q)||(s.fin_sector||"").toLowerCase().includes(q)||(s.descripcion||"").toLowerCase().includes(q); }
      return true;
    });
    if (sort==="monto_asc")  arr=[...arr].sort((a,b)=>a.monto-b.monto);
    if (sort==="monto_desc") arr=[...arr].sort((a,b)=>b.monto-a.monto);
    return arr;
  },[solicitudes,filtros,search,sort]);

  const totalMonto = filtered.reduce((s,x)=>s+(x.monto??0),0);
  const sinOfertas = filtered.filter(s=>!misOfertas.includes(s.id)).length;
  function upd(k: keyof typeof filtros, v: string) { setFiltros(f=>({...f,[k]:v})); }
  function handleSent() { if(ofertando){setMisOfertas(p=>[...p,ofertando.id]);setOfertasMes(n=>n+1);} }

  async function handleConectar(s: any) {
    if (!userId) return;
    if (plan==="free") { setPaywallReason(undefined); setShowPaywall(true); return; }
    if (plan==="basic"&&chatsMes>=LIMIT) { setPaywallReason("limit"); setShowPaywall(true); return; }
    const {data:conv,error} = await supabase.from("conversaciones").upsert({otorgante_id:userId,solicitante_id:s.borrower_id,solicitud_id:s.id,solicitante_empresa:s.fin_sector||null,otorgante_email:userEmail},{onConflict:"otorgante_id,solicitante_id",ignoreDuplicates:false}).select("id").maybeSingle();
    if (!error&&conv?.id) { setChatsMes(n=>n+1); router.push(`/dashboard/chat?conv=${conv.id}`); }
  }

  function handleOfertar(s: any) {
    if (plan==="free") { setPaywallReason(undefined); setShowPaywall(true); return; }
    if (plan==="basic"&&ofertasMes>=LIMIT) { setPaywallReason("limit"); setShowPaywall(true); return; }
    setOfertando(s);
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fade{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both;}
    .d1{animation-delay:.05s;}.d2{animation-delay:.10s;}.d3{animation-delay:.15s;}
    .mono{font-family:'Geist Mono',monospace;}
    .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;}
    .fsel{height:38px;border-radius:9px;border:1.5px solid #E2E8F0;background:#F8FAFC;padding:0 12px;font-size:12px;color:#374151;font-family:'Geist',sans-serif;outline:none;cursor:pointer;}
    .finp{height:38px;border-radius:9px;border:1.5px solid #E2E8F0;background:#F8FAFC;padding:0 12px;font-size:12px;color:#374151;font-family:'Geist',sans-serif;outline:none;width:100%;}
    .tr{display:grid;align-items:center;padding:16px 18px;border-bottom:1px solid #E8EDF5;cursor:pointer;transition:background .1s;}
    .tr:hover{background:#F8FAFF;}
    .spinner{animation:spin .7s linear infinite;}
  `;

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
      <style>{CSS}</style>
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.04em", marginBottom:3 }}>Marketplace</div>
          <div style={{ fontSize:12, color:"#94A3B8" }}>Solicitudes en subasta abierta · Anónimas hasta conectar</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <PlanBadge plan={plan} ofertasMes={ofertasMes} chatsMes={chatsMes}/>
          <div style={{ display:"flex", borderRadius:8, border:"1px solid #E2E8F0", overflow:"hidden" }}>
            <button onClick={()=>setVista("cards")} style={{ height:36, padding:"0 12px", border:"none", background:vista==="cards"?"#0B1F4B":"#F8FAFC", color:vista==="cards"?"#fff":"#64748B", fontSize:12, fontWeight:600, cursor:"pointer" }}>⊞ Tarjetas</button>
            <button onClick={()=>setVista("tabla")} style={{ height:36, padding:"0 12px", border:"none", background:vista==="tabla"?"#0B1F4B":"#F8FAFC", color:vista==="tabla"?"#fff":"#64748B", fontSize:12, fontWeight:600, cursor:"pointer" }}>☰ Tabla</button>
          </div>
          <select className="fsel" value={sort} onChange={e=>setSort(e.target.value as any)}>
            <option value="fecha">Más recientes</option>
            <option value="monto_desc">Mayor monto</option>
            <option value="monto_asc">Menor monto</option>
          </select>
        </div>
      </div>
      <div className="fade d1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        {[{label:"En subasta",val:loading?"—":filtered.length,color:"#1E40AF"},{label:"Monto total",val:loading?"—":fmt(totalMonto),color:"#0F172A"},{label:"Sin tu oferta",val:loading?"—":sinOfertas,color:"#059669"},{label:"Tus ofertas",val:loading?"—":misOfertas.length,color:"#5B21B6"}].map(k=>(
          <div key={k.label} className="card" style={{ padding:"13px 16px" }}>
            <div className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".08em", marginBottom:6 }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.04em", color:k.color }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div className="card fade d2" style={{ padding:"12px 16px", marginBottom:16, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <input className="finp" style={{ flex:"1 1 200px" }} placeholder="Buscar por destino, sector..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <select className="fsel" value={filtros.sector} onChange={e=>upd("sector",e.target.value)}>
          <option value="">Todos los sectores</option>
          {["comercio","manufactura","servicios","construccion","tecnologia","agro","salud","transporte","educacion","otro"].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="fsel" value={filtros.garantia} onChange={e=>upd("garantia",e.target.value)}>
          <option value="">Toda garantía</option>
          <option value="hipotecaria">Hipotecaria</option><option value="prendaria">Prendaria</option>
          <option value="aval">Aval</option><option value="sin_garantia">Sin garantía</option>
        </select>
        <select className="fsel" value={filtros.plazo} onChange={e=>upd("plazo",e.target.value)}>
          <option value="">Cualquier plazo</option>
          {[3,6,9,12,18,24,36,48,60].map(m=><option key={m} value={m}>{m}m</option>)}
        </select>
        {(filtros.sector||filtros.garantia||filtros.plazo||search)&&<button onClick={()=>{setFiltros({sector:"",garantia:"",monto_min:"",monto_max:"",plazo:""});setSearch("");}} style={{ height:38, padding:"0 12px", borderRadius:9, border:"1px solid #FECDD3", background:"#FFF1F2", color:"#9F1239", fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>Limpiar</button>}
      </div>
      {loading ? (
        <div style={{ padding:60, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          <svg className="spinner" width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="#1E40AF" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
          <span style={{ fontSize:13, color:"#94A3B8" }}>Cargando marketplace...</span>
        </div>
      ) : filtered.length===0 ? (
        <div style={{ padding:"60px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:12, textAlign:"center" }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#475569" }}>Sin solicitudes en este momento</div>
          <div style={{ fontSize:12, color:"#94A3B8" }}>Vuelve pronto — nuevas solicitudes llegan diariamente</div>
        </div>
      ) : (
        <>{vista==="cards" ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
          {filtered.map(s=>{
            const gColor = GARANTIA_COLOR[s.garantia_tipo]??GARANTIA_COLOR.sin_garantia;
            const yaOferto = misOfertas.includes(s.id);
            const isOpen = expanded===s.id;
            return (
              <React.Fragment key={s.id}>
                <div onClick={()=>setExpanded(isOpen?null:s.id)}
                  style={{ background:"#fff", border:`1.5px solid ${isOpen?"#1B3A6B":"#E8EDF5"}`, borderRadius:14, padding:"16px", cursor:"pointer", transition:"all .15s", boxShadow:isOpen?"0 4px 16px rgba(27,58,107,.12)":"none" }}>
                  {/* Header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:"#0B1F4B", marginBottom:2 }}>{s.destino||"Sin destino"}</div>
                      <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"monospace" }}>{fmtDate(s.created_at)}</div>
                    </div>
                    <div style={{ fontSize:18, fontWeight:900, color:"#0B1F4B", fontFamily:"monospace" }}>{fmt(s.monto)}</div>
                  </div>
                  {/* Tags */}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:"monospace", background:"#F1F5F9", color:"#475569", borderRadius:999, padding:"3px 8px", border:"1px solid #E2E8F0" }}>{s.plazo_meses}m</span>
                    {s.fin_sector&&<span style={{ fontSize:10, fontWeight:700, fontFamily:"monospace", background:"#F1F5F9", color:"#475569", borderRadius:999, padding:"3px 8px", border:"1px solid #E2E8F0", textTransform:"capitalize" }}>{s.fin_sector}</span>}
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:"monospace", background:gColor.bg, color:gColor.color, border:`1px solid ${gColor.border}`, borderRadius:999, padding:"3px 8px" }}>{(s.garantia_tipo||"—").replace("_"," ")}</span>
                    {s.fin_facturacion_anual&&<span style={{ fontSize:10, fontWeight:700, fontFamily:"monospace", background:"#F0FDF9", color:"#065F46", border:"1px solid #A7F3D0", borderRadius:999, padding:"3px 8px" }}>Fact. {FACTURACION_LABEL[s.fin_facturacion_anual]||s.fin_facturacion_anual}</span>}
                  </div>
                  {/* Actions */}
                  <div style={{ display:"flex", gap:6, alignItems:"center" }} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>handleConectar(s)} style={{ flex:1, height:32, borderRadius:8, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#475569", fontSize:12, fontWeight:600, cursor:"pointer" }}>💬 Chat</button>
                    {yaOferto
                      ?<div style={{ flex:1, height:32, borderRadius:8, background:"#ECFDF5", border:"1px solid #A7F3D0", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:11, fontWeight:700, color:"#059669" }}>✓ Oferta enviada</span></div>
                      :<button onClick={()=>handleOfertar(s)} style={{ flex:1, height:32, borderRadius:8, border:"none", background:"linear-gradient(135deg,#0B1F4B,#1B3A6B)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>+ Ofertar</button>
                    }
                  </div>
                </div>
                {isOpen&&<div style={{ gridColumn:"1/-1" }}><ExpandedRow s={s} plan={plan} ofertasMes={ofertasMes} chatsMes={chatsMes} yaOferto={yaOferto} onOfertar={handleOfertar} onConectar={handleConectar} onClose={()=>setExpanded(null)}/></div>}
              </React.Fragment>
            );
          })}
        </div>
        ) : (
        <div className="card" style={{ overflowX:"auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"200px 100px 70px 110px 120px 100px 150px", padding:"8px 16px", minWidth:900, background:"#F8FAFC", borderBottom:"1px solid #E8EDF5" }}>
            {["Destino","Monto","Plazo","Sector","Garantía","Fact.",""].map((h,i)=><div key={i} style={{ fontSize:10, color:"#94A3B8", fontFamily:"monospace", letterSpacing:".06em", fontWeight:700 }}>{h}</div>)}
          </div>
          {filtered.map(s=>{
            const gColor = GARANTIA_COLOR[s.garantia_tipo]??GARANTIA_COLOR.sin_garantia;
            const yaOferto = misOfertas.includes(s.id);
            const isOpen = expanded===s.id;
            return (
              <React.Fragment key={s.id}>
                <div onClick={()=>setExpanded(isOpen?null:s.id)} style={{ display:"grid", gridTemplateColumns:"200px 100px 70px 110px 120px 100px 150px", alignItems:"center", minWidth:900, padding:"13px 16px", borderBottom:"1px solid #F1F5F9", cursor:"pointer", background:isOpen?"#EEF2FF":"white", transition:"background .1s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
                    <span style={{ fontSize:10, color:"#94A3B8", flexShrink:0 }}>{isOpen?"▼":"▶"}</span>
                    <div style={{ overflow:"hidden" }}>
                      <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.destino||"—"}</div>
                      <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"monospace" }}>{fmtDate(s.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, fontFamily:"monospace" }}>{fmt(s.monto)}</div>
                  <div style={{ fontSize:12, color:"#64748B" }}>{s.plazo_meses}m</div>
                  <div style={{ fontSize:11, color:"#475569", textTransform:"capitalize" }}>{s.fin_sector||"—"}</div>
                  <span style={{ fontSize:10, fontWeight:700, fontFamily:"monospace", background:gColor.bg, color:gColor.color, border:`1px solid ${gColor.border}`, borderRadius:999, padding:"2px 8px", display:"inline-block", whiteSpace:"nowrap" }}>{(s.garantia_tipo||"—").replace("_"," ")}</span>
                  <div style={{ fontSize:11, color:"#64748B" }}>{FACTURACION_LABEL[s.fin_facturacion_anual]||"—"}</div>
                  <div style={{ display:"flex", gap:5 }} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>handleConectar(s)} style={{ height:28, padding:"0 8px", borderRadius:7, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#475569", fontSize:11, fontWeight:600, cursor:"pointer" }}>Chat</button>
                    {yaOferto
                      ?<span style={{ fontSize:10, fontWeight:800, color:"#059669", background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:7, padding:"3px 8px" }}>✓</span>
                      :<button onClick={()=>handleOfertar(s)} style={{ height:28, padding:"0 8px", borderRadius:7, border:"none", background:"linear-gradient(135deg,#0B1F4B,#1B3A6B)", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Ofertar</button>
                    }
                  </div>
                </div>
                {isOpen&&<ExpandedRow s={s} plan={plan} ofertasMes={ofertasMes} chatsMes={chatsMes} yaOferto={yaOferto} onOfertar={handleOfertar} onConectar={handleConectar} onClose={()=>setExpanded(null)}/>}
              </React.Fragment>
            );
          })}
        </div>
        )}</>
      )}
      {showPaywall&&<PaywallModal onClose={()=>setShowPaywall(false)} reason={paywallReason}/>}
      {ofertando&&userId&&<OfertaModal solicitud={ofertando} userId={userId} onClose={()=>setOfertando(null)} onSent={handleSent}/>}
    </div>
  );
}
