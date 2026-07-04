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

const INSTITUTION_LABELS: Record<string, string> = {
  bank:"Banco", private_fund:"Fondo privado", sofom:"SOFOM",
  credit_union:"Caja de ahorro", sofipo:"SOFIPO", ifc_crowd:"Crowdfunding", sapi:"SAPI", other:"Otro",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-MX")}`;
}

export default function DashboardOtorgante() {
  const [loading,    setLoading]    = useState(true);
  const [profile,    setProfile]    = useState<any>(null);
  const [userEmail,  setUserEmail]  = useState<string | null>(null);
  const [kpis, setKpis] = useState({
    oportunidadesActivas: null as number | null,
    creditosOtorgados:   null as number | null,
    montoEnCartera:      null as number | null,
    oportunidadesRecientes: [] as any[],
  });

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      setUserEmail(auth.user.email ?? null);

      // Perfil
      const { data: prof } = await supabase
        .from("lenders_profile")
        .select("institution_type,institution_name,rfc,legal_rep_first_names,legal_rep_last_name_paternal,legal_rep_email")
        .eq("owner_id", auth.user.id)
        .maybeSingle();
      setProfile(prof ?? null);

      // KPIs en paralelo
      const [
        { count: solActivas },
        { data: credData },
        { data: recientes },
      ] = await Promise.all([
        supabase.from("solicitudes")
          .select("*", { count:"exact", head:true })
          .eq("otorgante_id", auth.user.id)
          .in("status", ["enviada","en_revision","ofertada"]),

        supabase.from("credits")
  .select("id,monto_original,saldo_actual,estatus,created_at,created_by")
  .eq("created_by", auth.user.id)
  .in("estatus", ["vigente","mora_30","mora_60","mora_90"]),

        supabase.from("solicitudes")
          .select("id,monto,plazo_meses,destino,status,created_at,solicitante_id")
          .or(`otorgante_id.eq.${auth.user.id},tipo.eq.subasta`)
          .in("status", ["enviada","en_revision","ofertada","aprobada","rechazada"])
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const montoCartera = (credData ?? []).reduce((s: number, c: any) => s + (c.saldo_actual ?? 0), 0);

      setKpis({
        oportunidadesActivas: solActivas ?? 0,
        creditosOtorgados:   (credData ?? []).length,
        montoEnCartera:      montoCartera,
        oportunidadesRecientes: recientes ?? [],
      });

      setLoading(false);
    })();
  }, []);

  const profileOk = !!(profile?.institution_type && profile?.institution_name);
  const dateStr   = new Date().toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" });
  const instLabel = profile?.institution_type ? (INSTITUTION_LABELS[profile.institution_type] ?? "Institución") : null;
  const repName   = [profile?.legal_rep_first_names, profile?.legal_rep_last_name_paternal].filter(Boolean).join(" ") || null;

  const STATUS_PILL: Record<string, { label: string; cls: string }> = {
    enviada:     { label:"Enviada",     cls:"p-blue"  },
    en_revision: { label:"En revisión", cls:"p-amber" },
    ofertada:    { label:"Ofertada",    cls:"p-amber" },
    aprobada:    { label:"Aprobada",    cls:"p-green" },
    rechazada:   { label:"Rechazada",   cls:"p-red"   },
  };

  return (
    <div style={{ color:"#0F172A", fontSize:14 }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.3;}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .fade{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.05s;} .d2{animation-delay:.10s;} .d3{animation-delay:.15s;}
        .mono{font-family:'IBM Plex Mono',monospace;}
        .card{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:22px;transition:box-shadow .18s,border-color .18s;}
        .card:hover{box-shadow:0 6px 24px rgba(12,30,74,.07);border-color:#D4DCF0;}
        .pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 9px;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:.04em;}
        .p-green{background:#F0FDF9;color:#065F46;border:1px solid #D1FAE5;}
        .p-amber{background:#FFFBEB;color:#92400E;border:1px solid #FDE68A;}
        .p-blue {background:#EFF6FF;color:#1E40AF;border:1px solid #BFDBFE;}
        .p-red  {background:#FFF1F2;color:#9F1239;border:1px solid #FECDD3;}
        .p-navy {background:#EFF4FF;color:#0C1E4A;border:1px solid #C7D4F0;}
        .btn-p{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:9px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;padding:9px 16px;cursor:pointer;text-decoration:none;box-shadow:0 2px 10px rgba(12,30,74,.22);transition:opacity .15s,transform .15s;}
        .btn-p:hover{opacity:.9;transform:translateY(-1px);}
        .btn-g{display:inline-flex;align-items:center;gap:6px;background:#F8FAFC;color:#475569;border:1px solid #E2E8F0;border-radius:9px;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;padding:9px 16px;cursor:pointer;text-decoration:none;transition:background .15s;}
        .btn-g:hover{background:#EEF2FF;border-color:#C7D4F0;color:#0F172A;}
        .qa{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:1px solid #E2E8F0;background:#FAFBFF;text-decoration:none;color:#0F172A;font-size:14px;font-weight:500;transition:all .15s;width:100%;text-align:left;}
        .qa:hover{background:#EEF2FF;border-color:#C7D4F0;}
        .qa.prim{background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border-color:transparent;box-shadow:0 2px 10px rgba(12,30,74,.20);}
        .qa.prim:hover{opacity:.92;}
        .qa-ico{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;flex-shrink:0;}
        .tr{display:grid;align-items:center;padding:11px 16px;border-bottom:1px solid #F1F5F9;transition:background .12s;}
        .tr:last-child{border-bottom:none;}
        .tr:hover{background:#FAFBFF;}
        .spinner{animation:spin .7s linear infinite;}
      `}</style>

      {/* ── HEADER ── */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
            <h1 style={{ fontSize:34, fontFamily:"'Fraunces',serif", fontWeight:600, letterSpacing:"-0.01em", lineHeight:1.2 }}>Dashboard</h1>
            <span className="pill p-navy">Otorgante</span>
          </div>
          <div style={{ fontSize:14, color:"#64748B", textTransform:"capitalize" }}>{dateStr}</div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span className={`pill ${profileOk ? "p-green" : "p-amber"}`}>
            <span style={{ width:5,height:5,borderRadius:"50%",background:"currentColor",display:"inline-block" }}/>
            {profileOk ? "Perfil completo" : "Perfil incompleto"}
          </span>
          <Link href="/dashboard/datos" className="btn-g" style={{ fontSize:11, padding:"7px 14px" }}>
            {profileOk ? "Ver perfil" : "Completar perfil"} →
          </Link>
        </div>
      </div>

      {/* ── ONBOARDING BANNER ── */}
      {!loading && !profileOk && (
        <div className="fade d1" style={{ marginBottom:16, padding:"14px 18px", background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)", borderRadius:14, display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, boxShadow:"0 4px 20px rgba(12,30,74,.20)" }}>
          <div>
            <div className="mono" style={{ fontSize:10,color:"rgba(238,242,255,.5)",letterSpacing:".1em",marginBottom:4 }}>PRIMER PASO</div>
            <div style={{ fontSize:15,fontWeight:700,color:"#EEF2FF",marginBottom:2 }}>Completa tu perfil de otorgante</div>
            <div style={{ fontSize:13,color:"rgba(238,242,255,.6)" }}>Tipo de institución + representante legal · menos de 1 min</div>
          </div>
          <Link href="/dashboard/datos" style={{ background:"#fff",color:"#0C1E4A",borderRadius:9,padding:"8px 16px",fontSize:12,fontWeight:700,textDecoration:"none" }}>Completar →</Link>
        </div>
      )}

      {/* ── PERFIL CARD ── */}
      <div className="fade d1" style={{ marginBottom:14 }}>
        <div className="card" style={{ padding:22 }}>
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <svg className="spinner" width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#5B8DEF" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
              <span style={{ fontSize:13, color:"#94A3B8" }}>Cargando...</span>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#0C1E4A,#1B3F8A)",display:"grid",placeItems:"center",flexShrink:0 }}>
                  <Ic d="M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" s={20} c="#fff"/>
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#0F172A", letterSpacing:"-0.02em" }}>
                    {profile?.institution_name ?? userEmail ?? "—"}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, flexWrap:"wrap" }}>
                    {instLabel && <span className="pill p-blue">{instLabel}</span>}
                    {profile?.rfc && <span className="mono" style={{ fontSize:12,color:"#64748B" }}>{profile.rfc}</span>}
                    {!profileOk && <span className="pill p-amber">Perfil incompleto</span>}
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, textAlign:"right" }}>
                {repName && <div style={{ fontSize:12, fontWeight:600 }}>{repName}</div>}
                {(profile?.legal_rep_email || userEmail) && <div style={{ fontSize:11, color:"#94A3B8" }}>{profile?.legal_rep_email ?? userEmail}</div>}
                <Link href="/dashboard/datos" className="btn-g" style={{ marginTop:4, fontSize:11, padding:"5px 12px" }}>
                  {profileOk ? "Editar perfil" : "Completar perfil"} →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="fade d2" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:14 }}>
        {[
          {
            label: "Oportunidades",
            val:   kpis.oportunidadesActivas,
            sub:   "Pendientes · en revisión · ofertadas",
            color: "#5B8DEF",
            icon:  "M4 2h8v12H4zM6 6h4M6 9h4",
          },
          {
            label: "Créditos otorgados",
            val:   kpis.creditosOtorgados,
            sub:   "Operaciones activas en cartera",
            color: "#00E5A0",
            icon:  "M2 12L6 7l3 3 3-4 2 2",
          },
          {
            label: "Monto en cartera",
            val:   kpis.montoEnCartera !== null ? fmt(kpis.montoEnCartera) : null,
            sub:   "Saldo insoluto total",
            color: "#F5A623",
            icon:  "M8 2v12M2 8h12",
            money: true,
          },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding:24, borderRadius:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div style={{ fontSize:13.5, fontWeight:500, color:"#64748B" }}>{k.label}</div>
              <div style={{ width:34,height:34,borderRadius:10,background:`${k.color}18`,display:"grid",placeItems:"center" }}>
                <Ic d={k.icon} s={16} c={k.color}/>
              </div>
            </div>
            {loading
              ? <div style={{ height:36,width:90,borderRadius:8,background:"linear-gradient(90deg,#F0F4FF 25%,#E8EDF5 50%,#F0F4FF 75%)",backgroundSize:"300px 100%" }}/>
              : <div className="mono" style={{ fontSize:42, fontWeight:600, letterSpacing:"-0.03em", lineHeight:1, color:"#0F172A" }}>
                  {k.val ?? "—"}
                </div>
            }
            <div style={{ fontSize:13,color:"#94A3B8",marginTop:8 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── LOWER GRID ── */}
      <div className="fade d3" style={{ display:"grid", gridTemplateColumns:"1fr 260px", gap:12 }}>

        {/* Oportunidades recientes */}
        <div className="card" style={{ padding:0, overflow:"hidden" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px",borderBottom:"1px solid #E2E8F0" }}>
            <div>
              <div style={{ fontSize:15,fontWeight:600 }}>Oportunidades recientes</div>
              <div style={{ fontSize:13,color:"#94A3B8",marginTop:2 }}>Últimas solicitudes recibidas</div>
            </div>
            <Link href="/dashboard/solicitudes" className="btn-g" style={{ fontSize:11,padding:"6px 12px" }}>Ver todas →</Link>
          </div>

          {loading ? (
            <div style={{ padding:"24px 16px", display:"flex", alignItems:"center", gap:10 }}>
              <svg className="spinner" width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#5B8DEF" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
              <span style={{ fontSize:12,color:"#94A3B8" }}>Cargando oportunidades...</span>
            </div>
          ) : kpis.oportunidadesRecientes.length === 0 ? (
            <div style={{ padding:20, display:"flex", alignItems:"center", gap:14, background:"#F8FAFC", border:"1px dashed #CBD5E1", borderRadius:12, margin:16 }}>
              <div style={{ width:40,height:40,borderRadius:10,background:"#EEF2FF",display:"grid",placeItems:"center",flexShrink:0 }}>
                <Ic d="M4 2h8v12H4zM6 6h4M6 9h4M6 12h2" s={18} c="#94A3B8"/>
              </div>
              <div>
                <div style={{ fontSize:15,fontWeight:600,color:"#475569",marginBottom:2 }}>Sin oportunidades aún</div>
                <div style={{ fontSize:13,color:"#94A3B8" }}>Aquí aparecerán las solicitudes de crédito que recibas.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="tr" style={{ gridTemplateColumns:"1fr 90px 90px 90px", background:"#FAFBFF" }}>
                {["Destino","Monto","Plazo","Estado"].map(h => (
                  <div key={h} style={{ fontSize:13,color:"#94A3B8",fontWeight:500 }}>{h}</div>
                ))}
              </div>
              {kpis.oportunidadesRecientes.map((s: any) => {
                const pill = STATUS_PILL[s.status] ?? { label: s.status, cls:"p-blue" };
                return (
                  <div key={s.id} className="tr" style={{ gridTemplateColumns:"1fr 90px 90px 90px" }}>
                    <div style={{ fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.destino || "—"}</div>
                    <div className="mono" style={{ fontSize:14 }}>{s.monto ? fmt(s.monto) : "—"}</div>
                    <div style={{ fontSize:14,color:"#64748B" }}>{s.plazo_meses ? `${s.plazo_meses}m` : "—"}</div>
                    <span className={`pill ${pill.cls}`}>{pill.label}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Acciones */}
        <div className="card" style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ fontSize:15,fontWeight:600,marginBottom:8 }}>Acciones rápidas</div>
          <Link href="/dashboard/solicitudes" className="qa prim">
            <div className="qa-ico" style={{ background:"rgba(255,255,255,.12)" }}><Ic d="M4 2h8v12H4zM6 6h4M6 9h4" c="#fff" s={12}/></div>
            Oportunidades
          </Link>
          <Link href="/dashboard/reportes" className="qa">
            <div className="qa-ico" style={{ background:"#FFFBEB" }}><Ic d="M4 2h8v12H4zM6 6h4M6 9h4M6 12h2" c="#F5A623" s={12}/></div>
            Reportes
          </Link>
          <Link href="/dashboard/datos" className="qa">
            <div className="qa-ico" style={{ background:"#F8FAFC" }}><Ic d="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" c="#94A3B8" s={12}/></div>
            Mis datos
          </Link>
          <div style={{ marginTop:"auto" }}/>
          <div style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 12px",background:"#F0FDF9",border:"1px solid #D1FAE5",borderRadius:10 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#00E5A0",display:"inline-block",animation:"blink 2.5s ease-in-out infinite" }}/>
            <span style={{ fontSize:12,color:"#065F46",fontWeight:500 }}>Sistema operativo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
