"use client";

import { useState, useEffect } from "react";

type FieldType = "text" | "email" | "phone" | "number" | "select" | "date" | "file" | "boolean";

type Field = {
  id: string; label: string; type: FieldType;
  required: boolean; options?: string[]; accept?: string; maxSizeMB?: number;
}

type Step = { id: string; title: string; order: number; fields: Field[] }

type Props = {
  lenderId: string; flowId: string; adminSecret: string
  primaryColor: string; secondaryColor: string
  onClose: () => void
}

const FIELD_TYPES: { value: FieldType; label: string; icon: string }[] = [
  { value: "text",    label: "Texto",     icon: "T"  },
  { value: "email",   label: "Email",     icon: "@"  },
  { value: "phone",   label: "Teléfono",  icon: "☎"  },
  { value: "number",  label: "Número",    icon: "#"  },
  { value: "select",  label: "Opciones",  icon: "≡"  },
  { value: "date",    label: "Fecha",     icon: "📅" },
  { value: "file",    label: "Archivo",   icon: "📎" },
  { value: "boolean", label: "Sí / No",   icon: "✓"  },
]

function uid() { return Math.random().toString(36).slice(2, 8) }

export function FlowConfigurator({ lenderId, flowId, adminSecret, primaryColor, secondaryColor, onClose }: Props) {
  const [steps, setSteps]     = useState<Step[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [editingField, setEditingField] = useState<{ stepIdx: number; fieldIdx: number } | null>(null)

  useEffect(() => {
    fetch(`/api/onb-lenders/${lenderId}/flows/${flowId}`, {
      headers: { "x-admin-secret": adminSecret }
    })
      .then(r => r.json())
      .then(json => {
        const sorted = (json.flow?.steps ?? []).sort((a: Step, b: Step) => a.order - b.order)
        setSteps(sorted)
        setLoading(false)
      })
  }, [lenderId, flowId, adminSecret])

  async function save() {
    setSaving(true)
    await fetch(`/api/onb-lenders/${lenderId}/flows/${flowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
      body: JSON.stringify({ steps }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  function addStep() {
    const newStep: Step = {
      id: `step_${uid()}`, title: `Paso ${steps.length + 1}`,
      order: steps.length + 1, fields: []
    }
    setSteps(p => [...p, newStep])
    setActiveStep(steps.length)
  }

  function removeStep(idx: number) {
    setSteps(p => p.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })))
    setActiveStep(Math.max(0, idx - 1))
  }

  function updateStepTitle(idx: number, title: string) {
    setSteps(p => p.map((s, i) => i === idx ? { ...s, title } : s))
  }

  function addField(stepIdx: number) {
    const field: Field = { id: `field_${uid()}`, label: "Nuevo campo", type: "text", required: false }
    setSteps(p => p.map((s, i) => i === stepIdx ? { ...s, fields: [...s.fields, field] } : s))
    setEditingField({ stepIdx, fieldIdx: steps[stepIdx].fields.length })
  }

  function updateField(stepIdx: number, fieldIdx: number, updates: Partial<Field>) {
    setSteps(p => p.map((s, i) => i === stepIdx ? {
      ...s,
      fields: s.fields.map((f, j) => j === fieldIdx ? { ...f, ...updates } : f)
    } : s))
  }

  function removeField(stepIdx: number, fieldIdx: number) {
    setSteps(p => p.map((s, i) => i === stepIdx ? {
      ...s, fields: s.fields.filter((_, j) => j !== fieldIdx)
    } : s))
    setEditingField(null)
  }

  function moveField(stepIdx: number, fieldIdx: number, dir: -1 | 1) {
    setSteps(p => p.map((s, i) => {
      if (i !== stepIdx) return s
      const fields = [...s.fields]
      const target = fieldIdx + dir
      if (target < 0 || target >= fields.length) return s;
      [fields[fieldIdx], fields[target]] = [fields[target], fields[fieldIdx]]
      return { ...s, fields }
    }))
  }

  const inp: React.CSSProperties = {
    width: "100%", height: 36, padding: "0 10px",
    border: "1px solid #E2E8F0", borderRadius: 8,
    fontSize: 13, outline: "none", fontFamily: "inherit",
    color: "#0F172A", background: "#fff", boxSizing: "border-box",
  }

  if (loading) return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, fontSize: 13, color: "#94A3B8" }}>Cargando flow...</div>
    </div>
  )

  const step = steps[activeStep]

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 780, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ background: primaryColor, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>Configurador de flow</p>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em" }}>Editor de solicitud</h2>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={save} disabled={saving} style={{ height: 36, padding: "0 16px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.3)", background: saved ? secondaryColor : "rgba(255,255,255,0.15)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}>
              {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar flow"}
            </button>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Sidebar de pasos */}
          <div style={{ width: 200, borderRight: "1px solid #F1F5F9", display: "flex", flexDirection: "column", flexShrink: 0, background: "#FAFAFA" }}>
            <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #F1F5F9" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Pasos</p>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {steps.map((s, i) => (
                <button key={s.id} onClick={() => setActiveStep(i)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: i === activeStep ? `${primaryColor}12` : "transparent", color: i === activeStep ? primaryColor : "#475569", fontSize: 13, fontWeight: i === activeStep ? 700 : 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit", marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {i + 1}. {s.title}
                  </span>
                  <span style={{ fontSize: 10, color: "#CBD5E1", flexShrink: 0 }}>{s.fields.length}c</span>
                </button>
              ))}
            </div>
            <div style={{ padding: "8px", borderTop: "1px solid #F1F5F9" }}>
              <button onClick={addStep} style={{ width: "100%", height: 34, borderRadius: 9, border: `1px dashed ${primaryColor}40`, background: `${primaryColor}06`, color: primaryColor, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                + Agregar paso
              </button>
            </div>
          </div>

          {/* Editor de campos */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {!step ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 13 }}>
                Agrega un paso para empezar
              </div>
            ) : (
              <>
                {/* Step header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", gap: 12, background: "#fff", flexShrink: 0 }}>
                  <input
                    style={{ ...inp, flex: 1, fontSize: 14, fontWeight: 600, border: "none", padding: "0", background: "transparent" }}
                    value={step.title}
                    onChange={e => updateStepTitle(activeStep, e.target.value)}
                    placeholder="Nombre del paso"
                  />
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(activeStep)} style={{ height: 30, padding: "0 10px", borderRadius: 7, border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                      Eliminar paso
                    </button>
                  )}
                </div>

                {/* Fields list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                  {step.fields.length === 0 && (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "#CBD5E1", fontSize: 13 }}>
                      Sin campos — agrega uno abajo
                    </div>
                  )}

                  {step.fields.map((field, fi) => {
                    const isEditing = editingField?.stepIdx === activeStep && editingField?.fieldIdx === fi
                    return (
                      <div key={field.id} style={{ marginBottom: 8, borderRadius: 12, border: `1px solid ${isEditing ? primaryColor + "40" : "#E2E8F0"}`, background: isEditing ? `${primaryColor}04` : "#fff", overflow: "hidden", transition: "all 0.15s" }}>

                        {/* Field row */}
                        <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setEditingField(isEditing ? null : { stepIdx: activeStep, fieldIdx: fi })}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${primaryColor}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: primaryColor, flexShrink: 0 }}>
                            {FIELD_TYPES.find(t => t.value === field.type)?.icon ?? "T"}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{field.label}</p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8" }}>
                              {FIELD_TYPES.find(t => t.value === field.type)?.label}
                              {field.required ? " · Requerido" : " · Opcional"}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={e => { e.stopPropagation(); moveField(activeStep, fi, -1) }} disabled={fi === 0} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#94A3B8", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>↑</button>
                            <button onClick={e => { e.stopPropagation(); moveField(activeStep, fi, 1) }} disabled={fi === step.fields.length - 1} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#94A3B8", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>↓</button>
                            <button onClick={e => { e.stopPropagation(); removeField(activeStep, fi) }} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid #FECACA", background: "#FEF2F2", color: "#EF4444", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>×</button>
                          </div>
                        </div>

                        {/* Field editor */}
                        {isEditing && (
                          <div style={{ padding: "0 14px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, borderTop: "1px solid #F1F5F9" }}>
                            <div style={{ gridColumn: "1/-1", marginTop: 10 }}>
                              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Etiqueta del campo</label>
                              <input style={inp} value={field.label} onChange={e => updateField(activeStep, fi, { label: e.target.value })} placeholder="ej. Nombre completo" />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Tipo</label>
                              <select style={{ ...inp, cursor: "pointer" }} value={field.type} onChange={e => updateField(activeStep, fi, { type: e.target.value as FieldType })}>
                                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 500 }}>
                                <input type="checkbox" checked={field.required} onChange={e => updateField(activeStep, fi, { required: e.target.checked })} />
                                Campo requerido
                              </label>
                            </div>
                            {field.type === "select" && (
                              <div style={{ gridColumn: "1/-1" }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Opciones (separadas por coma)</label>
                                <input style={inp} value={field.options?.join(", ") ?? ""} onChange={e => updateField(activeStep, fi, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="Opción 1, Opción 2, Opción 3" />
                              </div>
                            )}
                            {field.type === "file" && (
                              <>
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Tipos aceptados</label>
                                  <input style={inp} value={field.accept ?? ""} onChange={e => updateField(activeStep, fi, { accept: e.target.value })} placeholder="image/*,application/pdf" />
                                </div>
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Tamaño máximo (MB)</label>
                                  <input type="number" style={inp} value={field.maxSizeMB ?? ""} onChange={e => updateField(activeStep, fi, { maxSizeMB: parseInt(e.target.value) })} placeholder="5" />
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  <button onClick={() => addField(activeStep)} style={{ width: "100%", height: 38, borderRadius: 10, border: `1.5px dashed ${primaryColor}35`, background: `${primaryColor}05`, color: primaryColor, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 4 }}>
                    + Agregar campo
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
