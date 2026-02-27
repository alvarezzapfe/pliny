"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted]   = useState(false);
  const [emailFocus, setEmailFocus]     = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const hint = useMemo(() => "Admin: /admin/login", []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.length < 5 || !cleanEmail.includes("@")) { setLoading(false); setError("Correo inválido."); return; }
    if (password.length < 6) { setLoading(false); setError("Contraseña muy corta."); return; }
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (authErr || !data.user) { setError(authErr?.message ?? "No se pudo iniciar sesión."); setLoading(false); return; }
      setSession({ role: "client", email: cleanEmail, customerId: data.user.id, createdAt: new Date().toISOString() });
      setLoading(false);
      router.push("/dashboard");
    } catch (err) {
      setLoading(false);
      setError(err?.message ?? "Error inesperado.");
    }
  };

  return (
    <main style={{
      height: "100svh", overflow: "hidden",
      display: "grid", gridTemplateColumns: "1fr 1fr",
      fontFamily: "'Geist', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --blue-deep:  #0C1E4A;
          --blue-mid:   #0F2254;
          --blue-rich:  #1B3F8A;
          --accent:     #5B8DEF;
          --green:      #00E5A0;
          --fg:         #EEF2FF;
          --fg-2:       rgba(238,242,255,0.62);
          --fg-3:       rgba(238,242,255,0.36);
          --border:     rgba(255,255,255,0.08);
          --border-2:   rgba(255,255,255,0.15);
        }

        @keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes ticker   { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes blink    { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        @keyframes gridPulse{ 0%,100%{opacity:0.5;} 50%{opacity:0.75;} }
        @keyframes orbDrift { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-20px);} }
        @keyframes scanline { from{transform:translateY(-100%);} to{transform:translateY(600%);} }
        @keyframes slideIn  { from{opacity:0;transform:translateY(-6px);} to{opacity:1;transform:translateY(0);} }

        .left-panel  { animation: fadeUp 0.65s cubic-bezier(.16,1,.3,1) both; }
        .right-panel { animation: fadeUp 0.65s cubic-bezier(.16,1,.3,1) 0.1s both; }
        .orb-a { animation: orbDrift 8s ease-in-out infinite; }
        .orb-b { animation: orbDrift 11s ease-in-out 2s infinite; }
        .grid-pulse { animation: gridPulse 7s ease-in-out infinite; }

        .ticker-track {
          display:flex; white-space:nowrap;
          animation: ticker 32s linear infinite;
        }

        /* ── Left panel elements ── */
        .stat-pill {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          padding: 14px 16px;
          transition: border-color 0.2s, background 0.2s;
        }
        .stat-pill:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(91,141,239,0.3);
        }

        .step-chip {
          display:inline-flex; align-items:center; gap:8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 999px; padding: 6px 14px;
          font-size: 12px; font-weight:500; color: rgba(238,242,255,0.75);
        }
        .step-n {
          width:20px; height:20px; border-radius:50%;
          background: rgba(0,229,160,0.14);
          border: 1px solid rgba(0,229,160,0.28);
          display:grid; place-items:center;
          font-size:10px; font-weight:700; color:#00E5A0;
          font-family:'Geist Mono',monospace;
        }

        /* ── Right panel / form ── */
        .inp-wrap { position:relative; }

        .inp {
          height: 48px; width:100%;
          background: #F0F4FF;
          border: 1.5px solid #DDE5F7;
          border-radius: 12px;
          padding: 0 44px 0 40px;
          font-size: 14px; color: #0F172A;
          font-family: 'Geist', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .inp::placeholder { color: #94A3B8; }
        .inp:focus {
          border-color: #5B8DEF;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(91,141,239,0.12);
        }
        .inp.has-error {
          border-color: #F43F5E;
          background: #FFF5F7;
        }
        .inp.has-error:focus {
          box-shadow: 0 0 0 4px rgba(244,63,94,0.10);
        }

        .inp-icon {
          position:absolute; left:13px; top:50%; transform:translateY(-50%);
          color: #94A3B8; pointer-events:none;
          transition: color 0.2s;
        }
        .inp-icon.focused { color: #5B8DEF; }

        .toggle-pass {
          position:absolute; right:13px; top:50%; transform:translateY(-50%);
          background:none; border:none; cursor:pointer; color:#94A3B8;
          display:flex; align-items:center;
          transition: color 0.15s;
          padding: 4px;
        }
        .toggle-pass:hover { color:#475569; }

        .btn-submit {
          height: 50px; width:100%;
          background: linear-gradient(135deg, #0C1E4A 0%, #1B3F8A 100%);
          color:#fff; border:none; border-radius:12px;
          font-size:14px; font-weight:600;
          font-family:'Geist',sans-serif;
          cursor:pointer; letter-spacing:-0.01em;
          display:flex; align-items:center; justify-content:center; gap:8px;
          box-shadow: 0 4px 20px rgba(12,30,74,0.30), 0 1px 4px rgba(12,30,74,0.20);
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
          position: relative; overflow: hidden;
        }
        .btn-submit::after {
          content:''; position:absolute; inset:0;
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%);
          pointer-events:none;
        }
        .btn-submit:hover:not(:disabled) {
          opacity:0.94; transform:translateY(-1px);
          box-shadow: 0 8px 32px rgba(12,30,74,0.35), 0 2px 8px rgba(12,30,74,0.25);
        }
        .btn-submit:disabled { opacity:0.52; cursor:not-allowed; transform:none; }

        .error-box {
          background:#FFF1F2; border:1px solid #FECDD3;
          border-radius:10px; padding:11px 14px;
          font-size:13px; font-weight:500; color:#9F1239;
          display:flex; align-items:center; gap:8px;
          animation: slideIn 0.2s ease both;
        }

        .card {
          background:#fff;
          border-radius: 24px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 24px 80px rgba(12,30,74,0.10), 0 4px 16px rgba(12,30,74,0.06);
          padding: 28px;
        }

        .divider { flex:1; height:1px; background:#EEF2FF; }

        .live-badge {
          display:inline-flex; align-items:center; gap:6px;
          background:#F0FDF9; border:1px solid #D1FAE5;
          border-radius:999px; padding:5px 11px;
        }
        .live-dot {
          width:7px; height:7px; border-radius:50%;
          background:#00E5A0;
          animation: blink 2.2s ease-in-out infinite;
        }

        .back-btn {
          display:inline-flex; align-items:center; gap:6px;
          background:#fff; border:1px solid #E2E8F0;
          border-radius:999px; padding:6px 14px;
          font-size:12px; font-weight:600; color:#475569;
          text-decoration:none; transition: all 0.15s;
        }
        .back-btn:hover { border-color:#CBD5E1; color:#0F172A; }

        /* Progress indicator on submit */
        @keyframes progressBar {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .progress-bar {
          position:absolute; bottom:0; left:0; right:0; height:2px;
          background: rgba(255,255,255,0.4);
          transform-origin: left;
          animation: progressBar 1.4s cubic-bezier(.4,0,.2,1) forwards;
        }

        @media (max-width:900px) {
          main { grid-template-columns: 1fr !important; }
          .left-panel { display:none !important; }
        }
      `}</style>

      {/* ══════════════════════════════════
          LEFT — brand / blue panel
      ══════════════════════════════════ */}
      <section className="left-panel" style={{
        position:"relative", overflow:"hidden",
        background: "radial-gradient(ellipse 120% 80% at 25% 10%, #1B3F8A 0%, #0C1E4A 55%, #091530 100%)",
        padding:"40px 48px",
        display:"flex", flexDirection:"column", justifyContent:"space-between",
      }}>
        {/* Grid */}
        <div className="grid-pulse" style={{
          position:"absolute", inset:0, pointerEvents:"none",
          backgroundImage:`
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)
          `,
          backgroundSize:"48px 48px",
        }}/>
        {/* Scanline */}
        <div style={{
          position:"absolute", left:0, right:0, top:0, height:"25%", pointerEvents:"none",
          background:"linear-gradient(to bottom, transparent, rgba(91,141,239,0.04), transparent)",
          animation:"scanline 6s linear infinite",
        }}/>
        {/* Orbs */}
        <div className="orb-a" style={{
          position:"absolute", top:"-80px", left:"-60px",
          width:480, height:480, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(circle, rgba(27,63,138,0.80) 0%, transparent 70%)",
        }}/>
        <div className="orb-b" style={{
          position:"absolute", bottom:"-80px", right:"-60px",
          width:420, height:420, borderRadius:"50%", pointerEvents:"none",
          background:"radial-gradient(circle, rgba(0,229,160,0.10) 0%, transparent 70%)",
        }}/>
        {/* Noise */}
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.04,pointerEvents:"none"}}>
          <filter id="lnoise"><feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
          <rect width="100%" height="100%" filter="url(#lnoise)"/>
        </svg>

        {/* TOP — logo */}
        <div style={{position:"relative",zIndex:2}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src="/plinius.png" alt="Plinius"
              style={{height:28,width:"auto",filter:"brightness(0) invert(1)",opacity:0.92}}
              onError={e=>e.target.style.display="none"}
            />
            <div>
              <div style={{color:"#EEF2FF",fontSize:15,fontWeight:700,letterSpacing:"-0.03em"}}>Plinius</div>
              <div style={{color:"var(--green)",fontSize:10,fontFamily:"'Geist Mono',monospace",letterSpacing:"0.10em"}}>CREDIT OS</div>
            </div>
          </div>
        </div>

        {/* MIDDLE — headline + stats */}
        <div style={{position:"relative",zIndex:2}}>
          <div style={{
            display:"inline-flex",alignItems:"center",gap:7,
            background:"rgba(0,229,160,0.10)",border:"1px solid rgba(0,229,160,0.22)",
            borderRadius:999,padding:"5px 12px",marginBottom:22,
          }}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block",animation:"blink 2s ease-in-out infinite"}}/>
            <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:500,color:"var(--green)",letterSpacing:"0.10em"}}>PRIVATE CREDIT INFRA</span>
          </div>

          <h1 style={{
            fontSize:42,fontWeight:800,lineHeight:1.06,
            letterSpacing:"-0.04em",color:"var(--fg)",marginBottom:14,
          }}>
            Underwrite.<br/>
            <span style={{color:"var(--green)"}}>Monitor.</span>{" "}
            <span style={{color:"var(--fg-3)",fontWeight:600}}>Report.</span>
          </h1>

          <p style={{fontSize:13,color:"var(--fg-2)",lineHeight:1.7,maxWidth:"40ch",marginBottom:28}}>
            Consola para otorgantes: portafolio, señales de riesgo y reportes ejecutivos en minutos.
          </p>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:28}}>
            {[
              {val:"$2.4B", label:"Volumen gestionado"},
              {val:"99.8%",label:"Uptime"},
              {val:"<3min",label:"Tiempo de reporte"},
            ].map(s=>(
              <div key={s.val} className="stat-pill">
                <div style={{fontSize:18,fontWeight:700,color:"var(--fg)",letterSpacing:"-0.04em"}}>{s.val}</div>
                <div style={{fontSize:10,color:"var(--fg-3)",marginTop:3,fontFamily:"'Geist Mono',monospace"}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[["01","Regístrate"],["02","Activa plan"],["03","Opera"]].map(([n,t])=>(
              <span key={t} className="step-chip">
                <span className="step-n">{n}</span>{t}
              </span>
            ))}
          </div>
        </div>

        {/* BOTTOM — ticker + copyright */}
        <div style={{position:"relative",zIndex:2}}>
          <div style={{
            overflow:"hidden",marginBottom:14,
            maskImage:"linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
            WebkitMaskImage:"linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)",
          }}>
            <div className="ticker-track">
              {[...Array(2)].map((_,i)=>(
                <span key={i} style={{display:"flex"}}>
                  {["Análisis de riesgo","Covenants","Alertas","Reportes PDF","Integración bancaria","Scoring crediticio"].map(t=>(
                    <span key={t} style={{
                      fontFamily:"'Geist Mono',monospace",fontSize:10,
                      color:"rgba(238,242,255,0.25)",letterSpacing:"0.06em",
                      padding:"0 20px",
                    }}>· {t} </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--fg-3)"}}>
            © {new Date().getFullYear()} Plinius · {hint}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════
          RIGHT — form panel
      ══════════════════════════════════ */}
      <section className="right-panel" style={{
        background:"#F8FAFC",
        position:"relative", overflow:"hidden",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"40px 32px",
      }}>
        {/* Subtle top glow */}
        <div style={{
          position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",
          width:"80%",height:220,pointerEvents:"none",
          background:"radial-gradient(ellipse at top, rgba(91,141,239,0.10), transparent 70%)",
        }}/>
        {/* Very subtle grid on right too */}
        <div style={{
          position:"absolute",inset:0,pointerEvents:"none",opacity:0.35,
          backgroundImage:`
            linear-gradient(rgba(12,30,74,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(12,30,74,0.04) 1px, transparent 1px)
          `,
          backgroundSize:"40px 40px",
        }}/>

        <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:1}}>

          {/* Top nav */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <Link href="/" className="back-btn">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 1.5L3 6L7.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Inicio
            </Link>
            <Link href="/admin/login" style={{fontSize:12,fontWeight:600,color:"#64748B",textDecoration:"none",transition:"color 0.15s"}}
              onMouseEnter={e=>e.target.style.color="#0F172A"}
              onMouseLeave={e=>e.target.style.color="#64748B"}>
              Admin →
            </Link>
          </div>

          {/* Card */}
          <div className="card">

            {/* Header row */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
              <div>
                <h2 style={{fontSize:21,fontWeight:700,color:"#0F172A",letterSpacing:"-0.03em",marginBottom:4}}>
                  Bienvenido de nuevo
                </h2>
                <p style={{fontSize:13,color:"#64748B"}}>
                  Accede a tu consola de crédito.
                </p>
              </div>
              <div className="live-badge">
                <div className="live-dot"/>
                <span style={{fontSize:10,fontWeight:700,color:"#065F46",fontFamily:"'Geist Mono',monospace",letterSpacing:"0.06em"}}>LIVE</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <div className="divider"/>
              <span style={{fontSize:10,color:"#CBD5E1",fontFamily:"'Geist Mono',monospace",whiteSpace:"nowrap",letterSpacing:"0.08em"}}>CREDENCIALES</span>
              <div className="divider"/>
            </div>

            <form onSubmit={onSubmit} style={{display:"flex",flexDirection:"column",gap:14}}>

              {/* Email */}
              <div>
                <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:7}}>
                  Correo electrónico
                </label>
                <div className="inp-wrap">
                  <div className={`inp-icon${emailFocus?" focused":""}`}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M1.5 3.5l6 4.5 6-4.5M1.5 3.5h12v8h-12z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    value={email}
                    onChange={e=>setEmail(e.target.value)}
                    onFocus={()=>setEmailFocus(true)}
                    onBlur={()=>setEmailFocus(false)}
                    type="email" required autoComplete="email"
                    placeholder="correo@empresa.com"
                    className={`inp${error?" has-error":""}`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#374151"}}>Contraseña</label>
                  <Link href="/forgot-password" style={{fontSize:11,fontWeight:600,color:"#5B8DEF",textDecoration:"none",transition:"opacity 0.15s"}}
                    onMouseEnter={e=>e.target.style.opacity="0.7"}
                    onMouseLeave={e=>e.target.style.opacity="1"}>
                    ¿Olvidaste la contraseña?
                  </Link>
                </div>
                <div className="inp-wrap">
                  <div className={`inp-icon${passwordFocus?" focused":""}`}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <rect x="2.5" y="6.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M4.5 6.5V5a3 3 0 016 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <input
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                    onFocus={()=>setPasswordFocus(true)}
                    onBlur={()=>setPasswordFocus(false)}
                    type={showPass?"text":"password"}
                    required autoComplete="current-password"
                    placeholder="••••••••"
                    className={`inp${error?" has-error":""}`}
                  />
                  <button type="button" className="toggle-pass" onClick={()=>setShowPass(v=>!v)} aria-label="Mostrar contraseña">
                    {showPass?(
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/>
                        <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M3 3l9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    ):(
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/>
                        <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="error-box">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#F43F5E" strokeWidth="1.3"/>
                    <path d="M7 4.5v3M7 10h.01" stroke="#F43F5E" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} className="btn-submit" style={{marginTop:2}}>
                {loading&&<div className="progress-bar"/>}
                {loading?(
                  <>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{animation:"spin 0.75s linear infinite"}}>
                      <circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,0.25)" strokeWidth="2"/>
                      <path d="M13 7.5a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Validando...
                  </>
                ):(
                  <>
                    Entrar a la consola
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2.5 6.5h8M7 3.5l3 3-3 3" stroke="rgba(255,255,255,0.65)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </>
                )}
              </button>

              {/* Register */}
              <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:"#94A3B8"}}>¿Nuevo aquí?</span>
                <Link href="/register" style={{fontSize:12,fontWeight:600,color:"#0F172A",textDecoration:"none",borderBottom:"1px solid #E2E8F0",paddingBottom:1}}>
                  Crear cuenta →
                </Link>
              </div>
            </form>
          </div>

          {/* Trust strip */}
          <div style={{marginTop:16,display:"flex",justifyContent:"center",alignItems:"center",flexWrap:"wrap",gap:4}}>
            {["Security-first","Supabase Auth","SOC 2 ready"].map((t,i)=>(
              <span key={t} style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11,color:"#94A3B8"}}>
                {i>0&&<span style={{width:3,height:3,borderRadius:"50%",background:"#CBD5E1",display:"inline-block"}}/>}
                {t}
              </span>
            ))}
          </div>

          <div style={{textAlign:"center",marginTop:8,fontFamily:"'Geist Mono',monospace",fontSize:10,color:"#CBD5E1",letterSpacing:"0.04em"}}>
            Plinius · private credit tooling
          </div>
        </div>
      </section>
    </main>
  );
}