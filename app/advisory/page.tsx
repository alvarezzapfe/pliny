"use client";

import React, { useEffect, useState } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  html { scroll-behavior: smooth; }
  :root {
    --font-sans: 'DM Sans', -apple-system, system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --bg:        #FFFFFF;
    --bg-2:      #F9FAFB;
    --fg:        #0A0A0A;
    --fg-2:      #6B7280;
    --fg-3:      #9CA3AF;
    --border:    #E5E7EB;
    --border-2:  #D1D5DB;
    --accent:    #0C1E4A;
    --accent-2:  #00E5A0;
    --grad:      linear-gradient(135deg, #7B5CF5 0%, #1E7FFF 50%, #1FD9E8 100%);
    --grad-text: linear-gradient(135deg, #7B5CF5 0%, #1E7FFF 45%, #1FD9E8 100%);
  }
  @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  .mount { opacity:0; transform:translateY(18px); animation:fadeUp 0.7s cubic-bezier(.16,1,.3,1) forwards; }
  .mount-1 { animation-delay:0.05s; } .mount-2 { animation-delay:0.15s; }
  .mount-3 { animation-delay:0.25s; } .mount-4 { animation-delay:0.38s; }
  @media (prefers-reduced-motion: reduce) { .mount { opacity:1 !important; transform:none !important; animation:none !important; } }

  .nav-wrap { position:fixed; top:0; left:0; right:0; z-index:100; transition:background .4s,border-color .4s; }
  .nav-wrap.scrolled { background:rgba(255,255,255,0.92); border-bottom:1px solid var(--border); backdrop-filter:blur(28px) saturate(160%); }
  .nav-inner { max-width:1160px; margin:0 auto; padding:0 28px; height:60px; display:flex; align-items:center; justify-content:space-between; }
  .logo-mark { display:flex; align-items:center; gap:10px; text-decoration:none; }
  .nav-links { display:flex; align-items:center; gap:2px; }
  .nav-btn { background:none; border:none; cursor:pointer; font-family:var(--font-sans); font-size:13.5px; font-weight:500; color:var(--fg-2); padding:6px 13px; border-radius:8px; transition:color .15s,background .15s; text-decoration:none; }
  .nav-btn:hover { color:var(--fg); background:rgba(0,0,0,0.04); }
  .nav-ctas { display:flex; align-items:center; gap:8px; }

  .btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; font-family:var(--font-sans); font-size:13.5px; font-weight:600; border-radius:10px; border:none; cursor:pointer; text-decoration:none; transition:all .2s cubic-bezier(.16,1,.3,1); letter-spacing:-0.015em; white-space:nowrap; }
  .btn:hover { transform:translateY(-1px); }
  .btn-sm { padding:7px 15px; font-size:12.5px; }
  .btn-lg { padding:14px 28px; font-size:14.5px; }
  .btn-ghost { background:transparent; color:var(--fg-2); border:1px solid var(--border); }
  .btn-ghost:hover { color:var(--fg); background:var(--bg-2); border-color:var(--border-2); }
  .btn-grad { background:var(--grad); color:#fff; font-weight:700; box-shadow:0 2px 12px rgba(12,30,74,.20),0 4px 16px rgba(0,0,0,.08); position:relative; overflow:hidden; }
  .btn-grad::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.15) 0%,transparent 60%); pointer-events:none; }
  .btn-grad:hover { box-shadow:0 4px 20px rgba(12,30,74,.30),0 8px 24px rgba(0,0,0,.12); }

  .section { max-width:1160px; margin:0 auto; padding:0 28px; }
  .mono-label { font-family:var(--font-mono); font-size:10px; font-weight:500; letter-spacing:0.14em; text-transform:uppercase; color:var(--fg-3); }
  .mono-label.accent { color:var(--accent-2); }
  .grad-text { background:var(--grad-text); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

  .feat-card { padding:28px; border-right:1px solid var(--border); border-bottom:1px solid var(--border); transition:background .2s; position:relative; overflow:hidden; }
  .feat-card:hover { background:#F9FAFB; }
  .feat-card::before { content:''; position:absolute; top:0; left:0; width:2px; height:0; background:var(--grad); transition:height .3s cubic-bezier(.16,1,.3,1); }
  .feat-card:hover::before { height:100%; }
  .feat-num { font-family:var(--font-mono); font-size:10px; color:var(--accent-2); letter-spacing:0.12em; margin-bottom:16px; }

  .foot-link { font-size:13px; color:var(--fg-3); text-decoration:none; transition:color .15s; }
  .foot-link:hover { color:var(--fg-2); }

  @media (max-width:900px) { .nav-links { display:none !important; } }
  @media (max-width:768px) {
    .feat-grid { grid-template-columns:1fr !important; }
    .footer-cols { grid-template-columns:1fr 1fr !important; }
  }
`;

const NAV_ITEMS = [
  { href: "/#producto", label: "Producto" },
  { href: "/#marketplace", label: "Marketplace" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/advisory", label: "Advisory" },
  { href: "/#about", label: "About" },
];

const CASES = [
  { n: "01", t: "Administración cautelar", d: "Participación en equipo de administración cautelar de una institución financiera durante un proceso de intervención regulatoria (2025)." },
  { n: "02", t: "Financiamiento estructurado", d: "Asesoría para la obtención de una línea de crédito por $40M MXN para una empresa del sector pesquero." },
  { n: "03", t: "Crédito · Aviación de carga", d: "Estructuración de financiamiento para una aerolínea de carga." },
  { n: "04", t: "M&A · Educación", d: "Mandato sell-side para la venta de un colegio en el Bajío." },
  { n: "05", t: "Mercado de valores", d: "Estructuración y emisión simplificada de deuda en el mercado de valores para una entidad financiera no bancaria." },
];

export default function AdvisoryPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--bg)", color: "var(--fg)", minHeight: "100vh" }}>
      <style>{CSS}</style>

      {/* ── NAV ── */}
      <header className={`nav-wrap${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <a href="/" className="logo-mark">
            <img src="/pliny_logo_new.png" alt="Plinius" style={{ height: 24, width: "auto" }} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; }} />
          </a>
          <nav className="nav-links">
            {NAV_ITEMS.map(n => (
              <a key={n.label} href={n.href} className="nav-btn">{n.label}</a>
            ))}
          </nav>
          <div className="nav-ctas">
            <a href="/login" className="btn btn-ghost btn-sm">Acceder</a>
            <a href="/register" className="btn btn-grad btn-sm">Empezar →</a>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ position: "relative", zIndex: 1, paddingTop: 148 }}>
        <div className="section">
          <div className="mount mount-1" style={{ marginBottom: 16 }}>
            <div className="mono-label accent">// Advisory</div>
          </div>
          <div className="mount mount-2" style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.05em", color: "var(--fg)", margin: 0 }}>
              Banca de inversión<br />
              <span className="grad-text">para empresas.</span>
            </h1>
          </div>
          <div className="mount mount-3" style={{ maxWidth: "54ch", marginBottom: 40 }}>
            <p style={{ fontSize: "clamp(15px, 2vw, 18px)", lineHeight: 1.6, color: "var(--fg-2)", margin: 0 }}>
              Estructuración de crédito, M&A y acceso a mercados de capital. Mandatos ejecutados con estándar institucional.
            </p>
          </div>
          <div className="mount mount-4" style={{ marginBottom: 128 }}>
            <a href="/demo" className="btn btn-grad btn-lg">Hablemos →</a>
          </div>
        </div>
      </section>

      {/* ── CASOS DE ÉXITO ── */}
      <section style={{ position: "relative", zIndex: 1, paddingBottom: 128 }}>
        <div className="section">
          <div style={{ marginBottom: 48 }}>
            <div className="mono-label accent" style={{ marginBottom: 16 }}>// Casos de éxito</div>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, margin: 0 }}>
              Mandatos<br />
              <span className="grad-text">ejecutados.</span>
            </h2>
          </div>

          <div className="feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
            {CASES.map((c, i) => (
              <div key={c.n} className="feat-card" style={{
                borderRight: i % 3 === 2 ? "none" : undefined,
                borderBottom: i >= 3 ? "none" : undefined,
              }}>
                <div className="feat-num">{c.n}</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 10 }}>{c.t}</div>
                <div style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.7 }}>{c.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "0 0 128px" }}>
        <div className="section" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 24 }}>
            ¿Tienes un mandato en mente?
          </h2>
          <a href="/demo" className="btn btn-grad btn-lg">Hablemos →</a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid var(--border)", padding: "64px 0 34px" }}>
        <div className="section">
          <div className="footer-cols" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 52, marginBottom: 60 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
                <img src="/pliny_logo_new.png" alt="Plinius" style={{ height: 20 }} onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; }} />
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.04em", color: "var(--fg)" }}>Plinius</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.8, maxWidth: "32ch", marginBottom: 26 }}>Infraestructura para originar, administrar y conectar crédito privado en México.</p>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "LI", title: "LinkedIn", href: "https://linkedin.com/company/plinius" },
                  { label: "TW", title: "Twitter", href: "https://twitter.com/pliniusmx" },
                  { label: "GH", title: "GitHub", href: "https://github.com/alvarezzapfe" },
                ].map(s => (
                  <a key={s.label} href={s.href} title={s.title} target="_blank" rel="noopener noreferrer"
                    style={{ width: 32, height: 32, borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--fg-3)", textDecoration: "none", transition: "all .15s" }}>
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: "Producto", links: [{ label: "Dashboard", href: "/login" }, { label: "Marketplace", href: "/#marketplace" }, { label: "Advisory", href: "/advisory" }, { label: "Pricing", href: "/#pricing" }] },
              { title: "Empresa", links: [{ label: "About", href: "/#about" }, { label: "Contacto", href: "mailto:hola@plinius.mx" }] },
              { title: "Legal", links: [{ label: "Términos", href: "/legal/terminos" }, { label: "Privacidad", href: "/legal/privacidad" }, { label: "Cookies", href: "/legal/cookies" }] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--fg-3)", letterSpacing: "0.12em", marginBottom: 18, textTransform: "uppercase" }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {col.links.map(l => (<a key={l.label} href={l.href} className="foot-link">{l.label}</a>))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 26, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)" }}>© {new Date().getFullYear()} Plinius Technologies Mexico LLC & Infraestructura en Finanzas AI S.A.P.I de C.V.</span>
              <span style={{ width: 1, height: 10, background: "var(--border)", display: "inline-block" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)" }}>Torre Esmeralda III, Blvd. Manuel Ávila Camacho No. 32, Sky Lobby B, Col. Lomas de Chapultepec I Sección, C.P. 11000, CDMX</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
