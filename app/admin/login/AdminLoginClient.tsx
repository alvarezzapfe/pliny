"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s = 15, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

type Step = "credentials" | "totp" | "setup_mfa";

export default function AdminLoginClient() {
  const router = useRouter();
  const [step, setStep]       = useState<Step>("credentials");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [qrUrl, setQrUrl]     = useState("");
  const [secret, setSecret]   = useState("");
  const [factorId, setFactorId] = useState("");

  // ── Step 1: Email + Password ──────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authErr || !data.user) {
      setError(authErr?.message ?? "Credenciales inválidas.");
      setLoading(false);
      return;
    }

    // Check super admin
    const { data: sa } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!sa) {
      await supabase.auth.signOut();
      setError("No tienes acceso al panel de administración.");
      setLoading(false);
      return;
    }

    // Check if MFA is enrolled
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.nextLevel === "aal2") {
      // MFA enrolled → need to verify
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (totp) {
        setFactorId(totp.id);
        setStep("totp");
      }
    } else {
      // No MFA enrolled yet → setup
      await setupMFA();
    }

    setLoading(false);
  }

  // ── Setup MFA (first time) ────────────────────────────────────────────
  async function setupMFA() {
    const { data, error: mfaErr } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Plinius Admin",
    });

    if (mfaErr || !data) {
      setError("Error configurando MFA: " + mfaErr?.message);
      return;
    }

    setQrUrl(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setStep("setup_mfa");
  }

  // ── Step 2: Verify TOTP ───────────────────────────────────────────────
  async function handleVerifyTOTP(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const code = totpCode.replace(/\s/g, "");
    if (code.length !== 6) {
      setError("El código debe tener 6 dígitos.");
      setLoading(false);
      return;
    }

    // Create challenge
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeErr) {
      setError("Error al crear challenge: " + challengeErr.message);
      setLoading(false);
      return;
    }

    // Verify
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyErr) {
      setError("Código incorrecto. Intenta de nuevo.");
      setTotpCode("");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/admin");
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes slideIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
    .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;}
    .slide{animation:slideIn .2s ease both;}
    .spinner{animation:spin .7s linear infinite;}
    .inp{height:48px;width:100%;background:#F0F4FF;border:1.5px solid #DDE5F7;border-radius:12px;padding:0 44px 0 40px;font-size:14px;color:#0F172A;font-family:'Geist',sans-serif;outline:none;transition:all .2s;}
    .inp:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 4px rgba(91,141,239,.12);}
    .inp.err{border-color:#F43F5E;background:#FFF5F7;}
    .inp-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#94A3B8;pointer-events:none;}
    .btn{height:50px;width:100%;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;font-family:'Geist',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 20px rgba(12,30,74,.3);transition:all .15s;}
    .btn:hover:not(:disabled){opacity:.93;transform:translateY(-1px);}
    .btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
    .err-box{background:#FFF1F2;border:1px solid #FECDD3;border-radius:10px;padding:11px 14px;font-size:13px;font-weight:500;color:#9F1239;display:flex;align-items:center;gap:8px;animation:slideIn .2s ease both;}
    .otp-inp{height:56px;width:100%;background:#F0F4FF;border:2px solid #DDE5F7;border-radius:14px;font-size:28px;font-weight:800;letter-spacing:.25em;text-align:center;color:#0F172A;font-family:'Geist Mono',monospace;outline:none;transition:all .2s;}
    .otp-inp:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 4px rgba(91,141,239,.12);}
    .secret-box{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:10px 14px;font-family:'Geist Mono',monospace;font-size:12px;color:#475569;letter-spacing:.08em;word-break:break-all;text-align:center;}
  `;

  return (
    <main style={{ minHeight: "100svh", background: "radial-gradient(ellipse 120% 80% at 25% 10%,#1B3F8A 0%,#0C1E4A 55%,#091530 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Geist',sans-serif" }}>
      <style>{CSS}</style>

      {/* Grid overlay */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)`, backgroundSize: "48px 48px", opacity: .6 }} />

      <div className="fade" style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", display: "grid", placeItems: "center" }}>
              <Ic d="M8 2a3 3 0 00-3 3v2H3v7h10V7h-2V5a3 3 0 00-3-3z" s={16} c="#93C5FD" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#EEF2FF", letterSpacing: "-0.03em" }}>Plinius</div>
              <div style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#00E5A0", letterSpacing: ".12em" }}>SUPER ADMIN</div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 24, boxShadow: "0 32px 80px rgba(0,0,0,.3)", overflow: "hidden" }}>

          {/* ── STEP: CREDENTIALS ─────────────────────────────────────── */}
          {step === "credentials" && (
            <div style={{ padding: 28 }}>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.04em", marginBottom: 4 }}>Acceso administrador</h1>
                <p style={{ fontSize: 13, color: "#64748B" }}>Acceso restringido · Solo super admins</p>
              </div>

              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Correo</label>
                  <div style={{ position: "relative" }}>
                    <div className="inp-icon"><Ic d="M1.5 3.5l6 4.5 6-4.5M1.5 3.5h12v8h-12z" s={14} c="#94A3B8" /></div>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      className={`inp${error ? " err" : ""}`} placeholder="admin@plinius.mx" autoComplete="email" />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Contraseña</label>
                  <div style={{ position: "relative" }}>
                    <div className="inp-icon"><Ic d="M4.5 6.5V5a3 3 0 016 0v1.5M2.5 6.5h11v7h-11z" s={14} c="#94A3B8" /></div>
                    <input type={showPass ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                      className={`inp${error ? " err" : ""}`} placeholder="••••••••" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex" }}>
                      <Ic d={showPass ? "M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4zM6 7.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zM3 3l10 10" : "M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4zM6 7.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0z"} s={14} c="#94A3B8" />
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="err-box">
                    <Ic d="M7 4.5v3M7 10h.01M1 7a6 6 0 1012 0A6 6 0 001 7z" s={14} c="#F43F5E" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn" style={{ marginTop: 4 }}>
                  {loading
                    ? <><svg className="spinner" width={15} height={15} viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,.25)" strokeWidth="2"/><path d="M13 7.5a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>Verificando...</>
                    : <>Continuar<Ic d="M2.5 7.5h10M9 4.5l3 3-3 3" s={13} c="rgba(255,255,255,.7)" /></>
                  }
                </button>
              </form>
            </div>
          )}

          {/* ── STEP: SETUP MFA (first time) ─────────────────────────── */}
          {step === "setup_mfa" && (
            <div style={{ padding: 28 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "#EFF6FF", display: "grid", placeItems: "center", marginBottom: 14 }}>
                  <Ic d="M8 2a3 3 0 00-3 3v2H3v7h10V7h-2V5a3 3 0 00-3-3z" s={20} c="#1E40AF" />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Configura tu autenticador</h2>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
                  Escanea el código QR con <strong>Google Authenticator</strong> o <strong>Authy</strong>. Solo se hace una vez.
                </p>
              </div>

              {/* QR */}
              {qrUrl && (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <div style={{ padding: 12, background: "#fff", border: "2px solid #E2E8F0", borderRadius: 14 }}>
                    <img src={qrUrl} alt="QR MFA" style={{ width: 160, height: 160, display: "block" }} />
                  </div>
                </div>
              )}

              {/* Secret key */}
              {secret && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 6, textAlign: "center" }}>O ingresa la clave manual:</div>
                  <div className="secret-box">{secret}</div>
                </div>
              )}

              <form onSubmit={handleVerifyTOTP} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7, textAlign: "center" }}>
                    Ingresa el código de 6 dígitos para confirmar
                  </label>
                  <input
                    className="otp-inp"
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="err-box">
                    <Ic d="M7 4.5v3M7 10h.01M1 7a6 6 0 1012 0A6 6 0 001 7z" s={14} c="#F43F5E" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || totpCode.length !== 6} className="btn">
                  {loading
                    ? <><svg className="spinner" width={15} height={15} viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,.25)" strokeWidth="2"/><path d="M13 7.5a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>Verificando...</>
                    : <>Activar 2FA y entrar<Ic d="M2 8l4 4 8-8" s={13} c="rgba(255,255,255,.7)" /></>
                  }
                </button>
              </form>
            </div>
          )}

          {/* ── STEP: TOTP VERIFY (subsequent logins) ────────────────── */}
          {step === "totp" && (
            <div style={{ padding: 28 }}>
              <div style={{ marginBottom: 24, textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
                  <Ic d="M8 2a3 3 0 00-3 3v2H3v7h10V7h-2V5a3 3 0 00-3-3z" s={22} c="#1E40AF" />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Verificación 2FA</h2>
                <p style={{ fontSize: 13, color: "#64748B" }}>Abre tu app autenticadora e ingresa el código</p>
              </div>

              <form onSubmit={handleVerifyTOTP} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input
                  className="otp-inp"
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                />

                {error && (
                  <div className="err-box">
                    <Ic d="M7 4.5v3M7 10h.01M1 7a6 6 0 1012 0A6 6 0 001 7z" s={14} c="#F43F5E" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || totpCode.length !== 6} className="btn">
                  {loading
                    ? <><svg className="spinner" width={15} height={15} viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,.25)" strokeWidth="2"/><path d="M13 7.5a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>Verificando...</>
                    : <>Entrar al panel<Ic d="M2.5 7.5h10M9 4.5l3 3-3 3" s={13} c="rgba(255,255,255,.7)" /></>
                  }
                </button>

                <button type="button" onClick={() => { setStep("credentials"); setTotpCode(""); setError(null); }}
                  style={{ background: "none", border: "none", fontSize: 12, color: "#94A3B8", cursor: "pointer", fontFamily: "'Geist',sans-serif", textAlign: "center" }}>
                  ← Volver
                </button>
              </form>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontFamily: "'Geist Mono',monospace", fontSize: 10, color: "rgba(238,242,255,.25)" }}>
          <a href="/" style={{ color:"rgba(238,242,255,.35)", textDecoration:"none", fontFamily:"'Geist Mono',monospace", fontSize:10 }}>← Inicio</a>
        </div>
      </div>
    </main>
  );
}
