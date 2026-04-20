"use client";

import { useState, useRef } from "react";

const SECTORES_OPTIONS = [
  "Residencial", "Comercial", "Industrial", "Agro", "Tecnología",
  "Salud", "Educación", "Construcción", "Transporte", "Servicios", "Otro",
];

const TIPOS_CREDITO = [
  "Crédito simple", "Crédito revolvente", "Arrendamiento", "Factoraje",
  "Crédito puente", "Crédito hipotecario", "Capital de trabajo", "Otro",
];

type Lender = {
  id: string; slug: string; name: string;
  primary_color: string; secondary_color: string;
  descripcion: string | null; tipo_credito: string | null;
  tasa_min: number | null; tasa_max: number | null;
  monto_min: number | null; monto_max: number | null;
  sectores: string[] | null; logo_url: string | null;
}

type Props = { lender: Lender; adminSecret: string; onDone: () => void }

export function LenderEditModal({ lender, adminSecret, onDone }: Props) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved]     = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(lender.logo_url)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  const [name,        setName]        = useState(lender.name)
  const [primary,     setPrimary]     = useState(lender.primary_color ?? "#1A3A6B")
  const [secondary,   setSecondary]   = useState(lender.secondary_color ?? "#00C896")
  const [descripcion, setDescripcion] = useState(lender.descripcion ?? "")
  const [tipo,        setTipo]        = useState(lender.tipo_credito ?? "Crédito simple")
  const [tasaMin,     setTasaMin]     = useState(lender.tasa_min?.toString() ?? "")
  const [tasaMax,     setTasaMax]     = useState(lender.tasa_max?.toString() ?? "")
  const [montoMin,    setMontoMin]    = useState(lender.monto_min?.toString() ?? "")
  const [montoMax,    setMontoMax]    = useState(lender.monto_max?.toString() ?? "")
  const [sectores,    setSectores]    = useState<string[]>(lender.sectores ?? [])

  function toggleSector(s: string) {
    setSectores(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert("El logo debe ser menor a 2MB"); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function uploadLogo(): Promise<string | null> {
    if (!logoFile) return null
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("logo", logoFile)
      const res = await fetch(`/api/onb-lenders/${lender.id}/branding`, {
        method: "POST",
        headers: { "x-admin-secret": adminSecret },
        body: formData,
      })
      const json = await res.json()
      return json.branding?.logo_url ?? null
    } catch {
      return null
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      // Upload logo si hay uno nuevo
      if (logoFile) await uploadLogo()

      await fetch(`/api/onb-lenders/${lender.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({ name, primary_color: primary, secondary_color: secondary }),
      })

      await fetch(`/api/onb-lenders/${lender.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
        body: JSON.stringify({
          descripcion,
          tipo_credito: tipo,
          tasa_min:  tasaMin  ? parseFloat(tasaMin)  : null,
          tasa_max:  tasaMax  ? parseFloat(tasaMax)  : null,
          monto_min: montoMin ? parseInt(montoMin)   : null,
          monto_max: montoMax ? parseInt(montoMax)   : null,
          sectores:  sectores.length > 0 ? sectores : null,
        }),
      })

      setSaved(true)
      setTimeout(() => { setSaved(false); onDone() }, 1200)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", height: 42, padding: "0 14px",
    border: "1px solid #E2E8F0", borderRadius: 10,
    fontSize: 13, color: "#0F172A", background: "#fff",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  }
  const lbl: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6,
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(4px)", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560, border: "1px solid #E2E8F0", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", overflow: "hidden", margin: "auto" }}>

        {/* Header */}
        <div style={{ background: primary, padding: "24px 28px 20px", position: "relative" }}>
          <button onClick={onDone} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>Editando portal</p>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>{name || lender.name}</h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", margin: 0 }}>plinius.mx/onboarding/{lender.slug}</p>
        </div>

        <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "70vh", overflowY: "auto" }}>

          {/* Logo upload */}
          <div>
            <label style={lbl}>Logo de tu empresa</label>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 14,
                border: "1.5px dashed #E2E8F0", background: "#F8FAFC",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
              }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
                ) : (
                  <span style={{ fontSize: 24, opacity: 0.3 }}>🏢</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  ref={logoRef}
                  onChange={handleLogoChange}
                  style={{ display: "none" }}
                />
                <button
                  onClick={() => logoRef.current?.click()}
                  style={{ height: 36, padding: "0 16px", borderRadius: 9, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 6, display: "block" }}>
                  {uploadingLogo ? "Subiendo..." : logoPreview ? "Cambiar logo" : "Subir logo"}
                </button>
                <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>PNG, JPG, SVG · Máx 2MB · Recomendado 200×60px</p>
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label style={lbl}>Nombre de tu empresa</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* Tipo */}
          <div>
            <label style={lbl}>Tipo de crédito</label>
            <select style={{ ...inp, cursor: "pointer" }} value={tipo} onChange={e => setTipo(e.target.value)}>
              {TIPOS_CREDITO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Colores */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Color principal</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="color" value={primary} onChange={e => setPrimary(e.target.value)} style={{ width: 42, height: 42, borderRadius: 8, border: "1px solid #E2E8F0", cursor: "pointer", padding: 2 }}/>
                <input style={{ ...inp, flex: 1 }} value={primary} onChange={e => setPrimary(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={lbl}>Color acento</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="color" value={secondary} onChange={e => setSecondary(e.target.value)} style={{ width: 42, height: 42, borderRadius: 8, border: "1px solid #E2E8F0", cursor: "pointer", padding: 2 }}/>
                <input style={{ ...inp, flex: 1 }} value={secondary} onChange={e => setSecondary(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label style={lbl}>Descripción</label>
            <textarea rows={3} style={{ ...inp, height: "auto", padding: "10px 14px", resize: "none", lineHeight: 1.5 }}
              value={descripcion} onChange={e => setDescripcion(e.target.value)}
              placeholder="Describe tu producto de crédito..." />
          </div>

          {/* Tasas y montos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Tasa mínima (%)</label><input type="number" style={inp} value={tasaMin} onChange={e => setTasaMin(e.target.value)} placeholder="18"/></div>
            <div><label style={lbl}>Tasa máxima (%)</label><input type="number" style={inp} value={tasaMax} onChange={e => setTasaMax(e.target.value)} placeholder="36"/></div>
            <div><label style={lbl}>Monto mínimo ($)</label><input type="number" style={inp} value={montoMin} onChange={e => setMontoMin(e.target.value)} placeholder="50000"/></div>
            <div><label style={lbl}>Monto máximo ($)</label><input type="number" style={inp} value={montoMax} onChange={e => setMontoMax(e.target.value)} placeholder="5000000"/></div>
          </div>

          {/* Sectores */}
          <div>
            <label style={lbl}>Sectores que financias</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SECTORES_OPTIONS.map(s => {
                const sel = sectores.includes(s)
                return (
                  <button key={s} onClick={() => toggleSector(s)} style={{ height: 32, padding: "0 14px", borderRadius: 20, border: `1px solid ${sel ? primary : "#E2E8F0"}`, background: sel ? `${primary}12` : "#F8FAFC", color: sel ? primary : "#64748B", fontSize: 12, fontWeight: sel ? 700 : 500, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit" }}>
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onDone} style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={loading} style={{ flex: 2, height: 42, borderRadius: 10, border: "none", background: saved ? "#059669" : primary, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}>
              {saved ? "✓ Guardado" : loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
