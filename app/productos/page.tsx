"use client";

import React from "react";
import Link from "next/link";

const PRODUCTS = [
  {
    num: "01",
    title: "Crédito simple con garantía",
    desc: "Financiamiento respaldado por colateral (inmueble, cartera o equipo) para acceder a mejores tasas y montos.",
    tag: "Con garantía",
    icon: "M3 21h18M5 21V7l7-4 7 4v14M9 9h2m-2 4h2m4-4h2m-2 4h2",
    featured: false,
  },
  {
    num: "02",
    title: "Crédito simple sin garantía",
    desc: "Línea sin colateral, evaluada por tu perfil crediticio y flujo. Ágil y flexible para capital de trabajo.",
    tag: "Sin garantía",
    icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
    featured: false,
  },
  {
    num: "03",
    title: "Arrendamiento puro / financiero",
    desc: "Para maquinaria o vehículos. Renta deducible (puro) u opción de compra al final (financiero).",
    tag: "Activos",
    icon: "M9 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-5M12 17v4M8 21h8",
    featured: false,
  },
  {
    num: "04",
    title: "Deuda estructurada",
    desc: "Estructuras a la medida para operaciones grandes, con esquemas de garantía y amortización caso por caso.",
    tag: "$50M–$250M",
    icon: "M3 3v18h18M7 14l4-4 3 3 5-6",
    featured: true,
  },
  {
    num: "05",
    title: "Crédito puente y pre-puente",
    desc: "Liquidez temporal mientras cierras una operación mayor o se libera tu crédito definitivo.",
    tag: "Corto plazo",
    icon: "M5 12h14M12 5l7 7-7 7",
    featured: false,
  },
];

const SHOW_PARTNERS = false;

const PLACEHOLDER_LOGOS = [
  "Banco Nacional", "SOFOM Capital", "Fondo Sur", "Arrendadora MX", "FinTech Plus", "Grupo Inversión",
];

export default function ProductosPage() {
  return (
    <div style={{ fontFamily:"'DM Sans',-apple-system,system-ui,sans-serif", color:"#0F172A", minHeight:"100vh", background:"#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .prod-card{border:1px solid #E2E8F0;border-radius:16px;padding:24px 28px;display:flex;align-items:flex-start;gap:18px;background:#fff;transition:all .2s;}
        .prod-card:hover{border-color:#CBD5E1;box-shadow:0 4px 20px rgba(0,0,0,.06);}
        .prod-card.feat{background:#0C1E4A;border-color:#1B3F8A;}
        .prod-card.feat:hover{border-color:#2A5FAA;box-shadow:0 4px 24px rgba(12,30,74,.25);}
        @media(max-width:768px){.prod-card{flex-direction:column;gap:14px;}}
      `}</style>

      {/* ── NAV (minimal) ── */}
      <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,.92)", backdropFilter:"blur(20px)", borderBottom:"1px solid #E2E8F0" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
            <img src="/pliny_logo_new.png" alt="Plinius" style={{ height:22, width:"auto" }} onError={e=>(e.currentTarget.style.display="none")} />
          </Link>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Link href="/login" style={{ fontSize:14, fontWeight:600, color:"#64748B", textDecoration:"none", padding:"7px 14px", borderRadius:8, transition:"color .15s" }}>Acceder</Link>
            <Link href="/register" style={{ fontSize:14, fontWeight:600, color:"#fff", background:"#0C1E4A", textDecoration:"none", padding:"7px 16px", borderRadius:8, boxShadow:"0 1px 4px rgba(12,30,74,.15)" }}>Empezar</Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ maxWidth:1100, margin:"0 auto", padding:"80px 24px 60px", textAlign:"center", animation:"fadeUp .6s cubic-bezier(.16,1,.3,1) both" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#E4FBF3", border:"1px solid #B8F0DA", borderRadius:999, padding:"5px 14px", marginBottom:20 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#0F9E6E", display:"inline-block" }} />
          <span style={{ fontSize:12, fontWeight:600, color:"#0F9E6E", letterSpacing:".04em" }}>Productos de deuda</span>
        </div>
        <h1 style={{ fontSize:"clamp(28px,5vw,44px)", fontWeight:800, letterSpacing:"-0.025em", lineHeight:1.1, color:"#0F172A", marginBottom:14 }}>
          Financiamiento para cada<br/>etapa de tu empresa
        </h1>
        <p style={{ fontSize:16, color:"#64748B", lineHeight:1.7, maxWidth:"58ch", margin:"0 auto" }}>
          Los productos de crédito que las instituciones ofrecen a través del marketplace de Plinius. Desde capital de trabajo hasta operaciones de gran monto — elige el que se ajusta a ti.
        </p>
      </section>

      {/* ── PRODUCTS ── */}
      <section style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 80px" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {PRODUCTS.map(p => (
            <div key={p.num} className={`prod-card${p.featured ? " feat" : ""}`}>
              {/* Icon chip */}
              <div style={{ width:48, height:48, borderRadius:12, background: p.featured ? "#123163" : "#E4FBF3", display:"grid", placeItems:"center", flexShrink:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={p.featured ? "#00E5A0" : "#0F9E6E"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={p.icon}/></svg>
              </div>

              {/* Content */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:12, fontWeight:600, color: p.featured ? "#00E5A0" : "#0F9E6E", fontFamily:"'DM Sans',sans-serif" }}>{p.num}</span>
                  <span style={{ fontSize:17, fontWeight:700, color: p.featured ? "#fff" : "#0F172A" }}>{p.title}</span>
                </div>
                <p style={{ fontSize:14.5, color: p.featured ? "rgba(255,255,255,.7)" : "#64748B", lineHeight:1.6, maxWidth:"60ch" }}>{p.desc}</p>
              </div>

              {/* Tag */}
              <div style={{ flexShrink:0, alignSelf:"center" }}>
                <span style={{ display:"inline-flex", alignItems:"center", padding:"5px 12px", borderRadius:999, fontSize:12, fontWeight:600, background: p.featured ? "rgba(0,229,160,.12)" : "#F1F5F9", color: p.featured ? "#00E5A0" : "#475569", border: p.featured ? "1px solid rgba(0,229,160,.25)" : "1px solid #E2E8F0" }}>
                  {p.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── EMPRESAS (placeholders — hidden until backend ready) ── */}
      {SHOW_PARTNERS && (
      <section style={{ borderTop:"1px solid #E2E8F0", padding:"60px 24px", background:"#F8FAFB" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", textAlign:"center" }}>
          <p style={{ fontSize:13, fontWeight:600, color:"#94A3B8", letterSpacing:".06em", marginBottom:24 }}>EMPRESAS CON LAS QUE TRABAJAMOS</p>
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:20 }}>
            {PLACEHOLDER_LOGOS.map(name => (
              <div key={name} style={{ width:140, height:48, borderRadius:10, background:"#fff", border:"1px solid #E2E8F0", display:"grid", placeItems:"center", fontSize:11, fontWeight:600, color:"#CBD5E1" }}>
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── FOOTER LINK ── */}
      <div style={{ padding:"40px 24px", textAlign:"center" }}>
        <Link href="/" style={{ fontSize:14, color:"#64748B", textDecoration:"none" }}>← Volver al inicio</Link>
      </div>
    </div>
  );
}
