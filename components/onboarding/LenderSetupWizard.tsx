"use client";

import { useState } from "react";

const SECTORES_OPTIONS = [
  "Residencial", "Comercial", "Industrial", "Agro", "Tecnología",
  "Salud", "Educación", "Construcción", "Transporte", "Servicios", "Otro",
];

const TIPOS_CREDITO = [
  "Crédito simple", "Crédito revolvente", "Arrendamiento", "Factoraje",
  "Crédito puente", "Crédito hipotecario", "Capital de trabajo", "Otro",
];

type Step1 = { name: string; slug: string; tipo_credito: string }
type Step2 = { primary_color: string; secondary_color: string; descripcion: string }
type Step3 = { tasa_min: string; tasa_max: string; monto_min: string; monto_max: string; sectores: string[] }

type Props = {
  userId: string
  adminSecret: string
  onDone: () => void
}

export function LenderSetupWizard({ userId, adminSecret, onDone }: Props) {
  const [step, setStep]         = useState(0)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [slugError, setSlugError]     = useState<string | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)

  const [s1, setS1] = useState<Step1>({ name: "", slug: "", tipo_credito: "Crédito simple" })
  const [s2, setS2] = useState<Step2>({ primary_color: "#1A3A6B", secondary_color: "#00C896", descripcion: "" })
  const [s3, setS3] = useState<Step3>({ tasa_min: "", tasa_max: "", monto_min: "", monto_max: "", sectores: [] })

  const primary = s2.primary_color

  function slugify(name: string) {
    return name.toLowerCase().trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
  }

  async function checkSlug(slug: string) {
    if (!slug) return
    setCheckingSlug(true)
    try {
      const res = await fetch(`/api/onboarding/${slug}`)
      if (res.ok) {
        setSlugError("Esta URL ya está en uso — elige otra")
      } else {
        setSlugError(null)
      }
    } catch {
      setSlugError(null)
    }
    setCheckingSlug(false)
  }

  function toggleSector(s: string) {
    setS3(prev => ({
      ...prev,
      sectores: prev.sectores.includes(s)
        ? prev.sectores.filter(x => x !== s)
        : [...prev.sectores, s],
    }))
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const createRes = await fetch("/api/onb-lenders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({
          slug:            s1.slug || slugify(s1.name),
          name:            s1.name,
          primary_color:   s2.primary_color,
          secondary_color: s2.secondary_color,
        }),
      })
      const createJson = await createRes.json()
      if (!createRes.ok) {
        if (createJson.error?.includes("slug") || createJson.error?.includes("duplicate") || createJson.error?.includes("unique")) {
          setSlugError("Esta URL ya está en uso — cámbiala arriba")
        }
        throw new Error(createJson.error ?? "Error al crear portal")
      }

      const lenderId = createJson.lender.id

      await fetch(`/api/onb-lenders/${lenderId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({
          user_id:      userId,
          descripcion:  s2.descripcion,
          tipo_credito: s1.tipo_credito,
          tasa_min:    s3.tasa_min  ? parseFloat(s3.tasa_min)  : null,
          tasa_max:    s3.tasa_max  ? parseFloat(s3.tasa_max)  : null,
          monto_min:   s3.monto_min ? parseInt(s3.monto_min)   : null,
          monto_max:   s3.monto_max ? parseInt(s3.monto_max)   : null,
          sectores:    s3.sectores.length > 0 ? s3.sectores    : null,
        }),
      })

      await fetch(`/api/onb-lenders/${lenderId}/flows`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({
          name: "Solicitud estándar",
          steps: [
            {
              id: "step_datos", title: "Datos personales", order: 1,
              fields: [
                { id: "full_name", label: "Nombre completo",    type: "text",  required: true },
                { id: "email",     label: "Correo electrónico", type: "email", required: true },
                { id: "phone",     label: "Teléfono",           type: "phone", required: true },
                { id: "rfc",       label: "RFC",                type: "text",  required: true },
              ]
            },
            {
              id: "step_docs", title: "Documentos", order: 2,
              fields: [
                { id: "ine",          label: "INE (ambos lados)",          type: "file",    required: true, accept: "image/*,application/pdf", maxSizeMB: 5 },
                { id: "comprobante",  label: "Comprobante de domicilio",   type: "file",    required: true, accept: "application/pdf",         maxSizeMB: 5 },
                { id: "acepta_terms", label: "Acepto términos y condiciones", type: "boolean", required: true },
              ]
            }
          ]
        }),
      })

      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 42, padding: "0 14px",
    border: "1px solid #E2E8F0", borderRadius: 10,
    fontSize: 13, color: "#0F172A", background: "#fff",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  }

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "#475569", marginBottom: 6,
  }

  const STEPS = ["Tu portal", "Diseño", "Condiciones"]
  const canContinue = step === 0 ? (!!s1.name && !slugError && !checkingSlug) : true

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520,
        border: "1px solid #E2E8F0",
        boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}>

        {/* Header con X para cerrar */}
        <div style={{ background: primary, padding: "28px 32px 24px", position: "relative" }}>

          {/* Botón cerrar */}
          <button
            onClick={onDone}
            style={{
              position: "absolute", top: 16, right: 16,
              width: 32, height: 32, borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.15)",
              color: "#fff", fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "inherit", lineHeight: 1,
            }}
          >
            ×
          </button>

          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
            Configura tu portal
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 20px" }}>
            {STEPS[step]}
          </h2>

          {/* Progress bars */}
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 3, flex: 1, borderRadius: 3,
                background: i <= step ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                transition: "background 0.3s",
              }}/>
            ))}
          </div>
        </div>

        <div style={{ padding: "28px 32px 24px" }}>

          {/* STEP 0 — Info básica */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Nombre de tu empresa *</label>
                <input
                  style={inputStyle}
                  placeholder="ej. QuickCap, Banorte Solar..."
                  value={s1.name}
                  onChange={e => {
                    const name = e.target.value
                    const slug = slugify(name)
                    setS1(p => ({ ...p, name, slug }))
                    setSlugError(null)
                  }}
                />
              </div>

              <div>
                <label style={labelStyle}>URL de tu portal</label>
                <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${slugError ? "#FECACA" : "#E2E8F0"}`, borderRadius: 10, overflow: "hidden", background: "#F8FAFC", transition: "border-color 0.15s" }}>
                  <span style={{ padding: "0 12px", fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap", borderRight: "1px solid #E2E8F0", height: 42, display: "flex", alignItems: "center" }}>
                    plinius.mx/onboarding/
                  </span>
                  <input
                    style={{ ...inputStyle, border: "none", borderRadius: 0, background: "transparent", flex: 1 }}
                    placeholder="tu-empresa"
                    value={s1.slug}
                    onChange={e => {
                      setS1(p => ({ ...p, slug: slugify(e.target.value) }))
                      setSlugError(null)
                    }}
                    onBlur={e => { if (e.target.value) checkSlug(e.target.value) }}
                  />
                </div>
                {checkingSlug && (
                  <p style={{ fontSize: 11, color: "#94A3B8", margin: "4px 0 0" }}>Verificando disponibilidad...</p>
                )}
                {slugError && (
                  <p style={{ fontSize: 11, color: "#B91C1C", margin: "4px 0 0" }}>⚠ {slugError}</p>
                )}
                {!slugError && !checkingSlug && s1.slug && (
                  <p style={{ fontSize: 11, color: "#059669", margin: "4px 0 0" }}>✓ URL disponible</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Tipo de crédito</label>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={s1.tipo_credito}
                  onChange={e => setS1(p => ({ ...p, tipo_credito: e.target.value }))}
                >
                  {TIPOS_CREDITO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* STEP 1 — Diseño */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Color principal</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={s2.primary_color}
                      onChange={e => setS2(p => ({ ...p, primary_color: e.target.value }))}
                      style={{ width: 42, height: 42, borderRadius: 8, border: "1px solid #E2E8F0", cursor: "pointer", padding: 2 }}
                    />
                    <input style={{ ...inputStyle, flex: 1 }} value={s2.primary_color}
                      onChange={e => setS2(p => ({ ...p, primary_color: e.target.value }))}
                      placeholder="#1A3A6B"
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Color acento</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" value={s2.secondary_color}
                      onChange={e => setS2(p => ({ ...p, secondary_color: e.target.value }))}
                      style={{ width: 42, height: 42, borderRadius: 8, border: "1px solid #E2E8F0", cursor: "pointer", padding: 2 }}
                    />
                    <input style={{ ...inputStyle, flex: 1 }} value={s2.secondary_color}
                      onChange={e => setS2(p => ({ ...p, secondary_color: e.target.value }))}
                      placeholder="#00C896"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #E2E8F0" }}>
                <div style={{ background: s2.primary_color, padding: "14px 18px" }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>{s1.name || "Tu empresa"}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{s1.tipo_credito}</p>
                </div>
                <div style={{ padding: "12px 18px", background: "#F8FAFC" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: s2.secondary_color + "18", border: `1px solid ${s2.secondary_color}30`, borderRadius: 20, padding: "3px 10px" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: s2.secondary_color }}/>
                    <span style={{ fontSize: 11, fontWeight: 600, color: s2.secondary_color }}>Vista previa</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Descripción breve</label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, height: "auto", padding: "10px 14px", resize: "none", lineHeight: 1.5 }}
                  placeholder="Describe qué tipo de financiamiento ofreces y a quién va dirigido..."
                  value={s2.descripcion}
                  onChange={e => setS2(p => ({ ...p, descripcion: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* STEP 2 — Condiciones */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Tasa mínima (%)</label>
                  <input type="number" style={inputStyle} placeholder="ej. 18"
                    value={s3.tasa_min} onChange={e => setS3(p => ({ ...p, tasa_min: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Tasa máxima (%)</label>
                  <input type="number" style={inputStyle} placeholder="ej. 36"
                    value={s3.tasa_max} onChange={e => setS3(p => ({ ...p, tasa_max: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Monto mínimo ($)</label>
                  <input type="number" style={inputStyle} placeholder="ej. 50000"
                    value={s3.monto_min} onChange={e => setS3(p => ({ ...p, monto_min: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Monto máximo ($)</label>
                  <input type="number" style={inputStyle} placeholder="ej. 5000000"
                    value={s3.monto_max} onChange={e => setS3(p => ({ ...p, monto_max: e.target.value }))} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Sectores que financias</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SECTORES_OPTIONS.map(s => {
                    const sel = s3.sectores.includes(s)
                    return (
                      <button key={s} onClick={() => toggleSector(s)}
                        style={{
                          height: 32, padding: "0 14px", borderRadius: 20,
                          border: `1px solid ${sel ? primary : "#E2E8F0"}`,
                          background: sel ? `${primary}12` : "#F8FAFC",
                          color: sel ? primary : "#64748B",
                          fontSize: 12, fontWeight: sel ? 700 : 500,
                          cursor: "pointer", transition: "all 0.15s",
                          fontFamily: "inherit",
                        }}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Slug edit inline cuando hay error en paso 2 */}
          {step === 2 && slugError && (
            <div style={{ marginTop: 8, padding: "14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: "#B91C1C", margin: "0 0 8px", fontWeight: 600 }}>
                ⚠ Esta URL ya está en uso — cámbiala:
              </p>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #FECACA", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
                <span style={{ padding: "0 10px", fontSize: 11, color: "#94A3B8", whiteSpace: "nowrap", borderRight: "1px solid #FECACA", height: 36, display: "flex", alignItems: "center" }}>
                  plinius.mx/onboarding/
                </span>
                <input
                  style={{ flex: 1, height: 36, padding: "0 10px", border: "none", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0F172A" }}
                  value={s1.slug}
                  onChange={e => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                    setS1(p => ({ ...p, slug: val }))
                    setSlugError(null)
                  }}
                  onBlur={e => { if (e.target.value) checkSlug(e.target.value) }}
                  placeholder="nueva-url"
                  autoFocus
                />
              </div>
              {checkingSlug && <p style={{ fontSize: 11, color: "#94A3B8", margin: "4px 0 0" }}>Verificando...</p>}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 16, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, color: "#B91C1C" }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Atrás
              </button>
            )}
            <button
              onClick={() => step < 2 ? setStep(s => s + 1) : handleSubmit()}
              disabled={loading || !canContinue || (step === 2 && !!slugError)}
              style={{
                flex: 2, height: 42, borderRadius: 10, border: "none",
                background: (!canContinue || (step === 2 && !!slugError)) ? "#E2E8F0" : primary,
                color: (!canContinue || (step === 2 && !!slugError)) ? "#94A3B8" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: (!canContinue || (step === 2 && !!slugError)) ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? "Creando portal..." : step < 2 ? "Continuar →" : "Crear mi portal ✓"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
