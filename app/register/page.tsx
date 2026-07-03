"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidEmail(v: string) {
  const s = v.trim().toLowerCase();
  return s.length >= 6 && s.includes("@") && s.includes(".");
}

function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function friendlyError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists"))
    return "Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.";
  if (m.includes("invalid email")) return "Correo inválido.";
  if (m.includes("password")) return "Contraseña inválida. Prueba una más larga.";
  return msg;
}

type Role = "otorgante" | "solicitante";

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
@keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes spin   { to{transform:rotate(360deg)} }
@keyframes stepIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

.page { min-height:100svh; background:#fff; display:flex; align-items:center; justify-content:center; font-family:'DM Sans',-apple-system,system-ui,sans-serif; }
.wrap { width:100%; max-width:420px; padding:40px 24px; animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both; }
.step-anim { animation:stepIn .28s cubic-bezier(.16,1,.3,1) both; }

.lbl { display:block; font-size:13px; font-weight:500; color:#475569; margin-bottom:6px; }
.inp { width:100%; height:54px; border-radius:12px; border:1px solid #E2E8F0; background:#fff; padding:0 16px; font-family:inherit; font-size:16px; color:#0F172A; outline:none; transition:border-color .18s,box-shadow .18s; }
.inp::placeholder { color:#94A3B8; }
.inp:focus { border-color:#0C1E4A; box-shadow:0 0 0 3px rgba(12,30,74,.08); }
.inp.err { border-color:#F43F5E; box-shadow:0 0 0 3px rgba(244,63,94,.08); }
.inp.icon-pad { padding-left:44px; }

.inp-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#94A3B8; pointer-events:none; }
.toggle-pass { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94A3B8; padding:4px; border-radius:6px; transition:color .15s; display:flex; align-items:center; }
.toggle-pass:hover { color:#0F172A; }

.btn-p { width:100%; height:54px; border-radius:12px; border:none; background:#0C1E4A; color:#fff; font-family:inherit; font-size:16px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all .18s; box-shadow:0 2px 8px rgba(12,30,74,.18); }
.btn-p:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(12,30,74,.25); }
.btn-p:disabled { opacity:.45; cursor:not-allowed; transform:none; }

.btn-back { height:54px; background:#fff; border:1px solid #E2E8F0; border-radius:12px; font-family:inherit; font-size:14px; font-weight:600; color:#475569; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all .15s; padding:0 20px; }
.btn-back:hover { border-color:#CBD5E1; color:#0F172A; }

.err-box { display:flex; align-items:center; gap:8px; background:#FFF1F2; border:1px solid #FECDD3; border-radius:10px; padding:11px 14px; font-size:13px; color:#9F1239; }

.role-card { border-radius:14px; padding:20px; border:2px solid #E2E8F0; background:#fff; cursor:pointer; transition:all .18s; display:flex; align-items:flex-start; gap:14px; position:relative; }
.role-card:hover { border-color:#94A3B8; }
.role-card.sel { border-color:#0C1E4A; background:#F8FAFF; }
.role-check { position:absolute; top:14px; right:14px; width:22px; height:22px; border-radius:50%; background:#0C1E4A; display:grid; place-items:center; opacity:0; transform:scale(.6); transition:all .18s; }
.role-card.sel .role-check { opacity:1; transform:scale(1); }

.footer-text { text-align:center; font-size:14px; color:#64748B; margin-top:28px; }
.footer-text a { color:#0C1E4A; font-weight:700; text-decoration:none; }
.footer-text a:hover { text-decoration:underline; }

.back-home { display:inline-flex; align-items:center; gap:6px; font-size:14px; color:#64748B; text-decoration:none; transition:color .15s; }
.back-home:hover { color:#0F172A; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoEmail = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 3.5l6 4.5 6-4.5M1.5 3.5h12v8h-12z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;
const IcoUser  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2 13c0-2.761 2.462-5 5.5-5s5.5 2.239 5.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const IcoLock  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="6.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 6.5V5a3 3 0 016 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const IcoArrow = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 5l4 3-4 3" stroke="#00E5A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoBack  = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 1.5L3 6l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoCheck = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoSpin  = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation:"spin .75s linear infinite" }}><circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,.25)" strokeWidth="2"/><path d="M14 8a6 6 0 00-6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>;
const IcoErr   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#F43F5E" strokeWidth="1.3"/><path d="M7 4.5v3M7 10h.01" stroke="#F43F5E" strokeWidth="1.3" strokeLinecap="round"/></svg>;

// ─── Input wrapper ────────────────────────────────────────────────────────────

function Inp({ label, icon, error: hasErr, children }: { label: string; icon?: React.ReactNode; error?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="lbl">{label}</label>
      <div style={{ position:"relative" }}>
        {icon && <span className="inp-icon">{icon}</span>}
        {children}
      </div>
      {hasErr && <p style={{ fontSize:12, color:"#F43F5E", marginTop:5, fontWeight:500 }}>Campo requerido.</p>}
    </div>
  );
}

// ─── Step bars ───────────────────────────────────────────────────────────────

function StepBars({ step }: { step: number }) {
  return (
    <div style={{ display:"flex", gap:6, marginBottom:32 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ width:28, height:6, borderRadius:999, background: i <= step ? "#0C1E4A" : "#E2E8F0", transition:"background .3s" }} />
      ))}
    </div>
  );
}

// ─── Step 1: Role ─────────────────────────────────────────────────────────────

function StepRole({ role, setRole, onNext }: { role: Role | null; setRole: (r: Role) => void; onNext: () => void }) {
  const roles = [
    {
      id: "otorgante" as Role,
      title: "Otorgante de crédito",
      desc: "Soy una institución, empresa o fondo que otorga financiamiento.",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0C1E4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M6 7V5a6 6 0 0112 0v2"/><path d="M12 14v2M9 14h6"/></svg>,
    },
    {
      id: "solicitante" as Role,
      title: "Solicitante de crédito",
      desc: "Busco financiamiento para mi empresa. Quiero acceder a opciones de crédito.",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0C1E4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M7 9V7a5 5 0 0110 0v2"/><circle cx="12" cy="15" r="1.5"/></svg>,
    },
  ];

  return (
    <div className="step-anim" style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <h1 style={{ fontSize:30, fontWeight:700, letterSpacing:"-0.02em", color:"#0F172A", marginBottom:6 }}>¿Cuál es tu rol?</h1>
        <p style={{ fontSize:15, color:"#64748B" }}>Elige cómo vas a usar Plinius.</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {roles.map(r => (
          <div key={r.id} className={`role-card${role === r.id ? " sel" : ""}`} onClick={() => setRole(r.id)}>
            <div className="role-check"><IcoCheck /></div>
            <div style={{ width:48, height:48, borderRadius:12, background:"#EEF2FF", display:"grid", placeItems:"center", flexShrink:0 }}>
              {r.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:17, fontWeight:700, color:"#0F172A", marginBottom:4 }}>{r.title}</div>
              <p style={{ fontSize:13, color:"#64748B", lineHeight:1.55 }}>{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-p" disabled={!role} onClick={onNext} style={{ marginTop:4 }}>
        Continuar <IcoArrow />
      </button>
    </div>
  );
}

// ─── Step 2: Data ─────────────────────────────────────────────────────────────

function StepData({ role, onBack, onDone }: { role: Role; onBack: () => void; onDone: (email: string) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [email2,    setEmail2]    = useState("");
  const [password,  setPassword]  = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);

  const cleanEmail  = email.trim().toLowerCase();
  const cleanEmail2 = email2.trim().toLowerCase();
  const pwScore     = useMemo(() => scorePassword(password), [password]);
  const strengthColor = ["#F43F5E","#F43F5E","#F59E0B","#10B981","#10B981"][pwScore];
  const strengthLabel = ["Muy débil","Débil","Regular","Fuerte","Muy fuerte"][pwScore];

  const canSubmit = !loading && firstName.trim().length >= 2 && lastName.trim().length >= 2 && isValidEmail(cleanEmail) && cleanEmail === cleanEmail2 && password.length >= 6;

  async function handleSubmit() {
    setError(null);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail, password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
          data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: `${firstName.trim()} ${lastName.trim()}`.trim(), user_role: role },
        },
      });
      if (authErr) { setError(friendlyError(authErr.message)); setLoading(false); return; }
      if (data.user) {
        await supabase.from("user_roles").upsert({ user_id: data.user.id, role }, { onConflict: "user_id" });
      }
      onDone(cleanEmail);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setLoading(false);
    }
  }

  return (
    <div className="step-anim" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <h1 style={{ fontSize:30, fontWeight:700, letterSpacing:"-0.02em", color:"#0F172A", marginBottom:6 }}>Tus datos</h1>
        <p style={{ fontSize:15, color:"#64748B" }}>
          Cuenta como{" "}
          <span style={{ fontWeight:700, color:"#0C1E4A" }}>
            {role === "otorgante" ? "Otorgante de crédito" : "Solicitante de crédito"}
          </span>.
        </p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Inp label="Nombre" icon={<IcoUser />}>
          <input value={firstName} onChange={e=>setFirstName(e.target.value)} type="text" placeholder="Luis" autoComplete="given-name" className="inp icon-pad" />
        </Inp>
        <Inp label="Apellido" icon={<IcoUser />}>
          <input value={lastName} onChange={e=>setLastName(e.target.value)} type="text" placeholder="Álvarez" autoComplete="family-name" className="inp icon-pad" />
        </Inp>
      </div>

      <Inp label="Correo electrónico" icon={<IcoEmail />}>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="correo@empresa.com" autoComplete="email" className={`inp icon-pad${error ? " err" : ""}`} />
      </Inp>

      <Inp label="Confirmar correo" icon={<IcoEmail />}>
        <input value={email2} onChange={e=>setEmail2(e.target.value)} type="email" placeholder="repite tu correo" autoComplete="email" className={`inp icon-pad${email2.length > 0 && cleanEmail !== cleanEmail2 ? " err" : ""}`} />
        {email2.length > 0 && cleanEmail !== cleanEmail2 && <p style={{ fontSize:12, color:"#F43F5E", marginTop:5, fontWeight:500 }}>Los correos no coinciden.</p>}
      </Inp>

      <div>
        <label className="lbl">Contraseña</label>
        <div style={{ position:"relative" }}>
          <span className="inp-icon"><IcoLock /></span>
          <input value={password} onChange={e=>setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="mínimo 6 caracteres" autoComplete="new-password" className="inp icon-pad" />
          <button type="button" className="toggle-pass" onClick={()=>setShowPw(v=>!v)}>
            {showPw
              ? <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/><circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M3 3l9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              : <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/><circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
            }
          </button>
        </div>
        {password.length > 0 && (
          <div style={{ marginTop:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span style={{ fontSize:11, color:"#94A3B8" }}>Fortaleza</span>
              <span style={{ fontSize:11, fontWeight:600, color:strengthColor }}>{strengthLabel}</span>
            </div>
            <div style={{ height:4, borderRadius:4, background:"#F1F5F9", overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:4, width:`${Math.max(10,(pwScore/4)*100)}%`, background:strengthColor, transition:"all 0.3s" }} />
            </div>
          </div>
        )}
      </div>

      {error && <div className="err-box"><IcoErr />{error}</div>}

      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <button className="btn-back" onClick={onBack}><IcoBack />Atrás</button>
        <button className="btn-p" disabled={!canSubmit} onClick={handleSubmit} style={{ flex:1 }}>
          {loading ? <><IcoSpin />Creando cuenta...</> : <>Crear cuenta <IcoArrow /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Done ─────────────────────────────────────────────────────────────

function StepDone({ email, role }: { email: string; role: Role }) {
  const router = useRouter();
  return (
    <div className="step-anim" style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:20, padding:"8px 0" }}>
      <div style={{ width:64, height:64, borderRadius:20, background:"#ECFDF5", border:"2px solid #D1FAE5", display:"grid", placeItems:"center" }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M5 14l6 6L23 8" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <div>
        <h2 style={{ fontSize:24, fontWeight:700, color:"#0F172A", letterSpacing:"-0.02em", marginBottom:6 }}>¡Cuenta creada!</h2>
        <p style={{ fontSize:14, color:"#64748B", lineHeight:1.7, maxWidth:"32ch", margin:"0 auto" }}>
          Enviamos un enlace de confirmación a{" "}
          <span style={{ fontWeight:700, color:"#0F172A" }}>{email}</span>.<br />Revisa tu bandeja o spam.
        </p>
      </div>
      <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:12, background:"#EEF2FF", border:"1px solid #C7D2FE" }}>
        <span style={{ fontSize:13, fontWeight:700, color:"#0C1E4A" }}>
          {role === "otorgante" ? "Otorgante de crédito" : "Solicitante de crédito"}
        </span>
      </div>
      {role === "solicitante" && (
        <div style={{ background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:12, padding:"12px 16px", fontSize:13, color:"#92400E", lineHeight:1.6, maxWidth:"32ch" }}>
          Al iniciar sesión completarás el perfil de tu empresa para solicitar crédito.
        </div>
      )}
      <button className="btn-p" onClick={() => router.push("/login")} style={{ marginTop:4 }}>
        Ir a iniciar sesión <IcoArrow />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [step,      setStep]      = useState(1);
  const [role,      setRole]      = useState<Role | null>(null);
  const [doneEmail, setDoneEmail] = useState("");

  return (
    <div className="page">
      <style>{CSS}</style>
      <div className="wrap">

        {/* Back link */}
        <div style={{ marginBottom:24 }}>
          <Link href="/" className="back-home">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 8H3M7 4L3 8l4 4"/></svg>
            Volver al inicio
          </Link>
        </div>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <Link href="/" style={{ display:"inline-block", cursor:"pointer" }}>
            <img src="/plinius.png" alt="Plinius" style={{ height:36, width:"auto" }} onError={e=>(e.currentTarget.style.display="none")} />
          </Link>
        </div>

        {/* Step bars */}
        <StepBars step={step} />

        {/* Steps */}
        {step === 1 && <StepRole role={role} setRole={setRole} onNext={() => setStep(2)} />}
        {step === 2 && role && <StepData role={role} onBack={() => setStep(1)} onDone={email => { setDoneEmail(email); setStep(3); }} />}
        {step === 3 && role && <StepDone email={doneEmail} role={role} />}

        <p className="footer-text">
          ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
        </p>

      </div>
    </div>
  );
}
