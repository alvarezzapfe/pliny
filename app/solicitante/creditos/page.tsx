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

function fmtFull(n: number) {
  if (!n && n !== 0) return "—";
  return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day:"numeric", month:"short", year:"numeric" });
}

function fmtDateShort(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { day:"numeric", month:"short" });
}

const ESTATUS_META: Record<string, { label:string; bg:string; color:string; border:string; dot:string }> = {
  activo:     { label:"Activo",     bg:"#ECFDF5", color:"#065F46", border:"#A7F3D0", dot:"#10B981" },
  vencido:    { label:"Vencido",    bg:"#FFF1F2", color:"#9F1239", border:"#FECDD3", dot:"#F43F5E" },
  liquidado:  { label:"Liquidado",  bg:"#F0FDF4", color:"#166534", border:"#BBF7D0", dot:"#22C55E" },
  castigado:  { label:"Castigado",  bg:"#FFF7ED", color:"#9A3412", border:"#FED7AA", dot:"#F97316" },
  reestructurado: { label:"Reestructurado", bg:"#EFF6FF", color:"#1E40AF", border:"#BFDBFE", dot:"#3B82F6" },
};

const PAGO_META: Record<string, { label:string; color:string; bg:string }> = {
  pagado:    { label:"Pagado",    color:"#065F46", bg:"#ECFDF5" },
  pendiente: { label:"Pendiente", color:"#92400E", bg:"#FFFBEB" },
  vencido:   { label:"Vencido",   color:"#9F1239", bg:"#FFF1F2" },
  parcial:   { label:"Parcial",   color:"#1E40AF", bg:"#EFF6FF" },
};

function EstatusPill({ estatus }: { estatus: string }) {
  const m = ESTATUS_META[estatus] ?? ESTATUS_META.activo;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, borderRadius:999, padding:"3px 9px", fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:m.bg, color:m.color, border:`1px solid ${m.border}` }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.dot, display:"inline-block" }}/>
      {m.label}
    </span>
  );
}

function DPDBadge({ dpd }: { dpd: number }) {
  if (!dpd || dpd === 0) return <span style={{ fontSize:11, color:"#10B981", fontWeight:700, fontFamily:"'Geist Mono',monospace" }}>Al corriente</span>;
  const color = dpd > 90 ? "#9F1239" : dpd > 30 ? "#92400E" : "#B45309";
  return <span style={{ fontSize:11, color, fontWeight:700, fontFamily:"'Geist Mono',monospace" }}>{dpd} días</span>;
}

function ProgressBar({ current, total, color="#059669" }: { current:number; total:number; color?:string }) {
  const pct = total > 0 ? Math.min(Math.round(((total-current)/total)*100), 100) : 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:5, background:"#F1F5F9", borderRadius:999, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:999, transition:"width .6s" }}/>
      </div>
      <span style={{ fontSize:10, fontWeight:700, color, fontFamily:"'Geist Mono',monospace", minWidth:28 }}>{pct}%</span>
    </div>
  );
}

// ── Credit Detail Modal ────────────────────────────────────────────────────
function CreditDetail({ credit, onClose }: { credit: any; onClose: ()=>void }) {
  const [pagos, setPagos]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const m = ESTATUS_META[credit.estatus] ?? ESTATUS_META.activo;

  useEffect(()=>{
    (async()=>{
      const { data } = await supabase
        .from("pagos")
        .select("*")
        .eq("credit_id", credit.id)
        .order("numero_pago", { ascending: true });
      setPagos(data ?? []);
      setLoading(false);
    })();
  }, [credit.id]);

  const pagados  = pagos.filter(p=>p.status==="pagado").length;
  const proxPago = pagos.find(p=>p.status==="pendiente" || p.status==="vencido");

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(15,23,42,.45)", backdropFilter:"blur(4px)" }}/>

      {/* Modal */}
      <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:740, maxHeight:"85vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(15,23,42,.18)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #E8EDF5", display:"flex", justifyContent:"space-between", alignItems:"flex-start", background:"linear-gradient(135deg,#F0FDF9,#fff)", flexShrink:0 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ fontSize:11, fontWeight:700, fontFamily:"'Geist Mono',monospace", color:"#94A3B8", letterSpacing:".08em" }}>FOLIO</span>
              <span style={{ fontSize:13, fontWeight:800, fontFamily:"'Geist Mono',monospace", color:"#059669" }}>{credit.folio || "—"}</span>
              <EstatusPill estatus={credit.estatus}/>
            </div>
            <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.03em", color:"#0F172A" }}>{credit.deudor || "—"}</div>
            <div style={{ fontSize:12, color:"#94A3B8", marginTop:2 }}>{credit.tipo_credito} · {credit.amortiza}</div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:"1px solid #E2E8F0", background:"#F8FAFC", cursor:"pointer", display:"grid", placeItems:"center", flexShrink:0 }}>
            <Ic d="M3 3l10 10M13 3L3 13" s={13} c="#64748B"/>
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
            {[
              { label:"Monto original",   val:fmtFull(credit.monto_original), color:"#0F172A" },
              { label:"Saldo actual",      val:fmtFull(credit.saldo_actual),   color: credit.saldo_actual > 0 ? "#0F172A" : "#059669" },
              { label:"Tasa anual",        val:`${credit.tasa_anual ?? "—"}%`, color:"#0F172A" },
              { label:"Plazo",             val:`${credit.plazo_meses ?? "—"}m`,color:"#0F172A" },
            ].map(k=>(
              <div key={k.label} style={{ padding:"12px 14px", background:"#F8FAFC", borderRadius:12, border:"1px solid #E8EDF5" }}>
                <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", letterSpacing:".06em", marginBottom:4 }}>{k.label.toUpperCase()}</div>
                <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.03em", color:k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Progress + dates */}
          <div style={{ padding:"14px 16px", background:"#F8FAFC", borderRadius:12, border:"1px solid #E8EDF5", marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", letterSpacing:".06em", marginBottom:2 }}>AVANCE DE PAGO</div>
                <div style={{ fontSize:12, color:"#64748B" }}>{pagados} de {pagos.length} pagos realizados</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", letterSpacing:".06em", marginBottom:2 }}>DPD</div>
                <DPDBadge dpd={credit.dpd}/>
              </div>
            </div>
            <ProgressBar current={credit.saldo_actual} total={credit.monto_original}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:14 }}>
              {[
                { label:"Inicio",       val:fmtDate(credit.fecha_inicio) },
                { label:"Vencimiento",  val:fmtDate(credit.fecha_vencimiento) },
                { label:"Último pago",  val:fmtDate(credit.ultimo_pago) },
              ].map(d=>(
                <div key={d.label}>
                  <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", letterSpacing:".06em", marginBottom:2 }}>{d.label.toUpperCase()}</div>
                  <div style={{ fontSize:12, fontWeight:600 }}>{d.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Próximo pago */}
          {proxPago && (
            <div style={{ marginBottom:20, padding:"14px 16px", background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"#92400E", marginBottom:2 }}>Próximo pago — pago #{proxPago.numero_pago}</div>
                <div style={{ fontSize:12, color:"#B45309" }}>Vence {fmtDate(proxPago.fecha_vencimiento)}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:18, fontWeight:800, color:"#92400E", letterSpacing:"-0.03em" }}>{fmtFull(proxPago.monto_total)}</div>
                <div style={{ fontSize:11, color:"#B45309" }}>Capital {fmtFull(proxPago.capital)} + Int. {fmtFull(proxPago.interes)}</div>
              </div>
            </div>
          )}

          {/* Tabla de amortización */}
          <div>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Tabla de amortización</div>
            {loading ? (
              <div style={{ padding:24, textAlign:"center", color:"#94A3B8", fontSize:13 }}>Cargando pagos...</div>
            ) : pagos.length === 0 ? (
              <div style={{ padding:24, textAlign:"center", color:"#94A3B8", fontSize:13 }}>Sin pagos registrados aún</div>
            ) : (
              <div style={{ border:"1px solid #E8EDF5", borderRadius:12, overflow:"hidden" }}>
                <div style={{ display:"grid", gridTemplateColumns:"40px 90px 1fr 1fr 1fr 1fr 90px", padding:"9px 14px", background:"#F8FAFC", borderBottom:"1px solid #E8EDF5" }}>
                  {["#","Vence","Capital","Interés","IVA Int.","Total","Estado"].map(h=>(
                    <div key={h} style={{ fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", color:"#94A3B8", letterSpacing:".06em" }}>{h}</div>
                  ))}
                </div>
                <div style={{ maxHeight:260, overflowY:"auto" }}>
                  {pagos.map((p,i)=>{
                    const pm = PAGO_META[p.status] ?? PAGO_META.pendiente;
                    const isPagado = p.status === "pagado";
                    return (
                      <div key={p.id} style={{ display:"grid", gridTemplateColumns:"40px 90px 1fr 1fr 1fr 1fr 90px", padding:"9px 14px", borderBottom: i<pagos.length-1?"1px solid #F1F5F9":"none", background: isPagado?"#F9FFFB":"#fff", opacity: isPagado ? 0.7 : 1 }}>
                        <div style={{ fontSize:12, fontFamily:"'Geist Mono',monospace", color:"#94A3B8" }}>{p.numero_pago}</div>
                        <div style={{ fontSize:12, color:"#64748B" }}>{fmtDateShort(p.fecha_vencimiento)}</div>
                        <div style={{ fontSize:12, fontFamily:"'Geist Mono',monospace" }}>{fmtFull(p.capital)}</div>
                        <div style={{ fontSize:12, fontFamily:"'Geist Mono',monospace" }}>{fmtFull(p.interes)}</div>
                        <div style={{ fontSize:12, fontFamily:"'Geist Mono',monospace", color:"#94A3B8" }}>{fmtFull(p.iva_interes)}</div>
                        <div style={{ fontSize:12, fontWeight:700, fontFamily:"'Geist Mono',monospace" }}>{fmtFull(p.monto_total)}</div>
                        <span style={{ fontSize:10, fontWeight:700, fontFamily:"'Geist Mono',monospace", background:pm.bg, color:pm.color, borderRadius:999, padding:"2px 8px", display:"inline-flex", alignItems:"center" }}>{pm.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Garantía / notas */}
          {(credit.garantia || credit.notas) && (
            <div style={{ marginTop:16, display:"grid", gridTemplateColumns: credit.garantia && credit.notas ? "1fr 1fr" : "1fr", gap:10 }}>
              {credit.garantia && (
                <div style={{ padding:"12px 14px", background:"#F8FAFC", borderRadius:10, border:"1px solid #E8EDF5" }}>
                  <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", letterSpacing:".06em", marginBottom:4 }}>GARANTÍA</div>
                  <div style={{ fontSize:12, fontWeight:500 }}>{credit.garantia}</div>
                </div>
              )}
              {credit.notas && (
                <div style={{ padding:"12px 14px", background:"#F8FAFC", borderRadius:10, border:"1px solid #E8EDF5" }}>
                  <div style={{ fontSize:10, color:"#94A3B8", fontFamily:"'Geist Mono',monospace", letterSpacing:".06em", marginBottom:4 }}>NOTAS</div>
                  <div style={{ fontSize:12, fontWeight:500 }}>{credit.notas}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CreditosPage() {
  const router = useRouter();
  const [credits,  setCredits]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(()=>{
    (async()=>{
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("credits")
        .select("*")
        .eq("client_id", auth.user.id)
        .order("created_at", { ascending: false });

      setCredits(data ?? []);
      setLoading(false);
    })();
  }, [router]);

  const activos    = credits.filter(c=>c.estatus==="activo");
  const totalSaldo = activos.reduce((s,c)=>s+(c.saldo_actual??0), 0);
  const totalOrig  = activos.reduce((s,c)=>s+(c.monto_original??0), 0);
  const vencidos   = credits.filter(c=>c.estatus==="vencido").length;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .fade{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both;}
    .d1{animation-delay:.05s;}.d2{animation-delay:.10s;}.d3{animation-delay:.15s;}
    .mono{font-family:'Geist Mono',monospace;}
    .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;}
    .crow{display:grid;align-items:center;padding:14px 18px;border-bottom:1px solid #F1F5F9;transition:background .12s;cursor:pointer;}
    .crow:last-child{border-bottom:none;}
    .crow:hover{background:#F7FDF9;}
    .spinner{animation:spin .7s linear infinite;}
  `;

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:900, letterSpacing:"-0.04em", marginBottom:3 }}>Mis créditos</div>
          <div style={{ fontSize:12, color:"#94A3B8" }}>Créditos activos y su estado de pago</div>
        </div>
        {vencidos > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px", background:"#FFF1F2", border:"1px solid #FECDD3", borderRadius:10 }}>
            <Ic d="M8 2a6 6 0 100 12M8 5v3M8 10h.01" s={14} c="#F43F5E"/>
            <span style={{ fontSize:12, fontWeight:700, color:"#9F1239" }}>{vencidos} crédito{vencidos>1?"s":""} vencido{vencidos>1?"s":""}</span>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="fade d1" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"Créditos activos",  val: activos.length,         sub:"En vigor",          color:"#059669", icon:"M2 12L6 7l3 3 3-4 2 2" },
          { label:"Saldo total",        val: fmt(totalSaldo),        sub:"Por pagar",         color:"#0F172A", icon:"M2 4h12v8H2zM5 8h6" },
          { label:"Monto original",     val: fmt(totalOrig),         sub:"Total otorgado",    color:"#64748B", icon:"M8 2v12M2 8h12" },
          { label:"Vencidos",           val: vencidos,               sub:"Con atraso",        color: vencidos>0?"#F43F5E":"#10B981", icon:"M8 2a6 6 0 100 12M8 5v3M8 10h.01" },
        ].map(k=>(
          <div key={k.label} className="card" style={{ padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".08em" }}>{k.label.toUpperCase()}</div>
              <div style={{ width:28, height:28, borderRadius:8, background:`${k.color}18`, display:"grid", placeItems:"center" }}>
                <Ic d={k.icon} s={13} c={k.color}/>
              </div>
            </div>
            {loading
              ? <div style={{ height:28, width:60, borderRadius:6, background:"#F1F5F9" }}/>
              : <div style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.04em", color:k.color }}>{k.val}</div>
            }
            <div style={{ fontSize:11, color:"#94A3B8", marginTop:4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Créditos activos — progress view */}
      {!loading && activos.length > 0 && (
        <div className="card fade d2" style={{ padding:"16px 18px", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Avance de pago</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {activos.map(c=>(
              <div key={c.id} onClick={()=>setSelected(c)} style={{ cursor:"pointer", padding:"12px 14px", background:"#F8FAFC", borderRadius:12, border:"1px solid #E8EDF5", transition:"all .15s" }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor="#A7F3D0")}
                onMouseLeave={e=>(e.currentTarget.style.borderColor="#E8EDF5")}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700 }}>{c.deudor || c.folio || "—"}</div>
                    <div style={{ fontSize:11, color:"#94A3B8", marginTop:1 }}>{c.tipo_credito} · {c.plazo_meses}m · {c.tasa_anual}% anual</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:14, fontWeight:800, letterSpacing:"-0.02em" }}>{fmt(c.saldo_actual)}</div>
                    <div style={{ fontSize:11, color:"#94A3B8" }}>de {fmt(c.monto_original)}</div>
                  </div>
                </div>
                <ProgressBar current={c.saldo_actual} total={c.monto_original}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="card fade d3" style={{ overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #E8EDF5", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:13, fontWeight:700 }}>Todos los créditos</div>
          <span className="mono" style={{ fontSize:11, color:"#94A3B8" }}>{credits.length} registro{credits.length!==1?"s":""}</span>
        </div>

        {loading ? (
          <div style={{ padding:48, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            <svg className="spinner" width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
            <span style={{ fontSize:13, color:"#94A3B8" }}>Cargando...</span>
          </div>
        ) : credits.length === 0 ? (
          <div style={{ padding:"52px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:12, textAlign:"center" }}>
            <div style={{ width:52, height:52, borderRadius:14, background:"#F1F5F9", display:"grid", placeItems:"center" }}>
              <Ic d="M2 12L6 7l3 3 3-4 2 2" s={22} c="#CBD5E1"/>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:"#475569" }}>Sin créditos aún</div>
            <div style={{ fontSize:12, color:"#94A3B8", maxWidth:"30ch" }}>
              Cuando un otorgante apruebe tu solicitud, tu crédito aparecerá aquí.
            </div>
          </div>
        ) : (
          <>
            <div className="crow" style={{ gridTemplateColumns:"1fr 110px 80px 70px 100px 80px 36px", background:"#FAFBFF", cursor:"default" }}>
              {["Deudor / Folio","Monto","Saldo","Plazo","Estado","DPD",""].map(h=>(
                <div key={h} className="mono" style={{ fontSize:10, color:"#94A3B8", letterSpacing:".06em" }}>{h}</div>
              ))}
            </div>
            {credits.map(c=>(
              <div key={c.id} className="crow" style={{ gridTemplateColumns:"1fr 110px 80px 70px 100px 80px 36px" }} onClick={()=>setSelected(c)}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.deudor || "—"}</div>
                  <div className="mono" style={{ fontSize:10, color:"#94A3B8" }}>{c.folio || c.id?.slice(0,8)}</div>
                </div>
                <div className="mono" style={{ fontSize:12 }}>{fmt(c.monto_original)}</div>
                <div className="mono" style={{ fontSize:12, color: c.saldo_actual===0?"#10B981":"#0F172A" }}>{fmt(c.saldo_actual)}</div>
                <div style={{ fontSize:12, color:"#64748B" }}>{c.plazo_meses ? `${c.plazo_meses}m` : "—"}</div>
                <EstatusPill estatus={c.estatus}/>
                <DPDBadge dpd={c.dpd}/>
                <div style={{ display:"grid", placeItems:"center" }}>
                  <Ic d="M5 8h6M9 5l3 3-3 3" s={14} c="#CBD5E1"/>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Detail modal */}
      {selected && <CreditDetail credit={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
