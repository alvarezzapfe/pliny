"use client";

import React, { useState, useEffect } from "react";

const NAV: Array<{ id: string; label: string }> = [
  { id: "producto", label: "Producto" },
  { id: "pricing", label: "Pricing" },
  { id: "about", label: "About" },
];

export default function Home() {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [activeRow, setActiveRow] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);

    if (typeof window === "undefined") return;

    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll(); // set initial state

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        background: "var(--bg)",
        color: "var(--fg)",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        :root {
          --font-sans: 'Geist', -apple-system, sans-serif;
          --font-mono: 'Geist Mono', monospace;
          --bg:        #0C1E4A;
          --bg-2:      #0F2254;
          --bg-3:      #132660;
          --fg:        #EEF2FF;
          --fg-2:      rgba(238,242,255,0.62);
          --fg-3:      rgba(238,242,255,0.36);
          --border:    rgba(255,255,255,0.08);
          --border-2:  rgba(255,255,255,0.15);
          --accent:    #5B8DEF;
          --accent-2:  #00E5A0;
          --accent-glow: rgba(91,141,239,0.22);
          --red:       #FF5C5C;
          --amber:     #F5A623;
          --green:     #00E5A0;
        }

        /* ── Keyframes ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity:0; } to { opacity:1; }
        }
        @keyframes scanline {
          from { transform: translateY(-100%); }
          to   { transform: translateY(400%); }
        }
        @keyframes blink {
          0%,100% { opacity:1; } 50% { opacity:0; }
        }
        @keyframes ticker {
          from { transform:translateX(0); }
          to   { transform:translateX(-50%); }
        }
        @keyframes shimmerBar {
          from { background-position: -200px 0; }
          to   { background-position: 200px 0; }
        }

        .mount { opacity:0; animation: fadeUp 0.6s cubic-bezier(.16,1,.3,1) forwards; }
        .mount-1 { animation-delay: 0.05s; }
        .mount-2 { animation-delay: 0.12s; }
        .mount-3 { animation-delay: 0.20s; }
        .mount-4 { animation-delay: 0.30s; }
        .mount-5 { animation-delay: 0.42s; }

        /* ── Nav ── */
        .nav-wrap {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          transition: background 0.3s, border-color 0.3s;
        }
        .nav-wrap.scrolled {
          background: rgba(8,12,20,0.85);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(24px);
        }
        .nav-inner {
          max-width: 1120px; margin: 0 auto;
          padding: 0 24px;
          height: 56px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .logo-mark {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none;
        }
        .logo-text {
          font-size: 15px; font-weight: 700; color: var(--fg);
          letter-spacing: -0.03em;
        }
        .logo-sub {
          font-family: var(--font-mono);
          font-size: 9px; color: var(--accent-2);
          letter-spacing: 0.1em; margin-top: 1px;
        }
        .nav-links { display: flex; align-items: center; gap: 2px; }
        .nav-btn {
          background: none; border: none; cursor: pointer;
          font-family: var(--font-sans); font-size: 13px;
          font-weight: 500; color: var(--fg-2);
          padding: 6px 12px; border-radius: 7px;
          transition: color 0.15s, background 0.15s;
        }
        .nav-btn:hover { color: var(--fg); background: rgba(255,255,255,0.06); }
        .nav-ctas { display: flex; align-items: center; gap: 8px; }

        /* ── Buttons ── */
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          font-family: var(--font-sans); font-size: 13px; font-weight: 600;
          border-radius: 9px; border: none; cursor: pointer;
          text-decoration: none; transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
          letter-spacing: -0.01em; white-space: nowrap;
        }
        .btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-sm { padding: 7px 14px; font-size: 12px; }
        .btn-md { padding: 10px 20px; }
        .btn-lg { padding: 13px 26px; font-size: 14px; }
        .btn-solid {
          background: var(--fg); color: #080C14;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2);
        }
        .btn-solid:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3); }
        .btn-ghost {
          background: rgba(255,255,255,0.06);
          color: var(--fg-2); border: 1px solid var(--border);
        }
        .btn-ghost:hover { color: var(--fg); background: rgba(255,255,255,0.09); border-color: var(--border-2); }
        .btn-accent {
          background: var(--accent); color: #fff;
          box-shadow: 0 0 32px rgba(61,126,255,0.30), 0 4px 16px rgba(0,0,0,0.3);
        }
        .btn-accent:hover { box-shadow: 0 0 48px rgba(61,126,255,0.40), 0 8px 24px rgba(0,0,0,0.4); }

        /* ── Section shell ── */
        .section { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .divider { width: 100%; height: 1px; background: var(--border); }

        /* ── Mono label ── */
        .mono-label {
          font-family: var(--font-mono); font-size: 10px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase; color: var(--fg-3);
        }
        .mono-label.accent { color: var(--accent-2); }

        /* ── Dashboard card ── */
        .db-card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.5);
        }
        .db-topbar {
          background: var(--bg-3);
          border-bottom: 1px solid var(--border);
          padding: 10px 16px;
          display: flex; align-items: center; gap: 8px;
        }
        .db-dot { width: 10px; height: 10px; border-radius: 50%; }
        .db-tab {
          font-family: var(--font-mono); font-size: 10px;
          color: var(--fg-3); padding: 3px 10px; border-radius: 5px;
          cursor: default;
        }
        .db-tab.active { background: rgba(255,255,255,0.07); color: var(--fg-2); }

        /* ── Table ── */
        .tbl-head {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 100px;
          padding: 8px 16px;
          border-bottom: 1px solid var(--border);
        }
        .tbl-head span {
          font-family: var(--font-mono); font-size: 10px;
          color: var(--fg-3); letter-spacing: 0.06em;
        }
        .tbl-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 100px;
          padding: 11px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          align-items: center;
          cursor: default;
          transition: background 0.12s;
        }
        .tbl-row:hover { background: rgba(255,255,255,0.025); }
        .tbl-row:last-child { border-bottom: none; }

        /* ── Status pill ── */
        .status-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 8px; border-radius: 999px;
          font-family: var(--font-mono); font-size: 10px; font-weight: 500;
          letter-spacing: 0.04em;
        }
        .status-pill.green { background: rgba(0,229,160,0.10); color: var(--green); }
        .status-pill.amber { background: rgba(245,166,35,0.12); color: var(--amber); }
        .status-pill.red   { background: rgba(255,92,92,0.10);  color: var(--red);   }
        .status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

        /* ── Sparkline bar ── */
        .spark-bar {
          height: 3px; border-radius: 999px; background: rgba(255,255,255,0.08);
          overflow: hidden;
        }
        .spark-fill {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%);
        }
        .spark-fill.warn { background: var(--amber); }
        .spark-fill.danger { background: var(--red); }

        /* ── Mini sparkline chart ── */
        .mini-chart { position: relative; height: 48px; }

        /* ── Ticker ── */
        .ticker-mask {
          mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
          overflow: hidden;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .ticker-track { display: flex; animation: ticker 36s linear infinite; }

        /* ── Feature grid ── */
        .feat-card {
          padding: 24px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          transition: background 0.2s;
        }
        .feat-card:hover { background: rgba(255,255,255,0.025); }

        /* ── Pricing ── */
        .price-card {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 16px; padding: 28px;
          transition: border-color 0.2s;
          position: relative; overflow: hidden;
        }
        .price-card.highlight {
          border-color: rgba(61,126,255,0.35);
          box-shadow: 0 0 0 1px rgba(61,126,255,0.12), 0 24px 60px rgba(0,0,0,0.4);
        }

        /* ── Input ── */
        .inp {
          width: 100%; background: rgba(255,255,255,0.05);
          border: 1px solid var(--border); border-radius: 9px;
          padding: 10px 14px; font-family: var(--font-sans);
          font-size: 13px; color: var(--fg); outline: none;
          transition: border-color 0.15s, background 0.15s;
        }
        .inp::placeholder { color: var(--fg-3); }
        .inp:focus { border-color: var(--accent-2); background: rgba(255,255,255,0.07); }

        /* ── Footer ── */
        .foot-link {
          font-size: 13px; color: var(--fg-3); text-decoration: none;
          transition: color 0.15s;
        }
        .foot-link:hover { color: var(--fg-2); }

        /* scanline effect on dashboard */
        .scanline-wrap { position: relative; overflow: hidden; }
        .scanline-wrap::after {
          content: '';
          position: absolute; left: 0; right: 0; top: 0;
          height: 30%; pointer-events: none;
          background: linear-gradient(to bottom, transparent, rgba(61,126,255,0.025), transparent);
          animation: scanline 5s linear infinite;
        }

        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .tbl-row, .tbl-head { grid-template-columns: 2fr 1fr 100px !important; }
          .tbl-row .hide-mob, .tbl-head .hide-mob { display: none; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .price-grid { grid-template-columns: 1fr !important; }
          .footer-cols { grid-template-columns: 1fr 1fr !important; }
          .nav-links { display: none !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════
          BACKGROUND
      ══════════════════════════════════════════ */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 120% 80% at 30% 0%, #1B3F8A 0%, #0C1E4A 50%, #091530 100%)" }} />
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "70vh",
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,141,239,0.20) 0%, transparent 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, opacity: 0.5,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 100% 80% at 50% 0%, #000 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 100% 80% at 50% 0%, #000 30%, transparent 80%)",
        }} />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }}>
          <filter id="n">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#n)" />
        </svg>
      </div>

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <header className={`nav-wrap${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <a href="/" className="logo-mark">
            <img
              src="/plinius.png"
              alt=""
              style={{ height: 22, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.9 }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div>
              <div className="logo-text">Plinius</div>
              <div className="logo-sub">CREDIT OS</div>
            </div>
          </a>

          <nav className="nav-links">
            {NAV.map((n) => (
              <button key={n.id} className="nav-btn" onClick={() => go(n.id)}>
                {n.label}
              </button>
            ))}
          </nav>

          <div className="nav-ctas">
            <a href="/login" className="btn btn-ghost btn-sm">Acceder</a>
            <a href="/register" className="btn btn-solid btn-sm">Empezar →</a>
          </div>
        </div>
      </header>

      {/* TODO: El resto de tu JSX sigue igual debajo de aquí */}
      {/* Pegaste un archivo larguísimo; no toqué nada más de estructura/estilos. */}
      {/* IMPORTANTE: Si quieres, te lo regreso también con el resto completo ya pegado,
          pero el cambio TS que te tronaba está resuelto con lo de arriba. */}

      {/* ───────────────────────────────────────── */}
      {/* TU CONTENIDO RESTANTE (sin cambios) */}
      {/* ───────────────────────────────────────── */}

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      {/* ... (deja el resto exactamente como lo tienes) ... */}

    </div>
  );
}