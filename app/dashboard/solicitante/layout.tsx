"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { clearSession } from "@/lib/auth";

function Icon({ d, size = 15 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const NAV = [
  {
    href: "/dashboard/solicitante",
    label: "Dashboard",
    match: "exact",
    icon: "M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z",
  },
  {
    href: "/dashboard/solicitante/solicitudes",
    label: "Solicitudes",
    match: "prefix",
    icon: "M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zM6 6h4M6 9h4M6 12h2",
  },
  {
    href: "/dashboard/solicitante/creditos",
    label: "Créditos",
    match: "prefix",
    icon: "M2 12L6 7l3 3 3-4 2 2",
  },
  {
    href: "/dashboard/datos",
    label: "Mis datos",
    match: "prefix",
    icon: "M8 2a4 4 0 100 8A4 4 0 008 2zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4",
  },
];

const W_OPEN = 232;
const W_CLOSE = 60;

export default function SolicitanteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const W = open ? W_OPEN : W_CLOSE;

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.push("/login");
        return;
      }

      setUserEmail(auth.user.email ?? null);

      const { data: profile } = await supabase
        .from("borrowers_profile")
        .select("company_name, onboarding_done")
        .eq("owner_id", auth.user.id)
        .maybeSingle();

      if (!profile?.onboarding_done) {
        router.push("/onboarding/solicitante");
        return;
      }
      setCompanyName(profile.company_name ?? null);
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
        @keyframes blink    { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }

        /* ── Sidebar shell ── */
        .sol-sb {
          position: fixed; top: 0; left: 0; bottom: 0;
          background: radial-gradient(ellipse 160% 120% at 15% 0%,
            #065F46 0%, #047857 35%, #064E3B 70%, #022C22 100%);
          border-right: 1px solid rgba(255,255,255,.07);
          display: flex; flex-direction: column;
          overflow: hidden; z-index: 40;
          transition: width .25s cubic-bezier(.16,1,.3,1);
        }
        .sol-grid {
          position: absolute; inset: 0; pointer-events: none; opacity: .18;
          background-image:
            linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        /* ── Nav links ── */
        .sol-nl {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 11px; border-radius: 10px;
          font-family: 'Geist', sans-serif;
          font-size: 13px; font-weight: 500;
          color: rgba(209,250,229,.58);
          text-decoration: none; white-space: nowrap; overflow: hidden;
          transition: background .14s, color .14s, border-left-color .14s;
          cursor: pointer; border: none; border-left: 2px solid transparent;
          background: none; width: 100%; text-align: left;
        }
        .sol-nl:hover  { background: rgba(255,255,255,.07); color: #D1FAE5; }
        .sol-nl.on     {
          background: rgba(0,229,160,.13);
          color: #fff; font-weight: 600;
          border-left-color: #00E5A0;
        }
        .sol-nl .ico   { flex-shrink: 0; }

        /* ── Collapse button ── */
        .sol-cb {
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,.07); border: none;
          border-radius: 7px; padding: 5px; cursor: pointer;
          color: rgba(209,250,229,.35); flex-shrink: 0;
          transition: background .14s, color .14s;
        }
        .sol-cb:hover { background: rgba(255,255,255,.13); color: #D1FAE5; }

        /* ── Section label ── */
        .sol-section {
          padding: 0 4px 5px;
          font-size: 9px; font-weight: 700; letter-spacing: .10em;
          text-transform: uppercase; color: rgba(209,250,229,.25);
          font-family: 'Geist Mono', monospace;
        }

        /* ── Content area ── */
        .sol-content {
          min-height: 100vh;
          background: #F0F7F4;
          font-family: 'Geist', sans-serif;
          transition: margin-left .25s cubic-bezier(.16,1,.3,1);
        }
      `}</style>

      {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className="sol-sb" style={{ width: W }}>
        <div className="sol-grid"/>

        {/* Logo row */}
        <div style={{
          padding: "15px 13px",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          display: "flex", alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          position: "relative", zIndex: 1, gap: 8, flexShrink: 0,
        }}>
          {open && (
            <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0, overflow:"hidden" }}>
              <img src="/plinius.png" alt="Plinius"
                style={{ height:22, width:"auto", filter:"brightness(0) invert(1)", opacity:.9, flexShrink:0 }}
                onError={e => (e.currentTarget.style.display = "none")}
              />
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#ECFDF5", letterSpacing:"-.03em", lineHeight:1 }}>Plinius</div>
                <div style={{ fontSize:9, fontFamily:"'Geist Mono',monospace", color:"#00E5A0", letterSpacing:".10em", marginTop:2 }}>CREDIT OS</div>
              </div>
            </div>
          )}
          <button className="sol-cb" onClick={() => setOpen(v => !v)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {open
                ? <path d="M9 6.5H4M6.5 4l-2.5 2.5 2.5 2.5"/>
                : <path d="M4 6.5h5M6.5 4l2.5 2.5-2.5 2.5"/>}
            </svg>
          </button>
        </div>

        {/* Company pill */}
        {open && companyName && (
          <div style={{
            margin: "10px 10px 0",
            padding: "9px 12px",
            background: "rgba(0,229,160,.08)",
            border: "1px solid rgba(0,229,160,.18)",
            borderRadius: 10,
            position: "relative", zIndex: 1,
          }}>
            <div style={{ fontSize:9, fontWeight:700, color:"rgba(209,250,229,.40)", letterSpacing:".08em", fontFamily:"'Geist Mono',monospace", marginBottom:2 }}>EMPRESA</div>
            <div style={{ fontSize:12, fontWeight:700, color:"#00E5A0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{companyName}</div>
            {userEmail && (
              <div style={{ fontSize:10, color:"rgba(209,250,229,.40)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{userEmail}</div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav style={{
          flex:1, padding:"12px 8px",
          display:"flex", flexDirection:"column", gap:2,
          overflowY:"auto", position:"relative", zIndex:1,
        }}>
          {open && <div className="sol-section">Menú</div>}
          {NAV.map(n => {
            const active = n.match === "exact"
              ? pathname === n.href
              : pathname === n.href || pathname?.startsWith(n.href + "/");
            return (
              <Link key={n.href} href={n.href}
                className={`sol-nl${active ? " on" : ""}`}
                title={!open ? n.label : undefined}
                style={{ justifyContent: open ? "flex-start" : "center" }}>
                <span className="ico"><Icon d={n.icon}/></span>
                {open && n.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{
          padding:"8px 8px 14px",
          borderTop:"1px solid rgba(255,255,255,.07)",
          display:"flex", flexDirection:"column", gap:2,
          position:"relative", zIndex:1, flexShrink:0,
        }}>
          <button
            className="sol-nl"
            onClick={handleLogout}
            title={!open ? "Cerrar sesión" : undefined}
            style={{ justifyContent: open ? "flex-start" : "center" }}
          >
            <span className="ico">
              <Icon d="M10 8H3M6 5l-3 3 3 3M13 2v12"/>
            </span>
            {open && "Cerrar sesión"}
          </button>

          {open && (
            <div style={{
              marginTop:6, padding:"8px 11px",
              background:"rgba(0,229,160,.07)",
              border:"1px solid rgba(0,229,160,.15)",
              borderRadius:9,
              display:"flex", alignItems:"center", gap:7,
            }}>
              <span style={{
                width:6, height:6, borderRadius:"50%",
                background:"#00E5A0", display:"inline-block",
                animation:"blink 2.5s ease-in-out infinite",
              }}/>
              <span style={{ fontSize:10, fontFamily:"'Geist Mono',monospace", color:"#00E5A0", letterSpacing:".06em" }}>
                Solicitante activo
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* ── CONTENT ──────────────────────────────────────────────────── */}
      <div className="sol-content" style={{ marginLeft: W }}>
        <div style={{ maxWidth:1400, padding:"36px 40px 56px" }}>
          {children}
        </div>
      </div>
    </>
  );
}