"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Profile = {
  company_name:  string | null;
  company_rfc:   string | null;
  company_giro:  string | null;
  company_state: string | null;
  rep_first_names: string | null;
  rep_last_name:   string | null;
};

type Solicitud = {
  id: string;
  status: string;
  amount: number;
  created_at: string;
};

const S = {
  title: { fontSize:22, fontWeight:700, color:"#0F172A", letterSpacing:"-0.03em", margin:0 } as React.CSSProperties,
  subtitle: { fontSize:13, color:"#64748B", marginTop:4 } as React.CSSProperties,
  card: { background:"#fff", borderRadius:16, border:"1px solid rgba(15,23,42,0.08)", overflow:"hidden" } as React.CSSProperties,
  cardHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid rgba(15,23,42,0.06)" } as React.CSSProperties,
  cardTitle: { fontSize:13, fontWeight:600, color:"#0F172A" } as React.CSSProperties,
  cardBadge: (color: string, bg: string): React.CSSProperties => ({ fontSize:10, fontWeight:700, color, background:bg, padding:"2px 8px", borderRadius:20 }),
  cardBody: { padding:"20px" } as React.CSSProperties,

  statCard: (color: string, bg: string): React.CSSProperties => ({
    background:"#fff", borderRadius:14, border:`1px solid ${color}22`,
    padding:"18px 20px", display:"flex", flexDirection:"column", gap:8,
  }),
  statVal: { fontSize:24, fontWeight:800, color:"#0F172A", letterSpacing:"-0.04em" } as React.CSSProperties,
  statLabel: { fontSize:11, color:"#64748B", fontWeight:500 } as React.CSSProperties,

  actionBtn: (primary?: boolean): React.CSSProperties => ({
    display:"flex", alignItems:"center", gap:8,
    padding: primary ? "10px 20px" : "9px 16px",
    borderRadius:10, border: primary ? "none" : "1.5px solid #E2E8F0",
    background: primary ? "#071A3A" : "#fff",
    color: primary ? "#fff" : "#475569",
    fontSize:13, fontWeight:600, cursor:"pointer",
    textDecoration:"none", transition:"all 0.15s",
  }),

  statusBadge: (status: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
      pendiente:  { bg:"#FEF3C7", color:"#92400E" },
      revision:   { bg:"#DBEAFE", color:"#1D4ED8" },
      aprobada:   { bg:"#DCFCE7", color:"#15803D" },
      rechazada:  { bg:"#FEE2E2", color:"#B91C1C" },
    };
    const s = map[status] ?? { bg:"#F1F5F9", color:"#475569" };
    return { fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background:s.bg, color:s.color };
  },
};

export default function SolicitanteDashboard() {
  const router  = useRouter();
  const [profile,    setProfile]    = useState<Profile | null>(null);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }

      const [{ data: prof }, { data: sols }] = await Promise.all([
        supabase.from("borrowers_profile").select("company_name,company_rfc,company_giro,company_state,rep_first_names,rep_last_name").eq("owner_id", auth.user.id).maybeSingle(),
        // Placeholder — swap for real solicitudes table when ready
        Promise.resolve({ data: [] as Solicitud[] }),
      ]);

      setProfile(prof ?? null);
      setSolicitudes(sols ?? []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:300 }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation:"spin 0.75s linear infinite" }}>
        <circle cx="10" cy="10" r="8" stroke="#E2E8F0" strokeWidth="2.5"/>
        <path d="M18 10a8 8 0 00-8-8" stroke="#0C1E4A" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const companyName = profile?.company_name ?? "Mi empresa";
  const repName     = [profile?.rep_first_names, profile?.rep_last_name].filter(Boolean).join(" ") || "—";

  return (
    <div style={{ fontFamily:"'Geist',system-ui,sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom:28, display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
        <div>
          <h1 style={S.title}>Bienvenido, {profile?.rep_first_names ?? "—"}</h1>
          <p style={S.subtitle}>{companyName} · Solicitante de crédito</p>
        </div>
        <Link href="/dashboard/solicitante/solicitudes/nueva" style={S.actionBtn(true)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          Nueva solicitud
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:14, marginBottom:24 }}>
        {[
          { label:"Solicitudes activas",  val: solicitudes.filter(s=>s.status==="revision").length.toString(),  color:"#5B8DEF", bg:"#EEF2FF" },
          { label:"Solicitudes aprobadas", val: solicitudes.filter(s=>s.status==="aprobada").length.toString(), color:"#10B981", bg:"#ECFDF5" },
          { label:"En revisión",           val: solicitudes.filter(s=>s.status==="pendiente").length.toString(),color:"#F59E0B", bg:"#FEF3C7" },
          { label:"Total enviadas",         val: solicitudes.length.toString(),                                  color:"#64748B", bg:"#F1F5F9" },
        ].map(stat => (
          <div key={stat.label} style={S.statCard(stat.color, stat.bg)}>
            <div style={{ width:32, height:32, borderRadius:8, background:stat.bg, display:"grid", placeItems:"center" }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:stat.color }} />
            </div>
            <div style={S.statVal}>{stat.val}</div>
            <div style={S.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:20, alignItems:"start" }}>
        {/* Solicitudes */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>Mis solicitudes</span>
            <Link href="/dashboard/solicitante/solicitudes" style={{ fontSize:12, fontWeight:600, color:"#5B8DEF", textDecoration:"none" }}>Ver todas →</Link>
          </div>
          <div style={S.cardBody}>
            {solicitudes.length === 0 ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 20px", gap:14, textAlign:"center" }}>
                <div style={{ width:48, height:48, borderRadius:14, background:"#F1F5F9", display:"grid", placeItems:"center" }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="16" height="18" rx="2"/><path d="M7 7h8M7 11h8M7 15h5"/></svg>
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:"#475569", marginBottom:4 }}>No tienes solicitudes aún</p>
                  <p style={{ fontSize:12, color:"#94A3B8" }}>Crea tu primera solicitud de crédito para comenzar.</p>
                </div>
                <Link href="/dashboard/solicitante/solicitudes/nueva" style={S.actionBtn(true)}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  Crear solicitud
                </Link>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                {solicitudes.map((sol, i) => (
                  <div key={sol.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom: i < solicitudes.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#0F172A" }}>Solicitud #{sol.id.slice(0,8)}</div>
                      <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{new Date(sol.created_at).toLocaleDateString("es-MX")}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>${sol.amount.toLocaleString("es-MX")}</span>
                      <span style={S.statusBadge(sol.status)}>{sol.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Company card */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Mi empresa</span>
              <Link href="/dashboard/solicitante/empresa" style={{ fontSize:11, color:"#5B8DEF", fontWeight:600, textDecoration:"none" }}>Editar</Link>
            </div>
            <div style={S.cardBody}>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { label:"Razón social", val: profile?.company_name ?? "—" },
                  { label:"RFC",          val: profile?.company_rfc  ?? "—" },
                  { label:"Giro",         val: profile?.company_giro ?? "—" },
                  { label:"Estado",       val: profile?.company_state ?? "—" },
                  { label:"Rep. legal",   val: repName },
                ].map(row => (
                  <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                    <span style={{ fontSize:11, color:"#94A3B8", fontWeight:500, minWidth:80 }}>{row.label}</span>
                    <span style={{ fontSize:12, color:"#0F172A", fontWeight:600, textAlign:"right", wordBreak:"break-all" }}>{row.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Acciones rápidas</span>
            </div>
            <div style={{ ...S.cardBody, display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { label:"Subir documentos",    href:"/dashboard/solicitante/documentos", icon:"📄" },
                { label:"Ver ofertas de crédito", href:"/market", icon:"🏦" },
                { label:"Configuración",        href:"/dashboard/solicitante/ajustes",    icon:"⚙️" },
              ].map(a => (
                <Link key={a.label} href={a.href} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:9, border:"1px solid #E2E8F0", textDecoration:"none", fontSize:13, fontWeight:500, color:"#475569", transition:"all 0.14s", background:"#fff" }}>
                  <span style={{ fontSize:16 }}>{a.icon}</span>
                  {a.label}
                  <svg style={{ marginLeft:"auto" }} width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
