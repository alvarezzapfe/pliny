"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function Ic({ d, s = 15, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

type Strength = "weak" | "fair" | "good" | "strong";

function getStrength(pw: string): Strength {
  let score = 0;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 2) return "weak";
  if (score === 3) return "fair";
  if (score === 4) return "good";
  return "strong";
}

const STRENGTH_META: Record<Strength, { label: string; color: string; pct: number }> = {
  weak:   { label: "Débil",    color: "#EF4444", pct: 25 },
  fair:   { label: "Regular",  color: "#F59E0B", pct: 50 },
  good:   { label: "Buena",    color: "#3B82F6", pct: 75 },
  strong: { label: "Fuerte",   color: "#059669", pct: 100 },
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate(): string | null {
    if (password.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
    if (!/[A-Z]/.test(password)) return "Debe incluir al menos 1 letra mayúscula.";
    if (!/[a-z]/.test(password)) return "Debe incluir al menos 1 letra minúscula.";
    if (!/[0-9]/.test(password)) return "Debe incluir al menos 1 número.";
    if (password !== confirm) return "Las contraseñas no coinciden.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error actualizando contraseña.");
        setLoading(false);
        return;
      }

      // Sign out any existing client session and redirect
      await supabase.auth.signOut();
      setSuccess(true);
      setLoading(false);
      setTimeout(() => router.push("/admin/login?reset=success"), 2000);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  const strength = password.length > 0 ? getStrength(password) : null;
  const sm = strength ? STRENGTH_META[strength] : null;

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes slideIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}
    .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;}
    .spinner{animation:spin .7s linear infinite;}
    .inp{height:48px;width:100%;background:#F0F4FF;border:1.5px solid #DDE5F7;border-radius:12px;padding:0 44px 0 40px;font-size:14px;color:#0F172A;font-family:'Geist',sans-serif;outline:none;transition:all .2s;}
    .inp:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 4px rgba(91,141,239,.12);}
    .inp.err{border-color:#F43F5E;background:#FFF5F7;}
    .inp-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#94A3B8;pointer-events:none;}
    .btn{height:50px;width:100%;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;font-family:'Geist',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 20px rgba(12,30,74,.3);transition:all .15s;}
    .btn:hover:not(:disabled){opacity:.93;transform:translateY(-1px);}
    .btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
    .err-box{background:#FFF1F2;border:1px solid #FECDD3;border-radius:10px;padding:11px 14px;font-size:13px;font-weight:500;color:#9F1239;display:flex;align-items:center;gap:8px;animation:slideIn .2s ease both;}
  `;

  return (
    <main style={{ minHeight: "100svh", background: "radial-gradient(ellipse 120% 80% at 25% 10%,#1B3F8A 0%,#0C1E4A 55%,#091530 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Geist',sans-serif" }}>
      <style>{CSS}</style>
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
        <div style={{ background: "#fff", borderRadius: 24, boxShadow: "0 32px 80px rgba(0,0,0,.3)", overflow: "hidden", padding: 28 }}>

          {/* No code in URL */}
          {!code && !success && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#FFF1F2", border: "2px solid #FECDD3", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
                <Ic d="M3 3l10 10M13 3L3 13" s={20} c="#EF4444" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>Enlace inválido</h2>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 20 }}>
                No se encontró un código de recuperación en la URL. Solicita un nuevo enlace.
              </p>
              <a href="/admin/forgot-password" style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF", textDecoration: "none" }}>
                Solicitar nuevo enlace &rarr;
              </a>
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", border: "2px solid #34D399", display: "grid", placeItems: "center", margin: "0 auto 16px", boxShadow: "0 0 24px rgba(52,211,153,.3)" }}>
                <Ic d="M2 8l4 4 8-8" s={20} c="#059669" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>Contraseña actualizada</h2>
              <p style={{ fontSize: 13, color: "#64748B" }}>Redirigiendo al login...</p>
            </div>
          )}

          {/* Form */}
          {code && !success && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.04em", marginBottom: 4 }}>Nueva contraseña</h1>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
                  Mínimo 12 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Nueva contraseña</label>
                  <div style={{ position: "relative" }}>
                    <div className="inp-icon"><Ic d="M4.5 6.5V5a3 3 0 016 0v1.5M2.5 6.5h11v7h-11z" s={14} c="#94A3B8" /></div>
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(null); }}
                      className={`inp${error ? " err" : ""}`}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex" }}>
                      <Ic d={showPass ? "M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4zM6 7.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0zM3 3l10 10" : "M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4zM6 7.5a1.5 1.5 0 103 0 1.5 1.5 0 00-3 0z"} s={14} c="#94A3B8" />
                    </button>
                  </div>
                  {sm && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 4, background: "#F1F5F9", borderRadius: 999, overflow: "hidden", marginBottom: 4 }}>
                        <div style={{ width: `${sm.pct}%`, height: "100%", background: sm.color, borderRadius: 999, transition: "all .3s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: sm.color, fontWeight: 600 }}>{sm.label}</div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Confirmar contraseña</label>
                  <div style={{ position: "relative" }}>
                    <div className="inp-icon"><Ic d="M4.5 6.5V5a3 3 0 016 0v1.5M2.5 6.5h11v7h-11z" s={14} c="#94A3B8" /></div>
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={confirm}
                      onChange={e => { setConfirm(e.target.value); setError(null); }}
                      className={`inp${error ? " err" : ""}`}
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                  {confirm.length > 0 && password !== confirm && (
                    <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>Las contraseñas no coinciden</div>
                  )}
                </div>

                {error && (
                  <div className="err-box">
                    <Ic d="M7 4.5v3M7 10h.01M1 7a6 6 0 1012 0A6 6 0 001 7z" s={14} c="#F43F5E" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn" style={{ marginTop: 4 }}>
                  {loading
                    ? <><svg className="spinner" width={15} height={15} viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,.25)" strokeWidth="2" /><path d="M13 7.5a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>Actualizando...</>
                    : <>Cambiar contraseña<Ic d="M2 8l4 4 8-8" s={13} c="rgba(255,255,255,.7)" /></>
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
