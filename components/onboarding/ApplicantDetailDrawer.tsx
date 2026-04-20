"use client";

import { useEffect, useState } from "react";

type Applicant = {
  id: string; status: string; email: string | null; phone: string | null;
  full_name: string | null; created_at: string; completed_at: string | null;
  data: Record<string, unknown> | null; documents: Record<string, string> | null;
  lender_id: string; flow_id: string;
}

type Props = {
  applicantId: string
  adminSecret: string
  primaryColor: string
  onClose: () => void
  onStatusChange?: (id: string, status: string) => void
}

const STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:       { label: "Borrador",    color: "#475569", bg: "#F8FAFC", border: "#E2E8F0" },
  in_progress: { label: "En progreso", color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
  completed:   { label: "Completada",  color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  rejected:    { label: "Rechazada",   color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" },
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) + " " +
    new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
}

export function ApplicantDetailDrawer({ applicantId, adminSecret, primaryColor, onClose, onStatusChange }: Props) {
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [loading, setLoading]     = useState(true)
  const [updating, setUpdating]   = useState(false)
  const [docUrls, setDocUrls]     = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`/api/onb-applicants/${applicantId}`, {
      headers: { "x-admin-secret": adminSecret }
    })
      .then(r => r.json())
      .then(json => {
        setApplicant(json.applicant)
        // Si hay documentos, generamos URLs firmadas
        if (json.applicant?.signed_documents) {
          setDocUrls(json.applicant.signed_documents)
        } else if (json.applicant?.documents) {
          setDocUrls(json.applicant.documents)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [applicantId, adminSecret])

  async function changeStatus(status: string) {
    if (!applicant) return
    setUpdating(true)
    const res = await fetch(`/api/onb-applicants/${applicantId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setApplicant(p => p ? { ...p, status } : p)
      onStatusChange?.(applicantId, status)
    }
    setUpdating(false)
  }

  const s = applicant ? (STATUS[applicant.status] ?? STATUS.draft) : STATUS.draft

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}/>

      {/* Drawer */}
      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0, zIndex: 301,
        width: "min(520px, 95vw)",
        background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ background: primaryColor, padding: "20px 24px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
                Detalle del solicitante
              </p>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                {loading ? "Cargando..." : applicant?.full_name ?? "Sin nombre"}
              </h2>
              {applicant?.email && (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: 0 }}>{applicant.email}</p>
              )}
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>×</button>
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 13 }}>
            Cargando datos...
          </div>
        ) : !applicant ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 13 }}>
            No se pudo cargar el solicitante
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>

            {/* Status + acciones */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, background: s.bg, border: `1px solid ${s.border}` }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }}/>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.label}</span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {applicant.status !== "completed" && (
                  <button onClick={() => changeStatus("completed")} disabled={updating}
                    style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "none", background: "#059669", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    ✓ Aprobar
                  </button>
                )}
                {applicant.status !== "rejected" && (
                  <button onClick={() => changeStatus("rejected")} disabled={updating}
                    style={{ height: 34, padding: "0 14px", borderRadius: 9, border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Rechazar
                  </button>
                )}
              </div>
            </div>

            {/* Info básica */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 14px" }}>Información de contacto</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  ["Nombre", applicant.full_name],
                  ["Email", applicant.email],
                  ["Teléfono", applicant.phone],
                  ["Registrado", fmt(applicant.created_at)],
                  ...(applicant.completed_at ? [["Completado", fmt(applicant.completed_at)]] : []),
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#0F172A", margin: 0 }}>{value ?? "—"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Datos del formulario */}
            {applicant.data && Object.keys(applicant.data).length > 0 && (
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 14px" }}>Datos de la solicitud</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(applicant.data).map(([key, value]) => (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                      <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500, textTransform: "capitalize", flexShrink: 0 }}>
                        {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span style={{ fontSize: 13, color: "#0F172A", fontWeight: 600, textAlign: "right", wordBreak: "break-all" }}>
                        {typeof value === "boolean"
                    ? (value ? "Sí" : "No")
                    : key === "monto_solicitado"
                      ? `$${Number(String(value).replace(/[^0-9]/g,"")).toLocaleString("es-MX")}`
                      : String(value ?? "—")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documentos */}
            {Object.keys(docUrls).length > 0 && (
              <div style={{ padding: "20px 24px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 14px" }}>Documentos</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(docUrls).map(([key, url]) => (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC", textDecoration: "none", transition: "all 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = primaryColor + "40"; (e.currentTarget as HTMLAnchorElement).style.background = primaryColor + "06" }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLAnchorElement).style.background = "#F8FAFC" }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: primaryColor + "12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                        📎
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0F172A", textTransform: "capitalize" }}>
                          {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8" }}>Clic para ver documento</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke={primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
