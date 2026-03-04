"use client";

import React, { useEffect, useState, useRef } from "react";

const FECHA = "3 de marzo de 2026";
const VERSION = "v1.0.0";

const SECCIONES = [
  { id:"s1",  n:"01", title:"Partes del contrato"                },
  { id:"s2",  n:"02", title:"Objeto y alcance"                   },
  { id:"s3",  n:"03", title:"Registro y cuenta de usuario"       },
  { id:"s4",  n:"04", title:"Marketplace de crédito"             },
  { id:"s5",  n:"05", title:"Obligaciones del otorgante"         },
  { id:"s6",  n:"06", title:"Obligaciones del solicitante"       },
  { id:"s7",  n:"07", title:"Tarifas y facturación"              },
  { id:"s8",  n:"08", title:"Propiedad intelectual"              },
  { id:"s9",  n:"09", title:"Privacidad y datos personales"      },
  { id:"s10", n:"10", title:"Limitación de responsabilidad"      },
  { id:"s11", n:"11", title:"Vigencia y terminación"             },
  { id:"s12", n:"12", title:"Modificaciones"                     },
  { id:"s13", n:"13", title:"Ley aplicable y jurisdicción"       },
  { id:"s14", n:"14", title:"Contacto"                           },
];

export default function TerminosPage() {
  const [scrolled,    setScrolled]    = useState(false);
  const [activeId,    setActiveId]    = useState("s1");
  const [progress,    setProgress]    = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const doc  = document.documentElement;
      const pct  = (window.scrollY / (doc.scrollHeight - doc.clientHeight)) * 100;
      setProgress(Math.min(pct, 100));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id); });
      },
      { rootMargin:"-20% 0px -70% 0px" }
    );
    SECCIONES.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html { scroll-behavior:smooth; }

    :root {
      --font-sans: 'Geist', -apple-system, system-ui, sans-serif;
      --font-mono: 'Geist Mono', ui-monospace, monospace;
      --bg:      #0C1E4A;
      --bg-2:    #0F2254;
      --bg-3:    #132660;
      --fg:      #EEF2FF;
      --fg-2:    rgba(238,242,255,0.62);
      --fg-3:    rgba(238,242,255,0.36);
      --border:  rgba(255,255,255,0.08);
      --border-2:rgba(255,255,255,0.15);
      --accent:  #5B8DEF;
      --accent-2:#00E5A0;
    }

    @keyframes fadeUp { from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);} }
    @keyframes blink  { 0%,100%{opacity:1;}50%{opacity:.25;} }

    .fade { animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
    .d1{animation-delay:.05s;} .d2{animation-delay:.12s;} .d3{animation-delay:.20s;}

    /* Progress bar */
    .progress-bar {
      position:fixed; top:0; left:0; height:2px; z-index:200;
      background:linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%);
      transition:width .1s linear;
      box-shadow:0 0 8px rgba(0,229,160,.4);
    }

    /* Nav */
    .nav-wrap { position:fixed; top:0; left:0; right:0; z-index:100; transition:background .3s,border-color .3s; }
    .nav-wrap.scrolled { background:rgba(8,12,20,.9); border-bottom:1px solid var(--border); backdrop-filter:blur(24px); }
    .nav-inner { max-width:1120px; margin:0 auto; padding:0 24px; height:56px; display:flex; align-items:center; justify-content:space-between; }
    .logo-mark { display:flex; align-items:center; gap:9px; text-decoration:none; }
    .logo-text { font-size:15px; font-weight:700; color:var(--fg); letter-spacing:-0.03em; }
    .logo-sub { font-family:var(--font-mono); font-size:9px; color:var(--accent-2); letter-spacing:.1em; margin-top:1px; }

    .btn { display:inline-flex; align-items:center; gap:6px; font-family:var(--font-sans); font-size:12px; font-weight:600; border-radius:8px; border:none; cursor:pointer; text-decoration:none; transition:all .15s; padding:7px 14px; letter-spacing:-.01em; }
    .btn-ghost { background:rgba(255,255,255,.06); color:var(--fg-2); border:1px solid var(--border); }
    .btn-ghost:hover { color:var(--fg); background:rgba(255,255,255,.09); border-color:var(--border-2); }

    /* Layout */
    .layout { max-width:1120px; margin:0 auto; padding:0 24px; display:grid; grid-template-columns:260px 1fr; gap:56px; align-items:start; }

    /* Sidebar */
    .sidebar { position:sticky; top:80px; padding-bottom:40px; }
    .sidebar-title { font-family:var(--font-mono); font-size:10px; color:var(--fg-3); letter-spacing:.12em; text-transform:uppercase; margin-bottom:16px; }
    .nav-item { display:flex; align-items:center; gap:10px; padding:7px 10px; border-radius:8px; cursor:pointer; transition:all .15s; border:none; background:transparent; width:100%; text-align:left; }
    .nav-item:hover { background:rgba(255,255,255,.04); }
    .nav-item.active { background:rgba(91,141,239,.10); }
    .nav-num { font-family:var(--font-mono); font-size:9px; color:var(--fg-3); min-width:20px; letter-spacing:.06em; }
    .nav-item.active .nav-num { color:var(--accent); }
    .nav-label { font-size:12px; font-weight:500; color:var(--fg-3); line-height:1.3; }
    .nav-item.active .nav-label { color:var(--fg); font-weight:600; }
    .nav-indicator { width:2px; height:2px; border-radius:50%; background:var(--accent); margin-left:auto; opacity:0; transition:opacity .15s; flex-shrink:0; }
    .nav-item.active .nav-indicator { opacity:1; }

    /* Content */
    .content { padding:0 0 120px; }

    /* Section */
    .sec { padding-top:80px; margin-top:-20px; }
    .sec-header { display:flex; align-items:flex-start; gap:16px; margin-bottom:24px; padding-bottom:20px; border-bottom:1px solid var(--border); }
    .sec-num { font-family:var(--font-mono); font-size:11px; color:var(--accent); letter-spacing:.1em; padding-top:4px; flex-shrink:0; }
    .sec-title { font-size:clamp(18px,2.5vw,24px); font-weight:800; letter-spacing:-.04em; color:var(--fg); }

    /* Typography */
    .prose { font-size:14px; color:var(--fg-2); line-height:1.85; }
    .prose p { margin-bottom:16px; }
    .prose p:last-child { margin-bottom:0; }
    .prose strong { color:var(--fg); font-weight:600; }
    .prose ul { list-style:none; display:flex; flex-direction:column; gap:8px; margin:16px 0; }
    .prose ul li { display:block; padding-left:18px; position:relative; line-height:1.85; }
    .prose ul li::before { content:''; width:4px; height:4px; border-radius:50%; background:var(--accent-2); position:absolute; left:2px; top:10px; }
    .prose ol { list-style:none; counter-reset:item; display:flex; flex-direction:column; gap:10px; margin:16px 0; }
    .prose ol li { display:flex; gap:12px; counter-increment:item; }
    .prose ol li::before { content:counter(item)"."; font-family:var(--font-mono); font-size:11px; color:var(--accent); flex-shrink:0; padding-top:2px; min-width:20px; }

    /* Callout boxes */
    .callout { padding:16px 20px; border-radius:12px; margin:20px 0; }
    .callout-info    { background:rgba(91,141,239,.08); border:1px solid rgba(91,141,239,.2); }
    .callout-warn    { background:rgba(245,166,35,.07); border:1px solid rgba(245,166,35,.2); }
    .callout-success { background:rgba(0,229,160,.06); border:1px solid rgba(0,229,160,.18); }
    .callout-label { font-family:var(--font-mono); font-size:10px; letter-spacing:.1em; font-weight:700; margin-bottom:6px; }
    .callout-info    .callout-label { color:var(--accent); }
    .callout-warn    .callout-label { color:#F5A623; }
    .callout-success .callout-label { color:var(--accent-2); }
    .callout-text { font-size:13px; color:var(--fg-2); line-height:1.7; }

    /* Table */
    .legal-table { width:100%; border-collapse:collapse; margin:20px 0; font-size:13px; }
    .legal-table th { font-family:var(--font-mono); font-size:10px; color:var(--fg-3); letter-spacing:.08em; padding:10px 14px; background:rgba(255,255,255,.03); border-bottom:1px solid var(--border); text-align:left; }
    .legal-table td { padding:10px 14px; border-bottom:1px solid rgba(255,255,255,.04); color:var(--fg-2); vertical-align:top; }
    .legal-table tr:last-child td { border-bottom:none; }
    .legal-table tr:hover td { background:rgba(255,255,255,.02); }

    /* Last updated banner */
    .update-banner { display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:999px; background:rgba(255,255,255,.04); border:1px solid var(--border); font-family:var(--font-mono); font-size:11px; color:var(--fg-3); }

    /* Footer mini */
    .foot-mini { border-top:1px solid var(--border); padding:32px 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; max-width:1120px; margin:0 auto; padding-left:24px; padding-right:24px; }
    .foot-link { font-size:12px; color:var(--fg-3); text-decoration:none; transition:color .15s; }
    .foot-link:hover { color:var(--fg-2); }

    @media (max-width:900px) {
      .layout { grid-template-columns:1fr !important; }
      .sidebar { display:none; }
    }
    @media (max-width:768px) {
      .foot-mini { flex-direction:column; align-items:flex-start; gap:16px; }
    }
  `;

  return (
    <div style={{ fontFamily:"var(--font-sans)", background:"var(--bg)", color:"var(--fg)", minHeight:"100vh" }}>
      <style>{CSS}</style>

      {/* Progress bar */}
      <div className="progress-bar" style={{ width:`${progress}%` }}/>

      {/* BG */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 120% 80% at 30% 0%, #1B3F8A 0%, #0C1E4A 60%, #091530 100%)" }}/>
        <div style={{ position:"absolute", inset:0, opacity:.35, backgroundImage:"linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize:"48px 48px", maskImage:"radial-gradient(ellipse 80% 60% at 50% 0%, #000 20%, transparent 70%)", WebkitMaskImage:"radial-gradient(ellipse 80% 60% at 50% 0%, #000 20%, transparent 70%)" }}/>
      </div>

      {/* NAV */}
      <header className={`nav-wrap${scrolled?" scrolled":""}`}>
        <div className="nav-inner">
          <a href="/" className="logo-mark">
            <img src="/plinius.png" alt="" style={{ height:22, filter:"brightness(0) invert(1)", opacity:.9 }} onError={(e:React.SyntheticEvent<HTMLImageElement>)=>{ e.currentTarget.style.display="none"; }}/>
            <div><div className="logo-text">Plinius</div><div className="logo-sub">CREDIT OS</div></div>
          </a>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <a href="/legal/privacidad" className="btn btn-ghost">Privacidad</a>
            <a href="/" className="btn btn-ghost">← Inicio</a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <div style={{ position:"relative", zIndex:1, paddingTop:96, paddingBottom:64 }}>
        <div style={{ maxWidth:1120, margin:"0 auto", padding:"0 24px" }}>
          <div className="fade d1" style={{ marginBottom:16 }}>
            <div className="update-banner">
              <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--accent-2)", display:"inline-block", animation:"blink 2.5s ease-in-out infinite" }}/>
              Última actualización: {FECHA} · {VERSION}
            </div>
          </div>
          <div className="fade d2">
            <h1 style={{ fontSize:"clamp(32px,5vw,60px)", fontWeight:900, letterSpacing:"-.05em", lineHeight:1.0, marginBottom:14 }}>
              Términos y<br/>
              <span style={{ color:"var(--fg-3)", fontWeight:600 }}>condiciones de uso.</span>
            </h1>
          </div>
          <div className="fade d3">
            <p style={{ fontSize:15, color:"var(--fg-2)", lineHeight:1.7, maxWidth:"58ch", marginTop:12 }}>
              Estos términos rigen el acceso y uso de los servicios de <strong style={{ color:"var(--fg)" }}>Infraestructura en Finanzas AI S.A.P.I. de C.V.</strong> bajo la marca <strong style={{ color:"var(--accent-2)" }}>Plinius</strong>. Léelos con atención antes de utilizar la plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div style={{ position:"relative", zIndex:1 }}>
        <div className="layout">

          {/* SIDEBAR */}
          <aside className="sidebar">
            <div className="sidebar-title">Contenido</div>
            {SECCIONES.map(s=>(
              <button key={s.id} className={`nav-item${activeId===s.id?" active":""}`} onClick={()=>go(s.id)}>
                <span className="nav-num">{s.n}</span>
                <span className="nav-label">{s.title}</span>
                <span className="nav-indicator"/>
              </button>
            ))}
            <div style={{ marginTop:24, padding:"14px 16px", background:"rgba(0,229,160,.05)", border:"1px solid rgba(0,229,160,.15)", borderRadius:12 }}>
              <div style={{ fontFamily:"var(--font-mono)", fontSize:10, color:"var(--accent-2)", letterSpacing:".1em", marginBottom:6 }}>VERSIÓN</div>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--fg)", marginBottom:2 }}>{VERSION}</div>
              <div style={{ fontSize:11, color:"var(--fg-3)" }}>{FECHA}</div>
            </div>
          </aside>

          {/* CONTENT */}
          <main className="content">

            {/* S1 — Partes */}
            <section id="s1" className="sec">
              <div className="sec-header"><span className="sec-num">01</span><h2 className="sec-title">Partes del contrato</h2></div>
              <div className="prose">
                <p>El presente instrumento es celebrado entre:</p>
                <ul>
                  <li><strong>Infraestructura en Finanzas AI S.A.P.I. de C.V.</strong>, sociedad constituida bajo las leyes de los Estados Unidos Mexicanos, con domicilio en Ciudad de México, en adelante <strong>"Plinius"</strong> o la <strong>"Empresa"</strong>.</li>
                  <li>Cualquier persona física o moral que acceda, se registre o utilice la plataforma tecnológica disponible en <strong>plinius.mx</strong> y sus subdominios, en adelante el <strong>"Usuario"</strong>.</li>
                </ul>
                <div className="callout callout-info">
                  <div className="callout-label">DEFINICIÓN DE USUARIO</div>
                  <div className="callout-text">El término "Usuario" comprende tanto a los <strong>Otorgantes</strong> (instituciones o personas que ofrecen crédito) como a los <strong>Solicitantes</strong> (personas morales que buscan financiamiento), así como a cualquier visitante o administrador de la plataforma.</div>
                </div>
              </div>
            </section>

            {/* S2 — Objeto */}
            <section id="s2" className="sec">
              <div className="sec-header"><span className="sec-num">02</span><h2 className="sec-title">Objeto y alcance</h2></div>
              <div className="prose">
                <p>Plinius es una plataforma tecnológica de infraestructura financiera que ofrece los siguientes servicios:</p>
                <ol>
                  <li><strong>Gestión de cartera crediticia:</strong> herramientas de administración, monitoreo, reporteo y análisis de riesgo para instituciones otorgantes de crédito.</li>
                  <li><strong>Marketplace de crédito:</strong> espacio digital donde solicitantes de financiamiento publican solicitudes anónimas y otorgantes registrados compiten mediante ofertas.</li>
                  <li><strong>KYC y expediente digital:</strong> procesos de verificación de identidad, validación fiscal ante el SAT y gestión documental.</li>
                  <li><strong>Reportes y analítica:</strong> generación de reportes ejecutivos, señales de riesgo y benchmarks sectoriales.</li>
                </ol>
                <div className="callout callout-warn">
                  <div className="callout-label">ALCANCE LIMITADO</div>
                  <div className="callout-text">Plinius es un proveedor de tecnología y no actúa como institución financiera, banco, SOFOM, intermediario bursátil ni asesor de inversiones. Plinius no es parte en ningún contrato de crédito celebrado entre otorgantes y solicitantes.</div>
                </div>
              </div>
            </section>

            {/* S3 — Registro */}
            <section id="s3" className="sec">
              <div className="sec-header"><span className="sec-num">03</span><h2 className="sec-title">Registro y cuenta de usuario</h2></div>
              <div className="prose">
                <p>Para acceder a las funcionalidades de la plataforma, el Usuario deberá:</p>
                <ul>
                  <li>Proporcionar información veraz, completa y actualizada durante el proceso de registro.</li>
                  <li>Crear credenciales de acceso (correo electrónico y contraseña) que son de uso personal e intransferible.</li>
                  <li>Completar los procesos de verificación de identidad (KYC) requeridos según su rol en la plataforma.</li>
                  <li>Aceptar expresamente los presentes Términos y la Política de Privacidad.</li>
                </ul>
                <p>El Usuario es el único responsable de mantener la confidencialidad de sus credenciales y de todas las actividades realizadas bajo su cuenta. Plinius no será responsable por daños derivados del uso no autorizado de credenciales del Usuario.</p>
                <p>Plinius se reserva el derecho de rechazar, suspender o cancelar cuentas que incumplan los presentes Términos, proporcionen información falsa o sean detectadas realizando actividades fraudulentas o ilícitas.</p>
              </div>
            </section>

            {/* S4 — Marketplace */}
            <section id="s4" className="sec">
              <div className="sec-header"><span className="sec-num">04</span><h2 className="sec-title">Marketplace de crédito</h2></div>
              <div className="prose">
                <p>El Marketplace de Plinius opera bajo las siguientes reglas:</p>

                <p><strong>4.1 Anonimato y revelación de identidad</strong></p>
                <p>Las solicitudes de financiamiento se publican de forma anónima. El nombre, RFC y datos de identificación del Solicitante permanecen ocultos hasta que ambas partes acuerdan conectarse. La revelación de identidad constituye el inicio formal del proceso de evaluación entre el otorgante y el solicitante.</p>

                <p><strong>4.2 Naturaleza de las ofertas</strong></p>
                <p>Las ofertas enviadas por los Otorgantes a través del Marketplace son propuestas no vinculantes. La aceptación de una oferta no constituye por sí misma la celebración de un contrato de crédito. El contrato de crédito se perfeccionará únicamente mediante los instrumentos legales que las partes suscriban de manera independiente a la plataforma.</p>

                <p><strong>4.3 Responsabilidad de las partes</strong></p>
                <ul>
                  <li>Plinius no garantiza la disponibilidad de financiamiento ni la calidad crediticia de los solicitantes.</li>
                  <li>Plinius no garantiza que los otorgantes registrados cuenten con los permisos y autorizaciones regulatorias necesarias para operar.</li>
                  <li>Cada Usuario es responsable de realizar su propia diligencia debida antes de celebrar cualquier operación.</li>
                </ul>

                <div className="callout callout-success">
                  <div className="callout-label">GRATUITO PARA SOLICITANTES</div>
                  <div className="callout-text">El registro y la publicación de solicitudes en el Marketplace es completamente gratuito para los Solicitantes. Los cargos aplican exclusivamente a los Otorgantes conforme a los planes de suscripción vigentes.</div>
                </div>
              </div>
            </section>

            {/* S5 — Otorgantes */}
            <section id="s5" className="sec">
              <div className="sec-header"><span className="sec-num">05</span><h2 className="sec-title">Obligaciones del otorgante</h2></div>
              <div className="prose">
                <p>Los Usuarios registrados como Otorgantes se obligan a:</p>
                <ol>
                  <li>Contar con la capacidad legal y, en su caso, las autorizaciones regulatorias necesarias para otorgar crédito en los términos aplicables.</li>
                  <li>No utilizar la plataforma para contactar a Solicitantes con fines distintos al análisis y otorgamiento de crédito.</li>
                  <li>Mantener la confidencialidad de la información de los Solicitantes obtenida a través de la plataforma.</li>
                  <li>Cumplir con la normatividad aplicable en materia de prevención de lavado de dinero (PLD) y financiamiento al terrorismo.</li>
                  <li>No compartir, vender ni ceder la información de Solicitantes a terceros ajenos al proceso de crédito.</li>
                  <li>Pagar puntualmente las tarifas de suscripción correspondientes a su plan contratado.</li>
                </ol>
              </div>
            </section>

            {/* S6 — Solicitantes */}
            <section id="s6" className="sec">
              <div className="sec-header"><span className="sec-num">06</span><h2 className="sec-title">Obligaciones del solicitante</h2></div>
              <div className="prose">
                <p>Los Usuarios registrados como Solicitantes se obligan a:</p>
                <ol>
                  <li>Proporcionar información veraz y documentación auténtica durante el proceso de KYC y en sus solicitudes de financiamiento.</li>
                  <li>No publicar solicitudes con fines especulativos, fraudulentos o para obtener información de mercado sin intención real de contratar crédito.</li>
                  <li>Notificar a Plinius cualquier cambio material en la situación financiera, legal o fiscal de la empresa que pudiera afectar solicitudes activas.</li>
                  <li>No utilizar la información de otorgantes obtenida a través de la plataforma para fines distintos a la contratación de crédito.</li>
                  <li>Mantener actualizada la información de su perfil y documentación.</li>
                </ol>
              </div>
            </section>

            {/* S7 — Tarifas */}
            <section id="s7" className="sec">
              <div className="sec-header"><span className="sec-num">07</span><h2 className="sec-title">Tarifas y facturación</h2></div>
              <div className="prose">
                <table className="legal-table">
                  <thead>
                    <tr><th>Plan</th><th>Precio</th><th>Ciclo</th><th>Usuarios</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>Basic</strong></td><td>USD $70</td><td>Mensual</td><td>1</td></tr>
                    <tr><td><strong>Pro</strong></td><td>USD $500</td><td>Mensual</td><td>Multi-usuario</td></tr>
                    <tr><td><strong>Solicitante</strong></td><td>Gratuito</td><td>—</td><td>Ilimitado</td></tr>
                  </tbody>
                </table>
                <ul>
                  <li>Los precios se expresan en dólares estadounidenses (USD) y se facturan en pesos mexicanos al tipo de cambio publicado por el Banco de México el día de la facturación.</li>
                  <li>La suscripción se renueva automáticamente al inicio de cada ciclo de facturación.</li>
                  <li>El Usuario puede cancelar su suscripción en cualquier momento desde el panel de configuración. La cancelación aplica al cierre del ciclo vigente, sin reembolso proporcional.</li>
                  <li>Plinius se reserva el derecho de modificar sus tarifas con 30 días de anticipación mediante notificación al correo electrónico registrado.</li>
                  <li>Los precios no incluyen IVA u otros impuestos aplicables conforme a la legislación mexicana vigente.</li>
                </ul>
              </div>
            </section>

            {/* S8 — PI */}
            <section id="s8" className="sec">
              <div className="sec-header"><span className="sec-num">08</span><h2 className="sec-title">Propiedad intelectual</h2></div>
              <div className="prose">
                <p>Todos los derechos de propiedad intelectual sobre la plataforma Plinius, incluyendo sin limitación el software, diseño, marca, logotipos, interfaces, algoritmos, bases de datos y documentación, son propiedad exclusiva de <strong>Infraestructura en Finanzas AI S.A.P.I. de C.V.</strong></p>
                <p>El acceso a la plataforma no confiere al Usuario ningún derecho de propiedad intelectual sobre la misma. Se prohíbe expresamente:</p>
                <ul>
                  <li>Copiar, modificar, distribuir o crear obras derivadas de cualquier componente de la plataforma.</li>
                  <li>Realizar ingeniería inversa o descompilar el software de la plataforma.</li>
                  <li>Utilizar la marca <strong>Plinius</strong> sin autorización expresa y por escrito de la Empresa.</li>
                  <li>Usar robots, scrapers u otros medios automatizados para extraer datos de la plataforma.</li>
                </ul>
                <p>El Usuario conserva todos los derechos sobre la información y datos que carga en la plataforma. Al hacerlo, otorga a Plinius una licencia limitada, no exclusiva y revocable para procesar dicha información con el único fin de prestar los servicios contratados.</p>
              </div>
            </section>

            {/* S9 — Privacidad */}
            <section id="s9" className="sec">
              <div className="sec-header"><span className="sec-num">09</span><h2 className="sec-title">Privacidad y datos personales</h2></div>
              <div className="prose">
                <p>El tratamiento de datos personales se rige por la <strong>Política de Privacidad</strong> de Plinius, disponible en <a href="/legal/privacidad" style={{ color:"var(--accent-2)", textDecoration:"none" }}>plinius.mx/legal/privacidad</a>, la cual forma parte integrante de los presentes Términos.</p>
                <p>Plinius cumple con la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y su Reglamento. Los datos personales del Usuario serán tratados exclusivamente para las finalidades descritas en la Política de Privacidad.</p>
                <div className="callout callout-info">
                  <div className="callout-label">DATOS EN EL MARKETPLACE</div>
                  <div className="callout-text">La información financiera y operativa compartida en el Marketplace es procesada de forma que preserve el anonimato del Solicitante frente a los Otorgantes, hasta que el propio Solicitante autorice la revelación de su identidad.</div>
                </div>
              </div>
            </section>

            {/* S10 — Responsabilidad */}
            <section id="s10" className="sec">
              <div className="sec-header"><span className="sec-num">10</span><h2 className="sec-title">Limitación de responsabilidad</h2></div>
              <div className="prose">
                <p>En la máxima medida permitida por la ley aplicable:</p>
                <ol>
                  <li>Plinius no será responsable por daños indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso o imposibilidad de uso de la plataforma.</li>
                  <li>La responsabilidad total de Plinius frente al Usuario, por cualquier causa, no excederá el monto pagado por el Usuario en los 3 (tres) meses anteriores al evento que originó la reclamación.</li>
                  <li>Plinius no garantiza la disponibilidad ininterrumpida de la plataforma y no será responsable por interrupciones derivadas de mantenimiento, fallas técnicas, causas de fuerza mayor o caso fortuito.</li>
                  <li>Plinius no es responsable por las decisiones de crédito tomadas por los Otorgantes, ni por el incumplimiento de los Solicitantes en operaciones de crédito celebradas fuera de la plataforma.</li>
                </ol>
                <div className="callout callout-warn">
                  <div className="callout-label">AVISO IMPORTANTE</div>
                  <div className="callout-text">Plinius es una herramienta tecnológica. Las decisiones financieras y crediticias son responsabilidad exclusiva de las partes que las adopten. Plinius no asume responsabilidad por pérdidas financieras derivadas de operaciones de crédito.</div>
                </div>
              </div>
            </section>

            {/* S11 — Vigencia */}
            <section id="s11" className="sec">
              <div className="sec-header"><span className="sec-num">11</span><h2 className="sec-title">Vigencia y terminación</h2></div>
              <div className="prose">
                <p>Los presentes Términos entran en vigor en la fecha de registro del Usuario y permanecen vigentes mientras mantenga una cuenta activa en la plataforma.</p>
                <p><strong>Terminación por el Usuario:</strong> El Usuario puede cancelar su cuenta en cualquier momento a través del panel de configuración. La cancelación implica la pérdida de acceso a los datos almacenados en la plataforma una vez transcurrido el periodo de retención establecido en la Política de Privacidad.</p>
                <p><strong>Terminación por Plinius:</strong> Plinius podrá suspender o terminar la cuenta del Usuario de forma inmediata en caso de:</p>
                <ul>
                  <li>Incumplimiento de cualquier disposición de los presentes Términos.</li>
                  <li>Actividades fraudulentas, ilegales o contrarias a la buena fe.</li>
                  <li>Falta de pago de dos o más ciclos de facturación consecutivos.</li>
                  <li>Resolución judicial o administrativa que así lo ordene.</li>
                </ul>
              </div>
            </section>

            {/* S12 — Modificaciones */}
            <section id="s12" className="sec">
              <div className="sec-header"><span className="sec-num">12</span><h2 className="sec-title">Modificaciones</h2></div>
              <div className="prose">
                <p>Plinius se reserva el derecho de modificar los presentes Términos en cualquier momento. Las modificaciones serán notificadas al Usuario mediante:</p>
                <ul>
                  <li>Correo electrónico a la dirección registrada, con al menos <strong>15 días naturales</strong> de anticipación para cambios sustanciales.</li>
                  <li>Notificación destacada dentro de la plataforma en el inicio de sesión posterior a la modificación.</li>
                  <li>Actualización del número de versión y fecha en la presente página.</li>
                </ul>
                <p>El uso continuado de la plataforma después del periodo de notificación constituye la aceptación tácita de los Términos modificados. Si el Usuario no acepta las modificaciones, deberá cancelar su cuenta antes de que entren en vigor.</p>
              </div>
            </section>

            {/* S13 — Ley */}
            <section id="s13" className="sec">
              <div className="sec-header"><span className="sec-num">13</span><h2 className="sec-title">Ley aplicable y jurisdicción</h2></div>
              <div className="prose">
                <p>Los presentes Términos se rigen e interpretan de conformidad con las leyes de los <strong>Estados Unidos Mexicanos</strong>, con exclusión de cualquier principio de conflicto de leyes que pudiera aplicar.</p>
                <p>Para la resolución de cualquier controversia derivada de los presentes Términos, las partes se someten expresamente a la jurisdicción de los <strong>Tribunales competentes de la Ciudad de México</strong>, renunciando a cualquier otro fuero que pudiera corresponderles en razón de sus domicilios presentes o futuros.</p>
                <p>Sin perjuicio de lo anterior, cualquier controversia podrá ser sometida a mediación ante la <strong>Procuraduría Federal del Consumidor (PROFECO)</strong> o ante el proveedor de resolución alternativa de disputas que Plinius designe.</p>
              </div>
            </section>

            {/* S14 — Contacto */}
            <section id="s14" className="sec">
              <div className="sec-header"><span className="sec-num">14</span><h2 className="sec-title">Contacto</h2></div>
              <div className="prose">
                <p>Para cualquier duda, aclaración o reclamación relacionada con los presentes Términos, el Usuario puede contactar a Plinius a través de:</p>
                <table className="legal-table">
                  <tbody>
                    <tr><td><strong>Empresa</strong></td><td>Infraestructura en Finanzas AI S.A.P.I. de C.V.</td></tr>
                    <tr><td><strong>Marca</strong></td><td>Plinius</td></tr>
                    <tr><td><strong>Domicilio</strong></td><td>Ciudad de México, México</td></tr>
                    <tr><td><strong>Correo legal</strong></td><td><a href="mailto:legal@plinius.mx" style={{ color:"var(--accent-2)", textDecoration:"none" }}>legal@plinius.mx</a></td></tr>
                    <tr><td><strong>Soporte</strong></td><td><a href="mailto:hola@plinius.mx" style={{ color:"var(--accent-2)", textDecoration:"none" }}>hola@plinius.mx</a></td></tr>
                    <tr><td><strong>Plataforma</strong></td><td><a href="https://plinius.mx" style={{ color:"var(--accent-2)", textDecoration:"none" }}>plinius.mx</a></td></tr>
                  </tbody>
                </table>
                <div className="callout callout-success">
                  <div className="callout-label">DERECHOS ARCO</div>
                  <div className="callout-text">Para ejercer tus derechos de Acceso, Rectificación, Cancelación u Oposición (ARCO) sobre tus datos personales, envía tu solicitud a <strong>privacidad@plinius.mx</strong> conforme al procedimiento descrito en nuestra Política de Privacidad.</div>
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ position:"relative", zIndex:1 }}>
        <div className="foot-mini">
          <div style={{ display:"flex", align:"center", gap:20, flexWrap:"wrap" }}>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--fg-3)" }}>© {new Date().getFullYear()} Infraestructura en Finanzas AI S.A.P.I. de C.V.</span>
            <span style={{ fontFamily:"var(--font-mono)", fontSize:11, color:"var(--fg-3)" }}>Plinius · {VERSION} · {FECHA}</span>
          </div>
          <div style={{ display:"flex", gap:16 }}>
            <a href="/legal/privacidad" className="foot-link">Privacidad</a>
            <a href="/legal/cookies"    className="foot-link">Cookies</a>
            <a href="/"                 className="foot-link">Inicio</a>
            <a href="/login"            className="foot-link">Acceder →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
