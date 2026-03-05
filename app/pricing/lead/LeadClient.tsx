"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Plan = "basic" | "pro";

const PLANS: Record<Plan, { title: string; price: string; scans: string; color: string; bg: string; border: string; glow: string }> = {
  basic: {
    title: "Basic",
    price: "$70",
    scans: "Hasta 10 scans / mes",
    color: "#0EA5E9",
    bg: "linear-gradient(135deg,#0369A1,#0EA5E9)",
    border: "rgba(14,165,233,.25)",
    glow: "rgba(14,165,233,.12)",
  },
  pro: {
    title: "Pro",
    price: "$500",
    scans: "Scans ilimitados",
    color: "#8B5CF6",
    bg: "linear-gradient(135deg,#6D28D9,#8B5CF6)",
    border: "rgba(139,92,246,.25)",
    glow: "rgba(139,92,246,.12)",
  },
};

function Ic({ d, s = 14, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function LeadClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const plan = (sp.get("plan") || "basic") as Plan;
  const meta = PLANS[plan] ?? PLANS.basic;

  const [company, setCompany] = useState("");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [notes,   setNotes]   = useState("");
  const [status,  setStatus]  = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submit() {
    if (!company.trim()) return alert("Empresa requerida.");
    if (!name.trim())    return alert("Nombre requerido.");
    if (!email.trim())   return alert("Correo requerido.");

    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, company: company.trim(), name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Geist', sans-serif; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes spin   { to { transform: rotate(360deg); } }
    @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
    .fade  { animation: fadeUp .4s cubic-bezier(.16,1,.3,1) both; }
    .d1    { animation-delay: .05s; }
    .d2    { animation-delay: .10s; }
    .d3    { animation-delay: .15s; }
    .spin  { animation: spin .7s linear infinite; }
    .field {
      width: 100%; padding: 10px 14px;
      background: #fff; border: 1.5px solid #E2E8F0;
      border-radius: 10px; font-size: 13px; font-family: 'Geist', sans-serif;
      color: #0F172A; outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .field::placeholder { color: #94A3B8; }
    .field:focus { border-color: ${meta.color}; box-shadow: 0 0 0 3px ${meta.glow}; }
    .btn-primary {
      width: 100%; padding: 13px; border: none; border-radius: 12px;
      background: ${meta.bg}; color: #fff;
      font-size: 14px; font-weight: 700; font-family: 'Geist', sans-serif;
      cursor: pointer; transition: opacity .15s, transform .1s;
      box-shadow: 0 4px 20px ${meta.glow};
    }
    .btn-primary:hover:not(:disabled) { opacity: .92; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-sec {
      width: 100%; padding: 13px; border: 1.5px solid #E2E8F0; border-radius: 12px;
      background: #F8FAFC; color: #475569;
      font-size: 14px; font-weight: 600; font-family: 'Geist', sans-serif;
      cursor: pointer; transition: all .15s;
    }
    .btn-sec:hover { background: #F1F5F9; border-color: #CBD5E1; color: #0F172A; }
  `;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0A2518 0%,#051A10 60%,#0A1628 100%)", fontFamily: "'Geist',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <style>{CSS}</style>

      {/* Grid overlay */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: .25, backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 900 }}>

        {/* Header */}
        <div className="fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/plinius.png" alt="Plinius" style={{ height: 24, filter: "brightness(0) invert(1)", opacity: .9 }} onError={e => (e.currentTarget.style.display = "none")} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#ECFDF5", letterSpacing: "-0.03em", lineHeight: 1 }}>Plinius</div>
              <div style={{ fontSize: 9, fontFamily: "'Geist Mono',monospace", color: "#00E5A0", letterSpacing: ".10em" }}>CREDIT OS</div>
            </div>
          </div>
          <button onClick={() => router.push("/")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(236,253,245,.7)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>
            <Ic d="M10 8H3M6 5l-3 3 3 3" s={12} c="currentColor" /> Volver
          </button>
        </div>

        {/* Plan badge */}
        <div className="fade d1" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(255,255,255,.07)", border: `1px solid ${meta.border}` }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#ECFDF5" }}>Plan {meta.title}</span>
            <span style={{ fontSize: 12, color: "rgba(236,253,245,.5)", fontFamily: "'Geist Mono',monospace" }}>{meta.price}/mes</span>
          </div>
          <span style={{ fontSize: 12, color: "rgba(236,253,245,.4)" }}>{meta.scans}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="fade d2">

          {/* ── FORM ── */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 28px", border: "1px solid rgba(255,255,255,.08)" }}>
            {status === "done" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 320, textAlign: "center", gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "#ECFDF5", display: "grid", placeItems: "center" }}>
                  <Ic d="M2 8l4 4 8-8" s={24} c="#059669" />
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "#0F172A" }}>¡Listo!</div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, maxWidth: "28ch" }}>
                  Recibimos tu solicitud. Te contactamos en las próximas 24 horas.
                </div>
                <div style={{ marginTop: 4, padding: "10px 16px", background: "#F8FAFC", border: "1px solid #E8EDF5", borderRadius: 10, fontSize: 12, color: "#94A3B8" }}>
                  Revisa tu correo — te enviamos una confirmación a <strong style={{ color: "#475569" }}>{email}</strong>
                </div>
                <button onClick={() => router.push("/")} className="btn-sec" style={{ marginTop: 8, width: "auto", padding: "9px 20px" }}>
                  Volver al inicio
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: "#0F172A", marginBottom: 4 }}>Datos de contacto</div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>Te contactamos para coordinar el demo.</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <Field label="Empresa" value={company} onChange={setCompany} placeholder="Razón social" />
                  <Field label="Nombre" value={name} onChange={setName} placeholder="Nombre y apellido" />
                  <Field label="Correo" value={email} onChange={setEmail} placeholder="correo@empresa.com" type="email" />
                  <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="+52 55 ..." />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <Field label="Notas (opcional)" value={notes} onChange={setNotes} placeholder="Caso de uso, volumen, dudas..." />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button className="btn-primary" onClick={submit} disabled={status === "loading"}>
                    {status === "loading" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <svg className="spin" width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="2"><path d="M8 2a6 6 0 016 6" /></svg>
                        Enviando...
                      </span>
                    ) : "Enviar solicitud"}
                  </button>
                  <button className="btn-sec" onClick={() => router.push("/")}>Cancelar</button>
                </div>

                {status === "error" && (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10, fontSize: 12, color: "#9F1239" }}>
                    Error al enviar. Intenta de nuevo o escríbenos a hola@plinius.mx
                  </div>
                )}

                <div style={{ marginTop: 14, fontSize: 11, color: "#94A3B8", textAlign: "center" }}>Sin compromisos. Demo gratuito.</div>
              </>
            )}
          </div>

          {/* ── PREVIEW ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Plan card */}
            <div style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${meta.border}` }}>
              <div style={{ height: 3, background: meta.bg }} />
              <div style={{ background: "rgba(255,255,255,.04)", padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontFamily: "'Geist Mono',monospace", color: "rgba(236,253,245,.4)", letterSpacing: ".08em", marginBottom: 4 }}>PLAN SELECCIONADO</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em" }}>{meta.price}<span style={{ fontSize: 13, fontWeight: 500, color: "rgba(236,253,245,.5)" }}>/mes</span></div>
                  </div>
                  <div style={{ padding: "5px 12px", borderRadius: 999, background: `${meta.color}22`, border: `1px solid ${meta.border}`, fontSize: 12, fontWeight: 700, color: meta.color }}>
                    {meta.title}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "rgba(236,253,245,.5)", marginBottom: 14 }}>{meta.scans}</div>
                {[
                  "Análisis de cartera en tiempo real",
                  "Señales de riesgo automáticas",
                  "Marketplace de crédito",
                  plan === "pro" ? "Soporte prioritario + API" : "Soporte por email",
                ].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 999, background: `${meta.color}22`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Ic d="M2 8l4 4 8-8" s={9} c={meta.color} />
                    </div>
                    <span style={{ fontSize: 12, color: "rgba(236,253,245,.7)" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, padding: "18px 22px", flex: 1 }}>
              <div style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "rgba(236,253,245,.35)", letterSpacing: ".08em", marginBottom: 12 }}>RESUMEN DE SOLICITUD</div>
              {[
                { k: "Empresa",  v: company || "—" },
                { k: "Contacto", v: name    || "—" },
                { k: "Email",    v: email   || "—" },
                { k: "Plan",     v: `${meta.title} · ${meta.price}/mes` },
              ].map(r => (
                <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize: 11, color: "rgba(236,253,245,.4)", fontFamily: "'Geist Mono',monospace", letterSpacing: ".04em" }}>{r.k.toUpperCase()}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: r.v === "—" ? "rgba(236,253,245,.25)" : "#ECFDF5", maxWidth: "55%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.v}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: status === "done" ? "#00E5A0" : "#F59E0B", animation: "pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize: 11, fontFamily: "'Geist Mono',monospace", color: status === "done" ? "#00E5A0" : "rgba(236,253,245,.4)", letterSpacing: ".06em" }}>
                  {status === "done" ? "Solicitud recibida" : "Borrador"}
                </span>
              </div>
            </div>

          </div>
        </div>

        <div className="fade d3" style={{ marginTop: 20, textAlign: "center", fontSize: 11, color: "rgba(236,253,245,.25)", fontFamily: "'Geist Mono',monospace" }}>
          © {new Date().getFullYear()} Infraestructura en Finanzas AI S.A.P.I. de C.V. · Plinius
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 5, letterSpacing: ".03em" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="field" />
    </div>
  );
}
