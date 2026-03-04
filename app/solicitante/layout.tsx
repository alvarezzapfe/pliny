"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { clearSession } from "@/lib/auth";

type BorrowerProfile = {
  company_name: string | null;
  onboarding_done: boolean | null;
};

const NAV = [
  { href: "/solicitante", label: "Inicio", match: "exact", icon: "M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" },
  { href: "/solicitante/solicitudes", label: "Solicitudes", match: "prefix", icon: "M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zM6 6h4M6 9h4M6 12h2" },
  { href: "/solicitante/ofertas", label: "Ofertas", match: "prefix", icon: "M2 2h12v8H2zM5 14h6M8 10v4" },
  { href: "/solicitante/creditos", label: "Créditos", match: "prefix", icon: "M2 12L6 7l3 3 3-4 2 2" },
  { href: "/solicitante/datos", label: "Mis datos", match: "prefix", icon: "M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" },
];

const W_OPEN  = 240;
const W_CLOSE = 64;

export default function SolicitanteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open,       setOpen]       = useState(true);
  const [profile,    setProfile]    = useState<BorrowerProfile | null>(null);
  const [userEmail,  setUserEmail]  = useState<string | null>(null);
  const [pendientes, setPendientes] = useState(0);

  const W = open ? W_OPEN : W_CLOSE;

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      setUserEmail(auth.user.email ?? null);

      const { data } = await supabase
        .from("borrowers_profile")
        .select("company_name, onboarding_done")
        .eq("owner_id", auth.user.id)
        .maybeSingle();

      if (data) setProfile(data);
      if (data && !data.onboarding_done) router.push("/onboarding/solicitante");

      // Badge: ofertas pendientes
      const { data: sols } = await supabase
        .from("solicitudes").select("id").eq("borrower_id", auth.user.id);
      if (sols && sols.length > 0) {
        const { count } = await supabase
          .from("ofertas")
          .select("id", { count: "exact", head: true })
          .in("solicitud_id", sols.map(s => s.id))
          .eq("status", "pendiente");
        setPendientes(count ?? 0);
      }
    })();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut().catch(() => {});
    clearSession();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
        *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        .sol-sb {
          position: fixed; top: 0; left: 0; height: 100vh;
          background: linear-gradient(160deg,#0A2518 0%,#051A10 100%);
          display: flex; flex-direction: column;
          transition: width .25s cubic-bezier(.16,1,.3,1);
          z-index: 100; overflow: hidden;
          border-right: 1px solid rgba(255,255,255,0.07);
        }
        .sol-grid {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
          background-image: linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px);
          background-size: 40px 40px;
        }
        .sol-nl {
          display: flex; align-items: center; gap: 11px;
          padding: 8px 11px; border-radius: 9px;
          font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(236,253,245,0.60); text-decoration: none;
          white-space: nowrap; overflow: hidden;
          transition: background .14s, color .14s;
          cursor: pointer; border: none; background: none;
          width: 100%; text-align: left; border-left: 2px solid transparent;
        }
        .sol-nl:hover { background: rgba(255,255,255,0.08); color: #ECFDF5; }
        .sol-nl.on { background: rgba(0,229,160,0.15); color: #fff; font-weight: 600; border-left-color: #00E5A0; }
        .sol-cb {
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.07); border: none; border-radius: 7px;
          padding: 5px; cursor: pointer; color: rgba(236,253,245,0.40); flex-shrink: 0;
          transition: background .14s, color .14s;
        }
        .sol-cb:hover { background: rgba(255,255,255,0.13); color: #ECFDF5; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside className="sol-sb" style={{ width: W }}>
        <div className="sol-grid" />

        {/* Logo */}
        <div style={{ padding:"16px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent: open ? "space-between" : "center", position:"relative", zIndex:1, gap:8, flexShrink:0 }}>
          {open && (
            <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0, overflow:"hidden" }}>
              <img src="/plinius.png" alt="Plinius"
                style={{ height:22, width:"auto", filter:"brightness(0) invert(1)", opacity:0.9, flexShrink:0 }}
                onError={e=>(e.currentTarget.style.display="none")} />
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#ECFDF5", letterSpacing:"-0.03em", lineHeight:1 }}>Plinius</div>
                <div style={{ fontSize:9, fontFamily:"'Geist Mono',monospace", color:"#00E5A0", letterSpacing:".10em", marginTop:2 }}>CREDIT OS</div>
              </div>
            </div>
          )}
          <button className="sol-cb" onClick={() => setOpen(v => !v)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {open ? <path d="M9 6.5H4M6.5 4l-2.5 2.5 2.5 2.5"/> : <path d="M4 6.5h5M6.5 4l2.5 2.5-2.5 2.5"/>}
            </svg>
          </button>
        </div>

        {/* Company pill */}
        {open && (
          <div style={{ margin:"10px 10px 0", padding:"9px 12px", background:"rgba(0,229,160,0.08)", border:"1px solid rgba(0,229,160,0.18)", borderRadius:10, position:"relative", zIndex:1 }}>
            <div style={{ fontSize:9, fontWeight:700, color:"rgba(209,250,229,.40)", letterSpacing:".08em", fontFamily:"'Geist Mono',monospace", marginBottom:2 }}>EMPRESA</div>
            <div style={{ fontSize:12, fontWeight:700, color:"#00E5A0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {profile?.company_name ?? "Mi empresa"}
            </div>
            {userEmail && (
              <div style={{ fontSize:10, color:"rgba(209,250,229,.40)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {userEmail}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto", position:"relative", zIndex:1 }}>
          {open && <div style={{ padding:"0 4px 6px", fontSize:9, fontWeight:700, letterSpacing:".10em", color:"rgba(209,250,229,.25)", fontFamily:"'Geist Mono',monospace" }}>MENÚ</div>}
          {NAV.map(n => {
            const active = n.match === "exact"
              ? pathname === n.href
              : pathname === n.href || pathname?.startsWith(n.href + "/");
            const isOfertas = n.href === "/solicitante/ofertas";
            return (
              <Link key={n.href} href={n.href}
                className={`sol-nl${active ? " on" : ""}`}
                title={!open ? n.label : undefined}
                style={{ justifyContent: open ? "flex-start" : "center" }}>
                <span style={{ flexShrink:0, position:"relative" }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d={n.icon}/>
                  </svg>
                  {isOfertas && pendientes > 0 && !open && (
                    <span style={{ position:"absolute", top:-4, right:-4, width:8, height:8, borderRadius:"50%", background:"#F59E0B", border:"1.5px solid #0A2518" }}/>
                  )}
                </span>
                {open && <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{n.label}</span>}
                {open && isOfertas && pendientes > 0 && (
                  <span style={{ flexShrink:0, minWidth:18, height:18, borderRadius:999, background:"#F59E0B", color:"#fff", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Geist Mono',monospace" }}>
                    {pendientes}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding:"8px 8px 14px", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", flexDirection:"column", gap:2, position:"relative", zIndex:1, flexShrink:0 }}>
          <button onClick={handleLogout} className="sol-nl" title={!open ? "Cerrar sesión" : undefined} style={{ justifyContent: open ? "flex-start" : "center" }}>
            <span style={{ flexShrink:0 }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 8H3M6 5l-3 3 3 3M13 2v12"/>
              </svg>
            </span>
            {open && <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>Cerrar sesión</span>}
          </button>

          {open && (
            <div style={{ marginTop:6, padding:"8px 11px", background:"rgba(0,229,160,.07)", border:"1px solid rgba(0,229,160,.15)", borderRadius:9, display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"#00E5A0", display:"inline-block", animation:"blink 2.5s ease-in-out infinite" }}/>
              <span style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"#00E5A0", letterSpacing:".06em" }}>Solicitante activo</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── CONTENT ── */}
      <div style={{ marginLeft: W, minHeight:"100vh", background:"#F0F7F4", fontFamily:"'Geist',sans-serif", transition:"margin-left .25s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ maxWidth:1400, padding:"36px 40px 56px" }}>
          {children}
        </div>
      </div>
    </>
  );
}
