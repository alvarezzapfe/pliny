"use client";

import { useEffect, useState } from "react";

type Lender = {
  id: string; slug: string; name: string; active: boolean;
  primary_color: string; logo_url: string | null;
  tasa_min: number | null; tasa_max: number | null;
  monto_min: number | null; monto_max: number | null;
  sectores: string[] | null; tipo_credito: string | null;
  created_at: string; user_id: string | null;
}

type Applicant = {
  id: string; status: string; email: string | null;
  full_name: string | null; created_at: string;
  lender_id: string;
  onb_lenders: { name: string; primary_color: string } | null;
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft:       { label: "Borrador",    color: "#475569", bg: "#F8FAFC" },
  in_progress: { label: "En progreso", color: "#1D4ED8", bg: "#EFF6FF" },
  completed:   { label: "Completada",  color: "#059669", bg: "#ECFDF5" },
  rejected:    { label: "Rechazada",   color: "#B91C1C", bg: "#FEF2F2" },
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n/1_000).toFixed(0)}K`
  return `$${n}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h/24)}d`
}

type Props = { adminSecret: string }

export function OnboardingAdminTab({ adminSecret }: Props) {
  const [lenders, setLenders]       = useState<Lender[]>([])
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState<"lenders" | "applicants">("lenders")
  const [filterLender, setFilterLender] = useState("")
  const [filterStatus, setFilterStatus] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/onb-lenders", { headers: { "x-admin-secret": adminSecret } }).then(r => r.json()),
      fetch("/api/onb-applicants?limit=100", { headers: { "x-admin-secret": adminSecret } }).then(r => r.json()),
    ]).then(([l, a]) => {
      setLenders(l.lenders ?? [])
      setApplicants((a.applicants ?? []).map((ap: Applicant) => ({
        ...ap,
        onb_lenders: Array.isArray(ap.onb_lenders) ? ap.onb_lenders[0] ?? null : ap.onb_lenders,
      })))
      setLoading(false)
    })
  }, [adminSecret])

  const filteredApplicants = applicants.filter(a => {
    if (filterLender && a.lender_id !== filterLender) return false
    if (filterStatus && a.status !== filterStatus) return false
    return true
  })

  const inp: React.CSSProperties = {
    height: 34, padding: "0 12px", border: "1px solid #E2E8F0",
    borderRadius: 8, fontSize: 12, outline: "none",
    fontFamily: "inherit", background: "#fff", color: "#0F172A",
  }

  if (loading) return (
    <div style={{ padding: "60px 0", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Cargando onboarding...</div>
  )

  return (
    <div>

      {/* Stats rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Otorgantes",   val: lenders.length,                                  color: "#1D4ED8" },
          { label: "Activos",      val: lenders.filter(l => l.active).length,            color: "#059669" },
          { label: "Solicitantes", val: applicants.length,                               color: "#0F172A" },
          { label: "Completados",  val: applicants.filter(a => a.status === "completed").length, color: "#059669" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94A3B8", margin: "0 0 8px" }}>{s.label}</p>
            <p style={{ fontSize: 30, fontWeight: 800, color: s.color, margin: 0, letterSpacing: "-0.03em" }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F1F5F9", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {(["lenders", "applicants"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ height: 32, padding: "0 16px", borderRadius: 7, border: "none", background: view === v ? "#fff" : "transparent", color: view === v ? "#0F172A" : "#64748B", fontSize: 13, fontWeight: view === v ? 700 : 500, cursor: "pointer", fontFamily: "inherit", boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
            {v === "lenders" ? `Otorgantes (${lenders.length})` : `Solicitantes (${applicants.length})`}
          </button>
        ))}
      </div>

      {/* LENDERS TABLE */}
      {view === "lenders" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #F1F5F9", background: "#FAFAFA" }}>
                {["Otorgante", "Slug", "Tipo", "Tasas", "Montos", "Sectores", "Status", "Creado"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lenders.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: i < lenders.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {l.logo_url ? (
                        <img src={l.logo_url} alt={l.name} style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 6, border: "1px solid #E2E8F0" }}/>
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: l.primary_color ?? "#1A3A6B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>{l.name[0]}</div>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{l.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <code style={{ fontSize: 11, background: "#F1F5F9", padding: "2px 8px", borderRadius: 5, color: "#475569" }}>{l.slug}</code>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#64748B" }}>{l.tipo_credito ?? "—"}</td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#64748B" }}>
                    {l.tasa_min && l.tasa_max ? `${l.tasa_min}–${l.tasa_max}%` : "—"}
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#64748B" }}>
                    {l.monto_min && l.monto_max ? `${fmt(l.monto_min)}–${fmt(l.monto_max)}` : "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {l.sectores?.slice(0,2).map(s => (
                        <span key={s} style={{ fontSize: 10, background: "#F1F5F9", color: "#475569", padding: "2px 8px", borderRadius: 10 }}>{s}</span>
                      ))}
                      {(l.sectores?.length ?? 0) > 2 && (
                        <span style={{ fontSize: 10, color: "#94A3B8" }}>+{(l.sectores?.length ?? 0) - 2}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: l.active ? "#ECFDF5" : "#F8FAFC", color: l.active ? "#059669" : "#94A3B8", border: `1px solid ${l.active ? "#A7F3D0" : "#E2E8F0"}` }}>
                      {l.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: "#94A3B8" }}>{timeAgo(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* APPLICANTS TABLE */}
      {view === "applicants" && (
        <>
          {/* Filtros */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <select style={inp} value={filterLender} onChange={e => setFilterLender(e.target.value)}>
              <option value="">Todos los otorgantes</option>
              {lenders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select style={inp} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos los status</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span style={{ fontSize: 12, color: "#94A3B8", alignSelf: "center" }}>
              {filteredApplicants.length} resultado{filteredApplicants.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #F1F5F9", background: "#FAFAFA" }}>
                  {["Solicitante", "Otorgante", "Status", "Registrado"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredApplicants.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Sin resultados</td></tr>
                ) : filteredApplicants.map((app, i) => {
                  const s = STATUS[app.status] ?? STATUS.draft
                  return (
                    <tr key={app.id} style={{ borderBottom: i < filteredApplicants.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                      <td style={{ padding: "13px 16px" }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{app.full_name ?? "—"}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8" }}>{app.email ?? "—"}</p>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        {app.onb_lenders ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: app.onb_lenders.primary_color, flexShrink: 0 }}/>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{app.onb_lenders.name}</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: s.bg, fontSize: 11, fontWeight: 600, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "#64748B" }}>{timeAgo(app.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
