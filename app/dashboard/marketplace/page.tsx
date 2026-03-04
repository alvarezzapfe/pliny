"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s=16, c="currentColor" }: { d:string; s?:number; c?:string }) {
  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-MX")}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day:"numeric", month:"short" });
}

const SECTOR_ICON: Record<string, string> = {
  comercio:"M2 4h12v8H2z", manufactura:"M2 12V6l4-4h4l4 4v6",
  servicios:"M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5",
  construccion:"M2 14V8l6-6 6 6v6", tecnologia:"M2 2h12v8H2zM5 14h6M8 10v4",
  agro:"M8 2c0 4-4 6-4 10M8 2c0 4 4 6 4 10", salud:"M8 2v12M2 8h12",
  transporte:"M2 10h12M4 10V6l2-3h4l2 3v4M5 13a1 1 0 100-2M11 13a1 1 0 100-2",
  educacion:"M8 2l6 4-6 4-6-4zM2 10v3M14 10v3M8 14v-4",
  financiero:"M2 12L6 7l3 3 3-4 2 2", otro:"M8 8a3 3 0 100-6M8 14v-3",
};

const FACTURACION_LABEL: Record<string, string> = {
  menos_1m:"< $1M", "1m_5m":"$1M–$5M", "5m_20m":"$5M–$20M",
  "20m_50m":"$20M–$50M", "50m_100m":"$50M–$100M", mas_100m:"> $100M",
};

const GARANTIA_COLOR: Record<string, { bg:string; color:string }> = {
  hipotecaria: { bg:"#EFF6FF", color:"#1E40AF" },
  prendaria:   { bg:"#F5F3FF", color:"#5B21B6" },
  aval:        { bg:"#FFF7ED", color:"#9A3412" },
  sin_garantia:{ bg:"#F8FAFC", color:"#475569" },
};

// ── Pro Paywall Modal ──────────────────────────────────────────────────────
function PaywallModal({ onClose }: { onClose: ()=>void }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.5)", backdropFilter:"blur(6px)" }}/>
      <div style={{ position:"relative", background:"#fff", borderRadius:24, width:"100%", maxWidth:440, overflow:"hidden", boxShadow:"0 32px 80px rgba(15,23,42,.22)" }}>
        {/* Top gradient */}
        <div style={{ background:"linear-gradient(135deg,#0C1E4A,#1B3F8A,#2563EB)", padding:"32px 28px 24px", textAlign:"center" }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"rgba(255,255,255,.12)", border:"1px solid rgba(255,255,255,.2)", display:"grid", placeItems:"center", margin:"0 auto 14px" }}>
            <Ic d="M8 2a3 3 0 00-3 3v2H3v9h10V7h-2V5a3 3 0 00-3-3zM6 5a2 2 0 114 0v2H6V5z" s={24} c="#93C5FD"/>
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-0.04em", marginBottom:6 }}>Plinius Pro</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.65)", lineHeight:1.6 }}>
            Conecta con solicitantes calificados y envía ofertas directamente desde el marketplace
          </div>
        </div>

        {/* Features */}
        <div style={{ padding:"22px 28px" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:22 }}>
            {[
              { icon:"M2 8l4 4 8-8", text:"Ver RFC y nombre completo del solicitante" },
              { icon:"M8 2v12M2 8h12", text:"Enviar ofertas de crédito ilimitadas" },
              { icon:"M2 12L6 7l3 3 3-4 2 2", text:"Acceso a historial crediticio básico" },
              { icon:"M2 2h12v8H2zM5 14h6M8 10v4", text:"Dashboard de cartera avanzado" },
              { icon:"M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5", text:"Soporte prioritario" },
            ].map((f,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:26, height:26, borderRadius:8, background:"#ECFDF5", display:"grid", placeItems:"center", flexShrink:0 }}>
                  <Ic d={f.icon} s={12} c="#059669"/>
                </div>
                <span style={{ fontSize:13, color:"#374151" }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button style={{ width:"100%", padding:"14px", background:"linear-gradient(135deg,#1B3F8A,#2563EB)", color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Geist',sans-serif", letterSpacing:"-0.02em", boxShadow:"0 4px 16px rgba(37,99,235,.35)", marginBottom:10 }}>
            Suscribirme a Pro →
          </button>
          <button onClick={onClose} style={{ width:"100%", padding:"10px", background:"transparent", color:"#94A3B8", border:"none", borderRadius:10, fontSize:13, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Oferta Modal ───────────────────────────────────────────────────────────
function OfertaModal({ solicitud, userId, onClose, onSent }: { solicitud:any; userId:string; onClose:()=>void; onSent:()=>void }) {
  const [monto,      setMonto]      = useState(solicitud.monto?.toLocaleString("es-MX") ?? "");
  const [tasa,       setTasa]       = useState("");
  const [plazo,      setPlazo]      = useState(solicitud.plazo_meses?.toString() ?? "");
  const [comisiones, setComisiones] = useState("");
  const [condiciones,setCondiciones]= useState("");
  const [saving,     setSaving]     = useState(false);
  const [sent,       setSent]       = useState(false);

  async function handleSubmit() {
    if (!tasa || !plazo) return;
    setSaving(true);
    await supabase.from("ofertas").upsert({
      solicitud_id: solicitud.id,
      otorgante_id: userId,
      monto_ofertado: parseFloat(monto.replace(/,/g,"")) || solicitud.monto,
      tasa_anual: parseFloat(tasa),
      plazo_meses: parseInt(plazo),
      comisiones: parseFloat(comisiones) || 0,
      condiciones,
      status: "pendiente",
    }, { onConflict:"solicitud_id,otorgante_id" });
    setSaving(false);
    setSent(true);
    setTimeout(()=>{ onSent(); onClose(); }, 1500);
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.45)", backdropFilter:"blur(5px)" }}/>
      <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:480, boxShadow:"0 24px 64px rgba(15,23,42,.18)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #E8EDF5", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.03em" }}>Enviar oferta</div>
            <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>
              {solicitud.destino} · {fmt(solicitud.monto)} · {solicitud.plazo_meses}m
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:"1px solid #E2E8F0", background:"#F8FAFC", cursor:"pointer", display:"grid", placeItems:"center" }}>
            <Ic d="M3 3l10 10M13 3L3 13" s={12} c="#64748B"/>
          </button>
        </div>

        <div style={{ padding:"20px 24px" }}>
          {sent ? (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:"#ECFDF5", border:"2px solid #A7F3D0", display:"grid", placeItems:"center", margin:"0 auto 12px" }}>
                <Ic d="M2 8l4 4 8-8" s={20} c="#059669"/>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"#065F46" }}>¡Oferta enviada!</div>
              <div style={{ fontSize:12, color:"#94A3B8", marginTop:4 }}>El solicitante recibirá tu propuesta</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {/* Monto */}
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"#374151" }}>Monto a otorgar (MXN)</label>
                  <div style={{ position:"relative" }}>
                    <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94A3B8", fontWeight:600, pointerEvents:"none" }}>$</span>
                    <input value={monto} onChange={e=>{
                      const d=e.target.value.replace(/[^0-9]/g,"");
                      setMonto(d?parseInt(d).toLocaleString("es-MX"):"");
                    }} style={{ height:44, borderRadius:10, border:"1.5px solid #DDE5F7", background:"#F8FAFF", paddingLeft:26, paddingRight:12, fontSize:13, color:"#0F172A", fontFamily:"'Geist',sans-serif", outline:"none", width:"100%" }} placeholder="1,000,000"/>
                  </div>
                </div>
                {/* Tasa */}
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"#374151" }}>Tasa anual (%)<span style={{ color:"#EF4444" }}> *</span></label>
                  <div style={{ position:"relative" }}>
                    <input value={tasa} onChange={e=>setTasa(e.target.value)} type="number" min="0" max="100" step="0.5"
                      style={{ height:44, borderRadius:10, border:"1.5px solid #DDE5F7", background:"#F8FAFF", padding:"0 32px 0 14px", fontSize:13, color:"#0F172A", fontFamily:"'Geist',sans-serif", outline:"none", width:"100%" }} placeholder="ej. 18"/>
                    <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94A3B8", pointerEvents:"none" }}>%</span>
                  </div>
                </div>
                {/* Plazo */}
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"#374151" }}>Plazo (meses)<span style={{ color:"#EF4444" }}> *</span></label>
                  <select value={plazo} onChange={e=>setPlazo(e.target.value)}
                    style={{ height:44, borderRadius:10, border:"1.5px solid #DDE5F7", background:"#F8FAFF", padding:"0 14px", fontSize:13, color:"#0F172A", fontFamily:"'Geist',sans-serif", outline:"none", width:"100%", cursor:"pointer" }}>
                    <option value="">Selecciona...</option>
                    {[3,6,9,12,18,24,36,48,60].map(m=><option key={m} value={m}>{m} meses</option>)}
                  </select>
                </div>
                {/* Comisión */}
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:"#374151" }}>Comisión de apertura (%)</label>
                  <div style={{ position:"relative" }}>
                    <input value={comisiones} onChange={e=>setComisiones(e.target.value)} type="number" min="0" step="0.1"
                      style={{ height:44, borderRadius:10, border:"1.5px solid #DDE5F7", background:"#F8FAFF", padding:"0 32px 0 14px", fontSize:13, color:"#0F172A", fontFamily:"'Geist',sans-serif", outline:"none", width:"100%" }} placeholder="0"/>
                    <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#94A3B8", pointerEvents:"none" }}>%</span>
                  </div>
                </div>
              </div>
              {/* Condiciones */}
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#374151" }}>Condiciones adicionales</label>
                <textarea value={condiciones} onChange={e=>setCondiciones(e.target.value)} rows={3}
                  placeholder="Ej: Se requiere aval adicional, seguro de vida, etc."
                  style={{ borderRadius:10, border:"1.5px solid #DDE5F7", background:"#F8FAFF", padding:"10px 14px", fontSize:13, color:"#0F172A", fontFamily:"'Geist',sans-serif", outline:"none", width:"100%", resize:"vertical" }}/>
              </div>

              {/* Summary */}
              {tasa && plazo && (
                <div style={{ padding:"12px 14px", background:"#F0FDF9", border:"1px solid #A7F3D0", borderRadius:10, display:"flex", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:11, color:"#059669", fontWeight:700, marginBottom:2 }}>Resumen de oferta</div>
                    <div style={{ fontSize:12, color:"#065F46" }}>{fmt(parseFloat(monto.replace(/,/g,""))||solicitud.monto)} · {tasa}% anual · {plazo} meses</div>
                  </div>
                  {comisiones && <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, color:"#059669", fontWeight:700, marginBottom:2 }}>Comisión</div>
                    <div style={{ fontSize:12, color:"#065F46" }}>{comisiones}%</div>
                  </div>}
                </div>
              )}

              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={onClose} style={{ flex:1, height:44, borderRadius:10, border:"1.5px solid #E2E8F0", background:"#F8FAFC", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>
                  Cancelar
                </button>
                <button onClick={handleSubmit} disabled={!tasa||!plazo||saving} style={{ flex:2, height:44, borderRadius:10, border:"none", background: tasa&&plazo ? "linear-gradient(135deg,#0C1E4A,#1B3F8A)" : "#E2E8F0", color: tasa&&plazo?"#fff":"#94A3B8", fontSize:13, fontWeight:700, cursor: tasa&&plazo?"pointer":"not-allowed", fontFamily:"'Geist',sans-serif", boxShadow: tasa&&plazo?"0 4px 14px rgba(27,63,138,.25)":"none" }}>
                  {saving ? "Enviando..." : "Enviar oferta →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Solicitud Card ─────────────────────────────────────────────────────────
function SolicitudCard({ s, userId, onOfertar, onConectar, yaOferto }: {
  s:any; userId:string; onOfertar:(s:any)=>void; onConectar:()=>void; yaOferto:boolean;
}) {
  const sector = s.fin_sector || "otro";
  const iconD  = SECTOR_ICON[sector] ?? SECTOR_ICON.otro;
  const gColor = GARANTIA_COLOR[s.garantia_tipo] ?? GARANTIA_COLOR.sin_garantia;

  return (
    <div style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:16, padding:"18px 20px", display:"flex", flexDirection:"column", gap:14, transition:"all .2s", position:"relative", overflow:"hidden" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="#BFDBFE";e.currentTarget.style.boxShadow="0 8px 28px rgba(15,23,42,.08)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="#E8EDF5";e.currentTarget.style.boxShadow="none";}}>

      {/* Subtle bg accent */}
      <div style={{ position:"absolute", top:0, right:0, width:80, height:80, borderRadius:"0 16px 0 80px", background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", opacity:.5 }}/>

      {/* Top row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:"linear-gradient(135deg,#EFF6FF,#BFDBFE)", display:"grid", placeItems:"center", flexShrink:0 }}>
            <Ic d={iconD} s={17} c="#1E40AF"/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", textTransform:"capitalize" }}>{sector}</div>
            <div style={{ fontSize:11, color:"#94A3B8", marginTop:1 }}>{s.destino || "—"}</div>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.04em", color:"#0F172A" }}>{fmt(s.monto)}</div>
          <div style={{ fontSize:11, color:"#94A3B8" }}>{s.plazo_meses}m · {s.tipo || "subasta"}</div>
        </div>
      </div>

      {/* Tags */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {s.fin_facturacion_anual && (
          <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:"#F0FDF9", color:"#065F46", border:"1px solid #A7F3D0", borderRadius:999, padding:"3px 8px" }}>
            Fact. {FACTURACION_LABEL[s.fin_facturacion_anual] ?? s.fin_facturacion_anual}
          </span>
        )}
        {s.garantia_tipo && (
          <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:gColor.bg, color:gColor.color, borderRadius:999, padding:"3px 8px" }}>
            {s.garantia_tipo.replace("_"," ")}
          </span>
        )}
        {s.fin_antiguedad && (
          <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:"#F8FAFC", color:"#475569", border:"1px solid #E2E8F0", borderRadius:999, padding:"3px 8px" }}>
            {s.fin_antiguedad.replace(/_/g," ")} años
          </span>
        )}
        {s.tasa_solicitada && (
          <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:"#FFF7ED", color:"#9A3412", border:"1px solid #FED7AA", borderRadius:999, padding:"3px 8px" }}>
            Máx {s.tasa_solicitada}%
          </span>
        )}
      </div>

      {/* Description */}
      {s.descripcion && (
        <div style={{ fontSize:12, color:"#64748B", lineHeight:1.6, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {s.descripcion}
        </div>
      )}

      {/* Footer */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:10, borderTop:"1px solid #F1F5F9" }}>
        <div style={{ fontSize:11, color:"#94A3B8" }}>{fmtDate(s.created_at)}</div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={onConectar} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:8, border:"1.5px solid #E2E8F0", background:"#F8FAFC", color:"#475569", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif", transition:"all .15s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="#F1F5F9";}}
            onMouseLeave={e=>{e.currentTarget.style.background="#F8FAFC";}}>
            <Ic d="M8 2a3 3 0 100 6M2 14c0-3 2.7-5 6-5s6 2 6 5" s={11} c="#64748B"/> Conectar
          </button>
          <button onClick={()=>onOfertar(s)} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:8, border:"none", background: yaOferto ? "#ECFDF5" : "linear-gradient(135deg,#0C1E4A,#1B3F8A)", color: yaOferto ? "#065F46" : "#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif", boxShadow: yaOferto ? "none" : "0 2px 10px rgba(27,63,138,.25)", transition:"all .15s" }}>
            {yaOferto
              ? <><Ic d="M2 8l4 4 8-8" s={11} c="#059669"/> Oferta enviada</>
              : <><Ic d="M8 2v12M2 8h12" s={11} c="#fff"/> Ofertar</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const router = useRouter();
  const [solicitudes,  setSolicitudes]  = useState<any[]>([]);
  const [misOfertas,   setMisOfertas]   = useState<string[]>([]); // solicitud_ids
  const [loading,      setLoading]      = useState(true);
  const [userId,       setUserId]       = useState<string|null>(null);
  const [showPaywall,  setShowPaywall]  = useState(false);
  const [ofertando,    setOfertando]    = useState<any>(null);
  const [filtros, setFiltros] = useState({ sector:"", garantia:"", monto_min:"", monto_max:"", plazo:"" });
  const [search, setSearch]  = useState("");

  useEffect(()=>{
    (async()=>{
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      setUserId(auth.user.id);

      const [{ data: sols }, { data: ofertas }] = await Promise.all([
        supabase.from("solicitudes")
          .select("id,tipo,monto,plazo_meses,tasa_solicitada,destino,descripcion,garantia_tipo,fin_sector,fin_facturacion_anual,fin_antiguedad,fin_num_empleados,created_at")
          .eq("tipo","subasta")
          .in("status",["enviada","en_revision"])
          .order("created_at", { ascending:false }),

        supabase.from("ofertas")
          .select("solicitud_id")
          .eq("otorgante_id", auth.user.id),
      ]);

      setSolicitudes(sols ?? []);
      setMisOfertas((ofertas ?? []).map((o:any)=>o.solicitud_id));
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(()=>{
    return solicitudes.filter(s=>{
      if (filtros.sector    && s.fin_sector !== filtros.sector) return false;
      if (filtros.garantia  && s.garantia_tipo !== filtros.garantia) return false;
      if (filtros.plazo     && s.plazo_meses?.toString() !== filtros.plazo) return false;
      if (filtros.monto_min && s.monto < parseFloat(filtros.monto_min)) return false;
      if (filtros.monto_max && s.monto > parseFloat(filtros.monto_max)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (s.destino||"").toLowerCase().includes(q) ||
               (s.fin_sector||"").toLowerCase().includes(q) ||
               (s.descripcion||"").toLowerCase().includes(q);
      }
      return true;
    });
  }, [solicitudes, filtros, search]);

  const totalMonto = filtered.reduce((s,x)=>s+(x.monto??0),0);
  const sinOfertas = filtered.filter(s=>!misOfertas.includes(s.id)).length;

  function upd(k: keyof typeof filtros, v: string) { setFiltros(f=>({...f,[k]:v})); }

  function handleSent() {
    if (ofertando) setMisOfertas(prev=>[...prev, ofertando.id]);
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
    .fsel{height:38px;border-radius:9px;border:1.5px solid #E2E8F0;background:#F8FAFC;padding:0 12px;font-size:12px;color:#374151;font-family:'Geist',sans-serif;outline:none;cursor:pointer;transition:border-color .15s;}
    .fsel:focus{border-color:#3B82F6;background:#fff;}
    .finp{height:38px;border-radius:9px;border:1.5px solid #E2E8F0;background:#F8FAFC;padding:0 12px;font-size:12px;color:#374151;font-family:'Geist',sans-serif;outline:none;transition:border-color .15s;width:100%;}
    .finp:focus{border-color:#3B82F6;background:#fff;}
    .spinner{animation:spin .7s linear infinite;}
    .tr{display:grid;align-items:center;padding:11px 16px;border-bottom:1px solid #F1F5F9;transition:background .12s;cursor:pointer;}
    .tr:last-child{border-bottom:none;}
    .tr:hover{background:#F8FAFF;}
  `;

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.04em", marginBottom:3 }}>Marketplace</div>
          <div style={{ fontSize:12, color:"#94A3B8" }}>Solicitudes en subasta abierta · Anónimas hasta conectar</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ padding:"6px 12px", background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:8, fontSize:11, fontWeight:700, fontFamily:"'Geist Mono',monospace", color:"#1E40AF" }}>
            {loading ? "—" : `${filtered.length} solicitudes`}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="fade d1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"En subasta",      val: loading?"—":filtered.length,         color:"#1E40AF", icon:"M2 2h12v8H2zM5 14h6M8 10v4" },
          { label:"Monto total",     val: loading?"—":fmt(totalMonto),          color:"#0F172A", icon:"M2 12L6 7l3 3 3-4 2 2" },
          { label:"Sin tu oferta",   val: loading?"—":sinOfertas,               color:"#059669", icon:"M8 2v12M2 8h12" },
          { label:"Tus ofertas",     val: loading?"—":misOfertas.length,        color:"#5B21B6", icon:"M2 8l4 4 8-8" },
        ].map(k=>(
          <div key={k.label} className="card" style={{ padding:"13px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".08em" }}>{k.label.toUpperCase()}</div>
              <div style={{ width:26, height:26, borderRadius:7, background:`${k.color}14`, display:"grid", placeItems:"center" }}>
                <Ic d={k.icon} s={12} c={k.color}/>
              </div>
            </div>
            <div style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.04em", color:k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card fade d2" style={{ padding:"14px 16px", marginBottom:16, display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ position:"relative", flex:"1 1 200px" }}>
          <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
            <Ic d="M10 10l4 4M2 7a5 5 0 1010 0A5 5 0 002 7z" s={13} c="#94A3B8"/>
          </div>
          <input className="finp" style={{ paddingLeft:30 }} placeholder="Buscar por destino, sector..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="fsel" value={filtros.sector} onChange={e=>upd("sector",e.target.value)}>
          <option value="">Todos los sectores</option>
          {["comercio","manufactura","servicios","construccion","tecnologia","agro","salud","transporte","educacion","otro"].map(s=>(
            <option key={s} value={s} style={{ textTransform:"capitalize" }}>{s}</option>
          ))}
        </select>
        <select className="fsel" value={filtros.garantia} onChange={e=>upd("garantia",e.target.value)}>
          <option value="">Toda garantía</option>
          <option value="hipotecaria">Hipotecaria</option>
          <option value="prendaria">Prendaria</option>
          <option value="aval">Aval</option>
          <option value="sin_garantia">Sin garantía</option>
        </select>
        <select className="fsel" value={filtros.plazo} onChange={e=>upd("plazo",e.target.value)}>
          <option value="">Cualquier plazo</option>
          {[3,6,9,12,18,24,36,48,60].map(m=><option key={m} value={m}>{m}m</option>)}
        </select>
        {(filtros.sector||filtros.garantia||filtros.plazo||search) && (
          <button onClick={()=>{setFiltros({sector:"",garantia:"",monto_min:"",monto_max:"",plazo:""});setSearch("");}}
            style={{ height:38, padding:"0 12px", borderRadius:9, border:"1px solid #FECDD3", background:"#FFF1F2", color:"#9F1239", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif", whiteSpace:"nowrap" }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding:60, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          <svg className="spinner" width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="#1E40AF" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
          <span style={{ fontSize:13, color:"#94A3B8" }}>Cargando marketplace...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding:"60px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:12, textAlign:"center" }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"#F1F5F9", display:"grid", placeItems:"center" }}>
            <Ic d="M2 2h12v8H2zM5 14h6M8 10v4" s={22} c="#CBD5E1"/>
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:"#475569" }}>Sin solicitudes en este momento</div>
          <div style={{ fontSize:12, color:"#94A3B8" }}>Vuelve pronto — nuevas solicitudes llegan diariamente</div>
        </div>
      ) : (
        <>
          {/* Cards grid */}
          <div className="fade d3" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14, marginBottom:20 }}>
            {filtered.slice(0,6).map(s=>(
              <SolicitudCard key={s.id} s={s} userId={userId??""} yaOferto={misOfertas.includes(s.id)}
                onOfertar={setOfertando} onConectar={()=>setShowPaywall(true)}/>
            ))}
          </div>

          {/* Table — all results */}
          {filtered.length > 0 && (
            <div className="card fade" style={{ overflow:"hidden" }}>
              <div style={{ padding:"13px 16px", borderBottom:"1px solid #E8EDF5", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, fontWeight:700 }}>Todas las solicitudes</div>
                <span className="mono" style={{ fontSize:11, color:"#94A3B8" }}>{filtered.length} resultados</span>
              </div>
              <div className="tr" style={{ gridTemplateColumns:"1fr 90px 70px 100px 90px 80px 120px", background:"#F8FAFC", cursor:"default" }}>
                {["Destino","Monto","Plazo","Sector","Garantía","Fact.",""].map(h=>(
                  <div key={h} className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".06em" }}>{h}</div>
                ))}
              </div>
              {filtered.map(s=>{
                const gColor = GARANTIA_COLOR[s.garantia_tipo] ?? GARANTIA_COLOR.sin_garantia;
                const yaOferto = misOfertas.includes(s.id);
                return (
                  <div key={s.id} className="tr" style={{ gridTemplateColumns:"1fr 90px 70px 100px 90px 80px 120px" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.destino||"—"}</div>
                      <div className="mono" style={{ fontSize:10, color:"#94A3B8" }}>{fmtDate(s.created_at)}</div>
                    </div>
                    <div className="mono" style={{ fontSize:12, fontWeight:700 }}>{fmt(s.monto)}</div>
                    <div style={{ fontSize:12, color:"#64748B" }}>{s.plazo_meses}m</div>
                    <div style={{ fontSize:11, color:"#475569", textTransform:"capitalize" }}>{s.fin_sector||"—"}</div>
                    <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:gColor.bg, color:gColor.color, borderRadius:999, padding:"2px 7px" }}>
                      {(s.garantia_tipo||"—").replace("_"," ")}
                    </span>
                    <div style={{ fontSize:11, color:"#64748B" }}>{FACTURACION_LABEL[s.fin_facturacion_anual]||"—"}</div>
                    <div style={{ display:"flex", gap:5 }}>
                      <button onClick={()=>setShowPaywall(true)} style={{ height:28, padding:"0 8px", borderRadius:7, border:"1px solid #E2E8F0", background:"#F8FAFC", color:"#475569", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>
                        Conectar
                      </button>
                      <button onClick={()=>setOfertando(s)} style={{ height:28, padding:"0 10px", borderRadius:7, border:"none", background: yaOferto?"#ECFDF5":"linear-gradient(135deg,#0C1E4A,#1B3F8A)", color: yaOferto?"#065F46":"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>
                        {yaOferto?"✓ Oferta":"Ofertar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showPaywall && <PaywallModal onClose={()=>setShowPaywall(false)}/>}
      {ofertando   && userId && (
        <OfertaModal solicitud={ofertando} userId={userId}
          onClose={()=>setOfertando(null)} onSent={handleSent}/>
      )}
    </div>
  );
}
