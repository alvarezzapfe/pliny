// DemoWizard — Wizard de 5 steps para solicitar demo de Plinius
"use client";

import React, { useState } from "react";

function Ic({ d, s = 15, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

const TIPOS = ["SOFOM ENR", "SOFIPO", "Fintech", "Banco", "Fondo de inversión", "Otro"];
const CARTERAS = ["Menos de $10M MXN", "$10M - $50M", "$50M - $200M", "$200M - $1,000M", "Más de $1,000M MXN"];
const VOLUMENES = ["Menos de $1M MXN", "$1M - $5M", "$5M - $20M", "$20M - $100M", "Más de $100M MXN"];
const INTERESES_OPS = [
  "Onboarding API white-label",
  "Integración con Crowdlink (capital institucional)",
  "Analytics y reportes de cartera",
  "Generación de pagarés y contratos",
  "Verificación de identidad (Ekatena)",
  "Score crediticio",
  "Otro",
];

type Form = {
  empresa: string; tipo: string; tipo_otro: string;
  cartera: string; volumen: string;
  intereses: string[]; intereses_otro: string;
  nombre: string; email: string; telefono: string; cargo: string;
};

const INIT: Form = {
  empresa: "", tipo: "", tipo_otro: "",
  cartera: "", volumen: "",
  intereses: [], intereses_otro: "",
  nombre: "", email: "", telefono: "", cargo: "",
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .wiz-fade{animation:fadeIn .35s cubic-bezier(.16,1,.3,1) both;}
  .wiz-inp{height:44px;width:100%;background:#F0F4FF;border:1.5px solid #DDE5F7;border-radius:11px;padding:0 14px;font-size:14px;color:#0F172A;font-family:'Geist',sans-serif;outline:none;transition:all .2s;}
  .wiz-inp:focus{border-color:#5B8DEF;background:#fff;box-shadow:0 0 0 3px rgba(91,141,239,.10);}
  .wiz-sel{height:44px;width:100%;background:#F0F4FF;border:1.5px solid #DDE5F7;border-radius:11px;padding:0 12px;font-size:14px;color:#0F172A;font-family:'Geist',sans-serif;outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;transition:all .2s;}
  .wiz-sel:focus{border-color:#5B8DEF;background:#fff;}
  .wiz-btn-p{height:48px;width:100%;background:linear-gradient(135deg,#0C1E4A,#1B3F8A);color:#fff;border:none;border-radius:11px;font-size:14px;font-weight:700;font-family:'Geist',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(12,30,74,.25);transition:all .15s;}
  .wiz-btn-p:hover:not(:disabled){opacity:.93;transform:translateY(-1px);}
  .wiz-btn-p:disabled{opacity:.5;cursor:not-allowed;transform:none;}
  .wiz-btn-g{height:44px;padding:0 20px;background:none;border:1.5px solid #DDE5F7;border-radius:11px;font-size:13px;font-weight:600;color:#64748B;font-family:'Geist',sans-serif;cursor:pointer;transition:all .15s;}
  .wiz-btn-g:hover{border-color:#94A3B8;color:#0F172A;}
  .wiz-chk{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:1.5px solid #DDE5F7;background:#FAFBFF;cursor:pointer;transition:all .15s;font-size:13px;color:#374151;font-family:'Geist',sans-serif;}
  .wiz-chk:hover{border-color:#5B8DEF;background:#F0F5FF;}
  .wiz-chk.on{border-color:#1B3F8A;background:#EFF4FF;color:#0C1E4A;font-weight:600;}
  .wiz-err{background:#FFF1F2;border:1px solid #FECDD3;border-radius:9px;padding:10px 14px;font-size:13px;color:#9F1239;margin-bottom:14px;}
  .spinner{animation:spin .7s linear infinite;}
`;

export default function DemoWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({ ...INIT });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function set<K extends keyof Form>(k: K, v: Form[K]) { setForm(f => ({ ...f, [k]: v })); setError(null); }

  function toggleInterest(i: string) {
    setForm(f => ({
      ...f,
      intereses: f.intereses.includes(i) ? f.intereses.filter(x => x !== i) : [...f.intereses, i],
    }));
    setError(null);
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.empresa.trim()) return "Ingresa el nombre de tu empresa.";
      if (!form.tipo) return "Selecciona el tipo de organización.";
      if (form.tipo === "Otro" && !form.tipo_otro.trim()) return "Especifica el tipo de organización.";
    }
    if (step === 1) {
      if (!form.cartera) return "Selecciona el tamaño de cartera.";
      if (!form.volumen) return "Selecciona el volumen de originación.";
    }
    if (step === 2) {
      if (form.intereses.length === 0) return "Selecciona al menos un área de interés.";
      if (form.intereses.includes("Otro") && !form.intereses_otro.trim()) return "Cuéntanos qué necesitas.";
    }
    if (step === 3) {
      if (!form.nombre.trim()) return "Ingresa tu nombre.";
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Ingresa un email válido.";
      if (form.telefono.replace(/\D/g, "").length < 10) return "Ingresa un teléfono válido (mín. 10 dígitos).";
      if (!form.cargo.trim()) return "Ingresa tu cargo.";
    }
    return null;
  }

  async function next() {
    const err = validateStep();
    if (err) { setError(err); return; }

    if (step === 3) {
      // Submit
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/demo-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Error enviando solicitud."); setLoading(false); return; }
        setDone(true);
        setStep(4);
      } catch {
        setError("Error de conexión. Intenta de nuevo.");
      }
      setLoading(false);
      return;
    }

    setStep(s => s + 1);
  }

  const STEP_TITLES = ["Sobre tu empresa", "Tamaño de operación", "¿Qué te interesa?", "Tus datos de contacto", "¡Listo! Agenda tu demo"];

  return (
    <main style={{ minHeight: "100svh", background: "radial-gradient(ellipse 120% 80% at 25% 10%,#1B3F8A 0%,#0C1E4A 55%,#091530 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", fontFamily: "'Geist',sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)", backgroundSize: "48px 48px", opacity: .5 }} />

      <div style={{ width: "100%", maxWidth: 560, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/plinius_newlogo.png" alt="Plinius" style={{ height: 40 }} onError={e => (e.currentTarget.style.display = "none")} />
          </a>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 24, boxShadow: "0 32px 80px rgba(0,0,0,.3)", overflow: "hidden" }}>
          {/* Progress */}
          <div style={{ padding: "18px 28px 0", display: "flex", gap: 6 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? "#0C1E4A" : "#E2E8F0", transition: "background .3s" }} />
            ))}
          </div>

          <div style={{ padding: "20px 28px 28px" }}>
            {/* Step title */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono',monospace", letterSpacing: ".08em", marginBottom: 6 }}>PASO {step + 1} DE 5</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em" }}>{STEP_TITLES[step]}</h2>
            </div>

            {error && <div className="wiz-err">{error}</div>}

            {/* Step 0: Empresa */}
            {step === 0 && (
              <div className="wiz-fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Nombre de la empresa</label>
                  <input className="wiz-inp" value={form.empresa} onChange={e => set("empresa", e.target.value)} placeholder="Tu empresa S.A. de C.V." />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Tipo de organización</label>
                  <select className="wiz-sel" value={form.tipo} onChange={e => set("tipo", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {form.tipo === "Otro" && (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Especifica</label>
                    <input className="wiz-inp" value={form.tipo_otro} onChange={e => set("tipo_otro", e.target.value)} placeholder="Tipo de organización" />
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Tamaño */}
            {step === 1 && (
              <div className="wiz-fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Cartera actual</label>
                  <select className="wiz-sel" value={form.cartera} onChange={e => set("cartera", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {CARTERAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Volumen mensual de originación</label>
                  <select className="wiz-sel" value={form.volumen} onChange={e => set("volumen", e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {VOLUMENES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Intereses */}
            {step === 2 && (
              <div className="wiz-fade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {INTERESES_OPS.map(i => (
                  <div key={i} className={`wiz-chk${form.intereses.includes(i) ? " on" : ""}`} onClick={() => toggleInterest(i)}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${form.intereses.includes(i) ? "#1B3F8A" : "#CBD5E1"}`, background: form.intereses.includes(i) ? "#0C1E4A" : "#fff", display: "grid", placeItems: "center", flexShrink: 0, transition: "all .15s" }}>
                      {form.intereses.includes(i) && <Ic d="M3 8l3 3 7-7" s={11} c="#fff" />}
                    </div>
                    {i}
                  </div>
                ))}
                {form.intereses.includes("Otro") && (
                  <textarea
                    value={form.intereses_otro}
                    onChange={e => set("intereses_otro", e.target.value)}
                    placeholder="Cuéntanos qué necesitas..."
                    style={{ width: "100%", minHeight: 64, padding: "10px 14px", borderRadius: 11, border: "1.5px solid #DDE5F7", background: "#F0F4FF", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#0F172A", outline: "none", resize: "vertical", marginTop: 4, boxSizing: "border-box" }}
                  />
                )}
              </div>
            )}

            {/* Step 3: Contacto */}
            {step === 3 && (
              <div className="wiz-fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Nombre completo</label>
                  <input className="wiz-inp" value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Tu nombre" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email corporativo</label>
                  <input className="wiz-inp" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="tu@empresa.com" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Teléfono</label>
                  <input className="wiz-inp" type="tel" value={form.telefono} onChange={e => set("telefono", e.target.value)} placeholder="+52 55 1234 5678" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Cargo / Posición</label>
                  <input className="wiz-inp" value={form.cargo} onChange={e => set("cargo", e.target.value)} placeholder="Director de Crédito" />
                </div>
              </div>
            )}

            {/* Step 4: Calendly */}
            {step === 4 && (
              <div className="wiz-fade">
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", border: "2px solid #34D399", display: "grid", placeItems: "center", margin: "0 auto 12px", boxShadow: "0 0 20px rgba(52,211,153,.25)" }}>
                    <Ic d="M2 8l4 4 8-8" s={20} c="#059669" />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#065F46", marginBottom: 4 }}>Recibimos tu solicitud</p>
                  <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>Agenda una llamada en el horario que prefieras:</p>
                </div>
                <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E2E8F0" }}>
                  <iframe
                    src="https://calendly.com/luis-plinius/30min"
                    width="100%"
                    height="660"
                    style={{ border: "none", display: "block" }}
                    title="Agendar demo"
                  />
                </div>
                <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
                  Si prefieres, te contactaremos en menos de 24 horas a <strong style={{ color: "#475569" }}>{form.email}</strong>.
                </p>
              </div>
            )}

            {/* Navigation */}
            {step < 4 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, gap: 10 }}>
                {step > 0 ? (
                  <button className="wiz-btn-g" onClick={() => { setStep(s => s - 1); setError(null); }}>← Anterior</button>
                ) : (
                  <a href="/" style={{ fontSize: 13, color: "#94A3B8", textDecoration: "none" }}>← Inicio</a>
                )}
                <button className="wiz-btn-p" onClick={next} disabled={loading} style={{ flex: 1, maxWidth: 240 }}>
                  {loading ? (
                    <><svg className="spinner" width={15} height={15} viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,.25)" strokeWidth="2" /><path d="M13 7.5a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>Enviando...</>
                  ) : step === 3 ? (
                    <>Enviar y agendar<Ic d="M2 8l4 4 8-8" s={13} c="rgba(255,255,255,.7)" /></>
                  ) : (
                    <>Siguiente<Ic d="M3 8h10M8 4l4 4-4 4" s={13} c="rgba(255,255,255,.7)" /></>
                  )}
                </button>
              </div>
            )}

            {/* Back to home from step 5 */}
            {step === 4 && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <a href="/" style={{ fontSize: 13, color: "#64748B", textDecoration: "none" }}>← Volver al inicio</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
