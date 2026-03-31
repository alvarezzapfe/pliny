"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { setSession } from "@/lib/auth";

function getErrMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return "Error inesperado."; }
}

export default function LoginPage() {
  const router = useRouter();
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [error,         setError]         = useState<string | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass,      setShowPass]      = useState(false);
  const [mounted,       setMounted]       = useState(false);
  const [stats,         setStats]         = useState({usuarios:13, solicitudes:11, monto:"$381M+"});

  useEffect(() => {
    setMounted(true);
    // Live stats from Supabase
    Promise.all([
      supabase.from("solicitudes").select("monto", {count:"exact"}).neq("status","rechazada"),
      supabase.auth.admin ? Promise.resolve(null) : Promise.resolve(null),
    ]).then(([{data, count}]) => {
      const total = data?.reduce((s,r)=>s+(Number(r.monto)||0),0)||0;
      const fmt = total>=1e9?`$${(total/1e9).toFixed(1)}B+`:total>=1e6?`$${(total/1e6).toFixed(0)}M+`:`$${(total/1e3).toFixed(0)}K`;
      setStats(p=>({...p, solicitudes:count??p.solicitudes, monto:fmt}));
    });
  }, []);

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `https://www.plinius.mx/auth/callback` },
    });
    if (oauthErr) { setError(oauthErr.message); setGoogleLoading(false); }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.length < 5 || !cleanEmail.includes("@")) { setLoading(false); setError("Correo inválido."); return; }
    if (password.length < 6) { setLoading(false); setError("Contraseña muy corta."); return; }
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (authErr || !data.user) { setError(authErr?.message ?? "No se pudo iniciar sesión."); setLoading(false); return; }
      const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle();
      const userRole = (roleRow?.role ?? null) as "otorgante"|"solicitante"|null;
      setSession({ role:"client", email:cleanEmail, customerId:data.user.id, createdAt:new Date().toISOString(), userRole:userRole??undefined });
      if (!userRole) { router.push("/onboarding/role"); return; }
      if (userRole === "solicitante") {
        const { data: borrower } = await supabase.from("borrowers_profile").select("onboarding_done").eq("owner_id", data.user.id).maybeSingle();
        setLoading(false);
        router.push(borrower?.onboarding_done ? "/solicitante" : "/onboarding/solicitante");
      } else {
        setLoading(false);
        router.push("/dashboard");
      }
    } catch (err) { setError(getErrMessage(err)); setLoading(false); }
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }

    @keyframes meshA { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(40px,-30px) scale(1.06);} 66%{transform:translate(-25px,20px) scale(.97);} }
    @keyframes meshB { 0%,100%{transform:translate(0,0) scale(1);} 33%{transform:translate(-30px,25px) scale(1.04);} 66%{transform:translate(20px,-15px) scale(.98);} }
    @keyframes meshC { 0%,100%{transform:translate(0,0);} 50%{transform:translate(15px,-20px);} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
    @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:.2;} }
    @keyframes spin { to{transform:rotate(360deg);} }
    @keyframes shimmer { from{background-position:-200% 0;} to{background-position:200% 0;} }
    @keyframes borderGlow { 0%,100%{border-color:rgba(139,92,246,.3);} 50%{border-color:rgba(6,182,212,.4);} }
    @keyframes float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }

    .login-wrap {
      min-height: 100svh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      font-family: 'DM Sans', system-ui, sans-serif;
    }

    /* ── LEFT PANEL ── */
    .left {
      position: relative;
      overflow: hidden;
      background: #060B18;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 36px 48px;
    }
    .mesh-orb {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      filter: blur(1px);
    }
    .orb-1 { top:-15%; left:-10%; width:70vw; height:70vw; max-width:600px; max-height:600px; background:radial-gradient(circle,rgba(139,92,246,.22) 0%,transparent 65%); animation:meshA 20s ease-in-out infinite; }
    .orb-2 { bottom:-10%; right:-5%; width:55vw; height:55vw; max-width:500px; max-height:500px; background:radial-gradient(circle,rgba(79,142,247,.18) 0%,transparent 65%); animation:meshB 26s ease-in-out infinite; }
    .orb-3 { top:20%; right:10%; width:35vw; height:35vw; max-width:320px; max-height:320px; background:radial-gradient(circle,rgba(6,182,212,.10) 0%,transparent 65%); animation:meshC 18s ease-in-out infinite; }
    .grid-lines {
      position: absolute; inset: 0; pointer-events: none;
      background-image: linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px), linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);
      background-size: 52px 52px;
      mask-image: radial-gradient(ellipse 100% 80% at 40% 30%, #000 30%, transparent 75%);
      -webkit-mask-image: radial-gradient(ellipse 100% 80% at 40% 30%, #000 30%, transparent 75%);
    }
    .grain {
      position: absolute; inset: 0; pointer-events: none; opacity: .025;
    }

    .left-content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 60px 0 40px; }

    .logo-mark { display: flex; align-items: center; gap: 10px; text-decoration: none; margin-bottom: 72px; }
    .logo-text { font-size: 17px; font-weight: 800; color: #F0F4FF; letter-spacing: -0.04em; }
    .logo-sub  { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #00E5A0; letter-spacing: .14em; margin-top: 2px; }

    .hero-badge {
      display: inline-flex; align-items: center; gap: 8px;
      border: 1px solid rgba(139,92,246,.3); background: rgba(139,92,246,.07);
      border-radius: 999px; padding: 5px 14px 5px 10px;
      margin-bottom: 28px; width: fit-content;
      animation: borderGlow 4s ease-in-out infinite;
    }
    .hero-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #00E5A0; animation: blink 2s ease-in-out infinite; }
    .hero-badge span { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(240,244,255,.65); letter-spacing: .08em; }

    .hero-h1 { font-size: clamp(34px,4.5vw,58px); font-weight: 800; line-height: 1.02; letter-spacing: -0.05em; color: #F0F4FF; margin-bottom: 18px; }
    .hero-h1 .grad { background: linear-gradient(135deg,#A78BFA,#60A5FA,#22D3EE); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .hero-sub { font-size: 15px; color: rgba(240,244,255,.5); line-height: 1.75; max-width: 38ch; margin-bottom: 44px; }

    .stats-row { display: flex; gap: 28px; }
    .stat { }
    .stat-val { font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; color: #F0F4FF; letter-spacing: -0.04em; line-height: 1; margin-bottom: 4px; }
    .stat-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: rgba(240,244,255,.3); letter-spacing: .1em; text-transform: uppercase; }
    .stat-divider { width: 1px; background: rgba(255,255,255,.08); }

    .left-footer { position: relative; z-index: 1; }
    .feature-pills { display: flex; gap: 8px; flex-wrap: wrap; }
    .pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(240,244,255,.35); letter-spacing: .06em; }
    .pill-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(240,244,255,.25); }

    /* ── RIGHT PANEL ── */
    .right {
      background: #F4F6FB;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 32px;
      position: relative;
    }
    .right::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(139,92,246,.03) 0%, transparent 50%, rgba(6,182,212,.03) 100%);
      pointer-events: none;
    }

    .form-card {
      width: 100%;
      max-width: 420px;
      position: relative;
      z-index: 1;
      animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both;
    }

    .form-header { margin-bottom: 32px; }
    .form-title { font-size: 26px; font-weight: 800; color: #0D1426; letter-spacing: -0.045em; margin-bottom: 6px; }
    .form-sub { font-size: 14px; color: rgba(13,20,38,.45); line-height: 1.6; }

    .live-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 999px;
      background: rgba(0,229,160,.08); border: 1px solid rgba(0,229,160,.2);
      font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #059669;
      letter-spacing: .1em; margin-bottom: 20px;
    }
    .live-dot { width: 5px; height: 5px; border-radius: 50%; background: #00E5A0; animation: blink 2s ease-in-out infinite; }

    .google-btn {
      width: 100%;
      height: 48px;
      border-radius: 12px;
      border: 1.5px solid rgba(13,20,38,.12);
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: #0D1426;
      cursor: pointer;
      transition: all .18s;
      box-shadow: 0 1px 4px rgba(13,20,38,.06);
      margin-bottom: 20px;
    }
    .google-btn:hover { border-color: rgba(13,20,38,.22); box-shadow: 0 4px 14px rgba(13,20,38,.1); transform: translateY(-1px); }
    .google-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

    .divider { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .divider-line { flex: 1; height: 1px; background: rgba(13,20,38,.08); }
    .divider-text { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(13,20,38,.3); letter-spacing: .08em; }

    .field { margin-bottom: 14px; }
    .field-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(13,20,38,.45); letter-spacing: .1em; text-transform: uppercase; display: block; margin-bottom: 7px; }
    .field-wrap { position: relative; }
    .field-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(13,20,38,.3); }
    .field-inp {
      width: 100%;
      height: 46px;
      border-radius: 11px;
      border: 1.5px solid rgba(13,20,38,.1);
      background: #fff;
      padding: 0 14px 0 40px;
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 14px;
      color: #0D1426;
      outline: none;
      transition: border-color .18s, box-shadow .18s;
      box-shadow: 0 1px 3px rgba(13,20,38,.05);
    }
    .field-inp:focus { border-color: #7C3AED; box-shadow: 0 0 0 3px rgba(124,58,237,.1); }
    .field-inp::placeholder { color: rgba(13,20,38,.28); }
    .field-inp.has-error { border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,.08); }
    .pass-toggle { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(13,20,38,.35); padding: 4px; border-radius: 6px; transition: color .15s; }
    .pass-toggle:hover { color: #0D1426; }

    .forgot { font-size: 12px; color: rgba(13,20,38,.4); text-decoration: none; display: block; text-align: right; margin-top: -6px; margin-bottom: 20px; transition: color .15s; }
    .forgot:hover { color: #7C3AED; }

    .error-box {
      display: flex; align-items: center; gap: 8px;
      background: rgba(220,38,38,.05); border: 1px solid rgba(220,38,38,.15);
      border-radius: 10px; padding: 10px 13px;
      font-size: 13px; color: #DC2626; margin-bottom: 16px;
    }

    .submit-btn {
      width: 100%;
      height: 48px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #7C3AED 0%, #1D4ED8 50%, #0891B2 100%);
      color: #fff;
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all .18s;
      box-shadow: 0 4px 16px rgba(124,58,237,.3);
      position: relative;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .submit-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.12) 0%,transparent 60%); pointer-events:none; }
    .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,.4); }
    .submit-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

    .form-footer { text-align: center; font-size: 13px; color: rgba(13,20,38,.45); }
    .form-footer a { color: #7C3AED; text-decoration: none; font-weight: 600; }
    .form-footer a:hover { text-decoration: underline; }

    .admin-link { display: block; text-align: center; margin-top: 24px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: rgba(13,20,38,.22); letter-spacing: .06em; text-decoration: none; transition: color .15s; }
    .admin-link:hover { color: rgba(13,20,38,.45); }

    @keyframes spin { to{transform:rotate(360deg);} }
    .spinner { animation: spin .7s linear infinite; }

    @media (max-width: 768px) {
      .login-wrap { grid-template-columns: 1fr; }
      .left { display: none; }
      .right { min-height: 100svh; }
    }
  `;

  if (!mounted) return null;

  return (
    <div className="login-wrap">
      <style>{CSS}</style>

      {/* ── LEFT ── */}
      <div className="left">
        <div className="mesh-orb orb-1"/>
        <div className="mesh-orb orb-2"/>
        <div className="mesh-orb orb-3"/>
        <div className="grid-lines"/>
        <svg className="grain" viewBox="0 0 200 200">
          <filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
          <rect width="100%" height="100%" filter="url(#g)"/>
        </svg>

        {/* Logo */}
        <a href="/" className="logo-mark">
          <img src="/plinius.png" alt="" style={{height:24,filter:"brightness(0) invert(1)",opacity:.9}} onError={e=>(e.currentTarget.style.display="none")}/>
          <div>
            <div className="logo-text">Plinius</div>
            <div className="logo-sub">CREDIT OS</div>
          </div>
        </a>

        <div className="left-content">
          <div className="hero-badge">
            <span className="dot"/>
            <span>LIVE · CRÉDITO PRIVADO · MÉXICO</span>
          </div>

          <h1 className="hero-h1">
            Infraestructura<br/>
            de crédito para<br/>
            <span className="grad">instituciones.</span>
          </h1>

          <p className="hero-sub">
            Cartera, riesgo y marketplace en un solo lugar. Estándares institucionales desde el día uno.
          </p>

          <div className="stats-row">
            {[
              {val:stats.monto,              label:"En solicitudes"},
              {val:String(stats.solicitudes),label:"Operaciones activas"},
              {val:"LATAM",                  label:"Mercado objetivo"},
            ].map((s,i)=>(
              <React.Fragment key={s.label}>
                {i>0&&<div className="stat-divider"/>}
                <div className="stat">
                  <div className="stat-val">{s.val}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="left-footer">
          <div className="feature-pills">
            {["Onboarding digital","Risk signals","SAT · CFDI","Reportes PDF","Marketplace","API-first"].map(t=>(
              <span key={t} className="pill"><span className="pill-dot"/>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="right">
        <div className="form-card">

          <div className="live-badge">
            <span className="live-dot"/>
            SISTEMA OPERATIVO
          </div>

          <div className="form-header">
            <h1 className="form-title">Bienvenido de nuevo</h1>
            <p className="form-sub">Accede a tu consola de crédito.</p>
          </div>

          {/* Google */}
          <button className="google-btn" onClick={handleGoogleLogin} disabled={googleLoading||loading}>
            {googleLoading ? (
              <svg className="spinner" width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="rgba(13,20,38,.4)" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            )}
            {googleLoading ? "Conectando..." : "Continuar con Google"}
          </button>

          <div className="divider">
            <div className="divider-line"/>
            <span className="divider-text">O CON CORREO</span>
            <div className="divider-line"/>
          </div>

          <form onSubmit={onSubmit} noValidate>
            {/* Email */}
            <div className="field">
              <label className="field-label">Correo electrónico</label>
              <div className="field-wrap">
                <span className="field-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 5l7 5 7-5"/></svg>
                </span>
                <input className={`field-inp${error?" has-error":""}`} type="email" placeholder="tu@empresa.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/>
              </div>
            </div>

            {/* Password */}
            <div className="field">
              <label className="field-label">Contraseña</label>
              <div className="field-wrap">
                <span className="field-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
                </span>
                <input className={`field-inp${error?" has-error":""}`} type={showPass?"text":"password"} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/>
                <button type="button" className="pass-toggle" onClick={()=>setShowPass(v=>!v)}>
                  {showPass
                    ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/><path d="M2 2l12 12"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>
                  }
                </button>
              </div>
            </div>

            <a href="/forgot-password" className="forgot">¿Olvidaste tu contraseña?</a>

            {error && (
              <div className="error-box">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3M8 11h.01"/></svg>
                {error}
              </div>
            )}

            <button type="submit" className="submit-btn" disabled={loading||googleLoading}>
              {loading
                ? <><svg className="spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>Iniciando sesión...</>
                : <>Entrar a la consola <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.6" strokeLinecap="round"><path d="M3 8h10M9 5l4 3-4 3"/></svg></>
              }
            </button>
          </form>

          <p className="form-footer">
            ¿Nuevo aquí? <Link href="/register">Crear cuenta →</Link>
          </p>

          <a href="/admin/login" className="admin-link">ADMIN →</a>
        </div>
      </div>
    </div>
  );
}
