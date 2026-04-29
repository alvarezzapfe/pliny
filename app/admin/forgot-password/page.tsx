"use client";

import React, { useState } from "react";
import Link from "next/link";

function Ic({ d, s = 15, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) setSent(true);
      else setError("Error enviando el correo. Intenta de nuevo.");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setLoading(false);
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes slideIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}
    .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;}
    .spinner{animation:spin .7s linear infinite;}
    .inp{height:48px;width:100%;background:#F0F4FF;border:1.5px solid #DDE5F7;border-radius:12px;padding:0 14px 0 40px;font-size:14px;color:#0F172A;font-family:'Geist',sans-serif;outline:none;transition:all .2s;}
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
          {sent ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", border: "2px solid #34D399", display: "grid", placeItems: "center", margin: "0 auto 16px", boxShadow: "0 0 24px rgba(52,211,153,.3)" }}>
                <Ic d="M2 8l4 4 8-8" s={20} c="#059669" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>Revisa tu bandeja</h2>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 20 }}>
                Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <Link href="/admin/login" style={{ fontSize: 13, fontWeight: 600, color: "#1E40AF", textDecoration: "none" }}>
                ← Volver al login
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.04em", marginBottom: 4 }}>Recuperar contraseña</h1>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 7 }}>Correo electrónico</label>
                  <div style={{ position: "relative" }}>
                    <div className="inp-icon"><Ic d="M1.5 3.5l6 4.5 6-4.5M1.5 3.5h12v8h-12z" s={14} c="#94A3B8" /></div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`inp${error ? " err" : ""}`}
                      placeholder="admin@plinius.mx"
                      autoComplete="email"
                      autoFocus
                    />
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
                    ? <><svg className="spinner" width={15} height={15} viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,.25)" strokeWidth="2" /><path d="M13 7.5a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>Enviando...</>
                    : <>Enviar link de recuperación<Ic d="M1.5 3.5l6 4.5 6-4.5M1.5 3.5h12v8h-12z" s={13} c="rgba(255,255,255,.7)" /></>
                  }
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Link href="/admin/login" style={{ fontSize: 13, color: "#64748B", textDecoration: "none" }}>
                  ← Volver al login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
