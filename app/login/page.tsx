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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes spin { to{transform:rotate(360deg)} }

    .page { min-height:100svh; background:#fff; display:flex; align-items:center; justify-content:center; font-family:'DM Sans',-apple-system,system-ui,sans-serif; }
    .card { width:100%; max-width:380px; padding:40px 24px; animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both; }

    .lbl { display:block; font-size:13px; font-weight:500; color:#475569; margin-bottom:6px; }
    .inp { width:100%; height:54px; border-radius:12px; border:1px solid #E2E8F0; background:#fff; padding:0 16px; font-family:inherit; font-size:16px; color:#0F172A; outline:none; transition:border-color .18s,box-shadow .18s; }
    .inp::placeholder { color:#94A3B8; }
    .inp:focus { border-color:#0C1E4A; box-shadow:0 0 0 3px rgba(12,30,74,.08); }
    .inp.has-error { border-color:#DC2626; box-shadow:0 0 0 3px rgba(220,38,38,.08); }

    .g-btn { width:100%; height:54px; border-radius:12px; border:1px solid #E2E8F0; background:#fff; display:flex; align-items:center; justify-content:center; gap:10px; font-family:inherit; font-size:15px; font-weight:600; color:#0F172A; cursor:pointer; transition:all .18s; }
    .g-btn:hover { border-color:#CBD5E1; box-shadow:0 4px 14px rgba(0,0,0,.06); transform:translateY(-1px); }
    .g-btn:disabled { opacity:.55; cursor:not-allowed; transform:none; }

    .divider { display:flex; align-items:center; gap:14px; margin:24px 0; }
    .divider-line { flex:1; height:1px; background:#E2E8F0; }
    .divider-text { font-size:12px; color:#94A3B8; white-space:nowrap; }

    .btn-p { width:100%; height:54px; border-radius:12px; border:none; background:#0C1E4A; color:#fff; font-family:inherit; font-size:16px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .18s; box-shadow:0 2px 8px rgba(12,30,74,.18); }
    .btn-p:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(12,30,74,.25); }
    .btn-p:disabled { opacity:.55; cursor:not-allowed; transform:none; }

    .err-box { display:flex; align-items:center; gap:8px; background:#FFF1F2; border:1px solid #FECDD3; border-radius:10px; padding:11px 14px; font-size:13px; color:#9F1239; margin-bottom:16px; }

    .forgot { font-size:13px; color:#94A3B8; text-decoration:none; display:block; text-align:right; margin-top:-4px; margin-bottom:20px; transition:color .15s; }
    .forgot:hover { color:#0C1E4A; text-decoration:underline; }

    .pass-toggle { position:absolute; right:16px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94A3B8; padding:4px; border-radius:6px; transition:color .15s; }
    .pass-toggle:hover { color:#0F172A; }

    .footer-text { text-align:center; font-size:14px; color:#64748B; margin-top:28px; }
    .footer-text a { color:#0C1E4A; font-weight:700; text-decoration:none; }
    .footer-text a:hover { text-decoration:underline; }

    .back-home { display:inline-flex; align-items:center; gap:6px; font-size:14px; color:#64748B; text-decoration:none; transition:color .15s; }
    .back-home:hover { color:#0F172A; }
  `;

  if (!mounted) return null;

  return (
    <div className="page">
      <style>{CSS}</style>
      <div className="card">

        {/* Back link */}
        <div style={{ marginBottom:24 }}>
          <Link href="/" className="back-home">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 8H3M7 4L3 8l4 4"/></svg>
            Volver al inicio
          </Link>
        </div>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <Link href="/" style={{ display:"inline-block", cursor:"pointer" }}>
            <img src="/plinius_newlogo.png" alt="Plinius" style={{ height:36, width:"auto" }} onError={e=>(e.currentTarget.style.display="none")} />
          </Link>
        </div>

        {/* Header */}
        <h1 style={{ fontSize:30, fontWeight:700, letterSpacing:"-0.02em", color:"#0F172A", marginBottom:6 }}>Inicia sesión</h1>
        <p style={{ fontSize:15, color:"#64748B", marginBottom:32 }}>Accede a tu consola.</p>

        {/* Google */}
        <button className="g-btn" onClick={handleGoogleLogin} disabled={googleLoading||loading}>
          {googleLoading ? (
            <svg style={{ animation:"spin .7s linear infinite" }} width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          )}
          {googleLoading ? "Conectando..." : "Continuar con Google"}
        </button>

        {/* Divider */}
        <div className="divider">
          <div className="divider-line"/>
          <span className="divider-text">o con tu correo</span>
          <div className="divider-line"/>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} noValidate>
          <div style={{ marginBottom:16 }}>
            <label className="lbl">Correo electrónico</label>
            <input className={`inp${error?" has-error":""}`} type="email" placeholder="tu@empresa.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/>
          </div>

          <div style={{ marginBottom:8 }}>
            <label className="lbl">Contraseña</label>
            <div style={{ position:"relative" }}>
              <input className={`inp${error?" has-error":""}`} type={showPass?"text":"password"} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/>
              <button type="button" className="pass-toggle" onClick={()=>setShowPass(v=>!v)}>
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/><path d="M2 2l12 12"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>
                }
              </button>
            </div>
          </div>

          <a href="/forgot-password" className="forgot">¿Olvidaste tu contraseña?</a>

          {error && (
            <div className="err-box">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3M8 11h.01"/></svg>
              {error}
            </div>
          )}

          <button type="submit" className="btn-p" disabled={loading||googleLoading}>
            {loading
              ? <><svg style={{ animation:"spin .7s linear infinite" }} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2"><path d="M8 2a6 6 0 016 6"/></svg>Iniciando sesión...</>
              : <>Entrar <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#00E5A0" strokeWidth="1.8" strokeLinecap="round"><path d="M3 8h10M9 5l4 3-4 3"/></svg></>
            }
          </button>
        </form>

        <p className="footer-text">
          ¿No tienes cuenta? <Link href="/register">Regístrate</Link>
        </p>

      </div>
    </div>
  );
}
