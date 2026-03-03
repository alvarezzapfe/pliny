"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s = 14, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-MX")}`;
}

const STATUS_PILL: Record<string, { label: string; bg: string; color: string; border: string }> = {
  borrador:    { label:"Borrador",    bg:"#F8FAFC", color:"#475569", border:"#E8EDF5" },
  enviada:     { label:"Enviada",     bg:"#EFF6FF", color:"#1E40AF", border:"#BFDBFE" },
  en_revision: { label:"En revisión", bg:"#FFFBEB", color:"#92400E", border:"#FDE68A" },
  ofertada:    { label:"Ofertada",    bg:"#F5F3FF", color:"#5B21B6", border:"#DDD6FE" },
  aprobada:    { label:"Aprobada",    bg:"#ECFDF5", color:"#065F46", border:"#A7F3D0" },
  rechazada:   { label:"Rechazada",   bg:"#FFF1F2", color:"#9F1239", border:"#FECDD3" },
};

export default function SolicitanteDashboard() {
  const [loading,   setLoading]   = useState(true);
  const [profile,   setProfile]   = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [kpis, setKpis] = useState({
    totalSolicitudes:  null as number | null,
    enRevision:        null as number | null,
    creditosAprobados: null as number | null,
    recientes:         [] as any[],
  });

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      setUserEmail(auth.user.email ?? null);

      const { data: prof } = await supabase
        .from("borrowers_profile")
        .select("company_name,company_rfc,company_giro,company_state,rep_first_names,rep_last_name,rep_email")
        .eq("owner_id", auth.user.id)
        .maybeSingle();
      setProfile(prof ?? null);

      const [
        { count: total },
        { count: enRev },
        { count: aprobadas },
        { data: recientes },
      ] = await Promise.all([
        supabase.from("solicitudes")
          .select("*", { count:"exact", head:true })
          .eq("solicitante_id", auth.user.id),

        supabase.from("solicitudes")
          .select("*", { count:"exact", head:true })
          .eq("solicitante_id", auth.user.id)
          .in("status", ["enviada","en_revision","ofertada"]),

        supabase.from("creditos")
          .select("*", { count:"exact", head:true })
          .eq("solicitante_id", auth.user.id)
          .eq("status", "activo"),

        supabase.from("solicitudes")
          .select("id,monto,plazo_meses,destino,status,created_at")
          .eq("solicitante_id", auth.user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setKpis({
        totalSolicitudes:  total  ?? 0,
        enRevision:        enRev  ?? 0,
        creditosAprobados: aprobadas ?? 0,
        recientes:         recientes ?? [],
      });
      setLoading(false);
    })();
  }, []);

  const dateStr     = new Date().toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" });
  const companyName = profile?.company_name ?? null;
  const repName     = [profile?.rep_first_names, profile?.rep_last_name].filter(Boolean).join(" ") || null;
  const profileOk   = !!(companyName && profile?.company_rfc);

  return (
    <div style={{ fontFamily:"'Geist',sans-serif", color:"#0F172A", fontSize:13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.3;}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fade{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.05s;} .d2{animation-delay:.10s;} .d3{animation-delay:.15s;}
        .mono{font-family:'Geist Mono',monospace;}
        .card{background:#fff;border:1px solid #E8EDF5;border-radius:14px;padding:16px;transition:box-shadow .18s,border-color .18s;}
        .card:hover{box-shadow:0 6px 24px rgba(6,78,59,.07);border-color:#C6E9D9;}
        .pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 9px;font-family:'Geist Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.04em;}
        .p-green{background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;}
        .p-amber{background:#FFFBEB;color:#92400E;border:1px solid #FDE68A;}
        .p-sol  {background:#ECFDF5;color:#065F46;border:1px solid #6EE7B7;}
        .btn-sol{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#064E3B,#059669);color:#fff;border:none;border-radius:9px;font-family:'Geist',sans-serif;font-size:12px;font-weight:600;padding:8px 14px;cursor:pointer;text-decoration:none;box-shadow:0 2px 10px rgba(6,78,59,.22);transition:opacity .15s,transform .15s;}
        .btn-sol:hover{opacity:.9;transform:translateY(-1px);}
        .btn-g{display:inline-flex;align-items:center;gap:6px;background:#F8FAFC;color:#475569;border:1px solid #E8EDF5;border-radius:9px;font-family:'Geist',sans-serif;font-size:12px;font-weight:600;padding:8px 14px;cursor:pointer;text-decoration:none;transition:background .15s;}
        .btn-g:hover{background:#ECFDF5;border-color:#A7F3D0;color:#065F46;}
        .qa{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:10px;border:1px solid #E8EDF5;background:#FAFBFF;text-decoration:none;color:#0F172A;font-size:12px;font-weight:500;transition:all .15s;width:100%;text-align:left;font-family:'Geist',sans-serif;}
        .qa:hover{background:#ECFDF5;border-color:#A7F3D0;}
        .qa.prim{background:linear-gradient(135deg,#064E3B,#059669);color:#fff;border-color:transparent;box-shadow:0 2px 10px rgba(6,78,59,.22);}
        .qa.prim:hover{opacity:.92;}
        .qa-ico{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;flex-shrink:0;}
        .tr{display:grid;align-items:center;padding:10px 14px;border-bottom:1px solid #F1F5F9;transition:background .12s;}
        .tr:last-child{border-bottom:none;}
        .tr:hover{background:#F7FDF9;}
        .spinner{animation:spin .7s linear infinite;}
      `}</style>

      {/* ── HEADER ── */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:3 }}>
            <div style={{ fontSize:19, fontWeight:800, letterSpacing:"-0.04em" }}>Dashboard</div>
            <span className="pill p-sol">Solicitante de crédito</span>
          </div>
          <div style={{ fontSize:12, color:"#94A3B8", textTransform:"capitalize" }}>{dateStr}</div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span className={`pill ${profileOk ? "p-green" : "p-amber"}`}>
            <span style={{ width:5,height:5,borderRadius:"50%",background:"currentColor",display:"inline-block" }}/>
            {profileOk ? "Perfil completo" : "Perfil incompleto"}
          </span>
          <Link href="/dashboard/solicitante/solicitudes" className="btn-sol">+ Nueva solicitud</Link>
        </div>
      </div>

      {/* ── PERFIL CARD ── */}
      <div className="fade d1" style={{ marginBottom:14 }}>
        <div className="card" style={{ padding:22 }}>
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <svg className="spinner" width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
              <span style={{ fontSize:13,color:"#94A3B8" }}>Cargando...</span>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#064E3B,#059669)",display:"grid",placeItems:"center",flexShrink:0 }}>
                  <Ic d="M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" s={20} c="#fff"/>
                </div>
                <div>
                  <div style={{ fontSize:15,fontWeight:700,letterSpacing:"-0.02em" }}>
                    {companyName ?? userEmail ?? "—"}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, flexWrap:"wrap" }}>
                    {profile?.company_giro  && <span className="pill p-sol">{profile.company_giro}</span>}
                    {profile?.company_rfc   && <span className="mono" style={{ fontSize:10,color:"#64748B" }}>{profile.company_rfc}</span>}
                    {profile?.company_state && <span style={{ fontSize:11,color:"#94A3B8" }}>{profile.company_state}</span>}
                    {!profileOk && <span className="pill p-amber">Perfil incompleto</span>}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, textAlign:"right" }}>
                {repName && (
                  <div style={{ fontSize:12,fontWeight:600 }}>
                    <span style={{ fontSize:10,color:"#94A3B8",marginRight:4 }}>Rep. legal</span>{repName}
                  </div>
                )}
                {(profile?.rep_email || userEmail) && <div style={{ fontSize:11,color:"#94A3B8" }}>{profile?.rep_email ?? userEmail}</div>}
                <Link href="/dashboard/datos" className="btn-g" style={{ marginTop:4,fontSize:11,padding:"5px 12px" }}>Editar datos →</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="fade d2" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:14 }}>
        {[
          { label:"Solicitudes enviadas", val:kpis.totalSolicitudes,  sub:"Total histórico",     color:"#059669", icon:"M4 2h8v12H4zM6 6h4M6 9h4" },
          { label:"En proceso",           val:kpis.enRevision,        sub:"Esperando respuesta", color:"#F5A623", icon:"M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 2" },
          { label:"Créditos activos",     val:kpis.creditosAprobados, sub:"Operaciones vigentes",color:"#10B981", icon:"M2 12L6 7l3 3 3-4 2 2" },
        ].map(k => (
          <div key={k.label} className="card">
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
              <div className="mono" style={{ fontSize:10,color:"#94A3B8",letterSpacing:".08em" }}>{k.label.toUpperCase()}</div>
              <div style={{ width:28,height:28,borderRadius:8,background:`${k.color}18`,display:"grid",placeItems:"center" }}>
                <Ic d={k.icon} s={13} c={k.color}/>
              </div>
            </div>
            {loading
              ? <div style={{ height:30,width:60,borderRadius:6,background:"linear-gradient(90deg,#F0FDF9 25%,#ECFDF5 50%,#F0FDF9 75%)",backgroundSize:"300px 100%" }}/>
              : <div style={{ fontSize:30,fontWeight:800,letterSpacing:"-0.05em",lineHeight:1,color:"#0F172A" }}>{k.val ?? "—"}</div>
            }
            <div style={{ fontSize:11,color:"#94A3B8",marginTop:6 }}>{k.sub}</div>
            <div style={{ height:3,background:"#F1F5F9",borderRadius:999,marginTop:10,overflow:"hidden" }}>
              <div style={{ width: k.val ? "60%" : "0%",height:"100%",background:k.color,borderRadius:999,transition:"width .8s" }}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── LOWER GRID ── */}
      <div className="fade d3" style={{ display:"grid", gridTemplateColumns:"1fr 260px", gap:12 }}>

        {/* Solicitudes recientes */}
        <div className="card" style={{ padding:0,overflow:"hidden" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid #E8EDF5" }}>
            <div>
              <div style={{ fontSize:13,fontWeight:700 }}>Mis solicitudes</div>
              <div style={{ fontSize:11,color:"#94A3B8",marginTop:1 }}>Historial reciente</div>
            </div>
            <Link href="/dashboard/solicitante/solicitudes" className="btn-g" style={{ fontSize:11,padding:"6px 12px" }}>Ver todas →</Link>
          </div>

          {loading ? (
            <div style={{ padding:"24px 16px",display:"flex",alignItems:"center",gap:10 }}>
              <svg className="spinner" width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
              <span style={{ fontSize:12,color:"#94A3B8" }}>Cargando...</span>
            </div>
          ) : kpis.recientes.length === 0 ? (
            <div style={{ padding:"36px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:10,textAlign:"center" }}>
              <div style={{ width:44,height:44,borderRadius:12,background:"#F1F5F9",display:"grid",placeItems:"center" }}>
                <Ic d="M4 2h8v12H4zM6 6h4M6 9h4M6 12h2" s={20} c="#94A3B8"/>
              </div>
              <div style={{ fontSize:13,fontWeight:600,color:"#475569" }}>Sin solicitudes aún</div>
              <div style={{ fontSize:12,color:"#94A3B8" }}>Crea tu primera solicitud de crédito.</div>
              <Link href="/dashboard/solicitante/solicitudes" className="btn-sol" style={{ marginTop:4 }}>Crear solicitud</Link>
            </div>
          ) : (
            <>
              <div className="tr" style={{ gridTemplateColumns:"1fr 90px 70px 100px", background:"#F7FDF9" }}>
                {["Destino","Monto","Plazo","Estado"].map(h => (
                  <div key={h} className="mono" style={{ fontSize:10,color:"#94A3B8",letterSpacing:".06em" }}>{h}</div>
                ))}
              </div>
              {kpis.recientes.map((s: any) => {
                const pill = STATUS_PILL[s.status] ?? STATUS_PILL.enviada;
                return (
                  <div key={s.id} className="tr" style={{ gridTemplateColumns:"1fr 90px 70px 100px" }}>
                    <div style={{ fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.destino || "—"}</div>
                    <div className="mono" style={{ fontSize:12 }}>{s.monto ? fmt(s.monto) : "—"}</div>
                    <div style={{ fontSize:12,color:"#64748B" }}>{s.plazo_meses ? `${s.plazo_meses}m` : "—"}</div>
                    <span style={{ display:"inline-flex",alignItems:"center",gap:4,borderRadius:999,padding:"3px 9px",fontSize:10,fontWeight:600,fontFamily:"'Geist Mono',monospace",background:pill.bg,color:pill.color,border:`1px solid ${pill.border}` }}>
                      {pill.label}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Acciones */}
        <div className="card" style={{ display:"flex",flexDirection:"column",gap:6 }}>
          <div style={{ fontSize:13,fontWeight:700,marginBottom:6 }}>Acciones rápidas</div>
          <Link href="/dashboard/solicitante/solicitudes" className="qa prim">
            <div className="qa-ico" style={{ background:"rgba(255,255,255,.12)" }}><Ic d="M8 2v12M2 8h12" c="#fff" s={12}/></div>
            Nueva solicitud
          </Link>
          <Link href="/dashboard/solicitante/solicitudes" className="qa">
            <div className="qa-ico" style={{ background:"#ECFDF5" }}><Ic d="M4 2h8v12H4zM6 6h4M6 9h4M6 12h2" c="#059669" s={12}/></div>
            Mis solicitudes
          </Link>
          <Link href="/dashboard/solicitante/creditos" className="qa">
            <div className="qa-ico" style={{ background:"#F0FDF9" }}><Ic d="M2 12L6 7l3 3 3-4 2 2" c="#10B981" s={12}/></div>
            Créditos activos
          </Link>
          <Link href="/dashboard/datos" className="qa">
            <div className="qa-ico" style={{ background:"#F8FAFC" }}><Ic d="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" c="#94A3B8" s={12}/></div>
            Mis datos
          </Link>
          <div style={{ marginTop:"auto" }}/>
          {profileOk && (
            <div style={{ padding:"12px 14px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:12 }}>
              <div className="mono" style={{ fontSize:9,color:"#059669",letterSpacing:".10em",marginBottom:4 }}>MI EMPRESA</div>
              <div style={{ fontSize:12,fontWeight:700,color:"#064E3B" }}>{companyName}</div>
              {profile?.company_rfc && <div className="mono" style={{ fontSize:10,color:"#059669",marginTop:2 }}>{profile.company_rfc}</div>}
            </div>
          )}
          <div style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 12px",background:"#ECFDF5",border:"1px solid #A7F3D0",borderRadius:10 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#10B981",display:"inline-block",animation:"blink 2.5s ease-in-out infinite" }}/>
            <span className="mono" style={{ fontSize:10,color:"#065F46",letterSpacing:".06em" }}>Sistema operativo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
