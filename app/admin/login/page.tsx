"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { setSession } from "@/lib/auth";

type RoleRow = { role: string | null };

function getErrMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Error inesperado.";
  }
}

async function checkAdminGate(): Promise<{ ok: boolean; ip?: string; reason?: string }> {
  try {
    const res = await fetch("/api/admin/gate", { method: "GET", cache: "no-store" });
    if (!res.ok) return { ok: false, reason: `Gate HTTP ${res.status}` };
    return (await res.json()) as { ok: boolean; ip?: string; reason?: string };
  } catch (e) {
    return { ok: false, reason: getErrMessage(e) };
  }
}

export default function SuperAdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);

  const [gateChecked, setGateChecked] = useState(false);
  const [gateOk, setGateOk] = useState(true); // fallback: true si no usas gate
  const [ip, setIp] = useState<string | null>(null);

  useEffect(() => {
    // Gate (opcional). Si no creas el endpoint, esto fallará y seguimos sin bloquear.
    (async () => {
      const g = await checkAdminGate();
      if (typeof g.ok === "boolean") {
        setGateChecked(true);
        setGateOk(g.ok);
        setIp(g.ip ?? null);
        if (!g.ok) setError(g.reason ?? "Acceso restringido.");
      } else {
        setGateChecked(true);
        setGateOk(true);
      }
    })();
  }, []);

  const hint = useMemo(() => "Solo Super Admin. Acceso restringido.", []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (gateChecked && !gateOk) {
      setError("Acceso restringido por política de seguridad (IP/allowlist).");
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.length < 5 || !cleanEmail.includes("@")) {
      setLoading(false);
      setError("Correo inválido.");
      return;
    }
    if (password.length < 6) {
      setLoading(false);
      setError("Contraseña muy corta.");
      return;
    }

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authErr || !data.user) {
        setLoading(false);
        setError(authErr?.message ?? "No se pudo iniciar sesión.");
        return;
      }

      // ── Validar rol SUPER ADMIN en DB ───────────────────────────────
      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle<RoleRow>();

      if (roleErr) {
        setLoading(false);
        setError("No se pudo validar rol (DB).");
        return;
      }

      const role = (roleRow?.role ?? "").toLowerCase();
      const isSuperAdmin = role === "super_admin" || role === "superadmin";

      if (!isSuperAdmin) {
        // Seguridad: cerrar sesión si entró por error
        await supabase.auth.signOut();
        setLoading(false);
        setError("Acceso denegado. Tu usuario no tiene rol de Super Admin.");
        return;
      }

      // ── Guardar sesión local ───────────────────────────────────────
      setSession({
  role: "super_admin",           // 👈 aquí
  email: cleanEmail,
  createdAt: new Date().toISOString(),
  ip: ip ?? undefined,
});

      setLoading(false);
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      setLoading(false);
      setError(getErrMessage(err));
    }
  };

  return (
    <main
      style={{
        height: "100svh",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "1.05fr 0.95fr",
        fontFamily: "'Geist', -apple-system, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root{
          --blue-deep:#070F24;
          --blue-ink:#0B1738;
          --blue-rich:#0C1E4A;
          --blue-neon:#3D7EFF;
          --green:#00E5A0;

          --fg:#EEF2FF;
          --fg-2:rgba(238,242,255,0.64);
          --fg-3:rgba(238,242,255,0.36);

          --border:rgba(255,255,255,0.10);
          --border2:rgba(255,255,255,0.16);
        }

        @keyframes fadeUp { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        @keyframes gridPulse { 0%,100%{opacity:0.42;} 50%{opacity:0.72;} }
        @keyframes scanline { from{transform:translateY(-100%);} to{transform:translateY(520%);} }
        @keyframes orbDrift { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-18px);} }
        @keyframes spin { to{transform:rotate(360deg);} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-6px);} to{opacity:1;transform:translateY(0);} }
        @keyframes progressBar { from{transform:scaleX(0);} to{transform:scaleX(1);} }

        .left-panel { animation: fadeUp 0.65s cubic-bezier(.16,1,.3,1) both; }
        .right-panel{ animation: fadeUp 0.65s cubic-bezier(.16,1,.3,1) 0.08s both; }

        .grid-pulse { animation: gridPulse 7s ease-in-out infinite; }
        .orb-a { animation: orbDrift 9s ease-in-out infinite; }
        .orb-b { animation: orbDrift 12s ease-in-out 2s infinite; }

        .badge {
          display:inline-flex; align-items:center; gap:8px;
          border:1px solid rgba(0,229,160,0.24);
          background: rgba(0,229,160,0.08);
          padding:6px 12px;
          border-radius:999px;
        }
        .dot {
          width:7px; height:7px; border-radius:50%;
          background: var(--green);
          box-shadow: 0 0 18px rgba(0,229,160,0.50);
          animation: blink 2.2s ease-in-out infinite;
        }

        .stat-pill {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          padding: 14px 16px;
          transition: border-color .2s, background .2s, transform .2s;
        }
        .stat-pill:hover{
          transform: translateY(-1px);
          background: rgba(255,255,255,0.07);
          border-color: rgba(61,126,255,0.35);
        }

        .card {
          background:#fff;
          border-radius: 26px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 28px 90px rgba(2,6,23,0.14), 0 4px 18px rgba(2,6,23,0.08);
          padding: 28px;
        }

        .inp-wrap { position: relative; }
        .inp {
          height: 48px; width: 100%;
          background: #F0F4FF;
          border: 1.5px solid #DDE5F7;
          border-radius: 12px;
          padding: 0 44px 0 40px;
          font-size: 14px;
          color: #0F172A;
          font-family: 'Geist', sans-serif;
          outline: none;
          transition: border-color .2s, background .2s, box-shadow .2s;
        }
        .inp::placeholder { color: #94A3B8; }
        .inp:focus { border-color:#5B8DEF; background:#fff; box-shadow:0 0 0 4px rgba(91,141,239,0.12); }
        .inp.has-error { border-color:#F43F5E; background:#FFF5F7; }
        .inp.has-error:focus { box-shadow:0 0 0 4px rgba(244,63,94,0.10); }

        .inp-icon {
          position: absolute; left: 13px; top: 50%;
          transform: translateY(-50%);
          color:#94A3B8; pointer-events:none;
          transition: color .2s;
        }
        .inp-icon.focused { color: #5B8DEF; }

        .toggle-pass {
          position:absolute; right: 13px; top: 50%;
          transform: translateY(-50%);
          background:none; border:none; cursor:pointer;
          color:#94A3B8;
          display:flex; align-items:center;
          padding: 4px;
          transition: color .15s;
        }
        .toggle-pass:hover { color:#475569; }

        .btn-submit {
          height: 50px; width: 100%;
          background: linear-gradient(135deg, #070F24 0%, #0C1E4A 55%, #1B3F8A 100%);
          color: #fff; border:none; border-radius: 12px;
          font-size: 14px; font-weight: 700;
          cursor:pointer; letter-spacing:-0.01em;
          display:flex; align-items:center; justify-content:center; gap:8px;
          box-shadow: 0 10px 40px rgba(7,15,36,0.28), 0 2px 10px rgba(7,15,36,0.18);
          transition: opacity .15s, transform .15s, box-shadow .15s;
          position: relative; overflow:hidden;
        }
        .btn-submit::after{
          content:'';
          position:absolute; inset:0;
          background: linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 55%);
          pointer-events:none;
        }
        .btn-submit:hover:not(:disabled){
          opacity: .95;
          transform: translateY(-1px);
          box-shadow: 0 16px 60px rgba(7,15,36,0.34), 0 4px 14px rgba(7,15,36,0.22);
        }
        .btn-submit:disabled { opacity: .55; cursor:not-allowed; transform:none; }

        .error-box {
          background:#FFF1F2;
          border:1px solid #FECDD3;
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 13px;
          font-weight: 600;
          color:#9F1239;
          display:flex;
          align-items:center;
          gap: 8px;
          animation: slideIn .2s ease both;
        }

        .back-btn {
          display:inline-flex; align-items:center; gap:6px;
          background:#fff;
          border:1px solid #E2E8F0;
          border-radius:999px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 700;
          color:#475569;
          text-decoration:none;
          transition: all .15s;
        }
        .back-btn:hover { border-color:#CBD5E1; color:#0F172A; }

        .live-badge{
          display:inline-flex; align-items:center; gap:6px;
          background:#F0FDF9;
          border:1px solid #D1FAE5;
          border-radius:999px;
          padding:5px 11px;
        }
        .progress-bar{
          position:absolute; bottom:0; left:0; right:0;
          height: 2px;
          background: rgba(255,255,255,0.45);
          transform-origin:left;
          animation: progressBar 1.4s cubic-bezier(.4,0,.2,1) forwards;
        }

        @media (max-width: 900px) {
          main { grid-template-columns: 1fr !important; }
          .left-panel { display: none !important; }
        }
      `}</style>

      {/* LEFT PANEL (premium / exclusive) */}
      <section
        className="left-panel"
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(ellipse 120% 80% at 25% 8%, #1B3F8A 0%, #0B1738 40%, #070F24 100%)",
          padding: "44px 54px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          className="grid-pulse"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)",
            backgroundSize: "52px 52px",
            maskImage: "radial-gradient(ellipse 90% 70% at 35% 10%, #000 40%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 35% 10%, #000 40%, transparent 80%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "28%",
            pointerEvents: "none",
            background: "linear-gradient(to bottom,transparent,rgba(61,126,255,0.08),transparent)",
            animation: "scanline 6s linear infinite",
          }}
        />
        <div
          className="orb-a"
          style={{
            position: "absolute",
            top: "-90px",
            left: "-70px",
            width: 520,
            height: 520,
            borderRadius: "50%",
            pointerEvents: "none",
            background: "radial-gradient(circle, rgba(27,63,138,0.92) 0%, transparent 70%)",
          }}
        />
        <div
          className="orb-b"
          style={{
            position: "absolute",
            bottom: "-90px",
            right: "-70px",
            width: 460,
            height: 460,
            borderRadius: "50%",
            pointerEvents: "none",
            background: "radial-gradient(circle, rgba(0,229,160,0.12) 0%, transparent 72%)",
          }}
        />
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.045, pointerEvents: "none" }}>
          <filter id="lnoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#lnoise)" />
        </svg>

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/plinius.png"
              alt="Plinius"
              style={{ height: 28, width: "auto", filter: "brightness(0) invert(1)", opacity: 0.93 }}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <div>
              <div style={{ color: "var(--fg)", fontSize: 15, fontWeight: 800, letterSpacing: "-0.03em" }}>Plinius</div>
              <div style={{ color: "var(--green)", fontSize: 10, fontFamily: "'Geist Mono',monospace", letterSpacing: "0.12em" }}>
                SUPER ADMIN
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18 }} className="badge" title="Acceso restringido">
            <span className="dot" />
            <span style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, fontWeight: 700, color: "var(--green)", letterSpacing: "0.12em" }}>
              RESTRICTED ACCESS
            </span>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 2 }}>
          <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.03, letterSpacing: "-0.045em", color: "var(--fg)", marginBottom: 14 }}>
            Control Room.
            <br />
            <span style={{ color: "var(--fg-3)", fontWeight: 650 }}>Only for owners.</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.75, maxWidth: "44ch", marginBottom: 22 }}>
            Consola para auditoría, usuarios, facturación y señales sistémicas. Trazabilidad completa y acciones irreversibles protegidas.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            {[
              { val: "SSO", label: "Ready (roadmap)" },
              { val: "2FA", label: "Recomendado" },
              { val: "Logs", label: "Inmutables" },
            ].map((s) => (
              <div key={s.val} className="stat-pill">
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--fg)", letterSpacing: "-0.04em" }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "var(--fg-3)", marginTop: 3, fontFamily: "'Geist Mono',monospace" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontFamily: "'Geist Mono',monospace", fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.06em" }}>
            {hint}
            {ip ? ` · IP: ${ip}` : ""}
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 2, fontFamily: "'Geist Mono',monospace", fontSize: 10, color: "var(--fg-3)" }}>
          © {new Date().getFullYear()} Plinius · Admin Access
        </div>
      </section>

      {/* RIGHT PANEL */}
      <section
        className="right-panel"
        style={{
          background: "#F8FAFC",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "42px 32px",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "80%", height: 220, pointerEvents: "none", background: "radial-gradient(ellipse at top,rgba(91,141,239,0.12),transparent 70%)" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.35, backgroundImage: "linear-gradient(rgba(12,30,74,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(12,30,74,0.04) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        <div style={{ width: "100%", maxWidth: 430, position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <Link href="/" className="back-btn">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M7.5 1.5L3 6l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Inicio
            </Link>

            <Link href="/login" style={{ fontSize: 12, fontWeight: 800, color: "#64748B", textDecoration: "none" }} title="Login Cliente">
              Login Cliente →
            </Link>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 21, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", marginBottom: 4 }}>
                  Super Admin
                </h2>
                <p style={{ fontSize: 13, color: "#64748B" }}>
                  Acceso restringido para operaciones críticas.
                </p>
              </div>

              <div className="live-badge" title="Security gate">
                <div className="live-dot" style={{ width: 7, height: 7, borderRadius: 99, background: gateChecked ? (gateOk ? "#00E5A0" : "#F43F5E") : "#F59E0B" }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: "#065F46", fontFamily: "'Geist Mono',monospace", letterSpacing: "0.06em" }}>
                  {gateChecked ? (gateOk ? "GATE OK" : "GATED") : "CHECKING"}
                </span>
              </div>
            </div>

            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#374151", marginBottom: 7 }}>Correo electrónico</label>
                <div className="inp-wrap">
                  <div className={`inp-icon${emailFocus ? " focused" : ""}`}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M1.5 3.5l6 4.5 6-4.5M1.5 3.5h12v8h-12z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocus(true)}
                    onBlur={() => setEmailFocus(false)}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="superadmin@plinius.mx"
                    className={`inp${error ? " has-error" : ""}`}
                    disabled={gateChecked && !gateOk}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>Contraseña</label>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8" }}>2FA recomendado</span>
                </div>
                <div className="inp-wrap">
                  <div className={`inp-icon${passwordFocus ? " focused" : ""}`}>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <rect x="2.5" y="6.5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M4.5 6.5V5a3 3 0 016 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocus(true)}
                    onBlur={() => setPasswordFocus(false)}
                    type={showPass ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`inp${error ? " has-error" : ""}`}
                    disabled={gateChecked && !gateOk}
                  />
                  <button type="button" className="toggle-pass" onClick={() => setShowPass((v) => !v)} aria-label="toggle password">
                    {showPass ? (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" />
                        <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M3 3l9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M1.5 7.5s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" />
                        <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-box">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#F43F5E" strokeWidth="1.3" />
                    <path d="M7 4.5v3M7 10h.01" stroke="#F43F5E" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || (gateChecked && !gateOk)} className="btn-submit" style={{ marginTop: 2 }}>
                {loading && <div className="progress-bar" />}
                {loading ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ animation: "spin 0.75s linear infinite" }}>
                      <circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
                      <path d="M13 7.5a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Validando…
                  </>
                ) : (
                  <>
                    Entrar al control room
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M2.5 6.5h8M7 3.5l3 3-3 3" stroke="rgba(255,255,255,0.65)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>

              <div style={{ textAlign: "center", marginTop: 4, fontFamily: "'Geist Mono',monospace", fontSize: 10, color: "#CBD5E1", letterSpacing: "0.04em" }}>
                {gateChecked ? (gateOk ? "Security gate active" : "Access blocked") : "Checking gate…"}
              </div>
            </form>
          </div>

          <div style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: "#94A3B8" }}>
            Security-first · Supabase Auth · Audit logs
          </div>
        </div>
      </section>
    </main>
  );
}