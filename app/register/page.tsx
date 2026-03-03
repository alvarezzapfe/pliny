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
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --green: #00E5A0;
  --fg:    #EEF2FF;
  --fg-2:  rgba(238,242,255,0.62);
  --fg-3:  rgba(238,242,255,0.36);
}
@keyframes fadeUp    { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
@keyframes blink     { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
@keyframes spin      { to{transform:rotate(360deg);} }
@keyframes gridPulse { 0%,100%{opacity:0.5;} 50%{opacity:0.75;} }
@keyframes orbDrift  { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-20px);} }
@keyframes scanline  { from{transform:translateY(-100%);} to{transform:translateY(600%);} }
@keyframes slideIn   { from{opacity:0;transform:translateY(-6px);} to{opacity:1;transform:translateY(0);} }
@keyframes ticker    { from{transform:translateX(0);} to{transform:translateX(-50%);} }
@keyframes stepIn    { from{opacity:0;transform:translateX(18px);} to{opacity:1;transform:translateX(0);} }
@keyframes progressBar { from{transform:scaleX(0);} to{transform:scaleX(1);} }

.left-panel  { animation: fadeUp 0.65s cubic-bezier(.16,1,.3,1) both; }
.right-panel { animation: fadeUp 0.65s cubic-bezier(.16,1,.3,1) 0.1s both; }
.orb-a { animation: orbDrift 8s ease-in-out infinite; }
.orb-b { animation: orbDrift 11s ease-in-out 2s infinite; }
.grid-pulse { animation: gridPulse 7s ease-in-out infinite; }
.step-anim { animation: stepIn 0.28s cubic-bezier(.16,1,.3,1) both; }
.ticker-track { display:flex; white-space:nowrap; animation: ticker 32s linear infinite; }

.inp {
  height:48px; width:100%;
  background:#F0F4FF; border:1.5px solid #DDE5F7; border-radius:12px;
  padding:0 44px 0 40px; font-size:14px; color:#0F172A;
  font-family:'Geist',sans-serif; outline:none;
  transition:border-color 0.2s,background 0.2s,box-shadow 0.2s;
}
.inp::placeholder { color:#94A3B8; }
.inp:focus { border-color:#5B8DEF; background:#fff; box-shadow:0 0 0 4px rgba(91,141,239,0.12); }
.inp.err { border-color:#F43F5E; background:#FFF5F7; }

.inp-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:#94A3B8; pointer-events:none; transition:color 0.2s; }
.inp-icon.focused { color:#5B8DEF; }
.toggle-pass { position:absolute; right:13px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94A3B8; display:flex; align-items:center; transition:color 0.15s; padding:4px; }
.toggle-pass:hover { color:#475569; }

.btn-primary {
  height:50px; width:100%;
  background:linear-gradient(135deg,#0C1E4A 0%,#1B3F8A 100%);
  color:#fff; border:none; border-radius:12px;
  font-size:14px; font-weight:600; font-family:'Geist',sans-serif;
  cursor:pointer; letter-spacing:-0.01em;
  display:flex; align-items:center; justify-content:center; gap:8px;
  box-shadow:0 4px 20px rgba(12,30,74,0.30),0 1px 4px rgba(12,30,74,0.20);
  transition:opacity 0.15s,transform 0.15s,box-shadow 0.15s;
  position:relative; overflow:hidden;
}
.btn-primary::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,0.08) 0%,transparent 60%); pointer-events:none; }
.btn-primary:hover:not(:disabled) { opacity:0.94; transform:translateY(-1px); box-shadow:0 8px 32px rgba(12,30,74,0.35),0 2px 8px rgba(12,30,74,0.25); }
.btn-primary:disabled { opacity:0.52; cursor:not-allowed; transform:none; }

.btn-ghost { height:44px; background:transparent; border:1.5px solid #E2E8F0; border-radius:12px; font-size:13px; font-weight:600; color:#475569; font-family:'Geist',sans-serif; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; transition:all 0.15s; }
.btn-ghost:hover { border-color:#CBD5E1; color:#0F172A; background:#F8FAFC; }

.error-box { background:#FFF1F2; border:1px solid #FECDD3; border-radius:10px; padding:11px 14px; font-size:13px; font-weight:500; color:#9F1239; display:flex; align-items:center; gap:8px; animation:slideIn 0.2s ease both; }

.card { background:#fff; border-radius:24px; border:1px solid #E2E8F0; box-shadow:0 24px 80px rgba(12,30,74,0.10),0 4px 16px rgba(12,30,74,0.06); padding:28px; }
.divider { flex:1; height:1px; background:#EEF2FF; }
.back-btn { display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid #E2E8F0; border-radius:999px; padding:6px 14px; font-size:12px; font-weight:600; color:#475569; text-decoration:none; transition:all 0.15s; }
.back-btn:hover { border-color:#CBD5E1; color:#0F172A; }
.live-badge { display:inline-flex; align-items:center; gap:6px; background:#F0FDF9; border:1px solid #D1FAE5; border-radius:999px; padding:5px 11px; }
.live-dot { width:7px; height:7px; border-radius:50%; background:#00E5A0; animation:blink 2.2s ease-in-out infinite; }

.role-card { border-radius:16px; padding:20px; border:2px solid #E2E8F0; background:#fff; cursor:pointer; transition:all 0.18s; display:flex; flex-direction:column; gap:12px; position:relative; overflow:hidden; }
.role-card:hover { border-color:#5B8DEF; box-shadow:0 4px 24px rgba(91,141,239,0.12); }
.role-card.selected { border-color:#0C1E4A; background:#F8FAFF; box-shadow:0 4px 24px rgba(12,30,74,0.14); }
.role-check { position:absolute; top:12px; right:12px; width:22px; height:22px; border-radius:50%; background:#0C1E4A; display:grid; place-items:center; opacity:0; transform:scale(0.6); transition:all 0.18s; }
.role-card.selected .role-check { opacity:1; transform:scale(1); }

.step-pip { width:28px; height:28px; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:700; font-family:'Geist Mono',monospace; transition:all 0.2s; }
.step-pip.done { background:#0C1E4A; color:#fff; }
.step-pip.active { background:#5B8DEF; color:#fff; box-shadow:0 0 0 4px rgba(91,141,239,0.20); }
.step-pip.idle { background:#F1F5F9; color:#94A3B8; }
.step-line { flex:1; height:2px; border-radius:2px; transition:background 0.3s; margin-bottom:16px; }

.stat-pill { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09); border-radius:12px; padding:14px 16px; transition:border-color 0.2s,background 0.2s; }
.stat-pill:hover { background:rgba(255,255,255,0.08); border-color:rgba(91,141,239,0.3); }
.step-chip { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09); border-radius:999px; padding:6px 14px; font-size:12px; font-weight:500; color:rgba(238,242,255,0.75); }
.step-n { width:20px; height:20px; border-radius:50%; background:rgba(0,229,160,0.14); border:1px solid rgba(0,229,160,0.28); display:grid; place-items:center; font-size:10px; font-weight:700; color:#00E5A0; font-family:'Geist Mono',monospace; }
.progress-bar { position:absolute; bottom:0; left:0; right:0; height:2px; background:rgba(255,255,255,0.4); transform-origin:left; animation:progressBar 1.4s cubic-bezier(.4,0,.2,1) forwards; }

@media (max-width:900px) { main { grid-template-columns:1fr !important; } .left-panel { display:none !important; } }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoEmail = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 3.5l6 4.5 6-4.5M1.5 3.5h12v8h-12z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;
const IcoUser  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2 13c0-2.761 2.462-5 5.5-5s5.5 2.239 5.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const IcoLock  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="6.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 6.5V5a3 3 0 016 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const IcoArrow = () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5h8M7 3.5l3 3-3 3" stroke="rgba(255,255,255,0.65)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoBack  = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 1.5L3 6l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoCheck = () => <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5L9 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoSpin  = () => <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ animation:"spin 0.75s linear infinite" }}><circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,0.25)" strokeWidth="2"/><path d="M13 7.5a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>;
const IcoErr   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#F43F5E" strokeWidth="1.3"/><path d="M7 4.5v3M7 10h.01" stroke="#F43F5E" strokeWidth="1.3" strokeLinecap="round"/></svg>;

// ─── Input wrapper ────────────────────────────────────────────────────────────

function Inp({ label, icon, error: hasErr, children }: { label: string; icon?: React.ReactNode; error?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:7 }}>{label}</label>
      <div style={{ position:"relative" }}>
        {icon && <span className="inp-icon">{icon}</span>}
        {children}
      </div>
      {hasErr && <p style={{ fontSize:12, color:"#F43F5E", marginTop:5, fontWeight:500 }}>Campo requerido.</p>}
    </div>
  );
}

// ─── Left Panel ───────────────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <section className="left-panel" style={{ position:"relative", overflow:"hidden", background:"radial-gradient(ellipse 120% 80% at 25% 10%,#1B3F8A 0%,#0C1E4A 55%,#091530 100%)", padding:"40px 48px", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
      <div className="grid-pulse" style={{ position:"absolute", inset:0, pointerEvents:"none", backgroundImage:`linear-gradient(rgba(255,255,255,0.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.045) 1px,transparent 1px)`, backgroundSize:"48px 48px" }} />
      <div style={{ position:"absolute", left:0, right:0, top:0, height:"25%", pointerEvents:"none", background:"linear-gradient(to bottom,transparent,rgba(91,141,239,0.04),transparent)", animation:"scanline 6s linear infinite" }} />
      <div className="orb-a" style={{ position:"absolute", top:"-80px", left:"-60px", width:480, height:480, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(circle,rgba(27,63,138,0.80) 0%,transparent 70%)" }} />
      <div className="orb-b" style={{ position:"absolute", bottom:"-80px", right:"-60px", width:420, height:420, borderRadius:"50%", pointerEvents:"none", background:"radial-gradient(circle,rgba(0,229,160,0.10) 0%,transparent 70%)" }} />

      <div style={{ position:"relative", zIndex:2 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/plinius.png" alt="Plinius" style={{ height:28, width:"auto", filter:"brightness(0) invert(1)", opacity:0.92 }} onError={e=>(e.currentTarget.style.display="none")} />
          <div>
            <div style={{ color:"#EEF2FF", fontSize:15, fontWeight:700, letterSpacing:"-0.03em" }}>Plinius</div>
            <div style={{ color:"var(--green)", fontSize:10, fontFamily:"'Geist Mono',monospace", letterSpacing:"0.10em" }}>CREDIT OS</div>
          </div>
        </div>
      </div>

      <div style={{ position:"relative", zIndex:2 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:7, background:"rgba(0,229,160,0.10)", border:"1px solid rgba(0,229,160,0.22)", borderRadius:999, padding:"5px 12px", marginBottom:22 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--green)", display:"inline-block", animation:"blink 2s ease-in-out infinite" }} />
          <span style={{ fontFamily:"'Geist Mono',monospace", fontSize:10, fontWeight:500, color:"var(--green)", letterSpacing:"0.10em" }}>ÚNETE A PLINIUS</span>
        </div>
        <h1 style={{ fontSize:42, fontWeight:800, lineHeight:1.06, letterSpacing:"-0.04em", color:"var(--fg)", marginBottom:14 }}>
          Otorga.<br /><span style={{ color:"var(--green)" }}>Solicita.</span>{" "}<span style={{ color:"var(--fg-3)", fontWeight:600 }}>Crece.</span>
        </h1>
        <p style={{ fontSize:13, color:"var(--fg-2)", lineHeight:1.7, maxWidth:"38ch", marginBottom:28 }}>
          Conectamos otorgantes e instituciones con solicitantes de crédito. Rápido, seguro y trazable.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:28 }}>
          {[{ val:"3 min", label:"Registro rápido" },{ val:"100%", label:"Seguro" },{ val:"24/7", label:"Disponible" }].map(s => (
            <div key={s.val} className="stat-pill">
              <div style={{ fontSize:18, fontWeight:700, color:"var(--fg)", letterSpacing:"-0.04em" }}>{s.val}</div>
              <div style={{ fontSize:10, color:"var(--fg-3)", marginTop:3, fontFamily:"'Geist Mono',monospace" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {[["01","Elige tu rol"],["02","Tus datos"],["03","Listo"]].map(([n,t]) => (
            <span key={t} className="step-chip"><span className="step-n">{n}</span>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ position:"relative", zIndex:2 }}>
        <div style={{ overflow:"hidden", marginBottom:14, maskImage:"linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)", WebkitMaskImage:"linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)" }}>
          <div className="ticker-track">
            {[...Array(2)].map((_,i) => (
              <span key={i} style={{ display:"flex" }}>
                {["Otorgantes","Solicitantes","Crédito seguro","Análisis de riesgo","Scoring crediticio","Reportes PDF"].map(t => (
                  <span key={t} style={{ fontFamily:"'Geist Mono',monospace", fontSize:10, color:"rgba(238,242,255,0.25)", letterSpacing:"0.06em", padding:"0 20px" }}>· {t} </span>
                ))}
              </span>
            ))}
          </div>
        </div>
        <div style={{ fontFamily:"'Geist Mono',monospace", fontSize:10, color:"var(--fg-3)" }}>© {new Date().getFullYear()} Plinius · private credit tooling</div>
      </div>
    </section>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  const steps = ["Tipo de cuenta", "Tus datos", "Confirmación"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:24 }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const state = idx < step ? "done" : idx === step ? "active" : "idle";
        return (
          <React.Fragment key={label}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div className={`step-pip ${state}`}>
                {state === "done" ? <IcoCheck /> : idx}
              </div>
              <span style={{ fontSize:10, fontWeight:600, whiteSpace:"nowrap", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.04em", color: state === "idle" ? "#CBD5E1" : state === "active" ? "#5B8DEF" : "#0C1E4A" }}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className="step-line" style={{ background: step > idx ? "#0C1E4A" : "#E2E8F0", margin:"0 6px" }} />}
          </React.Fragment>
        );
      })}
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
      tag: "Institucional",
      color: "#0C1E4A", bg: "#EEF2FF",
      icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#0C1E4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="18" height="13" rx="2"/><path d="M6 7V5a5 5 0 0110 0v2"/><path d="M11 13v2M8 13h6"/></svg>,
    },
    {
      id: "solicitante" as Role,
      title: "Solicitante de crédito",
      desc: "Busco financiamiento para mi empresa. Quiero acceder a opciones de crédito.",
      tag: "Empresa",
      color: "#065F46", bg: "#ECFDF5",
      icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#065F46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="9" width="16" height="10" rx="2"/><path d="M7 9V7a4 4 0 018 0v2"/><circle cx="11" cy="14" r="1.5"/></svg>,
    },
  ];

  return (
    <div className="step-anim" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <h2 style={{ fontSize:21, fontWeight:700, color:"#0F172A", letterSpacing:"-0.03em", marginBottom:4 }}>¿Cuál es tu rol?</h2>
        <p style={{ fontSize:13, color:"#64748B" }}>Selecciona el tipo de cuenta que mejor te describe.</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {roles.map(r => (
          <div key={r.id} className={`role-card${role === r.id ? " selected" : ""}`} onClick={() => setRole(r.id)}>
            <div className="role-check"><IcoCheck /></div>
            <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:r.bg, display:"grid", placeItems:"center", flexShrink:0 }}>{r.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>{r.title}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:r.color, background:r.bg, padding:"2px 8px", borderRadius:20 }}>{r.tag}</span>
                </div>
                <p style={{ fontSize:12, color:"#64748B", lineHeight:1.6 }}>{r.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-primary" disabled={!role} onClick={onNext} style={{ marginTop:4 }}>
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
    <div className="step-anim" style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div>
        <h2 style={{ fontSize:21, fontWeight:700, color:"#0F172A", letterSpacing:"-0.03em", marginBottom:4 }}>Tus datos</h2>
        <p style={{ fontSize:13, color:"#64748B" }}>
          Cuenta como{" "}
          <span style={{ fontWeight:700, color: role === "otorgante" ? "#0C1E4A" : "#065F46" }}>
            {role === "otorgante" ? "Otorgante de crédito" : "Solicitante de crédito"}
          </span>.
        </p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Nombre" icon={<IcoUser />}>
          <input value={firstName} onChange={e=>setFirstName(e.target.value)} type="text" placeholder="Luis" autoComplete="given-name" className="inp" style={{ paddingRight:12 }} />
        </Inp>
        <Inp label="Apellido" icon={<IcoUser />}>
          <input value={lastName} onChange={e=>setLastName(e.target.value)} type="text" placeholder="Álvarez" autoComplete="family-name" className="inp" style={{ paddingRight:12 }} />
        </Inp>
      </div>

      <Inp label="Correo electrónico" icon={<IcoEmail />}>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="correo@empresa.com" autoComplete="email" className={`inp${error ? " err" : ""}`} />
      </Inp>

      <Inp label="Confirmar correo" icon={<IcoEmail />}>
        <input value={email2} onChange={e=>setEmail2(e.target.value)} type="email" placeholder="repite tu correo" autoComplete="email" className={`inp${email2.length > 0 && cleanEmail !== cleanEmail2 ? " err" : ""}`} />
        {email2.length > 0 && cleanEmail !== cleanEmail2 && <p style={{ fontSize:12, color:"#F43F5E", marginTop:5, fontWeight:500 }}>Los correos no coinciden.</p>}
      </Inp>

      <div>
        <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:7 }}>Contraseña</label>
        <div style={{ position:"relative" }}>
          <span className="inp-icon"><IcoLock /></span>
          <input value={password} onChange={e=>setPassword(e.target.value)} type={showPw ? "text" : "password"} placeholder="mínimo 6 caracteres" autoComplete="new-password" className="inp" />
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

      {error && <div className="error-box"><IcoErr />{error}</div>}

      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <button className="btn-ghost" onClick={onBack} style={{ width:80, flexShrink:0 }}><IcoBack />Atrás</button>
        <button className="btn-primary" disabled={!canSubmit} onClick={handleSubmit} style={{ flex:1 }}>
          {loading && <div className="progress-bar" />}
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
        <h2 style={{ fontSize:21, fontWeight:700, color:"#0F172A", letterSpacing:"-0.03em", marginBottom:6 }}>¡Cuenta creada!</h2>
        <p style={{ fontSize:13, color:"#64748B", lineHeight:1.7, maxWidth:"32ch", margin:"0 auto" }}>
          Enviamos un enlace de confirmación a{" "}
          <span style={{ fontWeight:700, color:"#0F172A" }}>{email}</span>.<br />Revisa tu bandeja o spam.
        </p>
      </div>
      <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:12, background: role === "otorgante" ? "#EEF2FF" : "#ECFDF5", border:`1px solid ${role === "otorgante" ? "#C7D2FE" : "#D1FAE5"}` }}>
        <span style={{ fontSize:12, fontWeight:700, color: role === "otorgante" ? "#0C1E4A" : "#065F46" }}>
          {role === "otorgante" ? "Otorgante de crédito" : "Solicitante de crédito"}
        </span>
      </div>
      {role === "solicitante" && (
        <div style={{ background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:12, padding:"12px 16px", fontSize:12, color:"#92400E", lineHeight:1.6, maxWidth:"30ch" }}>
          Al iniciar sesión completarás el perfil de tu empresa para solicitar crédito.
        </div>
      )}
      <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10, marginTop:4 }}>
        <button className="btn-primary" onClick={() => router.push("/login")}>
          Ir a iniciar sesión <IcoArrow />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [step,      setStep]      = useState(1);
  const [role,      setRole]      = useState<Role | null>(null);
  const [doneEmail, setDoneEmail] = useState("");

  return (
    <main style={{ height:"100svh", overflow:"hidden", display:"grid", gridTemplateColumns:"1fr 1fr", fontFamily:"'Geist',-apple-system,sans-serif" }}>
      <style>{CSS}</style>
      <LeftPanel />
      <section className="right-panel" style={{ background:"#F8FAFC", position:"relative", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 32px" }}>
        <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:"80%", height:220, pointerEvents:"none", background:"radial-gradient(ellipse at top,rgba(91,141,239,0.10),transparent 70%)" }} />
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", opacity:0.35, backgroundImage:`linear-gradient(rgba(12,30,74,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(12,30,74,0.04) 1px,transparent 1px)`, backgroundSize:"40px 40px" }} />
        <div style={{ width:"100%", maxWidth:420, position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <Link href="/login" className="back-btn"><IcoBack />Volver a login</Link>
            <div className="live-badge">
              <div className="live-dot" />
              <span style={{ fontSize:10, fontWeight:700, color:"#065F46", fontFamily:"'Geist Mono',monospace", letterSpacing:"0.06em" }}>REGISTRO</span>
            </div>
          </div>
          <div className="card">
            <Stepper step={step} />
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <div className="divider" />
              <span style={{ fontSize:10, color:"#CBD5E1", fontFamily:"'Geist Mono',monospace", whiteSpace:"nowrap", letterSpacing:"0.08em" }}>PASO {step} DE 3</span>
              <div className="divider" />
            </div>
            {step === 1 && <StepRole role={role} setRole={setRole} onNext={() => setStep(2)} />}
            {step === 2 && role && <StepData role={role} onBack={() => setStep(1)} onDone={email => { setDoneEmail(email); setStep(3); }} />}
            {step === 3 && role && <StepDone email={doneEmail} role={role} />}
          </div>
          <div style={{ marginTop:16, display:"flex", justifyContent:"center", alignItems:"center", flexWrap:"wrap", gap:4 }}>
            {["Security-first","Supabase Auth","SOC 2 ready"].map((t,i) => (
              <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11, color:"#94A3B8" }}>
                {i > 0 && <span style={{ width:3, height:3, borderRadius:"50%", background:"#CBD5E1", display:"inline-block" }} />}{t}
              </span>
            ))}
          </div>
          <div style={{ textAlign:"center", marginTop:8, fontFamily:"'Geist Mono',monospace", fontSize:10, color:"#CBD5E1", letterSpacing:"0.04em" }}>Plinius · private credit tooling</div>
        </div>
      </section>
    </main>
  );
}
