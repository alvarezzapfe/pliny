"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s=16, c="currentColor" }: { d:string; s?:number; c?:string }) {
  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-MX")}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-MX", { day:"numeric", month:"short", year:"numeric" });
}

const STATUS_META: Record<string,{label:string;bg:string;color:string;border:string;dot:string}> = {
  pendiente: { label:"Pendiente", bg:"#FFFBEB", color:"#92400E", border:"#FDE68A",  dot:"#F59E0B" },
  aprobada:  { label:"Aprobada",  bg:"#ECFDF5", color:"#065F46", border:"#A7F3D0",  dot:"#10B981" },
  rechazada: { label:"Rechazada", bg:"#FFF1F2", color:"#9F1239", border:"#FECDD3",  dot:"#F43F5E" },
};

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.pendiente;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, borderRadius:999, padding:"3px 9px", fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.dot }}/>
      {m.label}
    </span>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────────────────
function ConfirmModal({ oferta, action, onConfirm, onClose }: {
  oferta: any; action: "aprobada"|"rechazada"; onConfirm: ()=>void; onClose: ()=>void;
}) {
  const isAccept = action === "aprobada";
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.5)", backdropFilter:"blur(5px)" }}/>
      <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:420, boxShadow:"0 24px 64px rgba(15,23,42,.2)", overflow:"hidden" }}>
        {/* Top accent */}
        <div style={{ height:4, background: isAccept ? "linear-gradient(90deg,#059669,#10B981)" : "linear-gradient(90deg,#F43F5E,#FDA4AF)" }}/>
        <div style={{ padding:"24px 28px" }}>
          <div style={{ width:48, height:48, borderRadius:14, background: isAccept?"#ECFDF5":"#FFF1F2", display:"grid", placeItems:"center", marginBottom:16 }}>
            {isAccept
              ? <Ic d="M2 8l4 4 8-8" s={22} c="#059669"/>
              : <Ic d="M3 3l10 10M13 3L3 13" s={22} c="#F43F5E"/>
            }
          </div>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.03em", color:"#0F172A", marginBottom:6 }}>
            {isAccept ? "¿Aceptar esta oferta?" : "¿Rechazar esta oferta?"}
          </div>
          <div style={{ fontSize:13, color:"#64748B", lineHeight:1.6, marginBottom:20 }}>
            {isAccept
              ? "Al aceptar, el otorgante recibirá una notificación para continuar el proceso. Las demás ofertas de esta solicitud quedarán como no seleccionadas."
              : "La oferta quedará marcada como rechazada. El otorgante será notificado."
            }
          </div>

          {/* Oferta summary */}
          <div style={{ padding:"12px 14px", background:"#F8FAFC", borderRadius:10, border:"1px solid #E8EDF5", marginBottom:20, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[
              { label:"Monto",  val: fmt(oferta.monto_ofertado) },
              { label:"Tasa",   val: `${oferta.tasa_anual}% anual` },
              { label:"Plazo",  val: `${oferta.plazo_meses} meses` },
            ].map(k=>(
              <div key={k.label}>
                <div style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"#94A3B8", letterSpacing:".06em", marginBottom:2 }}>{k.label.toUpperCase()}</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onClose} style={{ flex:1, height:44, borderRadius:10, border:"1.5px solid #E2E8F0", background:"#F8FAFC", color:"#64748B", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif" }}>
              Cancelar
            </button>
            <button onClick={onConfirm} style={{ flex:2, height:44, borderRadius:10, border:"none", background: isAccept ? "linear-gradient(135deg,#059669,#10B981)" : "linear-gradient(135deg,#F43F5E,#FDA4AF)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif", boxShadow: isAccept ? "0 4px 14px rgba(5,150,105,.3)" : "0 4px 14px rgba(244,63,94,.3)" }}>
              {isAccept ? "Sí, aceptar oferta" : "Sí, rechazar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Oferta Card ───────────────────────────────────────────────────────────
function OfertaCard({ oferta, solicitud, onAction }: {
  oferta: any; solicitud: any; onAction: (o:any, a:"aprobada"|"rechazada")=>void;
}) {
  const isPending = oferta.status === "pendiente";
  const costo_total = oferta.monto_ofertado * (oferta.tasa_anual/100) * (oferta.plazo_meses/12);
  const pago_mensual = oferta.monto_ofertado * (oferta.tasa_anual/100/12) /
    (1 - Math.pow(1 + oferta.tasa_anual/100/12, -oferta.plazo_meses));

  return (
    <div style={{ background:"#fff", border:"1px solid #E8EDF5", borderRadius:16, overflow:"hidden", transition:"box-shadow .2s",
      boxShadow: oferta.status==="aprobada" ? "0 0 0 2px #A7F3D0" : oferta.status==="rechazada" ? "0 0 0 1px #FECDD3" : "none" }}>

      {/* Top bar */}
      <div style={{ height:3, background: oferta.status==="aprobada" ? "linear-gradient(90deg,#059669,#10B981)" : oferta.status==="rechazada" ? "#FECDD3" : "linear-gradient(90deg,#3B82F6,#6366F1)" }}/>

      <div style={{ padding:"18px 20px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, fontFamily:"'Geist Mono',monospace", color:"#94A3B8", letterSpacing:".06em", marginBottom:4 }}>OFERTA RECIBIDA</div>
            <div style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.04em", color:"#0F172A" }}>{fmt(oferta.monto_ofertado)}</div>
            <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{solicitud?.destino || "—"}</div>
          </div>
          <StatusPill status={oferta.status}/>
        </div>

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
          {[
            { label:"Tasa anual",      val:`${oferta.tasa_anual}%`,        highlight: true },
            { label:"Plazo",           val:`${oferta.plazo_meses} meses`,   highlight: false },
            { label:"Comisión",        val: oferta.comisiones ? `${oferta.comisiones}%` : "Sin comisión", highlight: false },
          ].map(k=>(
            <div key={k.label} style={{ padding:"10px 12px", background: k.highlight ? "#F0FDF9" : "#F8FAFC", borderRadius:10, border:`1px solid ${k.highlight?"#A7F3D0":"#E8EDF5"}` }}>
              <div style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"#94A3B8", letterSpacing:".06em", marginBottom:3 }}>{k.label.toUpperCase()}</div>
              <div style={{ fontSize:15, fontWeight:800, letterSpacing:"-0.03em", color: k.highlight?"#059669":"#0F172A" }}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Costo estimado */}
        <div style={{ padding:"11px 14px", background:"#F8FAFC", border:"1px solid #E8EDF5", borderRadius:10, marginBottom:14, display:"flex", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"#94A3B8", letterSpacing:".06em", marginBottom:2 }}>PAGO MENSUAL EST.</div>
            <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.03em", color:"#0F172A" }}>{isNaN(pago_mensual) ? "—" : fmt(pago_mensual)}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"#94A3B8", letterSpacing:".06em", marginBottom:2 }}>COSTO TOTAL INT.</div>
            <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.03em", color:"#64748B" }}>{fmt(costo_total)}</div>
          </div>
        </div>

        {/* Condiciones */}
        {oferta.condiciones && (
          <div style={{ padding:"10px 12px", background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, marginBottom:14 }}>
            <div style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"#92400E", letterSpacing:".06em", marginBottom:3 }}>CONDICIONES</div>
            <div style={{ fontSize:12, color:"#78350F", lineHeight:1.6 }}>{oferta.condiciones}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:12, borderTop:"1px solid #F1F5F9" }}>
          <div style={{ fontSize:11, color:"#94A3B8", fontFamily:"'Geist Mono',monospace" }}>{fmtDate(oferta.created_at)}</div>
          {isPending && (
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>onAction(oferta,"rechazada")} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"7px 12px", borderRadius:8, border:"1.5px solid #FECDD3", background:"#FFF1F2", color:"#9F1239", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'Geist',sans-serif", transition:"all .15s" }}>
                <Ic d="M3 3l10 10M13 3L3 13" s={11} c="#F43F5E"/> Rechazar
              </button>
              <button onClick={()=>onAction(oferta,"aprobada")} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#059669,#10B981)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Geist',sans-serif", boxShadow:"0 2px 10px rgba(5,150,105,.3)", transition:"all .15s" }}>
                <Ic d="M2 8l4 4 8-8" s={11} c="#fff"/> Aceptar oferta
              </button>
            </div>
          )}
          {oferta.status === "aprobada" && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700, color:"#059669" }}>
              <Ic d="M2 8l4 4 8-8" s={13} c="#059669"/> Oferta aceptada
            </div>
          )}
          {oferta.status === "rechazada" && (
            <div style={{ fontSize:12, color:"#94A3B8" }}>Oferta rechazada</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function OfertasPage() {
  const router = useRouter();
  const [ofertas,     setOfertas]     = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<Record<string,any>>({});
  const [loading,     setLoading]     = useState(true);
  const [confirming,  setConfirming]  = useState<{oferta:any; action:"aprobada"|"rechazada"}|null>(null);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState<{msg:string; ok:boolean}|null>(null);

  useEffect(()=>{
    (async()=>{
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }

      // Get solicitante's solicitudes IDs
      const { data: sols } = await supabase
        .from("solicitudes")
        .select("id, destino, monto, plazo_meses, status")
        .eq("borrower_id", auth.user.id);

      const solsMap: Record<string,any> = {};
      (sols ?? []).forEach(s => { solsMap[s.id] = s; });
      setSolicitudes(solsMap);

      // Get all ofertas for those solicitudes
      const solIds = (sols ?? []).map(s => s.id);
      if (solIds.length === 0) { setLoading(false); return; }

      const { data: ofs } = await supabase
        .from("ofertas")
        .select("*")
        .in("solicitud_id", solIds)
        .order("created_at", { ascending: false });

      setOfertas(ofs ?? []);
      setLoading(false);
    })();
  }, [router]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(()=>setToast(null), 3000);
  }

  async function handleAction() {
    if (!confirming || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("ofertas")
      .update({ status: confirming.action, updated_at: new Date().toISOString() })
      .eq("id", confirming.oferta.id);

    if (!error) {
      // Si aceptada, marcar otras ofertas de la misma solicitud como no_seleccionada
      if (confirming.action === "aprobada") {
        await supabase
          .from("ofertas")
          .update({ status:"rechazada" })
          .eq("solicitud_id", confirming.oferta.solicitud_id)
          .neq("id", confirming.oferta.id)
          .eq("status","pendiente");

        // Actualizar status de la solicitud a ofertada/aprobada
        await supabase
          .from("solicitudes")
          .update({ status:"aprobada" })
          .eq("id", confirming.oferta.solicitud_id);
      }

      // Update local state
      setOfertas(prev => prev.map(o => {
        if (o.id === confirming.oferta.id) return { ...o, status: confirming.action };
        if (confirming.action === "aprobada" && o.solicitud_id === confirming.oferta.solicitud_id && o.status === "pendiente")
          return { ...o, status: "rechazada" };
        return o;
      }));

      showToast(confirming.action === "aprobada" ? "¡Oferta aceptada! El otorgante fue notificado." : "Oferta rechazada.", confirming.action === "aprobada");
    } else {
      showToast("Error al actualizar. Intenta de nuevo.", false);
    }

    setSaving(false);
    setConfirming(null);
  }

  // Group by solicitud
  const grouped = Object.entries(
    ofertas.reduce((acc, o) => {
      if (!acc[o.solicitud_id]) acc[o.solicitud_id] = [];
      acc[o.solicitud_id].push(o);
      return acc;
    }, {} as Record<string, any[]>)
  );

  const pendientes = ofertas.filter(o=>o.status==="pendiente").length;
  const aprobadas  = ofertas.filter(o=>o.status==="aprobada").length;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes slideIn{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
    .fade{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both;}
    .d1{animation-delay:.05s;}.d2{animation-delay:.10s;}.d3{animation-delay:.15s;}
    .mono{font-family:'Geist Mono',monospace;}
    .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;}
    .spinner{animation:spin .7s linear infinite;}
    .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:300;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;font-family:'Geist',sans-serif;display:flex;align-items:center;gap:8px;box-shadow:0 8px 32px rgba(15,23,42,.18);animation:slideIn .3s cubic-bezier(.16,1,.3,1);}
  `;

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
      <style>{CSS}</style>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{ background: toast.ok?"#ECFDF5":"#FFF1F2", color: toast.ok?"#065F46":"#9F1239", border:`1px solid ${toast.ok?"#A7F3D0":"#FECDD3"}` }}>
          <Ic d={toast.ok?"M2 8l4 4 8-8":"M8 2a6 6 0 100 12M8 5v3M8 10h.01"} s={14} c={toast.ok?"#059669":"#F43F5E"}/>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.04em", marginBottom:3 }}>Mis ofertas</div>
          <div style={{ fontSize:12, color:"#94A3B8" }}>Propuestas de financiamiento recibidas de otorgantes</div>
        </div>
        {pendientes > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px", background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10 }}>
            <Ic d="M8 2a6 6 0 100 12M8 5v3M8 10h.01" s={14} c="#F59E0B"/>
            <span style={{ fontSize:12, fontWeight:700, color:"#92400E" }}>{pendientes} oferta{pendientes>1?"s":""} pendiente{pendientes>1?"s":""}</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="fade d1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"Total ofertas",  val: ofertas.length,  color:"#0F172A", icon:"M2 2h12v8H2zM5 14h6M8 10v4" },
          { label:"Pendientes",     val: pendientes,      color:"#F59E0B", icon:"M8 2a6 6 0 100 12M8 5v3M8 10h.01" },
          { label:"Aceptadas",      val: aprobadas,       color:"#059669", icon:"M2 8l4 4 8-8" },
          { label:"Rechazadas",     val: ofertas.filter(o=>o.status==="rechazada").length, color:"#94A3B8", icon:"M3 3l10 10M13 3L3 13" },
        ].map(k=>(
          <div key={k.label} className="card" style={{ padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".08em" }}>{k.label.toUpperCase()}</div>
              <div style={{ width:28, height:28, borderRadius:8, background:`${k.color}14`, display:"grid", placeItems:"center" }}>
                <Ic d={k.icon} s={13} c={k.color}/>
              </div>
            </div>
            {loading
              ? <div style={{ height:28, width:40, borderRadius:6, background:"#F1F5F9" }}/>
              : <div style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.04em", color:k.color }}>{k.val}</div>
            }
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding:60, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          <svg className="spinner" width={20} height={20} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
          <span style={{ fontSize:13, color:"#94A3B8" }}>Cargando ofertas...</span>
        </div>
      ) : ofertas.length === 0 ? (
        <div className="card fade" style={{ padding:"64px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:14, textAlign:"center" }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"#F1F5F9", display:"grid", placeItems:"center" }}>
            <Ic d="M2 2h12v8H2zM5 14h6M8 10v4" s={24} c="#CBD5E1"/>
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:"#475569" }}>Sin ofertas aún</div>
          <div style={{ fontSize:13, color:"#94A3B8", maxWidth:"32ch", lineHeight:1.6 }}>
            Cuando un otorgante envíe una propuesta para tus solicitudes, aparecerá aquí.
          </div>
          <a href="/solicitante/solicitudes" style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:4, padding:"9px 18px", borderRadius:10, background:"linear-gradient(135deg,#064E3B,#059669)", color:"#fff", fontSize:13, fontWeight:600, textDecoration:"none" }}>
            Ver mis solicitudes →
          </a>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:32 }}>
          {grouped.map(([solId, ofs])=>{
            const sol = solicitudes[solId];
            return (
              <div key={solId} className="fade d2">
                {/* Solicitud header */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ height:1, flex:1, background:"#E8EDF5" }}/>
                  <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 12px", background:"#F8FAFC", border:"1px solid #E8EDF5", borderRadius:999 }}>
                    <Ic d="M4 2h8v12H4zM6 6h4M6 9h4" s={11} c="#64748B"/>
                    <span style={{ fontSize:11, fontWeight:700, color:"#475569" }}>{sol?.destino || "Solicitud"}</span>
                    <span className="mono" style={{ fontSize:10, color:"#94A3B8" }}>{sol?.monto ? `$${Number(sol.monto).toLocaleString("es-MX")}` : ""}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:"#059669", fontFamily:"'Geist Mono',monospace", background:"#ECFDF5", padding:"1px 6px", borderRadius:999 }}>
                      {(ofs as any[]).length} oferta{(ofs as any[]).length>1?"s":""}
                    </span>
                  </div>
                  <div style={{ height:1, flex:1, background:"#E8EDF5" }}/>
                </div>

                {/* Ofertas grid */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14 }}>
                  {(ofs as any[]).map(o=>(
                    <OfertaCard key={o.id} oferta={o} solicitud={sol}
                      onAction={(oferta, action)=>setConfirming({ oferta, action })}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm modal */}
      {confirming && (
        <ConfirmModal
          oferta={confirming.oferta}
          action={confirming.action}
          onConfirm={handleAction}
          onClose={()=>setConfirming(null)}
        />
      )}
    </div>
  );
}
