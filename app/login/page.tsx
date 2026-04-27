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
      const userRole = (roleRow?.role ?? null) as "otorgante"|"solicitante"|"fondeador"|null;
      setSession({ role:"client", email:cleanEmail, customerId:data.user.id, createdAt:new Date().toISOString(), userRole:userRole??undefined });
      if (!userRole) { router.push("/onboarding/role"); return; }
      if (userRole === "solicitante") {
        const { data: borrower } = await supabase.from("borrowers_profile").select("onboarding_done").eq("owner_id", data.user.id).maybeSingle();
        setLoading(false);
        router.push(borrower?.onboarding_done ? "/solicitante" : "/onboarding/solicitante");
      } else if (userRole === "fondeador") {
        setLoading(false);
        router.push("/fondeador");
      } else {
        setLoading(false);
        router.push("/dashboard");
      }
    } catch (err) { setError(getErrMessage(err)); setLoading(false); }
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }

    @keyframes fadeUp { from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }
    @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:.2;} }
    @keyframes spin { to{transform:rotate(360deg);} }
    @keyframes gridPulse { 0%,100%{opacity:.3;} 50%{opacity:.5;} }

    .login-wrap {
      min-height: 100svh;
      display: grid;
      grid-template-columns: 1fr 1fr;
      font-family: 'Geist', system-ui, sans-serif;
    }

    /* ── LEFT PANEL ── */
    .left {
      position: relative; overflow: hidden;
      background: radial-gradient(ellipse 160% 110% at 20% 0%, #1B3F8A 0%, #0C1E4A 55%, #091530 100%);
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 40px 52px;
    }
    .grid-lines {
      position: absolute; inset: 0; pointer-events: none;
      background-image:
        radial-gradient(circle 1px, rgba(255,255,255,.12) 1px, transparent 1px);
      background-size: 32px 32px;
      animation: gridPulse 6s ease-in-out infinite;
      mask-image: radial-gradient(ellipse 80% 70% at 40% 35%, #000 20%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse 80% 70% at 40% 35%, #000 20%, transparent 70%);
    }

    .left-content { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 40px 0; }

    .logo-mark { display: flex; align-items: center; gap: 10px; text-decoration: none; position: relative; z-index: 1; }
    .logo-text { font-size: 18px; font-weight: 800; color: #EEF2FF; letter-spacing: -0.04em; }
    .logo-sub  { font-family: 'Geist Mono', monospace; font-size: 9px; color: #00E5A0; letter-spacing: .14em; margin-top: 2px; }

    .hero-h1 { font-size: clamp(28px,3.5vw,42px); font-weight: 900; line-height: 1.08; letter-spacing: -0.045em; color: #EEF2FF; margin-bottom: 20px; }

    .user-types { display: flex; flex-direction: column; gap: 14px; margin-bottom: 40px; }
    .user-type {
      display: flex; align-items: center; gap: 12px;
      font-size: 14px; color: rgba(238,242,255,.65); line-height: 1.5;
    }
    .user-type-icon {
      width: 28px; height: 28px; border-radius: 8px;
      display: grid; place-items: center; flex-shrink: 0;
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.10);
    }

    .stats-row { display: flex; gap: 28px; }
    .stat-val { font-family: 'Geist Mono', monospace; font-size: 22px; font-weight: 700; color: #EEF2FF; letter-spacing: -0.04em; line-height: 1; margin-bottom: 4px; }
    .stat-label { font-family: 'Geist Mono', monospace; font-size: 9px; color: rgba(238,242,255,.3); letter-spacing: .1em; text-transform: uppercase; }
    .stat-divider { width: 1px; background: rgba(255,255,255,.08); }

    .left-footer { position: relative; z-index: 1; }
    .reg-badge {
      font-family: 'Geist Mono', monospace; font-size: 9px; color: rgba(238,242,255,.25);
      letter-spacing: .08em; border: 1px solid rgba(255,255,255,.08);
      border-radius: 999px; padding: 5px 14px; display: inline-flex; align-items: center; gap: 6px;
    }

    /* ── RIGHT PANEL ── */
    .right {
      background: #FAFBFF;
      display: flex; align-items: center; justify-content: center;
      padding: 48px 40px; position: relative;
    }

    .form-card {
      width: 100%; max-width: 400px;
      position: relative; z-index: 1;
      animation: fadeUp .5s cubic-bezier(.16,1,.3,1) both;
    }

    .form-header { margin-bottom: 36px; }
    .form-title { font-size: 28px; font-weight: 900; color: #0C1E4A; letter-spacing: -0.04em; margin-bottom: 6px; }
    .form-sub { font-size: 14px; color: #64748B; line-height: 1.6; }

    .google-btn {
      width: 100%; height: 48px; border-radius: 12px;
      border: 1.5px solid #E2E8F0; background: #fff;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      font-family: 'Geist', sans-serif; font-size: 14px; font-weight: 600; color: #0F172A;
      cursor: pointer; transition: all .18s;
      box-shadow: 0 1px 4px rgba(0,0,0,.04); margin-bottom: 24px;
    }
    .google-btn:hover { border-color: #CBD5E1; box-shadow: 0 4px 14px rgba(0,0,0,.08); transform: translateY(-1px); }
    .google-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

    .divider { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
    .divider-line { flex: 1; height: 1px; background: #E2E8F0; }
    .divider-text { font-family: 'Geist Mono', monospace; font-size: 10px; color: #94A3B8; letter-spacing: .08em; }

    .field { margin-bottom: 16px; }
    .field-label { font-family: 'Geist Mono', monospace; font-size: 10px; color: #64748B; letter-spacing: .1em; text-transform: uppercase; display: block; margin-bottom: 8px; }
    .field-wrap { position: relative; }
    .field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94A3B8; }
    .field-inp {
      width: 100%; height: 44px; border-radius: 10px;
      border: 1.5px solid #E2E8F0; background: #fff;
      padding: 0 14px 0 42px;
      font-family: 'Geist', sans-serif; font-size: 14px; color: #0F172A;
      outline: none; transition: border-color .18s, box-shadow .18s;
    }
    .field-inp:focus { border-color: #1B3F8A; box-shadow: 0 0 0 3px rgba(27,63,138,.08); }
    .field-inp::placeholder { color: #CBD5E1; }
    .field-inp.has-error { border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,.08); }
    .pass-toggle { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94A3B8; padding: 4px; border-radius: 6px; transition: color .15s; }
    .pass-toggle:hover { color: #0F172A; }

    .forgot { font-size: 12px; color: #94A3B8; text-decoration: none; display: block; text-align: right; margin-top: -8px; margin-bottom: 20px; transition: color .15s; }
    .forgot:hover { color: #0C1E4A; text-decoration: underline; }

    .error-box {
      display: flex; align-items: center; gap: 8px;
      background: #FFF1F2; border: 1px solid #FECDD3;
      border-radius: 10px; padding: 10px 13px;
      font-size: 13px; color: #9F1239; margin-bottom: 16px;
    }

    .submit-btn {
      width: 100%; height: 48px; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #0C1E4A 0%, #1B3F8A 100%);
      color: #fff; font-family: 'Geist', sans-serif; font-size: 14px; font-weight: 700;
      cursor: pointer; letter-spacing: -0.01em;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all .18s;
      box-shadow: 0 4px 16px rgba(12,30,74,.25);
      position: relative; overflow: hidden; margin-bottom: 24px;
    }
    .submit-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.08) 0%,transparent 60%); pointer-events:none; }
    .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(12,30,74,.35); }
    .submit-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }

    .form-footer { text-align: center; font-size: 13px; color: #64748B; }
    .form-footer a { color: #0C1E4A; text-decoration: none; font-weight: 700; }
    .form-footer a:hover { text-decoration: underline; }


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
        <div className="grid-lines"/>

        {/* Logo */}
        <a href="/" className="logo-mark">
          <img src="/plinius_newlogo.png" alt="Plinius" style={{height:52,width:"auto"}} onError={e=>(e.currentTarget.style.display="none")}/>
        </a>

        <div className="left-content">
          <h1 className="hero-h1">
            Credit OS para<br/>
            el M&eacute;xico<br/>
            Financiero
          </h1>

          <div className="user-types">
            {[
              { icon: "M3 2h10v12H3zM6 5h4M6 8h4M6 11h2", label: "Solicitantes", desc: "Busca cr\u00E9dito para tu empresa" },
              { icon: "M2 14h12M4 14V6l4-4 4 4v8M7 11h2v3H7z", label: "Otorgantes", desc: "Escala tu cartera con infraestructura" },
              { icon: "M2 12L6 7l3 3 3-4 2 2M13 4h-3M13 4v3", label: "Fondeadores", desc: "Conecta con originadores mexicanos" },
            ].map(u => (
              <div key={u.label} className="user-type">
                <div className="user-type-icon">
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#00E5A0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={u.icon}/></svg>
                </div>
                <div>
                  <span style={{fontWeight:700,color:"#EEF2FF"}}>{u.label}</span>
                  <span style={{color:"rgba(238,242,255,.45)"}}> &mdash; {u.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="stats-row">
            {[
              {val:stats.monto,              label:"En solicitudes"},
              {val:String(stats.solicitudes),label:"Operaciones activas"},
              {val:"LATAM",                  label:"Mercado objetivo"},
            ].map((s,i)=>(
              <React.Fragment key={s.label}>
                {i>0&&<div className="stat-divider"/>}
                <div>
                  <div className="stat-val">{s.val}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="left-footer">
          <span className="reg-badge">
            <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="rgba(238,242,255,.3)" strokeWidth="1.4" strokeLinecap="round"><path d="M8 2a6 6 0 100 12 6 6 0 000-12zM6 8l1.5 1.5L10 6"/></svg>
            INFRAESTRUCTURA EN FINANZAS AI, S.A.P.I. DE C.V.
          </span>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="right">
        <div className="form-card">

          <div className="form-header">
            <h1 className="form-title">Iniciar sesi&oacute;n</h1>
            <p className="form-sub">Accede a tu consola de cr&eacute;dito.</p>
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
            <span className="divider-text">O CONTINU&#769;A CON EMAIL</span>
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
            &iquest;No tienes cuenta? <Link href="/register">Reg&iacute;strate &rarr;</Link>
          </p>

        </div>
      </div>
    </div>
  );
}
