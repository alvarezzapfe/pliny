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

export default function SolicitanteDashboard() {
  const [loading,   setLoading]   = useState(true);
  const [profile,   setProfile]   = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      setUserEmail(auth.user.email ?? null);
      const { data } = await supabase
        .from("borrowers_profile")
        .select("company_name,company_rfc,company_giro,company_state,rep_first_names,rep_last_name,rep_email,onboarding_done")
        .eq("owner_id", auth.user.id)
        .maybeSingle();
      setProfile(data ?? null);
      setLoading(false);
    })();
  }, []);

  const dateStr = new Date().toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" });
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
        .btn-sol{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#064E3B,#059669);color:#fff;border:none;border-radius:9px;font-family:'Geist',sans-serif;font-size:12px;font-weight:600;padding:8px 14px;cursor:pointer;text-decoration:none;box-shadow:0 2px 10px rgba(6,78,59,.22);transition:opacity .15s,transform .15s;}
        .btn-sol:hover{opacity:.9;transform:translateY(-1px);}
        .btn-g{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:#F8FAFC;color:#475569;border:1px solid #E8EDF5;border-radius:9px;font-family:'Geist',sans-serif;font-size:12px;font-weight:600;padding:8px 14px;cursor:pointer;text-decoration:none;transition:background .15s,border-color .15s;}
        .btn-g:hover{background:#ECFDF5;border-color:#A7F3D0;color:#065F46;}
        .qa{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:10px;border:1px solid #E8EDF5;background:#FAFBFF;text-decoration:none;color:#0F172A;font-size:12px;font-weight:500;transition:all .15s;cursor:pointer;width:100%;text-align:left;font-family:'Geist',sans-serif;}
        .qa:hover{background:#ECFDF5;border-color:#A7F3D0;}
        .qa.prim{background:linear-gradient(135deg,#064E3B,#059669);color:#fff;border-color:transparent;box-shadow:0 2px 10px rgba(6,78,59,.22);}
        .qa.prim:hover{opacity:.92;}
        .qa-ico{width:26px;height:26px;border-radius:7px;display:grid;place-items:center;flex-shrink:0;}
        .dr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #F1F5F9;gap:16px;}
        .dr:last-child{border-bottom:none;}
        .spinner{animation:spin .7s linear infinite;}
      `}</style>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:3 }}>
            <div style={{ fontSize:19, fontWeight:800, letterSpacing:"-0.04em", lineHeight:1 }}>Dashboard</div>
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

      {/* ── PERFIL CARD ─────────────────────────────────── */}
      <div className="fade d1" style={{ marginBottom:14 }}>
        <div className="card" style={{ padding:22 }}>
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <svg className="spinner" width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
              <span style={{ fontSize:13, color:"#94A3B8" }}>Cargando perfil...</span>
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
              {/* Left — empresa */}
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#064E3B,#059669)", display:"grid", placeItems:"center", flexShrink:0 }}>
                  <Ic d="M2 6l6-4 6 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" s={20} c="#fff"/>
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#0F172A", letterSpacing:"-0.02em" }}>
                    {companyName ?? userEmail ?? "—"}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, flexWrap:"wrap" }}>
                    {profile?.company_giro && <span className="pill p-sol">{profile.company_giro}</span>}
                    {profile?.company_rfc  && <span className="mono" style={{ fontSize:10, color:"#64748B" }}>{profile.company_rfc}</span>}
                    {profile?.company_state && <span style={{ fontSize:11, color:"#94A3B8" }}>{profile.company_state}</span>}
                    {!profileOk && <span className="pill p-amber">Perfil incompleto</span>}
                  </div>
                </div>
              </div>
              {/* Right — rep */}
              <div style={{ display:"flex", flexDirection:"column", gap:4, textAlign:"right" }}>
                {repName && (
                  <div style={{ fontSize:12, fontWeight:600, color:"#0F172A" }}>
                    <span style={{ fontSize:10, color:"#94A3B8", marginRight:4 }}>Rep. legal</span>
                    {repName}
                  </div>
                )}
                {(profile?.rep_email || userEmail) && (
                  <div style={{ fontSize:11, color:"#94A3B8" }}>{profile?.rep_email ?? userEmail}</div>
                )}
                <Link href="/dashboard/datos" className="btn-g" style={{ marginTop:4, fontSize:11, padding:"5px 12px" }}>
                  Editar datos →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── LOWER GRID ──────────────────────────────────── */}
      <div className="fade d2" style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:12 }}>

        {/* Left */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {[
              { label:"Solicitudes enviadas", val:"—", sub:"Total histórico",        color:"#059669" },
              { label:"En revisión",          val:"—", sub:"Esperando respuesta",    color:"#F5A623" },
              { label:"Créditos aprobados",   val:"—", sub:"Operaciones activas",    color:"#10B981" },
            ].map(k=>(
              <div key={k.label} className="card">
                <div className="mono" style={{ fontSize:10,color:"#94A3B8",letterSpacing:".08em",marginBottom:8 }}>{k.label.toUpperCase()}</div>
                <div style={{ fontSize:28,fontWeight:800,letterSpacing:"-0.05em",color:"#0F172A",lineHeight:1 }}>{k.val}</div>
                <div style={{ fontSize:11,color:"#94A3B8",marginTop:6 }}>{k.sub}</div>
                <div style={{ height:3,background:"#F1F5F9",borderRadius:999,marginTop:10,overflow:"hidden" }}>
                  <div style={{ width:"0%",height:"100%",background:k.color,borderRadius:999 }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state — solicitudes */}
          <div className="card" style={{ padding:0, overflow:"hidden" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid #E8EDF5" }}>
              <div>
                <div style={{ fontSize:13,fontWeight:700 }}>Mis solicitudes</div>
                <div style={{ fontSize:11,color:"#94A3B8",marginTop:1 }}>Historial de solicitudes de crédito</div>
              </div>
              <Link href="/dashboard/solicitante/solicitudes" className="btn-g" style={{ fontSize:11,padding:"6px 12px" }}>Ver todas →</Link>
            </div>
            <div style={{ padding:"36px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:10,textAlign:"center" }}>
              <div style={{ width:44,height:44,borderRadius:12,background:"#F1F5F9",display:"grid",placeItems:"center" }}>
                <Ic d="M4 2h8v12H4zM6 6h4M6 9h4M6 12h2" s={20} c="#94A3B8"/>
              </div>
              <div style={{ fontSize:13,fontWeight:600,color:"#475569" }}>Sin solicitudes aún</div>
              <div style={{ fontSize:12,color:"#94A3B8" }}>Crea tu primera solicitud de crédito para comenzar el proceso.</div>
              <Link href="/dashboard/solicitante/solicitudes" className="btn-sol" style={{ marginTop:4 }}>Crear solicitud</Link>
            </div>
          </div>
        </div>

        {/* Right — acciones */}
        <div className="card fade d3" style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <div style={{ fontSize:13,fontWeight:700,letterSpacing:"-0.02em",marginBottom:6 }}>Acciones rápidas</div>

          <Link href="/dashboard/solicitante/solicitudes" className="qa prim">
            <div className="qa-ico" style={{ background:"rgba(255,255,255,.12)" }}>
              <Ic d="M8 2v12M2 8h12" c="#fff" s={12}/>
            </div>
            Nueva solicitud
          </Link>
          <Link href="/dashboard/solicitante/solicitudes" className="qa">
            <div className="qa-ico" style={{ background:"#ECFDF5" }}>
              <Ic d="M4 2h8v12H4zM6 6h4M6 9h4M6 12h2" c="#059669" s={12}/>
            </div>
            Mis solicitudes
          </Link>
          <Link href="/dashboard/solicitante/creditos" className="qa">
            <div className="qa-ico" style={{ background:"#F0FDF9" }}>
              <Ic d="M2 12L6 7l3 3 3-4 2 2" c="#10B981" s={12}/>
            </div>
            Créditos aprobados
          </Link>
          <Link href="/dashboard/datos" className="qa">
            <div className="qa-ico" style={{ background:"#F8FAFC" }}>
              <Ic d="M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" c="#94A3B8" s={12}/>
            </div>
            Mis datos
          </Link>

          <div style={{ marginTop:"auto" }}/>

          {/* Empresa mini-resumen */}
          {profileOk && (
            <div style={{ padding:"12px 14px", background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:12 }}>
              <div className="mono" style={{ fontSize:9,color:"#059669",letterSpacing:".10em",marginBottom:6 }}>MI EMPRESA</div>
              <div style={{ fontSize:12,fontWeight:700,color:"#064E3B",marginBottom:4 }}>{companyName}</div>
              {profile?.company_rfc && (
                <div className="mono" style={{ fontSize:10,color:"#059669" }}>{profile.company_rfc}</div>
              )}
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
