"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function Icon({ d, size = 15 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const NAV = [
  { href: "/fondeador",          label: "Inicio",         icon: "M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" },
  { href: "/fondeador/perfil",   label: "Mi Perfil",      icon: "M8 2a4 4 0 100 8 4 4 0 000-8zM2 14c0-2.2 2.7-4 6-4s6 1.8 6 4" },
  { href: "/fondeador/inbox",    label: "Inbox",          icon: "M2 4h12v8H2zM2 4l6 4.5L14 4" },
  { href: "/fondeador/ajustes",  label: "Configuración",  icon: "M8 5a3 3 0 100 6M2.5 8h1M12.5 8h1M8 2.5v1M8 12.5v1M4.2 4.2l.7.7M11.1 11.1l.7.7M4.2 11.8l.7-.7M11.1 4.9l.7-.7" },
];

const BOTTOM = [
  { href: "/login", label: "Salir", icon: "M10 8H3M6 5l-3 3 3 3M13 2v12" },
];

const W_OPEN = 240;
const W_CLOSE = 64;

export default function FondeadorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const W = open ? W_OPEN : W_CLOSE;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        .fsb {
          position: fixed; top: 0; left: 0; bottom: 0;
          background: radial-gradient(ellipse 160% 110% at 20% 0%, #1B3F8A 0%, #0C1E4A 55%, #091530 100%);
          border-right: 1px solid rgba(255,255,255,.07);
          display: flex; flex-direction: column;
          overflow: hidden; z-index: 40;
          transition: width .25s cubic-bezier(.16,1,.3,1);
        }
        .fsb-grid {
          position: absolute; inset: 0; pointer-events: none; opacity: .28;
          background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .fnl {
          display: flex; align-items: center; gap: 11px;
          padding: 8px 11px; border-radius: 9px;
          font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(238,242,255,.58); text-decoration: none;
          white-space: nowrap; overflow: hidden;
          transition: background .14s, color .14s;
          cursor: pointer; border: none; background: none;
          width: 100%; text-align: left;
        }
        .fnl:hover { background: rgba(255,255,255,.07); color: #EEF2FF; }
        .fnl.on   { background: rgba(59,130,246,.20); color: #fff; font-weight: 600; }
        .fnl .ico { flex-shrink: 0; }
        .fcb {
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,.07); border: none;
          border-radius: 7px; padding: 5px; cursor: pointer;
          color: rgba(238,242,255,.35); flex-shrink: 0;
          transition: background .14s, color .14s;
        }
        .fcb:hover { background: rgba(255,255,255,.13); color: #EEF2FF; }
      `}</style>

      <aside className="fsb" style={{ width: W }}>
        <div className="fsb-grid" />
        <div style={{ padding: "16px 14px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: open ? "space-between" : "center", position: "relative", zIndex: 1, gap: 8, flexShrink: 0 }}>
          {open && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, overflow: "hidden" }}>
              <img src="/plinius.png" alt="Plinius" style={{ height: 22, width: "auto", filter: "brightness(0) invert(1)", opacity: .9, flexShrink: 0 }} onError={e => (e.currentTarget.style.display = "none")} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#EEF2FF", letterSpacing: "-.03em", lineHeight: 1 }}>Plinius</div>
                <div style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#3B82F6", letterSpacing: ".10em", marginTop: 2 }}>FONDEADOR</div>
              </div>
            </div>
          )}
          <button className="fcb" onClick={() => setOpen(v => !v)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {open ? <path d="M9 6.5H4M6.5 4l-2.5 2.5 2.5 2.5" /> : <path d="M4 6.5h5M6.5 4l2.5 2.5-2.5 2.5" />}
            </svg>
          </button>
        </div>

        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", position: "relative", zIndex: 1 }}>
          {NAV.map(n => {
            const active = n.href === "/fondeador" ? pathname === n.href : pathname?.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`fnl${active ? " on" : ""}`} title={!open ? n.label : undefined} style={{ justifyContent: open ? "flex-start" : "center" }}>
                <span className="ico"><Icon d={n.icon} /></span>
                {open && n.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "8px 8px 14px", borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", flexDirection: "column", gap: 1, position: "relative", zIndex: 1, flexShrink: 0 }}>
          {BOTTOM.map(n => (
            <Link key={n.href} href={n.href} className="fnl" title={!open ? n.label : undefined} style={{ justifyContent: open ? "flex-start" : "center" }}>
              <span className="ico"><Icon d={n.icon} /></span>
              {open && n.label}
            </Link>
          ))}
          {open && (
            <div style={{ marginTop: 8, padding: "10px 11px", background: "rgba(59,130,246,.10)", border: "1px solid rgba(59,130,246,.22)", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", display: "inline-block" }} />
                <span style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "#3B82F6", letterSpacing: ".10em", fontWeight: 700 }}>FONDEADOR</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div style={{ marginLeft: W, minHeight: "100vh", background: "#F4F6FB", fontFamily: "'Geist', sans-serif", transition: "margin-left .25s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ maxWidth: 1400, padding: "36px 40px 56px" }}>
          {children}
        </div>
      </div>
    </>
  );
}
