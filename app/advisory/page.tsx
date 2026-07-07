"use client";

import React from "react";
import Link from "next/link";

const SERVICES = [
  { title: "Estructuración de deuda", desc: "Estructura, garantías y términos de tu financiamiento." },
  { title: "Levantamiento de deuda", desc: "El financiamiento correcto, con la institución o fondo correcto." },
  { title: "Valuación y modelos", desc: "Modelos financieros y valuaciones para sustentar tu operación." },
  { title: "Emisiones en mercado de valores", desc: "Emisiones de deuda en el mercado de valores en México." },
];

export default function AdvisoryPage() {
  return (
    <div style={{ fontFamily:"'DM Sans',-apple-system,system-ui,sans-serif", color:"#0F172A", minHeight:"100vh", background:"#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .srv-card{background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:24px;transition:all .2s;}
        .srv-card:hover{border-color:#CBD5E1;box-shadow:0 4px 20px rgba(0,0,0,.06);}
        @media(max-width:768px){
          .hero-grid{grid-template-columns:1fr !important;}
          .srv-grid{grid-template-columns:1fr !important;}
          .hero-photo{order:-1;justify-self:center;margin-bottom:8px;}
        }
      `}</style>

      {/* ── NAV ── */}
      <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,.92)", backdropFilter:"blur(20px)", borderBottom:"1px solid #E2E8F0" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
            <img src="/pliny_logo_new.png" alt="Plinius" style={{ height:22, width:"auto" }} onError={e=>(e.currentTarget.style.display="none")} />
          </Link>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Link href="/" style={{ fontSize:14, fontWeight:600, color:"#64748B", textDecoration:"none", padding:"7px 14px", borderRadius:8 }}>Inicio</Link>
            <Link href="/login" style={{ fontSize:14, fontWeight:600, color:"#fff", background:"#0C1E4A", textDecoration:"none", padding:"7px 16px", borderRadius:8, boxShadow:"0 1px 4px rgba(12,30,74,.15)" }}>Acceder</Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ maxWidth:1100, margin:"0 auto", padding:"48px 24px 0", animation:"fadeUp .6s cubic-bezier(.16,1,.3,1) both" }}>
        <div className="hero-grid" style={{ background:"#0C1E4A", borderRadius:20, padding:48, display:"grid", gridTemplateColumns:"200px 1fr", gap:40, alignItems:"center", position:"relative", overflow:"hidden" }}>
          {/* Subtle glow */}
          <div style={{ position:"absolute", top:0, right:0, width:400, height:400, background:"radial-gradient(circle at top right, rgba(0,229,160,.06), transparent 70%)", pointerEvents:"none" }} />

          {/* Photo */}
          <div className="hero-photo" style={{ position:"relative", zIndex:1 }}>
            <div style={{ width:200, height:240, borderRadius:16, border:"1px solid #1E406F", overflow:"hidden", background:"#162D50" }}>
              <img src="/profile.png" alt="Luis Armando Alvarez Zapfe" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                onError={e=>{ e.currentTarget.style.display="none"; }} />
            </div>
          </div>

          {/* Text */}
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#00E5A0", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:14 }}>Asesoría</div>
            <h1 style={{ fontSize:32, fontWeight:700, color:"#fff", letterSpacing:"-0.02em", lineHeight:1.2, marginBottom:8 }}>
              Luis Armando Alvarez Zapfe
            </h1>
            <div style={{ fontSize:16, color:"#7C90B8", marginBottom:16 }}>CFA Charterholder</div>
            <p style={{ fontSize:16, color:"#A9BAD8", lineHeight:1.65, maxWidth:460 }}>
              Asesoría estratégica y levantamiento de deuda para empresas e instituciones financieras.
            </p>
          </div>
        </div>
      </section>

      {/* ── EXPERIENCIA ── */}
      <section style={{ maxWidth:1100, margin:"0 auto", padding:"56px 24px 0" }}>
        <p style={{ fontSize:15, color:"#64748B", lineHeight:1.75, maxWidth:640 }}>
          Trader y portfolio manager en Seguros Monterrey New York Life y Actinver. Ingeniero industrial (Anáhuac) y CFA Charterholder; cofundador de Crowdlink y fundador de Plinius.
        </p>
      </section>

      {/* ── SERVICIOS ── */}
      <section style={{ maxWidth:1100, margin:"0 auto", padding:"56px 24px 80px" }}>
        <div className="srv-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {SERVICES.map(s => (
            <div key={s.title} className="srv-card">
              <div style={{ fontSize:16, fontWeight:700, color:"#0F172A", marginBottom:6 }}>{s.title}</div>
              <p style={{ fontSize:14.5, color:"#64748B", lineHeight:1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER LINK ── */}
      <div style={{ padding:"40px 24px", textAlign:"center", borderTop:"1px solid #E2E8F0" }}>
        <Link href="/" style={{ fontSize:14, color:"#64748B", textDecoration:"none" }}>← Volver al inicio</Link>
      </div>
    </div>
  );
}
