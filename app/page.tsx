"use client";

import React, { useEffect, useMemo, useState } from "react";

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

export default function Home() {
  const [scrolled,   setScrolled]   = useState(false);
  const [activeTab,  setActiveTab]  = useState<"otorgante"|"solicitante">("otorgante");
  const [empresa,    setEmpresa]    = useState("");
  const [correo,     setCorreo]     = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle"|"loading"|"done"|"error">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    :root {
      --font-sans: 'Geist', -apple-system, system-ui, sans-serif;
      --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
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
      --red:       #FF5C5C;
      --amber:     #F5A623;
      --green:     #00E5A0;
    }

    @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes scanline { from { transform:translateY(-100%); } to { transform:translateY(400%); } }
    @keyframes blink    { 0%,100% { opacity:1; } 50% { opacity:0.25; } }
    @keyframes ticker   { from { transform:translateX(0); } to { transform:translateX(-50%); } }
    @keyframes spin     { to { transform:rotate(360deg); } }

    .mount { opacity:0; transform:translateY(12px); animation:fadeUp 0.6s cubic-bezier(.16,1,.3,1) forwards; }
    .mount-1 { animation-delay:0.05s; } .mount-2 { animation-delay:0.12s; }
    .mount-3 { animation-delay:0.20s; } .mount-4 { animation-delay:0.30s; }
    .mount-5 { animation-delay:0.42s; }
    @media (prefers-reduced-motion: reduce) { .mount { opacity:1 !important; transform:none !important; animation:none !important; } }

    .nav-wrap { position:fixed; top:0; left:0; right:0; z-index:100; transition:background .3s,border-color .3s; }
    .nav-wrap.scrolled { background:rgba(8,12,20,0.85); border-bottom:1px solid var(--border); backdrop-filter:blur(24px); }
    .nav-inner { max-width:1120px; margin:0 auto; padding:0 24px; height:56px; display:flex; align-items:center; justify-content:space-between; }
    .logo-mark { display:flex; align-items:center; gap:9px; text-decoration:none; }
    .logo-text { font-size:15px; font-weight:700; color:var(--fg); letter-spacing:-0.03em; }
    .logo-sub { font-family:var(--font-mono); font-size:9px; color:var(--accent-2); letter-spacing:0.1em; margin-top:1px; }
    .nav-links { display:flex; align-items:center; gap:2px; }
    .nav-btn { background:none; border:none; cursor:pointer; font-family:var(--font-sans); font-size:13px; font-weight:500; color:var(--fg-2); padding:6px 12px; border-radius:7px; transition:color .15s,background .15s; }
    .nav-btn:hover { color:var(--fg); background:rgba(255,255,255,0.06); }
    .nav-ctas { display:flex; align-items:center; gap:8px; }

    .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; font-family:var(--font-sans); font-size:13px; font-weight:600; border-radius:9px; border:none; cursor:pointer; text-decoration:none; transition:opacity .15s,transform .15s,box-shadow .15s; letter-spacing:-0.01em; white-space:nowrap; }
    .btn:hover { opacity:0.90; transform:translateY(-1px); }
    .btn:disabled { opacity:.6; cursor:not-allowed; transform:none; }
    .btn-sm { padding:7px 14px; font-size:12px; }
    .btn-md { padding:10px 20px; }
    .btn-lg { padding:13px 26px; font-size:14px; }
    .btn-solid { background:var(--fg); color:#080C14; box-shadow:0 1px 3px rgba(0,0,0,.4),0 4px 16px rgba(0,0,0,.2); }
    .btn-solid:hover:not(:disabled) { box-shadow:0 2px 8px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.3); }
    .btn-ghost { background:rgba(255,255,255,0.06); color:var(--fg-2); border:1px solid var(--border); }
    .btn-ghost:hover { color:var(--fg); background:rgba(255,255,255,0.09); border-color:var(--border-2); }
    .btn-accent { background:var(--accent); color:#fff; box-shadow:0 0 32px rgba(61,126,255,.30),0 4px 16px rgba(0,0,0,.3); }
    .btn-green { background:var(--accent-2); color:#05201A; box-shadow:0 0 28px rgba(0,229,160,.25),0 4px 16px rgba(0,0,0,.3); font-weight:700; }

    .section { max-width:1120px; margin:0 auto; padding:0 24px; }
    .mono-label { font-family:var(--font-mono); font-size:10px; font-weight:500; letter-spacing:0.12em; text-transform:uppercase; color:var(--fg-3); }
    .mono-label.accent { color:var(--accent-2); }

    .db-card { background:var(--bg-2); border:1px solid var(--border); border-radius:16px; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,.04),0 24px 80px rgba(0,0,0,.5); }
    .db-topbar { background:var(--bg-3); border-bottom:1px solid var(--border); padding:10px 16px; display:flex; align-items:center; gap:8px; }
    .db-dot { width:10px; height:10px; border-radius:50%; }
    .db-tab { font-family:var(--font-mono); font-size:10px; color:var(--fg-3); padding:3px 10px; border-radius:5px; }
    .db-tab.active { background:rgba(255,255,255,.07); color:var(--fg-2); }

    .tbl-head { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 100px; padding:8px 16px; border-bottom:1px solid var(--border); }
    .tbl-head span { font-family:var(--font-mono); font-size:10px; color:var(--fg-3); letter-spacing:0.06em; }
    .tbl-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 100px; padding:11px 16px; border-bottom:1px solid rgba(255,255,255,.04); align-items:center; transition:background .12s; }
    .tbl-row:hover { background:rgba(255,255,255,.025); }
    .tbl-row:last-child { border-bottom:none; }
    .status-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:999px; font-family:var(--font-mono); font-size:10px; font-weight:500; letter-spacing:0.04em; }
    .status-pill.green { background:rgba(0,229,160,.10); color:var(--green); }
    .status-pill.amber { background:rgba(245,166,35,.12); color:var(--amber); }
    .status-pill.red   { background:rgba(255,92,92,.10);  color:var(--red); }
    .status-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }
    .spark-bar { height:3px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden; }
    .spark-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,var(--accent) 0%,var(--accent-2) 100%); }
    .spark-fill.warn { background:var(--amber); }
    .spark-fill.danger { background:var(--red); }

    .ticker-mask { mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); overflow:hidden; border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
    .ticker-track { display:flex; animation:ticker 36s linear infinite; }

    .feat-card { padding:24px; border-right:1px solid var(--border); border-bottom:1px solid var(--border); transition:background .2s; }
    .feat-card:hover { background:rgba(255,255,255,.025); }

    .price-card { background:var(--bg-2); border:1px solid var(--border); border-radius:16px; padding:28px; transition:border-color .2s; position:relative; overflow:hidden; }
    .price-card.highlight { border-color:rgba(61,126,255,.35); box-shadow:0 0 0 1px rgba(61,126,255,.12),0 24px 60px rgba(0,0,0,.4); }

    .tab-toggle { display:inline-flex; background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:12px; padding:4px; gap:4px; }
    .tab-pill { padding:8px 20px; border-radius:9px; font-family:var(--font-sans); font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all .2s; letter-spacing:-0.01em; }
    .tab-pill.active-ot  { background:var(--accent);   color:#fff;    box-shadow:0 2px 12px rgba(91,141,239,.4); }
    .tab-pill.active-sol { background:var(--accent-2); color:#05201A; box-shadow:0 2px 12px rgba(0,229,160,.35); }
    .tab-pill.inactive   { background:transparent; color:var(--fg-3); }
    .tab-pill.inactive:hover { color:var(--fg-2); background:rgba(255,255,255,.04); }

    .sol-card { background:var(--bg-2); border:1px solid var(--border); border-radius:14px; padding:18px; transition:all .2s; position:relative; overflow:hidden; }
    .sol-card:hover { border-color:var(--border-2); background:rgba(15,34,84,.9); transform:translateY(-2px); box-shadow:0 12px 40px rgba(0,0,0,.4); }
    .sol-card::before { content:''; position:absolute; top:0; right:0; width:60px; height:60px; background:radial-gradient(circle at top right, rgba(0,229,160,.08), transparent 70%); border-radius:0 14px 0 60px; }
    .sol-tag   { display:inline-flex; align-items:center; padding:3px 8px; border-radius:999px; font-family:var(--font-mono); font-size:9px; font-weight:500; letter-spacing:0.06em; background:rgba(0,229,160,.10); color:var(--accent-2); border:1px solid rgba(0,229,160,.2); }
    .sol-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 7px; border-radius:999px; font-family:var(--font-mono); font-size:9px; background:rgba(255,255,255,.05); color:var(--fg-3); border:1px solid var(--border); }
    .sol-btn   { display:inline-flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px; border:none; font-family:var(--font-sans); font-size:11px; font-weight:700; cursor:pointer; transition:all .15s; }
    .sol-btn-ot    { background:var(--accent); color:#fff; box-shadow:0 2px 8px rgba(91,141,239,.3); }
    .sol-btn-ot:hover { box-shadow:0 4px 14px rgba(91,141,239,.45); transform:translateY(-1px); }
    .sol-btn-ghost { background:rgba(255,255,255,.06); color:var(--fg-3); border:1px solid var(--border); }
    .sol-btn-ghost:hover { color:var(--fg-2); border-color:var(--border-2); }

    .step-line { position:absolute; left:19px; top:40px; bottom:-20px; width:1px; background:linear-gradient(to bottom, var(--border-2), transparent); }

    .inp { width:100%; background:rgba(255,255,255,.05); border:1px solid var(--border); border-radius:9px; padding:10px 14px; font-family:var(--font-sans); font-size:13px; color:var(--fg); outline:none; transition:border-color .15s,background .15s; }
    .inp::placeholder { color:var(--fg-3); }
    .inp:focus { border-color:var(--accent-2); background:rgba(255,255,255,.07); }

    .foot-link { font-size:13px; color:var(--fg-3); text-decoration:none; transition:color .15s; }
    .foot-link:hover { color:var(--fg-2); }

    .scanline-wrap { position:relative; overflow:hidden; }
    .scanline-wrap::after { content:''; position:absolute; left:0; right:0; top:0; height:30%; pointer-events:none; background:linear-gradient(to bottom,transparent,rgba(61,126,255,.025),transparent); animation:scanline 5s linear infinite; }
    .spin-ico { animation:spin .7s linear infinite; }

    @media (max-width:900px) { .nav-links { display:none !important; } }
    @media (max-width:768px) {
      .feat-grid { grid-template-columns:1fr !important; }
      .price-grid { grid-template-columns:1fr !important; }
      .footer-cols { grid-template-columns:1fr 1fr !important; }
      .tbl-row, .tbl-head { grid-template-columns:2fr 1fr 100px !important; }
      .tbl-row .hide-mob, .tbl-head .hide-mob { display:none; }
      .sol-grid { grid-template-columns:1fr !important; }
      .hero-about-grid { grid-template-columns:1fr !important; }
      .lead-grid { flex-direction:column !important; }
    }
  `;

  return (
    <div style={{ fontFamily:"var(--font-sans)", background:"var(--bg)", color:"var(--fg)", minHeight:"100vh", overflowX:"hidden" }}>
      <style>{CSS}</style>

      {/* BG */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 120% 80% at 30% 0%, #1B3F8A 0%, #0C1E4A 50%, #091530 100%)" }}/>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"70vh", background:"radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,141,239,0.20) 0%, transparent 100%)" }}/>
        <div style={{ position:"absolute", inset:0, opacity:.5, backgroundImage:"linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)", backgroundSize:"48px 48px", maskImage:"radial-gradient(ellipse 100% 80% at 50% 0%, #000 30%, transparent 80%)", WebkitMaskImage:"radial-gradient(ellipse 100% 80% at 50% 0%, #000 30%, transparent 80%)" }}/>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:.04 }}>
          <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
          <rect width="100%" height="100%" filter="url(#n)"/>
        </svg>
      </div>

      {/* NAV */}
      <header className={`nav-wrap${scrolled?" scrolled":""}`}>
        <div className="nav-inner">
          <a href="/" className="logo-mark">
            <img src="/plinius.png" alt="" style={{ height:22, width:"auto", filter:"brightness(0) invert(1)", opacity:.9 }} onError={(e:React.SyntheticEvent<HTMLImageElement>)=>{ e.currentTarget.style.display="none"; }}/>
            <div><div className="logo-text">Plinius</div><div className="logo-sub">CREDIT OS</div></div>
          </a>
          <nav className="nav-links">
            {NAV.map(n=>(
              <button key={n.id} className="nav-btn" onClick={()=>go(n.id)}>{n.label}</button>
            ))}
          </nav>
          <div className="nav-ctas">
            <a href="/login" className="btn btn-ghost btn-sm">Acceder</a>
            <a href="/register" className="btn btn-solid btn-sm">Empezar →</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ position:"relative", zIndex:1, paddingTop:120 }}>
        <div className="section">
          <div className="mount mount-1" style={{ display:"flex", justifyContent:"center", marginBottom:28 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, border:"1px solid var(--border-2)", borderRadius:999, padding:"5px 14px 5px 10px" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent-2)", display:"inline-block", animation:"blink 2s ease-in-out infinite" }}/>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--fg-2)", letterSpacing:"0.06em" }}>LIVE · CRÉDITO PRIVADO · MÉXICO</span>
            </div>
          </div>
          <div className="mount mount-2" style={{ textAlign:"center", marginBottom:20 }}>
            <h1 style={{ fontSize:"clamp(36px,6vw,72px)", fontWeight:800, lineHeight:1.02, letterSpacing:"-0.045em", color:"var(--fg)" }}>
              Infraestructura de crédito<br/>
              <span style={{ color:"var(--fg-3)", fontWeight:600 }}>para instituciones modernas.</span>
            </h1>
          </div>
          <div className="mount mount-3" style={{ textAlign:"center", marginBottom:32 }}>
            <p style={{ fontSize:17, color:"var(--fg-2)", lineHeight:1.65, maxWidth:"54ch", margin:"0 auto" }}>
              Cartera, señales de riesgo y marketplace de crédito en un solo lugar. Para bancos, sofomes, fondos y empresas que buscan financiamiento.
            </p>
          </div>
          <div className="mount mount-4" style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:64, flexWrap:"wrap" }}>
            <a href="/login" className="btn btn-solid btn-lg">Entrar a la consola →</a>
            <button className="btn btn-ghost btn-lg" onClick={()=>go("marketplace")}>Ver marketplace</button>
          </div>

          {/* DASHBOARD MOCK */}
          <div className="mount mount-5 db-card scanline-wrap" style={{ maxWidth:960, margin:"0 auto", marginBottom:-80 }}>
            <div className="db-topbar">
              <div className="db-dot" style={{ background:"#FF5F57" }}/><div className="db-dot" style={{ background:"#FFBD2E" }}/><div className="db-dot" style={{ background:"#28C840" }}/>
              <div style={{ flex:1, display:"flex", gap:6, marginLeft:12, flexWrap:"wrap" }}>
                {["Cartera","Risk signals","Marketplace","Config"].map((t,i)=>(
                  <div key={t} className={`db-tab${i===0?" active":""}`}>{t}</div>
                ))}
              </div>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--fg-3)" }}>plinius.mx/dashboard</div>
            </div>
            <div style={{ padding:"20px 16px 0" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
                {[
                  {label:"Cartera total",   val:"$14.3M", delta:"+2.1%", up:true},
                  {label:"Créditos activos",val:"38",     delta:"+3",    up:true},
                  {label:"Mora > 90 días",  val:"2.4%",  delta:"+0.3%", up:false},
                  {label:"En marketplace",  val:"12",    delta:"nuevas", up:true},
                ].map(k=>(
                  <div key={k.label} style={{ background:"rgba(255,255,255,.03)", border:"1px solid var(--border)", borderRadius:10, padding:"12px 14px" }}>
                    <div className="mono-label" style={{ marginBottom:6 }}>{k.label}</div>
                    <div style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.04em", color:"var(--fg)" }}>{k.val}</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:k.up?"var(--green)":"var(--red)", marginTop:4 }}>{k.delta}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", marginBottom:16 }}>
                <div className="tbl-head"><span>Acreditado</span><span className="hide-mob">Monto</span><span className="hide-mob">Score</span><span>Vencimiento</span><span>Estado</span></div>
                {rows.map(r=>(
                  <div key={r.name} className="tbl-row">
                    <div style={{ fontSize:12, fontWeight:500, color:"var(--fg)" }}>{r.name}</div>
                    <div className="hide-mob" style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--fg-2)" }}>{r.monto}</div>
                    <div className="hide-mob" style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:60 }}><div className="spark-bar"><div className={`spark-fill${r.status==="amber"?" warn":r.status==="red"?" danger":""}`} style={{ width:`${r.pct}%` }}/></div></div>
                      <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--fg-3)" }}>{r.score}</span>
                    </div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--fg-3)" }}>{r.vcto}</div>
                    <div><span className={`status-pill ${r.status}`}><span className="status-dot"/>{r.label}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height:80, marginTop:-40, background:"linear-gradient(to bottom,transparent,var(--bg-2))", borderRadius:"0 0 16px 16px" }}/>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <div style={{ position:"relative", zIndex:1, paddingTop:120 }}>
        <div className="ticker-mask" style={{ padding:"10px 0" }}>
          <div className="ticker-track">
            {[...Array(2)].map((_,ri)=>(
              <span key={ri} style={{ display:"flex" }}>
                {["Onboarding digital","SAT · CFDI · ZIP","Risk signals","Scoring crediticio","Reporte PDF ejecutivo","Multi-usuario · Roles","API-first","Monitor de covenants","Alertas de mora","Marketplace de crédito","Conexión otorgante-empresa"].map(t=>(
                  <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:16, padding:"0 28px" }}>
                    <span style={{ width:3, height:3, borderRadius:"50%", background:"var(--border-2)", display:"inline-block" }}/>
                    <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--fg-3)", letterSpacing:"0.08em" }}>{t}</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* MARKETPLACE */}
      <section id="marketplace" style={{ position:"relative", zIndex:1, padding:"100px 0" }}>
        <div className="section">
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", marginBottom:48 }}>
            <div className="mono-label accent" style={{ marginBottom:14 }}>// Marketplace</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.06, marginBottom:14 }}>
              Donde el capital<br/><span style={{ color:"var(--accent-2)" }}>encuentra a las empresas.</span>
            </h2>
            <p style={{ fontSize:15, color:"var(--fg-2)", lineHeight:1.7, maxWidth:"52ch", marginBottom:32 }}>
              Otorgantes calificados compiten por financiar tu empresa. Solicitudes anónimas hasta conectar. Sin intermediarios, sin fricciones.
            </p>
            <div className="tab-toggle">
              <button className={`tab-pill ${activeTab==="otorgante"?"active-ot":"inactive"}`} onClick={()=>setActiveTab("otorgante")}>Soy otorgante</button>
              <button className={`tab-pill ${activeTab==="solicitante"?"active-sol":"inactive"}`} onClick={()=>setActiveTab("solicitante")}>Busco financiamiento</button>
            </div>
          </div>

          {activeTab === "otorgante" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
                {[
                  {label:"Solicitudes activas", val:"47",    color:"var(--accent)"},
                  {label:"Monto en subasta",    val:"$184M", color:"var(--fg)"},
                  {label:"Tasa promedio req.",  val:"14.2%", color:"var(--accent-2)"},
                ].map(k=>(
                  <div key={k.label} style={{ background:"rgba(255,255,255,.03)", border:"1px solid var(--border)", borderRadius:12, padding:"14px 18px", textAlign:"center" }}>
                    <div style={{ fontSize:28, fontWeight:800, letterSpacing:"-0.05em", color:k.color, marginBottom:4 }}>{k.val}</div>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--fg-3)", letterSpacing:".06em" }}>{k.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div className="sol-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
                {solicitudes.map((s,i)=>(
                  <div key={i} className="sol-card">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:11, fontWeight:600, color:"var(--fg-3)", fontFamily:"var(--font-mono)", letterSpacing:".06em", marginBottom:4 }}>{s.sector.toUpperCase()}</div>
                        <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.04em", color:"var(--fg)" }}>{s.monto}</div>
                        <div style={{ fontSize:11, color:"var(--fg-3)", marginTop:2 }}>{s.plazo} · {s.fact}</div>
                      </div>
                      <span className="sol-tag">{s.tag}</span>
                    </div>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:14 }}>
                      <span className="sol-badge"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:3}}><path d="M5 7V5a3 3 0 016 0v2M3 7h10v7H3z"/></svg>Anónimo</span>
                      <span className="sol-badge">{s.garantia}</span>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
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
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, marginBottom:48 }} className="hero-about-grid">
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--fg-2)", marginBottom:24 }}>Cómo funciona</div>
                  {[
                    { n:"01", t:"Crea tu solicitud",     d:"Describe tu empresa, el monto y el destino del crédito. Sin revelar tu nombre ni RFC." },
                    { n:"02", t:"Otorgantes compiten",   d:"Múltiples instituciones revisan tu solicitud y envían ofertas con tasa, plazo y condiciones." },
                    { n:"03", t:"Tú eliges la mejor",    d:"Compara ofertas lado a lado y conecta solo con quien te interese. El control es tuyo." },
                  ].map((s,i)=>(
                    <div key={s.n} style={{ display:"flex", gap:16, marginBottom:28, position:"relative" }}>
                      {i<2 && <div className="step-line"/>}
                      <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(0,229,160,.10)", border:"1px solid rgba(0,229,160,.25)", display:"grid", placeItems:"center", flexShrink:0, position:"relative", zIndex:1 }}>
                        <span style={{ fontFamily:"var(--font-mono)", fontSize:11, fontWeight:700, color:"var(--accent-2)" }}>{s.n}</span>
                      </div>
                      <div style={{ paddingTop:6 }}>
                        <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{s.t}</div>
                        <div style={{ fontSize:13, color:"var(--fg-3)", lineHeight:1.65 }}>{s.d}</div>
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
                    <div key={b.t} style={{ display:"flex", gap:14, padding:"16px 18px", background:"rgba(0,229,160,.04)", border:"1px solid rgba(0,229,160,.12)", borderRadius:12 }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:"rgba(0,229,160,.10)", border:"1px solid rgba(0,229,160,.2)", display:"grid", placeItems:"center", flexShrink:0 }}>
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--accent-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={b.icon}/></svg>
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, marginBottom:3 }}>{b.t}</div>
                        <div style={{ fontSize:12, color:"var(--fg-3)", lineHeight:1.6 }}>{b.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:"linear-gradient(135deg,rgba(0,229,160,.06),rgba(0,229,160,.02))", border:"1px solid rgba(0,229,160,.2)", borderRadius:20, padding:"36px 40px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:32, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.04em", marginBottom:8 }}>¿Necesitas financiamiento?</div>
                  <p style={{ fontSize:14, color:"var(--fg-2)", lineHeight:1.7, maxWidth:"42ch" }}>Publica tu solicitud gratis y recibe ofertas de otorgantes institucionales en menos de 48 horas.</p>
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

      {/* PRODUCTO */}
      <section id="producto" style={{ position:"relative", zIndex:1, padding:"100px 0 0" }}>
        <div className="section">
          <div style={{ marginBottom:56 }}>
            <div className="mono-label accent" style={{ marginBottom:14 }}>// Producto</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:40, alignItems:"end" }}>
              <h2 style={{ fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.05 }}>Todo lo que necesitas<br/>para operar crédito.</h2>
              <p style={{ fontSize:15, color:"var(--fg-2)", lineHeight:1.7, paddingBottom:4 }}>Desde el expediente hasta el reporte de comité. Un sistema que convierte datos operativos en decisiones de crédito estructuradas.</p>
            </div>
          </div>
          <div className="feat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", border:"1px solid var(--border)", borderRadius:16, overflow:"hidden" }}>
            {[
              {n:"01",t:"Onboarding digital",   d:"Expediente, KYC y validación SAT desde el primer día. Sin papelería, sin fricciones."},
              {n:"02",t:"Analítica de riesgo",  d:"Señales automáticas, scoring configurable y alertas por covenants o cambios en el acreditado."},
              {n:"03",t:"Reporte ejecutivo",    d:"PDF listo para comité en menos de 3 minutos. Benchmarks y evolución del cartera."},
              {n:"04",t:"Monitor de cartera",   d:"Vista agregada de cartera, segmentada por etapa, riesgo, vencimiento y sector."},
              {n:"05",t:"Marketplace",          d:"Publica solicitudes o accede a ellas. Conexión directa entre otorgantes y empresas."},
              {n:"06",t:"Multi-usuario · Roles",d:"Analistas, directivos y auditores con vistas y permisos diferenciados."},
            ].map((f,i)=>(
              <div key={f.n} className="feat-card" style={{ borderRight:i%3===2?"none":undefined, borderBottom:i>=3?"none":undefined }}>
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--accent)", letterSpacing:"0.1em", marginBottom:14 }}>{f.n}</div>
                <div style={{ fontSize:14, fontWeight:600, letterSpacing:"-0.02em", marginBottom:8 }}>{f.t}</div>
                <div style={{ fontSize:13, color:"var(--fg-3)", lineHeight:1.65 }}>{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ position:"relative", zIndex:1, padding:"100px 0" }}>
        <div className="section">
          <div style={{ marginBottom:48 }}>
            <div className="mono-label accent" style={{ marginBottom:14 }}>// Pricing</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-0.04em" }}>Sin sorpresas.</h2>
            <p style={{ fontSize:15, color:"var(--fg-2)", marginTop:10, maxWidth:"46ch" }}>Empieza con lo esencial. Escala cuando tu operación lo exige.</p>
          </div>
          <div className="price-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              { name:"Basic", price:"$70", per:"/mes USD", desc:"Para validar tu modelo de crédito y arrancar operaciones.", features:["Dashboard y cartera base","Expediente de acreditados","Reporte ejecutivo estándar","Acceso al marketplace","1 usuario"], cta:"Solicitar Basic", href:"/pricing/lead?plan=basic", highlight:false },
              { name:"Pro", price:"$500", per:"/mes USD", badge:"Recomendado", desc:"Para operaciones que necesitan escala, señales y automatización.", features:["Todo lo de Basic","Risk signals y alertas automáticas","Multi-usuario + roles","Marketplace Pro (contacto ilimitado)","Integración API (roadmap)","Soporte prioritario"], cta:"Solicitar Pro", href:"/pricing/lead?plan=pro", highlight:true },
            ].map(p=>(
              <div key={p.name} className={`price-card${p.highlight?" highlight":""}`}>
                {p.badge && (
                  <div style={{ position:"absolute", top:0, right:24, background:"var(--accent)", color:"#080C14", fontSize:10, fontWeight:700, fontFamily:"var(--font-mono)", letterSpacing:"0.08em", padding:"4px 10px", borderRadius:"0 0 8px 8px" }}>{p.badge.toUpperCase()}</div>
                )}
                <div className="mono-label" style={{ marginBottom:12 }}>{p.name}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:8 }}>
                  <span style={{ fontSize:42, fontWeight:800, letterSpacing:"-0.05em" }}>{p.price}</span>
                  <span style={{ fontSize:13, color:"var(--fg-3)" }}>{p.per}</span>
                </div>
                <p style={{ fontSize:13, color:"var(--fg-2)", lineHeight:1.65, marginBottom:24 }}>{p.desc}</p>
                <div style={{ borderTop:"1px solid var(--border)", paddingTop:20, marginBottom:24 }}>
                  {p.features.map(f=>(
                    <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="var(--accent-2)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{ fontSize:13, color:"var(--fg-2)" }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={p.href} className={`btn btn-md ${p.highlight?"btn-accent":"btn-ghost"}`} style={{ width:"100%", justifyContent:"center" }}>{p.cta} →</a>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, padding:"14px 20px", background:"rgba(0,229,160,.05)", border:"1px solid rgba(0,229,160,.15)", borderRadius:12, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"rgba(0,229,160,.12)", border:"1px solid rgba(0,229,160,.2)", display:"grid", placeItems:"center", flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--accent-2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8l4 4 8-8"/></svg>
            </div>
            <div>
              <span style={{ fontSize:13, fontWeight:700, color:"var(--accent-2)" }}>Gratis para solicitantes · </span>
              <span style={{ fontSize:13, color:"var(--fg-3)" }}>Publicar solicitudes en el marketplace no tiene costo. Solo pagas si eres otorgante.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ position:"relative", zIndex:1, padding:"0 0 100px" }}>
        <div className="section">
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:80 }}>
            <div className="mono-label accent" style={{ marginBottom:14 }}>// About</div>
            <div style={{ display:"grid", gridTemplateColumns:"5fr 7fr", gap:60, alignItems:"start" }} className="hero-about-grid">
              <div>
                <h2 style={{ fontSize:"clamp(24px,3.5vw,40px)", fontWeight:800, letterSpacing:"-0.04em", lineHeight:1.08, marginBottom:16 }}>
                  Hecho para el crédito privado.<br/><span style={{ color:"var(--fg-3)", fontWeight:500 }}>En México.</span>
                </h2>
                <p style={{ fontSize:14, color:"var(--fg-2)", lineHeight:1.75, marginBottom:16 }}>El crédito privado en México opera con herramientas que no fueron diseñadas para él: Excel, PDFs manuales y sistemas bancarios legacy.</p>
                <p style={{ fontSize:14, color:"var(--fg-2)", lineHeight:1.75, marginBottom:28 }}>Plinius conecta otorgantes con empresas que buscan financiamiento. Estándares institucionales desde el día uno, para ambos lados.</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {["Banco","SOFOM","Fondo privado","Fintech","PyME","Empresa"].map(t=>(
                    <span key={t} style={{ fontSize:11, fontFamily:"var(--font-mono)", color:"var(--fg-3)", background:"rgba(255,255,255,.05)", border:"1px solid var(--border)", borderRadius:6, padding:"4px 10px", letterSpacing:"0.04em" }}>{t}</span>
                  ))}
                </div>
              </div>
              <div>
                {[
                  {n:"01",t:"Setup en minutos",              d:"Sin integraciones largas. Empieza con un ZIP del SAT y una cartera en horas."},
                  {n:"02",t:"Marketplace de crédito nativo", d:"Publica solicitudes anónimas y recibe ofertas de múltiples otorgantes. Control total del proceso."},
                  {n:"03",t:"API cuando la necesites",       d:"Empieza manual. Integra cuando escales. El stack crece contigo."},
                ].map((a,i)=>(
                  <div key={a.n} style={{ display:"flex", gap:20, padding:"24px 0", borderBottom:i<2?"1px solid var(--border)":"none" }}>
                    <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--accent)", letterSpacing:"0.1em", paddingTop:3, flexShrink:0 }}>{a.n}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, letterSpacing:"-0.02em", marginBottom:6 }}>{a.t}</div>
                      <div style={{ fontSize:13, color:"var(--fg-3)", lineHeight:1.65 }}>{a.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEAD FORM — conectado a Resend */}
      <section style={{ position:"relative", zIndex:1, padding:"0 0 100px" }}>
        <div className="section">
          <div style={{ border:"1px solid var(--border)", borderRadius:20, padding:"52px 48px", background:"rgba(255,255,255,.02)", display:"flex", justifyContent:"space-between", alignItems:"center", gap:40, flexWrap:"wrap" }} className="lead-grid">
            <div style={{ maxWidth:"42ch" }}>
              <div className="mono-label accent" style={{ marginBottom:12 }}>// ¿Buscas financiamiento?</div>
              <h3 style={{ fontSize:28, fontWeight:800, letterSpacing:"-0.04em", marginBottom:10 }}>Conecta con otorgantes.</h3>
              <p style={{ fontSize:14, color:"var(--fg-2)", lineHeight:1.7 }}>Deja tus datos y te conectamos con instituciones que operan en Plinius. Respondemos en menos de 24 h.</p>
            </div>
            <div style={{ display:"grid", gap:8, minWidth:300, flex:"0 0 auto" }}>
              {leadStatus === "done" ? (
                <div style={{ padding:"20px 24px", background:"rgba(0,229,160,.08)", border:"1px solid rgba(0,229,160,.25)", borderRadius:12, textAlign:"center" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--accent-2)", marginBottom:4 }}>¡Listo! Te contactamos pronto.</div>
                  <div style={{ fontSize:12, color:"var(--fg-3)" }}>Revisa tu correo — te enviamos una confirmación.</div>
                </div>
              ) : (
                <>
                  <input className="inp" placeholder="Nombre de empresa" value={empresa} onChange={e=>setEmpresa(e.target.value)} disabled={leadStatus==="loading"}/>
                  <input className="inp" placeholder="Correo electrónico" type="email" value={correo} onChange={e=>setCorreo(e.target.value)} disabled={leadStatus==="loading"}/>
                  <button className="btn btn-solid btn-md" style={{ width:"100%", marginTop:2 }} onClick={submitLead} disabled={leadStatus==="loading"}>
                    {leadStatus === "loading"
                      ? <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
                          <svg className="spin-ico" width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
                          Enviando...
                        </span>
                      : "Enviar solicitud →"
                    }
                  </button>
                  {leadStatus === "error" && (
                    <div style={{ fontSize:12, color:"var(--red)", textAlign:"center" }}>Error al enviar. Escríbenos a <a href="mailto:hola@plinius.mx" style={{ color:"var(--accent-2)" }}>hola@plinius.mx</a></div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position:"relative", zIndex:1, borderTop:"1px solid var(--border)", padding:"60px 0 32px" }}>
        <div className="section">
          <div className="footer-cols" style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:48, marginBottom:56 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <img src="/plinius.png" alt="" style={{ height:18, filter:"brightness(0) invert(1)", opacity:.7 }} onError={(e:React.SyntheticEvent<HTMLImageElement>)=>{ e.currentTarget.style.display="none"; }}/>
                <span style={{ fontSize:14, fontWeight:700, letterSpacing:"-0.03em", color:"var(--fg)" }}>Plinius</span>
              </div>
              <p style={{ fontSize:13, color:"var(--fg-3)", lineHeight:1.75, maxWidth:"34ch", marginBottom:24 }}>Infraestructura para originar, administrar y conectar crédito privado en México.</p>
              <div style={{ display:"flex", gap:8 }}>
                {[
                  {label:"LI", title:"LinkedIn", href:"https://linkedin.com/company/plinius"},
                  {label:"TW", title:"Twitter",  href:"https://twitter.com/pliniusmx"},
                  {label:"GH", title:"GitHub",   href:"https://github.com/alvarezzapfe"},
                ].map(s=>(
                  <a key={s.label} href={s.href} title={s.title} target="_blank" rel="noopener noreferrer"
                    style={{ width:30, height:30, borderRadius:7, background:"rgba(255,255,255,.04)", border:"1px solid var(--border)", display:"grid", placeItems:"center", cursor:"pointer", fontFamily:"var(--font-mono)", fontSize:9, color:"var(--fg-3)", textDecoration:"none", transition:"border-color .15s,color .15s" }}
                    onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor="var(--border-2)"; (e.currentTarget as HTMLElement).style.color="var(--fg-2)"; }}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor="var(--border)"; (e.currentTarget as HTMLElement).style.color="var(--fg-3)"; }}>
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
                {label:"Blog",     href:"#"},
                {label:"Carreras", href:"mailto:hola@plinius.mx"},
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
                <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--fg-3)", letterSpacing:"0.1em", marginBottom:16, textTransform:"uppercase" }}>{col.title}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {col.links.map(l=>(
                    <a key={l.label} href={l.href} className="foot-link">{l.label}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:"1px solid var(--border)", paddingTop:24, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--fg-3)" }}>© {new Date().getFullYear()} Plinius Technologies Mexico LLC & Infraestructura en Finanzas AI S.A.P.I de C.V.</span>
              <span style={{ width:1, height:10, background:"var(--border)", display:"inline-block" }}/>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--fg-3)" }}>Ciudad de México</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent-2)", display:"inline-block", animation:"blink 2.5s ease-in-out infinite" }}/>
                <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--accent-2)" }}>All systems operational</span>
              </div>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--fg-3)" }}>v2.2.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
