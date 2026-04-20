"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlanProvider, usePlan } from "@/lib/PlanContext";

function Icon({ d, size = 15 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

const NAV = [
  { href: "/dashboard",               label: "Dashboard",    icon: "M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" },
  { href: "/dashboard/clientes",      label: "Clientes",     icon: "M5.5 7.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1 14s.5-4 4.5-4M11 10l2 2 2-2" },
  { href: "/dashboard/cartera",       label: "Cartera",      icon: "M2 12L6 7l3 3 3-4 2 2" },
  { href: "/dashboard/reportes",      label: "Reportes",     icon: "M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zM6 6h4M6 9h4M6 12h2" },
  { href: "/dashboard/datos",         label: "Datos",        icon: "M8 2a6 6 0 100 12M8 6v2.5M8 11h.01" },
  { href: "/dashboard/marketplace",   label: "Marketplace",  icon: "M2 2h12v8H2zM5 14h6M8 10v4" },
  { href: "/dashboard/fondeo",        label: "Fondeo",       icon: "M2 14h12M3 10h2v4H3zM7 7h2v7H7zM11 4h2v10h-2zM8 2l3 2-3 2-3-2z", special: "fondeo" },
  { href: "/dashboard/calculadora",   label: "Calculadora",  icon: "M3 2h10a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zM3 9h2v2H3zM7 9h2v2H7zM11 9h2v2H11zM3 13h2v2H3zM7 13h2v2H7zM11 13h2v2H11z" },
  { href: "/dashboard/applicants",    label: "Onboarding",   icon: "M8 2a3 3 0 110 6 3 3 0 010-6zM2 14c0-3.3 2.7-6 6-6s6 2.7 6 6M11 8l2 2M13 8l-2 2", special: "onboarding" },
  { href: "/dashboard/chat",          label: "Mensajes",     icon: "M2 2h12v8a2 2 0 01-2 2H4a2 2 0 01-2-2V2zM6 14h4M8 12v2" },
  { href: "/dashboard/plan",           label: "Mi Plan",      icon: "M2 2h12v2H2zM2 6h8M2 10h5M11 9l2 2 3-3", special: "plan" },
];

const BOTTOM = [
  { href: "/dashboard/ajustes", label: "Configuración", icon: "M8 5a3 3 0 100 6M2.5 8h1M12.5 8h1M8 2.5v1M8 12.5v1M4.2 4.2l.7.7M11.1 11.1l.7.7M4.2 11.8l.7-.7M11.1 4.9l.7-.7" },
  { href: "/login",             label: "Salir",         icon: "M10 8H3M6 5l-3 3 3 3M13 2v12" },
];

const W_OPEN  = 240;
const W_CLOSE = 64;


const PLAN_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  free:  { label: "FREE",  color: "#94A3B8", bg: "rgba(148,163,184,.10)", border: "rgba(148,163,184,.20)", dot: "#94A3B8" },
  basic: { label: "BASIC", color: "#38BDF8", bg: "rgba(56,189,248,.10)",  border: "rgba(56,189,248,.22)",  dot: "#38BDF8" },
  pro:   { label: "PRO",   color: "#00E5A0", bg: "rgba(0,229,160,.10)",   border: "rgba(0,229,160,.22)",   dot: "#00E5A0" },
};

function PlanDot({ plan }: { plan: string }) {
  const m = PLAN_META[plan] ?? PLAN_META.free;
  return (
    <div title={m.label} style={{ width: 8, height: 8, borderRadius: "50%", background: m.dot, boxShadow: `0 0 6px ${m.dot}`, animation: "blink 2.5s ease-in-out infinite" }} />
  );
}

function PlanWidget({ plan, since }: { plan: string; since: string | null }) {
  const m = PLAN_META[plan] ?? PLAN_META.free;
  const sinceStr = since ? new Date(since).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : null;
  return (
    <div style={{ padding: "10px 11px", background: m.bg, border: `1px solid ${m.border}`, borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sinceStr ? 6 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, display: "inline-block", animation: "blink 2.5s ease-in-out infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: m.color, letterSpacing: ".10em", fontWeight: 700 }}>{m.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E5A0", display: "inline-block", animation: "blink 2.5s ease-in-out infinite" }} />
          <span style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "rgba(0,229,160,.7)", letterSpacing: ".06em" }}>AL CORRIENTE</span>
        </div>
      </div>
      {sinceStr && (
        <div style={{ fontSize: 9, color: "rgba(238,242,255,.28)", fontFamily: "'Geist Mono',monospace", letterSpacing: ".04em" }}>
          Desde {sinceStr}
        </div>
      )}
    </div>
  );
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const [open, setOpen] = useState(true);
  const W = open ? W_OPEN : W_CLOSE;
  const planInfo = usePlan();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .sb {
          position: fixed; top: 0; left: 0; bottom: 0;
          background: radial-gradient(ellipse 160% 110% at 20% 0%, #1B3F8A 0%, #0C1E4A 55%, #091530 100%);
          border-right: 1px solid rgba(255,255,255,.07);
          display: flex; flex-direction: column;
          overflow: hidden; z-index: 40;
          transition: width .25s cubic-bezier(.16,1,.3,1);
        }
        .sb-grid {
          position: absolute; inset: 0; pointer-events: none; opacity: .28;
          background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .nl {
          display: flex; align-items: center; gap: 11px;
          padding: 8px 11px; border-radius: 9px;
          font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 500;
          color: rgba(238,242,255,.58); text-decoration: none;
          white-space: nowrap; overflow: hidden;
          transition: background .14s, color .14s;
          cursor: pointer; border: none; background: none;
          width: 100%; text-align: left;
        }
        .nl:hover { background: rgba(255,255,255,.07); color: #EEF2FF; }
        .nl.on    { background: rgba(91,141,239,.20); color: #fff; font-weight: 600; }
        .nl .ico  { flex-shrink: 0; }
        .nl.calc  { background: rgba(139,92,246,.10); color: rgba(167,139,250,.9); }
        .nl.calc:hover { background: rgba(139,92,246,.18); color: #A78BFA; }
        .nl.calc.on    { background: rgba(139,92,246,.25); color: #A78BFA; font-weight: 700; }
        .nl.onboarding { background: rgba(0,229,160,.06); color: rgba(0,229,160,.8); }
        .nl.onboarding:hover { background: rgba(0,229,160,.12); color: #00E5A0; }
        .nl.onboarding.on    { background: rgba(0,229,160,.18); color: #00E5A0; font-weight: 700; }
        .nl.plan  { background: rgba(251,191,36,.06); color: rgba(251,191,36,.8); }
        .nl.plan:hover { background: rgba(251,191,36,.12); color: #FBB924; }
        .nl.plan.on    { background: rgba(251,191,36,.18); color: #FBB924; font-weight: 700; }
        .nl.fondeo { background: rgba(59,130,246,.06); color: rgba(59,130,246,.8); }
        .nl.fondeo:hover { background: rgba(59,130,246,.12); color: #3B82F6; }
        .nl.fondeo.on    { background: rgba(59,130,246,.18); color: #3B82F6; font-weight: 700; }
        .cb {
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,.07); border: none;
          border-radius: 7px; padding: 5px; cursor: pointer;
          color: rgba(238,242,255,.35); flex-shrink: 0;
          transition: background .14s, color .14s;
        }
        .cb:hover { background: rgba(255,255,255,.13); color: #EEF2FF; }
      `}</style>

      <aside className="sb" style={{ width: W }}>
        <div className="sb-grid"/>
        <div style={{ padding: "16px 14px", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: open ? "space-between" : "center", position: "relative", zIndex: 1, gap: 8, flexShrink: 0 }}>
          {open && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, overflow: "hidden" }}>
              <img src="/plinius.png" alt="Plinius" style={{ height: 22, width: "auto", filter: "brightness(0) invert(1)", opacity: .9, flexShrink: 0 }} onError={e => (e.currentTarget.style.display = "none")}/>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#EEF2FF", letterSpacing: "-.03em", lineHeight: 1 }}>Plinius</div>
                <div style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#00E5A0", letterSpacing: ".10em", marginTop: 2 }}>CREDIT OS</div>
              </div>
            </div>
          )}
          <button className="cb" onClick={() => setOpen(v => !v)}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {open ? <path d="M9 6.5H4M6.5 4l-2.5 2.5 2.5 2.5"/> : <path d="M4 6.5h5M6.5 4l2.5 2.5-2.5 2.5"/>}
            </svg>
          </button>
        </div>

        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", position: "relative", zIndex: 1 }}>
          {NAV.map(n => {
            const active = n.href === "/dashboard" ? pathname === n.href : pathname?.startsWith(n.href);
            const isCalc   = n.href === "/dashboard/calculadora";
            const isOnb    = n.special === "onboarding";
            const isPlan   = n.special === "plan";
            const isFondeo = n.special === "fondeo";
            const cls = `nl${isCalc ? " calc" : ""}${isOnb ? " onboarding" : ""}${isPlan ? " plan" : ""}${isFondeo ? " fondeo" : ""}${active ? " on" : ""}`;
            return (
              <Link key={n.href} href={n.href}
                className={cls}
                title={!open ? n.label : undefined}
                style={{ justifyContent: open ? "flex-start" : "center" }}>
                <span className="ico"><Icon d={n.icon}/></span>
                {open && n.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "8px 8px 14px", borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", flexDirection: "column", gap: 1, position: "relative", zIndex: 1, flexShrink: 0 }}>
          {BOTTOM.map(n => (
            <Link key={n.href} href={n.href} className="nl" title={!open ? n.label : undefined} style={{ justifyContent: open ? "flex-start" : "center" }}>
              <span className="ico"><Icon d={n.icon}/></span>
              {open && n.label}
            </Link>
          ))}
          {open && (
            <div style={{ marginTop: 8 }}>
              <PlanWidget plan={planInfo.plan} since={planInfo.since} />
            </div>
          )}
          {!open && (
            <div style={{ display:"flex", justifyContent:"center", marginTop:8 }}>
              <PlanDot plan={planInfo.plan} />
            </div>
          )}
        </div>
      </aside>

      <div style={{ marginLeft: W, minHeight: "100vh", background: "#F4F6FB", fontFamily: "'Geist', sans-serif", transition: "margin-left .25s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ maxWidth: ["/dashboard/calculadora","/dashboard/cartera-valuacion"].some(p=>pathname?.startsWith(p)) ? "none" : 1400, padding: ["/dashboard/calculadora","/dashboard/cartera-valuacion"].some(p=>pathname?.startsWith(p)) ? "0" : "36px 40px 56px" }}>
          {children}
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      <DashboardInner>{children}</DashboardInner>
    </PlanProvider>
  );
}
