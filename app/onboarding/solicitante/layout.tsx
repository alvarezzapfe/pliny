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
  {
    id: "home",
    label: "Inicio",
    href: "/dashboard/solicitante",
    match: "exact",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 6.5L7.5 1.5l6 5V13.5a1 1 0 01-1 1h-3v-3.5h-4V14.5h-3a1 1 0 01-1-1V6.5z"/></svg>,
  },
  {
    id: "solicitudes",
    label: "Mis solicitudes",
    href: "/dashboard/solicitante/solicitudes",
    match: "prefix",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="1.5" width="11" height="12" rx="1.5"/><path d="M5 5h5M5 7.5h5M5 10h3"/></svg>,
  },
  {
    id: "documentos",
    label: "Documentos",
    href: "/dashboard/solicitante/documentos",
    match: "prefix",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 1.5h5l3.5 3.5V13a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z"/><path d="M9 1.5V5h3.5"/></svg>,
  },
  {
    id: "perfil",
    label: "Mi empresa",
    href: "/dashboard/solicitante/empresa",
    match: "prefix",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="5" width="12" height="9" rx="1.5"/><path d="M4.5 5V4a3 3 0 016 0v1"/><circle cx="7.5" cy="9.5" r="1"/></svg>,
  },
  {
    id: "ajustes",
    label: "Configuración",
    href: "/dashboard/solicitante/ajustes",
    match: "prefix",
    icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="7.5" r="2"/><path d="M7.5 1.5v1M7.5 12.5v1M1.5 7.5h1M12.5 7.5h1M3.2 3.2l.7.7M11.1 11.1l.7.7M3.2 11.8l.7-.7M11.1 4.9l-.7-.7"/></svg>,
  },
];

export default function SolicitanteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [open,    setOpen]    = useState(true);
  const [profile, setProfile] = useState<BorrowerProfile | null>(null);

  const W = open ? 240 : 64;

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("borrowers_profile")
        .select("company_name, onboarding_done")
        .eq("owner_id", auth.user.id)
        .maybeSingle();

      if (data) setProfile(data);

      // Guard: if onboarding not done, redirect
      if (data && !data.onboarding_done) {
        router.push("/onboarding/solicitante");
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
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:.3;} }

        .sol-sb {
          position: fixed; top: 0; left: 0; bottom: 0;
          background: radial-gradient(ellipse 160% 110% at 20% 0%, #064E3B 0%, #065F46 40%, #047857 100%);
          border-right: 1px solid rgba(255,255,255,0.08);
          display: flex; flex-direction: column;
          overflow: hidden; z-index: 40;
          transition: width .25s cubic-bezier(.16,1,.3,1);
        }
        .sol-grid {
          position: absolute; inset: 0; pointer-events: none; opacity: .20;
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

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className="sol-sb" style={{ width: W }}>
        <div className="sol-grid" />

        {/* Logo */}
        <div style={{ padding:"16px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent: open ? "space-between" : "center", position:"relative", zIndex:1, gap:8, flexShrink:0 }}>
          {open && (
            <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0, overflow:"hidden" }}>
              <img src="/plinius.png" alt="Plinius" style={{ height:22, width:"auto", filter:"brightness(0) invert(1)", opacity:0.9, flexShrink:0 }} onError={e=>(e.currentTarget.style.display="none")} />
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

        {/* Company card */}
        {open && (
          <div style={{ margin:"12px 10px 0", padding:"10px 12px", background:"rgba(0,229,160,0.08)", border:"1px solid rgba(0,229,160,0.18)", borderRadius:10, position:"relative", zIndex:1 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(236,253,245,0.45)", letterSpacing:"0.08em", fontFamily:"'Geist Mono',monospace", marginBottom:3 }}>SOLICITANTE</div>
            <div style={{ fontSize:12, fontWeight:700, color:"#00E5A0", truncate:true }}>
              {profile?.company_name ?? "Mi empresa"}
            </div>
            <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#00E5A0", display:"inline-block", animation:"blink 2.5s ease-in-out infinite" }} />
              <span style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"rgba(236,253,245,0.45)", letterSpacing:"0.06em" }}>Activo</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, padding:"12px 8px", display:"flex", flexDirection:"column", gap:1, overflowY:"auto", position:"relative", zIndex:1 }}>
          {open && <div style={{ padding:"0 4px 6px", fontSize:10, fontWeight:700, letterSpacing:"0.08em", color:"rgba(236,253,245,0.30)", fontFamily:"'Geist Mono',monospace" }}>MENÚ</div>}
          {NAV.map(n => {
            const active = n.match === "exact" ? pathname === n.href : pathname === n.href || pathname?.startsWith(n.href + "/");
            return (
              <Link key={n.href} href={n.href} className={`sol-nl${active ? " on" : ""}`} title={!open ? n.label : undefined} style={{ justifyContent: open ? "flex-start" : "center" }}>
                <span style={{ flexShrink:0 }}>{n.icon}</span>
                {open && <span style={{ truncate:true }}>{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding:"8px 8px 14px", borderTop:"1px solid rgba(255,255,255,0.08)", position:"relative", zIndex:1, flexShrink:0 }}>
          <button
            onClick={handleLogout}
            className="sol-nl"
            style={{ justifyContent: open ? "flex-start" : "center" }}
            title={!open ? "Cerrar sesión" : undefined}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 7.5H3M7 4.5l-3 3 3 3M13 2v11"/></svg>
            {open && "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div style={{ marginLeft: W, minHeight:"100vh", background:"#F4F6FB", fontFamily:"'Geist',sans-serif", transition:"margin-left .25s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ maxWidth:1400, padding:"36px 40px 56px" }}>
          {children}
        </div>
      </div>
    </>
  );
}
