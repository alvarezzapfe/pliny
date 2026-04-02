"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";

type NavItem = { id: string; label: string };
const NAV: NavItem[] = [
  { id: "producto", label: "Producto" },
  { id: "marketplace", label: "Marketplace" },
  { id: "pricing", label: "Pricing" },
  { id: "about", label: "About" },
];

type TableRow = {
  name: string; monto: string; score: number; vcto: string;
  status: "green" | "amber" | "red"; label: string; pct: number;
};

type SolicitudCard = {
  sector: string; monto: string; plazo: string;
  garantia: string; fact: string; tag: string;
};

type MarketStats = { count: number; montoTotal: number; tasaPromedio: number | null };

export default function Home() {
  const [scrolled,   setScrolled]   = useState(false);
  const [activeTab,  setActiveTab]  = useState<"otorgante"|"solicitante">("otorgante");
  const [empresa,    setEmpresa]    = useState("");
  const [correo,     setCorreo]     = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle"|"loading"|"done"|"error">("idle");
  const [mktStats,   setMktStats]   = useState<MarketStats>({ count: 0, montoTotal: 0, tasaPromedio: null });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const res = await fetch(
          `${url}/rest/v1/solicitudes?select=monto,tasa_solicitada&status=eq.enviada`,
          { headers: { apikey: key, Authorization: `Bearer ${key}` } }
        );
        const data: { monto: number; tasa_solicitada: number | null }[] = await res.json();
        const count = data.length;
        const montoTotal = data.reduce((s, r) => s + (r.monto || 0), 0);
        const tasas = data.map(r => r.tasa_solicitada).filter((t): t is number => t !== null);
        const tasaPromedio = tasas.length > 0 ? tasas.reduce((s, t) => s + t, 0) / tasas.length : null;
        setMktStats({ count, montoTotal, tasaPromedio });
      } catch { /* mantiene defaults */ }
    }
    fetchStats();
  }, []);

  const go = (id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  async function submitLead() {
    if (!empresa.trim()) return alert("Empresa requerida.");
    if (!correo.trim())  return alert("Correo requerido.");
    setLeadStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "contacto", company: empresa.trim(), name: empresa.trim(), email: correo.trim() }),
      });
      if (!res.ok) throw new Error();
      setLeadStatus("done");
      setEmpresa("");
      setCorreo("");
    } catch {
      setLeadStatus("error");
    }
  }

  const rows: TableRow[] = useMemo(() => [
    { name:"SOFOM Región Sur",       monto:"$2.1M", score:84, vcto:"Mar 26", status:"green", label:"Al corriente", pct:88 },
    { name:"Fondo Infraestructura",  monto:"$5.8M", score:77, vcto:"Jun 26", status:"green", label:"Al corriente", pct:72 },
    { name:"Crédito PyME · Batch 4", monto:"$890K", score:51, vcto:"Ene 26", status:"amber", label:"En monitoreo", pct:51 },
    { name:"Desarrolladora Norte",   monto:"$3.2M", score:38, vcto:"Feb 26", status:"red",   label:"Alerta",       pct:35 },
    { name:"Logística Central S.A.", monto:"$1.5M", score:90, vcto:"Ago 26", status:"green", label:"Al corriente", pct:95 },
  ], []);

  const solicitudes: SolicitudCard[] = [
    { sector:"Manufactura",  monto:"$8.5M",  plazo:"24m", garantia:"Hipotecaria", fact:"$20M–$50M",  tag:"Capital de trabajo"  },
    { sector:"Tecnología",   monto:"$2.1M",  plazo:"12m", garantia:"Aval",        fact:"$5M–$20M",   tag:"Expansión"           },
    { sector:"Construcción", monto:"$15M",   plazo:"36m", garantia:"Hipotecaria", fact:">$50M",       tag:"Proyectos"           },
    { sector:"Comercio",     monto:"$900K",  plazo:"6m",  garantia:"Prendaria",   fact:"$1M–$5M",    tag:"Inventario"          },
    { sector:"Salud",        monto:"$3.4M",  plazo:"18m", garantia:"Sin garantía",fact:"$5M–$20M",   tag:"Equipamiento"        },
    { sector:"Agro",         monto:"$5.2M",  plazo:"12m", garantia:"Prendaria",   fact:"$20M–$50M",  tag:"Capital de trabajo"  },
  ];

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    :root {
      --font-sans: 'DM Sans', -apple-system, system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      --bg:        #060B18;
      --bg-2:      #0A1020;
      --bg-3:      #0D1428;
      --fg:        #F0F4FF;
      --fg-2:      rgba(240,244,255,0.60);
      --fg-3:      rgba(240,244,255,0.32);
      --border:    rgba(255,255,255,0.07);
      --border-2:  rgba(255,255,255,0.14);
      --accent:    #4F8EF7;
      --accent-2:  #00E5A0;
      --purple:    #8B5CF6;
      --cyan:      #06B6D4;
      --red:       #F87171;
      --amber:     #FBBF24;
      --green:     #00E5A0;
      --grad:      linear-gradient(135deg, #8B5CF6 0%, #4F8EF7 50%, #06B6D4 100%);
      --grad-text: linear-gradient(135deg, #A78BFA 0%, #60A5FA 45%, #22D3EE 100%);
    }

    /* ── KEYFRAMES ── */
    @keyframes fadeUp    { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
    @keyframes ticker    { from { transform:translateX(0); } to { transform:translateX(-50%); } }
    @keyframes blink     { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
    @keyframes spin      { to { transform:rotate(360deg); } }
    @keyframes meshMove  { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(30px,-20px) scale(1.05); } 66% { transform:translate(-20px,15px) scale(0.97); } }
    @keyframes meshMove2 { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(-25px,20px) scale(1.04); } 66% { transform:translate(20px,-15px) scale(0.98); } }
    @keyframes scanBeam  { from { transform:translateY(-100%); } to { transform:translateY(400%); } }
    @keyframes borderGlow { 0%,100% { border-color: rgba(79,142,247,.25); } 50% { border-color: rgba(139,92,246,.45); } }
    @keyframes counterUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    @keyframes shimmer   { from { background-position: -200% 0; } to { background-position: 200% 0; } }

    /* ── MOUNT ANIMATIONS ── */
    .mount { opacity:0; transform:translateY(18px); animation:fadeUp 0.7s cubic-bezier(.16,1,.3,1) forwards; }
    .mount-1 { animation-delay:0.05s; } .mount-2 { animation-delay:0.15s; }
    .mount-3 { animation-delay:0.25s; } .mount-4 { animation-delay:0.38s; }
    .mount-5 { animation-delay:0.52s; } .mount-6 { animation-delay:0.68s; }
    @media (prefers-reduced-motion: reduce) { .mount { opacity:1 !important; transform:none !important; animation:none !important; } }

    /* ── NAV ── */
    .nav-wrap { position:fixed; top:0; left:0; right:0; z-index:100; transition:background .4s,border-color .4s; }
    .nav-wrap.scrolled { background:rgba(6,11,24,0.88); border-bottom:1px solid var(--border); backdrop-filter:blur(28px) saturate(160%); }
    .nav-inner { max-width:1160px; margin:0 auto; padding:0 28px; height:60px; display:flex; align-items:center; justify-content:space-between; }
    .logo-mark { display:flex; align-items:center; gap:10px; text-decoration:none; }
    .logo-text { font-size:16px; font-weight:700; color:var(--fg); letter-spacing:-0.04em; }
    .logo-sub  { font-family:var(--font-mono); font-size:8px; color:var(--accent-2); letter-spacing:0.14em; margin-top:1px; }
    .nav-links { display:flex; align-items:center; gap:2px; }
    .nav-btn { background:none; border:none; cursor:pointer; font-family:var(--font-sans); font-size:13.5px; font-weight:500; color:var(--fg-2); padding:6px 13px; border-radius:8px; transition:color .15s,background .15s; }
    .nav-btn:hover { color:var(--fg); background:rgba(255,255,255,0.05); }
    .nav-ctas { display:flex; align-items:center; gap:8px; }

    /* ── BUTTONS ── */
    .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; font-family:var(--font-sans); font-size:13.5px; font-weight:600; border-radius:10px; border:none; cursor:pointer; text-decoration:none; transition:all .2s cubic-bezier(.16,1,.3,1); letter-spacing:-0.015em; white-space:nowrap; }
    .btn:hover { transform:translateY(-1px); }
    .btn:disabled { opacity:.55; cursor:not-allowed; transform:none; }
    .btn-sm { padding:7px 15px; font-size:12.5px; }
    .btn-md { padding:11px 22px; }
    .btn-lg { padding:14px 28px; font-size:14.5px; }
    .btn-solid { background:var(--fg); color:#060B18; font-weight:700; box-shadow:0 1px 3px rgba(0,0,0,.5),0 6px 20px rgba(0,0,0,.3); }
    .btn-solid:hover { box-shadow:0 2px 8px rgba(0,0,0,.5),0 12px 32px rgba(0,0,0,.4); }
    .btn-ghost { background:rgba(255,255,255,0.05); color:var(--fg-2); border:1px solid var(--border); }
    .btn-ghost:hover { color:var(--fg); background:rgba(255,255,255,0.09); border-color:var(--border-2); }
    .btn-grad { background:var(--grad); color:#fff; font-weight:700; box-shadow:0 0 40px rgba(139,92,246,.35),0 4px 20px rgba(0,0,0,.4); position:relative; overflow:hidden; }
    .btn-grad::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.15) 0%,transparent 60%); pointer-events:none; }
    .btn-grad:hover { box-shadow:0 0 60px rgba(139,92,246,.5),0 8px 30px rgba(0,0,0,.5); }
    .btn-accent { background:var(--accent); color:#fff; box-shadow:0 0 32px rgba(79,142,247,.30),0 4px 16px rgba(0,0,0,.3); }
    .btn-green { background:var(--accent-2); color:#031A11; font-weight:700; box-shadow:0 0 28px rgba(0,229,160,.25),0 4px 16px rgba(0,0,0,.3); }

    /* ── LAYOUT ── */
    .section { max-width:1160px; margin:0 auto; padding:0 28px; }

    /* ── TYPOGRAPHY ── */
    .mono-label { font-family:var(--font-mono); font-size:10px; font-weight:500; letter-spacing:0.14em; text-transform:uppercase; color:var(--fg-3); }
    .mono-label.accent { color:var(--accent-2); }
    .mono-label.purple { color:#A78BFA; }
    .grad-text { background:var(--grad-text); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

    /* ── BADGE / PILL ── */
    .badge-live { display:inline-flex; align-items:center; gap:8px; border:1px solid rgba(139,92,246,.25); background:rgba(139,92,246,.07); border-radius:999px; padding:5px 14px 5px 10px; backdrop-filter:blur(8px); animation:borderGlow 4s ease-in-out infinite; }
    .badge-live span.dot { width:6px; height:6px; border-radius:50%; background:var(--accent-2); display:inline-block; animation:blink 2s ease-in-out infinite; }
    .badge-live span.txt { font-family:var(--font-mono); font-size:10.5px; color:rgba(240,244,255,0.7); letter-spacing:0.08em; }

    /* ── DASHBOARD CARD ── */
    .db-card { background:rgba(10,16,32,.9); border:1px solid rgba(255,255,255,.09); border-radius:18px; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,.03),0 30px 100px rgba(0,0,0,.7),0 0 80px rgba(79,142,247,.06); backdrop-filter:blur(20px); }
    .db-topbar { background:rgba(13,20,40,.95); border-bottom:1px solid var(--border); padding:11px 18px; display:flex; align-items:center; gap:8px; }
    .db-dot { width:10px; height:10px; border-radius:50%; }
    .db-tab { font-family:var(--font-mono); font-size:10px; color:var(--fg-3); padding:3px 10px; border-radius:6px; transition:all .15s; }
    .db-tab.active { background:rgba(79,142,247,.12); color:var(--accent); border:1px solid rgba(79,142,247,.2); }

    /* ── TABLE ── */
    .tbl-head { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 110px; padding:9px 18px; border-bottom:1px solid var(--border); background:rgba(255,255,255,.015); }
    .tbl-head span { font-family:var(--font-mono); font-size:9.5px; color:var(--fg-3); letter-spacing:0.08em; text-transform:uppercase; }
    .tbl-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 110px; padding:12px 18px; border-bottom:1px solid rgba(255,255,255,.04); align-items:center; transition:background .12s; }
    .tbl-row:hover { background:rgba(79,142,247,.04); }
    .tbl-row:last-child { border-bottom:none; }
    .status-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:999px; font-family:var(--font-mono); font-size:9.5px; font-weight:500; letter-spacing:0.05em; }
    .status-pill.green { background:rgba(0,229,160,.08); color:var(--green); border:1px solid rgba(0,229,160,.15); }
    .status-pill.amber { background:rgba(251,191,36,.08); color:var(--amber); border:1px solid rgba(251,191,36,.15); }
    .status-pill.red   { background:rgba(248,113,113,.08); color:var(--red); border:1px solid rgba(248,113,113,.15); }
    .status-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }
    .spark-bar  { height:3px; border-radius:999px; background:rgba(255,255,255,.07); overflow:hidden; }
    .spark-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,var(--accent) 0%,var(--accent-2) 100%); transition:width .6s cubic-bezier(.16,1,.3,1); }
    .spark-fill.warn   { background:var(--amber); }
    .spark-fill.danger { background:var(--red); }

    /* ── KPI CARD ── */
    .kpi-card { background:rgba(255,255,255,.025); border:1px solid var(--border); border-radius:12px; padding:14px 16px; transition:all .2s; }
    .kpi-card:hover { border-color:var(--border-2); background:rgba(255,255,255,.04); }

    /* ── TICKER ── */
    .ticker-mask { mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent); -webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent); overflow:hidden; border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
    .ticker-track { display:flex; animation:ticker 40s linear infinite; }

    /* ── FEATURE GRID ── */
    .feat-card { padding:28px; border-right:1px solid var(--border); border-bottom:1px solid var(--border); transition:background .2s; position:relative; overflow:hidden; }
    .feat-card:hover { background:rgba(79,142,247,.03); }
    .feat-card::before { content:''; position:absolute; top:0; left:0; width:2px; height:0; background:var(--grad); transition:height .3s cubic-bezier(.16,1,.3,1); }
    .feat-card:hover::before { height:100%; }
    .feat-num { font-family:var(--font-mono); font-size:10px; color:rgba(139,92,246,.6); letter-spacing:0.12em; margin-bottom:16px; }

    /* ── PRICE CARD ── */
    .price-card { background:var(--bg-2); border:1px solid var(--border); border-radius:18px; padding:32px; transition:all .25s; position:relative; overflow:hidden; }
    .price-card::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139,92,246,.06), transparent 70%); pointer-events:none; }
    .price-card.highlight { border-color:rgba(79,142,247,.3); box-shadow:0 0 0 1px rgba(79,142,247,.1),0 30px 70px rgba(0,0,0,.5),0 0 60px rgba(79,142,247,.07); }
    .price-card.highlight:hover { border-color:rgba(139,92,246,.45); box-shadow:0 0 0 1px rgba(139,92,246,.15),0 40px 80px rgba(0,0,0,.6),0 0 80px rgba(139,92,246,.1); }

    /* ── TAB TOGGLE ── */
    .tab-toggle { display:inline-flex; background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:12px; padding:4px; gap:4px; }
    .tab-pill { padding:9px 22px; border-radius:9px; font-family:var(--font-sans); font-size:13.5px; font-weight:600; cursor:pointer; border:none; transition:all .2s cubic-bezier(.16,1,.3,1); letter-spacing:-0.015em; }
    .tab-pill.active-ot  { background:var(--accent);   color:#fff; box-shadow:0 2px 14px rgba(79,142,247,.45); }
    .tab-pill.active-sol { background:var(--accent-2); color:#031A11; box-shadow:0 2px 14px rgba(0,229,160,.4); }
    .tab-pill.inactive   { background:transparent; color:var(--fg-3); }
    .tab-pill.inactive:hover { color:var(--fg-2); background:rgba(255,255,255,.04); }

    /* ── SOL CARDS ── */
    .sol-card { background:var(--bg-2); border:1px solid var(--border); border-radius:14px; padding:20px; transition:all .22s cubic-bezier(.16,1,.3,1); position:relative; overflow:hidden; }
    .sol-card:hover { border-color:rgba(79,142,247,.25); background:rgba(13,20,40,.95); transform:translateY(-3px); box-shadow:0 16px 50px rgba(0,0,0,.5),0 0 30px rgba(79,142,247,.06); }
    .sol-card::before { content:''; position:absolute; top:0; right:0; width:80px; height:80px; background:radial-gradient(circle at top right, rgba(0,229,160,.07), transparent 70%); border-radius:0 14px 0 80px; }
    .sol-tag   { display:inline-flex; align-items:center; padding:3px 9px; border-radius:999px; font-family:var(--font-mono); font-size:9px; font-weight:600; letter-spacing:0.07em; background:rgba(0,229,160,.08); color:var(--accent-2); border:1px solid rgba(0,229,160,.18); }
    .sol-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-family:var(--font-mono); font-size:9px; background:rgba(255,255,255,.04); color:var(--fg-3); border:1px solid var(--border); }
    .sol-btn   { display:inline-flex; align-items:center; gap:5px; padding:7px 13px; border-radius:9px; border:none; font-family:var(--font-sans); font-size:11.5px; font-weight:700; cursor:pointer; transition:all .15s; }
    .sol-btn-ot    { background:var(--accent); color:#fff; box-shadow:0 2px 10px rgba(79,142,247,.3); }
    .sol-btn-ot:hover { box-shadow:0 4px 18px rgba(79,142,247,.5); transform:translateY(-1px); }
    .sol-btn-ghost { background:rgba(255,255,255,.05); color:var(--fg-3); border:1px solid var(--border); }
    .sol-btn-ghost:hover { color:var(--fg-2); border-color:var(--border-2); }

    /* ── STEPS ── */
    .step-line { position:absolute; left:19px; top:40px; bottom:-20px; width:1px; background:linear-gradient(to bottom, rgba(139,92,246,.3), transparent); }

    /* ── INPUTS ── */
    .inp { width:100%; background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:10px; padding:11px 15px; font-family:var(--font-sans); font-size:13.5px; color:var(--fg); outline:none; transition:all .2s; }
    .inp::placeholder { color:var(--fg-3); }
    .inp:focus { border-color:rgba(0,229,160,.4); background:rgba(255,255,255,.06); box-shadow:0 0 0 3px rgba(0,229,160,.08); }

    /* ── FOOTER ── */
    .foot-link { font-size:13px; color:var(--fg-3); text-decoration:none; transition:color .15s; }
    .foot-link:hover { color:var(--fg-2); }

    /* ── SCAN ── */
    .scanline-wrap { position:relative; overflow:hidden; }
    .scanline-wrap::after { content:''; position:absolute; left:0; right:0; top:0; height:25%; pointer-events:none; background:linear-gradient(to bottom,transparent,rgba(79,142,247,.018),transparent); animation:scanBeam 6s linear infinite; }

    /* ── MISC ── */
    .spin-ico { animation:spin .7s linear infinite; }

    /* ── STAT HIGHLIGHTS ── */
    .stat-block { border:1px solid var(--border); border-radius:14px; padding:24px 28px; background:rgba(255,255,255,.02); position:relative; overflow:hidden; transition:all .2s; }
    .stat-block:hover { border-color:var(--border-2); }
    .stat-block::before { content:''; position:absolute; bottom:0; left:0; right:0; height:2px; background:var(--grad); opacity:0; transition:opacity .3s; }
    .stat-block:hover::before { opacity:1; }

    /* ── SECTION DIVIDER ── */
    .section-divider { height:1px; background:linear-gradient(90deg, transparent, var(--border), transparent); margin:0 28px; }

    /* ── RESPONSIVE ── */
    @media (max-width:900px) { .nav-links { display:none !important; } }
    @media (max-width:768px) {
      .feat-grid { grid-template-columns:1fr !important; }
      .price-grid { grid-template-columns:1fr !important; }
      .footer-cols { grid-template-columns:1fr 1fr !important; }
      .tbl-row, .tbl-head { grid-template-columns:2fr 1fr 110px !important; }
      .tbl-row .hide-mob, .tbl-head .hide-mob { display:none; }
      .sol-grid { grid-template-columns:1fr !important; }
      .hero-about-grid { grid-template-columns:1fr !important; }
      .lead-grid { flex-direction:column !important; }
      .stats-grid { grid-template-columns:1fr 1fr !important; }
      .hero-ctas { flex-direction:column; align-items:center; }
    }
  `;

  return (
    <div style={{ fontFamily:"var(--font-sans)", background:"var(--bg)", color:"var(--fg)", minHeight:"100vh", overflowX:"hidden" }}>
      <style>{CSS}</style>

      {/* ── BACKGROUND MESH ── */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
        {/* Base */}
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 140% 90% at 60% -10%, #0E1A3A 0%, #060B18 55%, #04080F 100%)" }}/>
        {/* Mesh orb 1 — purple */}
        <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"70vw", height:"70vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)", animation:"meshMove 18s ease-in-out infinite", filter:"blur(1px)" }}/>
        {/* Mesh orb 2 — blue */}
        <div style={{ position:"absolute", top:"-10%", right:"-5%", width:"60vw", height:"60vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(79,142,247,0.14) 0%, transparent 65%)", animation:"meshMove2 22s ease-in-out infinite", filter:"blur(1px)" }}/>
        {/* Mesh orb 3 — cyan */}
        <div style={{ position:"absolute", top:"5%", left:"30%", width:"40vw", height:"40vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 65%)", animation:"meshMove 28s ease-in-out infinite reverse", filter:"blur(1px)" }}/>
        {/* Grid */}
        <div style={{ position:"absolute", inset:0, opacity:.35, backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize:"56px 56px", maskImage:"radial-gradient(ellipse 100% 70% at 50% 0%, #000 30%, transparent 75%)", WebkitMaskImage:"radial-gradient(ellipse 100% 70% at 50% 0%, #000 30%, transparent 75%)" }}/>
        {/* Grain */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:.03 }}>
          <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
          <rect width="100%" height="100%" filter="url(#grain)"/>
        </svg>
        {/* Top gradient fade */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"80vh", background:"radial-gradient(ellipse 90% 70% at 50% -10%, rgba(139,92,246,0.12) 0%, transparent 70%)", pointerEvents:"none" }}/>
      </div>

      {/* ── NAV ── */}
      <header className={`nav-wrap${scrolled?" scrolled":""}`}>
        <div className="nav-inner">
          <a href="/" className="logo-mark">
            <img src="/plinius.png" alt="" style={{ height:24, width:"auto", filter:"brightness(0) invert(1)", opacity:.92 }} onError={(e:React.SyntheticEvent<HTMLImageElement>)=>{ e.currentTarget.style.display="none"; }}/>
            <div><div className="logo-text">Plinius</div><div className="logo-sub">CRÉDITO</div></div>
          </a>
          <nav className="nav-links">
            {NAV.map(n=>(
              <button key={n.id} className="nav-btn" onClick={()=>go(n.id)}>{n.label}</button>
            ))}
          </nav>
          <div className="nav-ctas">
            <a href="/login" className="btn btn-ghost btn-sm">Acceder</a>
            <a href="/register" className="btn btn-grad btn-sm">Empezar →</a>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ position:"relative", zIndex:1, paddingTop:128 }}>
        <div className="section">

          {/* Live badge */}
          <div className="mount mount-1" style={{ display:"flex", justifyContent:"center", marginBottom:32 }}>
            <div className="badge-live">
              <span className="dot"/>
              <span className="txt">LIVE · CRÉDITO PRIVADO · MÉXICO</span>
            </div>
          </div>

          {/* Headline */}
          <div className="mount mount-2" style={{ textAlign:"center", marginBottom:22 }}>
            <h1 style={{ fontSize:"clamp(40px,6.5vw,80px)", fontWeight:800, lineHeight:1.0, letterSpacing:"-0.05em", color:"var(--fg)" }}>
              Infraestructura de crédito<br/>
              <span className="grad-text">para instituciones modernas.</span>
            </h1>
          </div>

          {/* Subheadline */}
          <div className="mount mount-3" style={{ textAlign:"center", marginBottom:36 }}>
            <p style={{ fontSize:18, color:"var(--fg-2)", lineHeight:1.7, maxWidth:"52ch", margin:"0 auto", fontWeight:400 }}>
              Cartera, señales de riesgo y marketplace de crédito en un solo lugar. Para bancos, sofomes, fondos y empresas que buscan financiamiento.
            </p>
          </div>

          {/* CTAs */}
          <div className="mount mount-4 hero-ctas" style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:24, flexWrap:"wrap" }}>
            <a href="/login" className="btn btn-grad btn-lg">Entrar a la consola →</a>
            <button className="btn btn-ghost btn-lg" onClick={()=>go("marketplace")}>Ver marketplace</button>
          </div>

          {/* Social proof micro-line */}
          <div className="mount mount-4" style={{ display:"flex", justifyContent:"center", marginBottom:72 }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              {["Bancos","SOFOMs","Fondos Privados","Fintechs"].map((t,i)=>(
                <React.Fragment key={t}>
                  {i>0 && <span style={{ width:3, height:3, borderRadius:"50%", background:"var(--fg-3)", display:"inline-block" }}/>}
                  <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--fg-3)", letterSpacing:"0.08em" }}>{t}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── DASHBOARD MOCK ── */}
          <div className="mount mount-5 db-card scanline-wrap" style={{ maxWidth:980, margin:"0 auto", marginBottom:-100 }}>
            <div className="db-topbar">
              <div className="db-dot" style={{ background:"#FF5F57" }}/><div className="db-dot" style={{ background:"#FFBD2E" }}/><div className="db-dot" style={{ background:"#28C840" }}/>
              <div style={{ flex:1, display:"flex", gap:6, marginLeft:14, flexWrap:"wrap" }}>
                {["Cartera","Risk signals","Marketplace","Config"].map((t,i)=>(
                  <div key={t} className={`db-tab${i===0?" active":""}`}>{t}</div>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--accent-2)", display:"inline-block", animation:"blink 2s ease-in-out infinite" }}/>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--fg-3)" }}>plinius.mx/dashboard</div>
              </div>
            </div>
            <div style={{ padding:"22px 18px 0" }}>
              {/* KPI row */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
                {[
                  {label:"Cartera total",   val:"$14.3M", delta:"+2.1%", up:true},
                  {label:"Créditos activos",val:"38",     delta:"+3",    up:true},
                  {label:"Mora > 90 días",  val:"2.4%",  delta:"+0.3%", up:false},
                  {label:"En marketplace",  val:"12",    delta:"nuevas", up:true},
                ].map(k=>(
                  <div key={k.label} className="kpi-card">
                    <div className="mono-label" style={{ marginBottom:7 }}>{k.label}</div>
                    <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.05em", color:"var(--fg)" }}>{k.val}</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:k.up?"var(--green)":"var(--red)", marginTop:5 }}>{k.delta}</div>
                  </div>
                ))}
              </div>
              {/* Table */}
              <div style={{ background:"rgba(255,255,255,.015)", border:"1px solid var(--border)", borderRadius:12, overflow:"hidden", marginBottom:18 }}>
                <div className="tbl-head"><span>Acreditado</span><span className="hide-mob">Monto</span><span className="hide-mob">Score</span><span>Vencimiento</span><span>Estado</span></div>
                {rows.map(r=>(
                  <div key={r.name} className="tbl-row">
                    <div style={{ fontSize:12.5, fontWeight:500, color:"var(--fg)" }}>{r.name}</div>
                    <div className="hide-mob" style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--fg-2)" }}>{r.monto}</div>
                    <div className="hide-mob" style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:56 }}><div className="spark-bar"><div className={`spark-fill${r.status==="amber"?" warn":r.status==="red"?" danger":""}`} style={{ width:`${r.pct}%` }}/></div></div>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--fg-3)" }}>{r.score}</span>
                    </div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--fg-3)" }}>{r.vcto}</div>
                    <div><span className={`status-pill ${r.status}`}><span className="status-dot"/>{r.label}</span></div>
                  </div>
                ))}
              </div>
            </div>
            {/* Fade out */}
            <div style={{ height:90, marginTop:-45, background:"linear-gradient(to bottom,transparent,rgba(10,16,32,.95))", borderRadius:"0 0 18px 18px" }}/>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div style={{ position:"relative", zIndex:1, paddingTop:136 }}>
        <div className="ticker-mask" style={{ padding:"11px 0", background:"rgba(255,255,255,.012)" }}>
          <div className="ticker-track">
            {[...Array(2)].map((_,ri)=>(
              <span key={ri} style={{ display:"flex" }}>
                {["Onboarding digital","SAT · CFDI · ZIP","Risk signals","Scoring crediticio","Reporte PDF ejecutivo","Multi-usuario · Roles","API-first","Monitor de covenants","Alertas de mora","Marketplace de crédito","Conexión otorgante-empresa"].map(t=>(
                  <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:16, padding:"0 32px" }}>
                    <span style={{ width:3, height:3, borderRadius:"50%", background:"rgba(139,92,246,.5)", display:"inline-block" }}/>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:10.5, color:"var(--fg-3)", letterSpacing:"0.1em" }}>{t}</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS BAND ── */}
      

      {/* ── MARKETPLACE ── */}
      <section id="marketplace" style={{ position:"relative", zIndex:1, padding:"96px 0" }}>
        <div className="section">
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", marginBottom:52 }}>
            <div className="mono-label accent" style={{ marginBottom:16 }}>// Marketplace</div>
            <h2 style={{ fontSize:"clamp(30px,4.5vw,52px)", fontWeight:800, letterSpacing:"-0.045em", lineHeight:1.04, marginBottom:16 }}>
              Donde el capital<br/><span className="grad-text">encuentra a las empresas.</span>
            </h2>
            <p style={{ fontSize:15.5, color:"var(--fg-2)", lineHeight:1.75, maxWidth:"50ch", marginBottom:36 }}>
              Otorgantes calificados compiten por financiar tu empresa. Solicitudes anónimas hasta conectar. Sin intermediarios, sin fricciones.
            </p>
            <div className="tab-toggle">
              <button className={`tab-pill ${activeTab==="otorgante"?"active-ot":"inactive"}`} onClick={()=>setActiveTab("otorgante")}>Soy otorgante</button>
              <button className={`tab-pill ${activeTab==="solicitante"?"active-sol":"inactive"}`} onClick={()=>setActiveTab("solicitante")}>Busco financiamiento</button>
            </div>
          </div>

          {activeTab === "otorgante" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
                {[
                  {
                    label:"Solicitudes activas",
                    val: mktStats.count > 0 ? String(mktStats.count) : "—",
                    color:"var(--purple)"
                  },
                  {
                    label:"Monto en subasta",
                    val: mktStats.montoTotal > 0
                      ? mktStats.montoTotal >= 1_000_000
                        ? `$${(mktStats.montoTotal/1_000_000).toFixed(1)}M`
                        : `$${(mktStats.montoTotal/1_000).toFixed(0)}K`
                      : "—",
                    color:"var(--fg)"
                  },
                  {
                    label:"Tasa promedio req.",
                    val: mktStats.tasaPromedio !== null ? `${mktStats.tasaPromedio.toFixed(1)}%` : "—",
                    color:"var(--accent-2)"
                  },
                ].map(k=>(
                  <div key={k.label} className="stat-block" style={{ textAlign:"center", padding:"18px 20px" }}>
                    <div style={{ fontSize:32, fontWeight:800, letterSpacing:"-0.05em", color:k.color, marginBottom:5 }}>{k.val}</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--fg-3)", letterSpacing:".08em" }}>{k.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div className="sol-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
                {solicitudes.map((s,i)=>(
                  <div key={i} className="sol-card">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                      <div>
                        <div style={{ fontSize:10, fontWeight:600, color:"var(--fg-3)", fontFamily:"var(--font-mono)", letterSpacing:".08em", marginBottom:5 }}>{s.sector.toUpperCase()}</div>
                        <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.05em", color:"var(--fg)" }}>{s.monto}</div>
                        <div style={{ fontSize:11, color:"var(--fg-3)", marginTop:3, fontFamily:"var(--font-mono)" }}>{s.plazo} · {s.fact}</div>
                      </div>
                      <span className="sol-tag">{s.tag}</span>
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                      <span className="sol-badge"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:3}}><path d="M5 7V5a3 3 0 016 0v2M3 7h10v7H3z"/></svg>Anónimo</span>
                      <span className="sol-badge">{s.garantia}</span>
                    </div>
                    <div style={{ display:"flex", gap:7 }}>
                      <button className="sol-btn sol-btn-ot" style={{ flex:1, justifyContent:"center" }} onClick={()=>window.location.href="/login"}>Ofertar</button>
                      <button className="sol-btn sol-btn-ghost" onClick={()=>window.location.href="/login"}>Conectar →</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign:"center" }}>
                <a href="/login" className="btn btn-accent btn-md">Ver todas las solicitudes →</a>
              </div>
            </div>
          )}

          {activeTab === "solicitante" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:52, marginBottom:52 }} className="hero-about-grid">
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"var(--fg-3)", fontFamily:"var(--font-mono)", letterSpacing:"0.08em", marginBottom:28 }}>CÓMO FUNCIONA</div>
                  {[
                    { n:"01", t:"Crea tu solicitud",     d:"Describe tu empresa, el monto y el destino del crédito. Sin revelar tu nombre ni RFC." },
                    { n:"02", t:"Otorgantes compiten",   d:"Múltiples instituciones revisan tu solicitud y envían ofertas con tasa, plazo y condiciones." },
                    { n:"03", t:"Tú eliges la mejor",    d:"Compara ofertas lado a lado y conecta solo con quien te interese. El control es tuyo." },
                  ].map((s,i)=>(
                    <div key={s.n} style={{ display:"flex", gap:18, marginBottom:30, position:"relative" }}>
                      {i<2 && <div className="step-line"/>}
                      <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(139,92,246,.08)", border:"1px solid rgba(139,92,246,.25)", display:"grid", placeItems:"center", flexShrink:0, position:"relative", zIndex:1 }}>
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:11, fontWeight:700, color:"#A78BFA" }}>{s.n}</span>
                      </div>
                      <div style={{ paddingTop:8 }}>
                        <div style={{ fontSize:14, fontWeight:700, marginBottom:5 }}>{s.t}</div>
                        <div style={{ fontSize:13, color:"var(--fg-3)", lineHeight:1.7 }}>{s.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {[
                    { icon:"M5 7V5a3 3 0 016 0v2M3 7h10v7H3z", t:"Privacidad total", d:"Tu nombre y RFC nunca son visibles hasta que decides conectar." },
                    { icon:"M8 2v3M8 11v3M3 8H1M15 8h-2M4.9 4.9L3.5 3.5M12.5 12.5l-1.4-1.4M4.9 11.1l-1.4 1.4M12.5 3.5l-1.4 1.4", t:"Respuesta en 48h", d:"Los otorgantes compiten por financiarte. Recibes ofertas rápidamente." },
                    { icon:"M2 12L6 7l3 3 3-4 2 2", t:"Múltiples ofertas", d:"Compara tasas, plazos y comisiones de diferentes instituciones." },
                    { icon:"M2 8l4 4 8-8", t:"Sin costo para empresas", d:"Publicar en el marketplace es gratuito para solicitantes." },
                  ].map(b=>(
                    <div key={b.t} style={{ display:"flex", gap:15, padding:"17px 20px", background:"rgba(0,229,160,.03)", border:"1px solid rgba(0,229,160,.1)", borderRadius:13, transition:"all .2s" }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:"rgba(0,229,160,.08)", border:"1px solid rgba(0,229,160,.18)", display:"grid", placeItems:"center", flexShrink:0 }}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--accent-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={b.icon}/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:13.5, fontWeight:700, marginBottom:4 }}>{b.t}</div>
                        <div style={{ fontSize:12.5, color:"var(--fg-3)", lineHeight:1.65 }}>{b.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:"linear-gradient(135deg,rgba(0,229,160,.05),rgba(6,182,212,.04))", border:"1px solid rgba(0,229,160,.18)", borderRadius:22, padding:"40px 44px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:36, flexWrap:"wrap", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, right:0, width:300, height:300, background:"radial-gradient(circle at top right, rgba(0,229,160,.05), transparent 70%)", pointerEvents:"none" }}/>
                <div>
                  <div style={{ fontSize:26, fontWeight:800, letterSpacing:"-0.045em", marginBottom:10 }}>¿Necesitas financiamiento?</div>
                  <p style={{ fontSize:14.5, color:"var(--fg-2)", lineHeight:1.75, maxWidth:"40ch" }}>Publica tu solicitud gratis y recibe ofertas de otorgantes institucionales en menos de 48 horas.</p>
                </div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <a href="/register?role=solicitante" className="btn btn-green btn-lg">Publicar solicitud gratis →</a>
                  <button className="btn btn-ghost btn-lg" onClick={()=>go("about")}>Saber más</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="section-divider"/>

      {/* ── PRODUCTO ── */}
      <section id="producto" style={{ position:"relative", zIndex:1, padding:"96px 0 0" }}>
        <div className="section">
          <div style={{ marginBottom:60 }}>
            <div className="mono-label purple" style={{ marginBottom:16 }}>// Producto</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:44, alignItems:"end" }}>
              <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:800, letterSpacing:"-0.045em", lineHeight:1.03 }}>Todo lo que necesitas<br/>para operar crédito.</h2>
              <p style={{ fontSize:15.5, color:"var(--fg-2)", lineHeight:1.75, paddingBottom:4 }}>Desde el expediente hasta el reporte de comité. Un sistema que convierte datos operativos en decisiones de crédito estructuradas.</p>
            </div>
          </div>
          <div className="feat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", border:"1px solid var(--border)", borderRadius:18, overflow:"hidden" }}>
            {[
              {n:"01",t:"Onboarding digital",   d:"Expediente, KYC y validación SAT desde el primer día. Sin papelería, sin fricciones."},
              {n:"02",t:"Analítica de riesgo",  d:"Señales automáticas, scoring configurable y alertas por covenants o cambios en el acreditado."},
              {n:"03",t:"Reporte ejecutivo",    d:"PDF listo para comité en menos de 3 minutos. Benchmarks y evolución del cartera."},
              {n:"04",t:"Monitor de cartera",   d:"Vista agregada de cartera, segmentada por etapa, riesgo, vencimiento y sector."},
              {n:"05",t:"Marketplace",          d:"Publica solicitudes o accede a ellas. Conexión directa entre otorgantes y empresas."},
              {n:"06",t:"Multi-usuario · Roles",d:"Analistas, directivos y auditores con vistas y permisos diferenciados."},
            ].map((f,i)=>(
              <div key={f.n} className="feat-card" style={{ borderRight:i%3===2?"none":undefined, borderBottom:i>=3?"none":undefined }}>
                <div className="feat-num">{f.n}</div>
                <div style={{ fontSize:14.5, fontWeight:700, letterSpacing:"-0.025em", marginBottom:10 }}>{f.t}</div>
                <div style={{ fontSize:13, color:"var(--fg-3)", lineHeight:1.7 }}>{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ position:"relative", zIndex:1, padding:"96px 0" }}>
        <div className="section">
          <div style={{ marginBottom:52 }}>
            <div className="mono-label purple" style={{ marginBottom:16 }}>// Pricing</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:800, letterSpacing:"-0.045em" }}>Sin sorpresas.</h2>
            <p style={{ fontSize:15.5, color:"var(--fg-2)", marginTop:12, maxWidth:"44ch" }}>Empieza con lo esencial. Escala cuando tu operación lo exige.</p>
          </div>
          <div className="price-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {[
              { name:"Basic", price:"$30", per:"/mes USD", desc:"Para validar tu modelo de crédito y arrancar operaciones.", features:["Dashboard y cartera base","Expediente de acreditados","Reporte ejecutivo estándar","Acceso al marketplace","1 usuario"], cta:"Solicitar Basic", href:"/pricing/lead?plan=basic", highlight:false },
              { name:"Pro", price:"$150", per:"/mes USD", badge:"Recomendado", desc:"Para operaciones que necesitan escala, señales y automatización.", features:["Todo lo de Basic","Risk signals y alertas automáticas","Multi-usuario + roles","Marketplace Pro (contacto ilimitado)","Integración API (roadmap)","Soporte prioritario"], cta:"Solicitar Pro", href:"/pricing/lead?plan=pro", highlight:true },
            ].map(p=>(
              <div key={p.name} className={`price-card${p.highlight?" highlight":""}`}>
                {p.badge && (
                  <div style={{ position:"absolute", top:0, right:24, background:"var(--grad)", color:"#fff", fontSize:9.5, fontWeight:700, fontFamily:"var(--font-mono)", letterSpacing:"0.1em", padding:"5px 12px", borderRadius:"0 0 10px 10px" }}>{p.badge.toUpperCase()}</div>
                )}
                <div className="mono-label" style={{ marginBottom:14 }}>{p.name}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:7, marginBottom:10 }}>
                  <span style={{ fontSize:48, fontWeight:800, letterSpacing:"-0.06em" }}>{p.price}</span>
                  <span style={{ fontSize:13.5, color:"var(--fg-3)" }}>{p.per}</span>
                </div>
                <p style={{ fontSize:13.5, color:"var(--fg-2)", lineHeight:1.7, marginBottom:28 }}>{p.desc}</p>
                <div style={{ borderTop:"1px solid var(--border)", paddingTop:22, marginBottom:28 }}>
                  {p.features.map(f=>(
                    <div key={f} style={{ display:"flex", alignItems:"center", gap:11, marginBottom:11 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="var(--accent-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{ fontSize:13.5, color:"var(--fg-2)" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={p.href} className={`btn btn-md ${p.highlight?"btn-grad":"btn-ghost"}`} style={{ width:"100%", justifyContent:"center" }}>{p.cta} →</a>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, padding:"15px 22px", background:"rgba(0,229,160,.04)", border:"1px solid rgba(0,229,160,.12)", borderRadius:14, display:"flex", alignItems:"center", gap:13 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:"rgba(0,229,160,.1)", border:"1px solid rgba(0,229,160,.18)", display:"grid", placeItems:"center", flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--accent-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8l4 4 8-8"/></svg>
            </div>
            <div>
              <span style={{ fontSize:13.5, fontWeight:700, color:"var(--accent-2)" }}>Gratis para solicitantes · </span>
              <span style={{ fontSize:13.5, color:"var(--fg-3)" }}>Publicar solicitudes en el marketplace no tiene costo. Solo pagas si eres otorgante.</span>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider"/>

      {/* ── ABOUT ── */}
      <section id="about" style={{ position:"relative", zIndex:1, padding:"96px 0 80px" }}>
        <div className="section">
          <div className="mono-label purple" style={{ marginBottom:16 }}>// About</div>
          <div style={{ display:"grid", gridTemplateColumns:"5fr 7fr", gap:64, alignItems:"start" }} className="hero-about-grid">
            <div>
              <h2 style={{ fontSize:"clamp(24px,3.5vw,42px)", fontWeight:800, letterSpacing:"-0.045em", lineHeight:1.06, marginBottom:18 }}>
                Hecho para el crédito privado.<br/><span style={{ color:"var(--fg-3)", fontWeight:400 }}>En México.</span>
              </h2>
              <p style={{ fontSize:14, color:"var(--fg-2)", lineHeight:1.8, marginBottom:18 }}>El crédito privado en México opera con herramientas que no fueron diseñadas para él: Excel, PDFs manuales y sistemas bancarios legacy.</p>
              <p style={{ fontSize:14, color:"var(--fg-2)", lineHeight:1.8, marginBottom:32 }}>Plinius conecta otorgantes con empresas que buscan financiamiento. Estándares institucionales desde el día uno, para ambos lados.</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["Banco","SOFOM","Fondo privado","Fintech","PyME","Empresa"].map(t=>(
                  <span key={t} style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--fg-3)", background:"rgba(255,255,255,.04)", border:"1px solid var(--border)", borderRadius:7, padding:"5px 11px", letterSpacing:"0.06em", transition:"all .15s" }}>{t}</span>
                ))}
              </div>
            </div>
            <div>
              {[
                {n:"01",t:"Setup en minutos",              d:"Sin integraciones largas. Empieza con un ZIP del SAT y una cartera en horas."},
                {n:"02",t:"Marketplace de crédito nativo", d:"Publica solicitudes anónimas y recibe ofertas de múltiples otorgantes. Control total del proceso."},
                {n:"03",t:"API cuando la necesites",       d:"Empieza manual. Integra cuando escales. El stack crece contigo."},
              ].map((a,i)=>(
                <div key={a.n} style={{ display:"flex", gap:22, padding:"26px 0", borderBottom:i<2?"1px solid var(--border)":"none" }}>
                  <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"rgba(139,92,246,.7)", letterSpacing:"0.12em", paddingTop:3, flexShrink:0 }}>{a.n}</div>
                  <div>
                    <div style={{ fontSize:14.5, fontWeight:700, letterSpacing:"-0.025em", marginBottom:7 }}>{a.t}</div>
                    <div style={{ fontSize:13.5, color:"var(--fg-3)", lineHeight:1.7 }}>{a.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LEAD FORM ── */}
      <section style={{ position:"relative", zIndex:1, padding:"0 0 100px" }}>
        <div className="section">
          <div style={{ border:"1px solid rgba(139,92,246,.2)", borderRadius:24, padding:"56px 52px", background:"linear-gradient(135deg,rgba(139,92,246,.06),rgba(79,142,247,.04))", display:"flex", justifyContent:"space-between", alignItems:"center", gap:44, flexWrap:"wrap", position:"relative", overflow:"hidden" }} className="lead-grid">
            <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, background:"radial-gradient(ellipse 60% 80% at 0% 50%, rgba(139,92,246,.06), transparent 70%)", pointerEvents:"none" }}/>
            <div style={{ maxWidth:"42ch", position:"relative" }}>
              <div className="mono-label purple" style={{ marginBottom:14 }}>// ¿Buscas financiamiento?</div>
              <h3 style={{ fontSize:30, fontWeight:800, letterSpacing:"-0.045em", marginBottom:12 }}>Conecta con otorgantes.</h3>
              <p style={{ fontSize:14.5, color:"var(--fg-2)", lineHeight:1.75 }}>Deja tus datos y te conectamos con instituciones que operan en Plinius. Respondemos en menos de 24 h.</p>
            </div>
            <div style={{ display:"grid", gap:10, minWidth:310, flex:"0 0 auto", position:"relative" }}>
              {leadStatus === "done" ? (
                <div style={{ padding:"22px 26px", background:"rgba(0,229,160,.07)", border:"1px solid rgba(0,229,160,.22)", borderRadius:14, textAlign:"center" }}>
                  <div style={{ fontSize:14.5, fontWeight:700, color:"var(--accent-2)", marginBottom:5 }}>¡Listo! Te contactamos pronto.</div>
                  <div style={{ fontSize:12.5, color:"var(--fg-3)" }}>Revisa tu correo — te enviamos una confirmación.</div>
                </div>
              ) : (
                <>
                  <input className="inp" placeholder="Nombre de empresa" value={empresa} onChange={e=>setEmpresa(e.target.value)} disabled={leadStatus==="loading"}/>
                  <input className="inp" placeholder="Correo electrónico" type="email" value={correo} onChange={e=>setCorreo(e.target.value)} disabled={leadStatus==="loading"}/>
                  <button className="btn btn-grad btn-md" style={{ width:"100%", marginTop:2 }} onClick={submitLead} disabled={leadStatus==="loading"}>
                    {leadStatus === "loading"
                      ? <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                          <svg className="spin-ico" width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
                          Enviando...
                        </span>
                      : "Enviar solicitud →"
                    }
                  </button>
                  {leadStatus === "error" && (
                    <div style={{ fontSize:12.5, color:"var(--red)", textAlign:"center" }}>Error al enviar. Escríbenos a <a href="mailto:hola@plinius.mx" style={{ color:"var(--accent-2)" }}>hola@plinius.mx</a></div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position:"relative", zIndex:1, borderTop:"1px solid var(--border)", padding:"64px 0 34px" }}>
        <div className="section">
          <div className="footer-cols" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:52, marginBottom:60 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:18 }}>
                <img src="/plinius.png" alt="" style={{ height:20, filter:"brightness(0) invert(1)", opacity:.65 }} onError={(e:React.SyntheticEvent<HTMLImageElement>)=>{ e.currentTarget.style.display="none"; }}/>
                <span style={{ fontSize:15, fontWeight:700, letterSpacing:"-0.04em", color:"var(--fg)" }}>Plinius</span>
              </div>
              <p style={{ fontSize:13, color:"var(--fg-3)", lineHeight:1.8, maxWidth:"32ch", marginBottom:26 }}>Infraestructura para originar, administrar y conectar crédito privado en México.</p>
              <div style={{ display:"flex", gap:8 }}>
                {[
                  {label:"LI", title:"LinkedIn", href:"https://linkedin.com/company/plinius"},
                  {label:"TW", title:"Twitter",  href:"https://twitter.com/pliniusmx"},
                  {label:"GH", title:"GitHub",   href:"https://github.com/alvarezzapfe"},
                ].map(s=>(
                  <a key={s.label} href={s.href} title={s.title} target="_blank" rel="noopener noreferrer"
                    style={{ width:32, height:32, borderRadius:8, background:"rgba(255,255,255,.03)", border:"1px solid var(--border)", display:"grid", placeItems:"center", cursor:"pointer", fontFamily:"var(--font-mono)", fontSize:9, color:"var(--fg-3)", textDecoration:"none", transition:"all .15s" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor="rgba(139,92,246,.35)"; (e.currentTarget as HTMLElement).style.color="var(--fg-2)"; (e.currentTarget as HTMLElement).style.background="rgba(139,92,246,.07)"; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor="var(--border)"; (e.currentTarget as HTMLElement).style.color="var(--fg-3)"; (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.03)"; }}>
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
            {[
              { title:"Producto", links:[
                {label:"Dashboard",    href:"/login"},
                {label:"Marketplace",  href:"/#marketplace"},
                {label:"Risk signals", href:"/login"},
                {label:"Reporte PDF",  href:"/login"},
                {label:"Pricing",      href:"/#pricing"},
              ]},
              { title:"Empresa", links:[
                {label:"About",    href:"/#about"},
                {label:"Pricing",  href:"/#pricing"},
                {label:"Contacto", href:"mailto:hola@plinius.mx"},
              ]},
              { title:"Legal", links:[
                {label:"Términos",   href:"/legal/terminos"},
                {label:"Privacidad", href:"/legal/privacidad"},
                {label:"Cookies",    href:"/legal/cookies"},
                {label:"Seguridad",  href:"mailto:hola@plinius.mx"},
                {label:"Entrar →",   href:"/login"},
              ]},
            ].map(col=>(
              <div key={col.title}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--fg-3)", letterSpacing:"0.12em", marginBottom:18, textTransform:"uppercase" }}>{col.title}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
                  {col.links.map(l=>(
                    <a key={l.label} href={l.href} className="foot-link">{l.label}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:26, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10.5, color:"var(--fg-3)" }}>© {new Date().getFullYear()} Plinius Technologies Mexico LLC & Infraestructura en Finanzas AI S.A.P.I de C.V.</span>
              <span style={{ width:1, height:10, background:"var(--border)", display:"inline-block" }}/>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10.5, color:"var(--fg-3)" }}>Ciudad de México</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent-2)", display:"inline-block", animation:"blink 2.5s ease-in-out infinite" }}/>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--accent-2)" }}>All systems operational</span>
              </div>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--fg-3)" }}>v2.3.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
