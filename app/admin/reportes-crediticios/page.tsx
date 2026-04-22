"use client";

import React, { useEffect, useState } from "react";

type Reporte = {
  id: string;
  client_id: string;
  lender_user_id: string;
  lender_email: string;
  estado: string;
  score: number | null;
  solicitado_at: string;
  procesado_at: string | null;
  completado_at: string | null;
  reporte_pdf_url: string | null;
  reporte_pdf_filename: string | null;
  admin_notas: string | null;
  lender_notas: string | null;
  periodo_mes: string;
  clients: { company_name: string; rfc: string; sector: string | null; rep_legal_nombre: string | null };
};

type Tab = "pendiente" | "procesando" | "completado" | "todos";

const ESTADO_S: Record<string, { bg: string; color: string; border: string; label: string }> = {
  pendiente:  { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A", label: "Pendiente" },
  procesando: { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE", label: "Procesando" },
  completado: { bg: "#F0FDF9", color: "#065F46", border: "#A7F3D0", label: "Completado" },
  cancelado:  { bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0", label: "Cancelado" },
};

const adminSecret = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "") : "";

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret, ...(opts?.headers ?? {}) } });
  return res;
}

function ago(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `hace ${Math.floor(ms / 60000)}m`;
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function ReportesCrediticiosAdmin() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pendiente");
  const [selected, setSelected] = useState<Reporte | null>(null);
  const [editState, setEditState] = useState("");
  const [editScore, setEditScore] = useState("");
  const [editNotas, setEditNotas] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const res = await api("/api/admin/reportes-crediticios");
    if (res.ok) { const j = await res.json(); setReportes(j.reportes ?? []); }
    setLoading(false);
  }

  useEffect(() => { load(); const iv = setInterval(load, 60000); return () => clearInterval(iv); }, []);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 3500); }

  function openDetail(r: Reporte) {
    setSelected(r);
    setEditState(r.estado);
    setEditScore(r.score != null ? String(r.score) : "");
    setEditNotas(r.admin_notas ?? "");
    setPendingFile(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.type !== "application/pdf") {
      showToast("Solo se aceptan archivos PDF");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("El archivo no puede exceder 10 MB");
      e.target.value = "";
      return;
    }
    setPendingFile(file);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);

    // Step 1: Upload PDF if one is selected
    if (pendingFile) {
      setSavingLabel("Subiendo PDF...");
      const fd = new FormData();
      fd.append("file", pendingFile);
      const uploadRes = await fetch(`/api/admin/reportes-crediticios/${selected.id}`, {
        method: "POST",
        headers: { "x-admin-secret": adminSecret },
        body: fd,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Error subiendo PDF" }));
        showToast(err.error ?? "Error subiendo PDF");
        setSaving(false);
        setSavingLabel("");
        return; // Do NOT continue to PATCH if upload fails
      }
    }

    // Step 2: PATCH metadata (estado, score, notas)
    setSavingLabel("Guardando...");
    const body: Record<string, any> = { estado: editState };
    if (editScore) body.score = Number(editScore);
    if (editNotas) body.admin_notas = editNotas;

    const patchRes = await api(`/api/admin/reportes-crediticios/${selected.id}`, { method: "PATCH", body: JSON.stringify(body) });
    if (!patchRes.ok) {
      showToast("Error guardando cambios");
      setSaving(false);
      setSavingLabel("");
      return;
    }

    setSaving(false);
    setSavingLabel("");
    setPendingFile(null);
    setSelected(null);
    load();
    showToast("Reporte actualizado");
  }

  const filtered = tab === "todos" ? reportes : reportes.filter(r => r.estado === tab);
  const pendientes = reportes.filter(r => r.estado === "pendiente").length;

  const S = {
    page: { fontFamily: "'Geist',sans-serif", color: "#0F172A", padding: "32px 40px", maxWidth: 1100, margin: "0 auto" } as React.CSSProperties,
    card: { background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, overflow: "hidden" } as React.CSSProperties,
    tab: (a: boolean) => ({ padding: "7px 14px", borderRadius: 9, border: "1.5px solid", fontSize: 12, fontWeight: a ? 700 : 500, cursor: "pointer", fontFamily: "'Geist',sans-serif", background: a ? "#0C1E4A" : "#fff", color: a ? "#fff" : "#64748B", borderColor: a ? "#0C1E4A" : "#E2E8F0" }) as React.CSSProperties,
    inp: { width: "100%", height: 38, borderRadius: 9, border: "1.5px solid #E2E8F0", padding: "0 12px", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#0F172A", background: "#F8FAFC", outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
    overlay: { position: "fixed" as const, inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", justifyContent: "flex-end" } as React.CSSProperties,
    drawer: { width: 560, maxWidth: "90vw", height: "100vh", background: "#fff", overflowY: "auto" as const, boxShadow: "-8px 0 40px rgba(15,23,42,.15)", padding: "28px 32px" } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500&display=swap');`}</style>
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, padding: "11px 16px", background: "#fff", border: "1px solid #D1FAE5", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#065F46", boxShadow: "0 8px 32px rgba(0,0,0,.1)" }}>{toast}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Reportes Crediticios</h1>
          <p style={{ fontSize: 13, color: "#64748B" }}>{pendientes > 0 ? `${pendientes} pendiente${pendientes > 1 ? "s" : ""} de procesar` : "Todos procesados"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["pendiente","procesando","completado","todos"] as Tab[]).map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
            {t === "todos" ? "Todos" : ESTADO_S[t]?.label ?? t}
            {t === "pendiente" && pendientes > 0 && <span style={{ marginLeft: 6, background: "#EF4444", color: "#fff", borderRadius: 999, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{pendientes}</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={S.card}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 160px 90px 130px 1fr 60px", padding: "10px 16px", background: "#FAFBFF", borderBottom: "1px solid #E8EDF5" }}>
          {["Solicitado","Cliente","Lender","Estado","Score","Notas lender",""].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono',monospace", letterSpacing: ".06em", textTransform: "uppercase" }}>{h}</div>
          ))}
        </div>

        {loading && <div style={{ padding: "40px 16px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Cargando...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: "48px 16px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Sin reportes {tab !== "todos" ? ESTADO_S[tab]?.label.toLowerCase() + "s" : ""}</div>
        )}

        {!loading && filtered.map(r => {
          const st = ESTADO_S[r.estado] ?? ESTADO_S.pendiente;
          return (
            <div key={r.id} onClick={() => openDetail(r)} style={{ display: "grid", gridTemplateColumns: "110px 1fr 160px 90px 130px 1fr 60px", padding: "12px 16px", borderBottom: "1px solid #F8FAFC", alignItems: "center", cursor: "pointer", transition: "background .12s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#FAFBFF")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{ago(r.solicitado_at)}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.clients?.company_name}</div>
                <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "'Geist Mono',monospace" }}>{r.clients?.rfc}</div>
              </div>
              <div style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lender_email}</div>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Geist Mono',monospace", background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 999, padding: "3px 8px", letterSpacing: ".04em", justifySelf: "start" }}>{st.label}</span>
              <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Geist Mono',monospace", color: r.score ? (r.score >= 700 ? "#059669" : r.score >= 500 ? "#F59E0B" : "#EF4444") : "#CBD5E1" }}>{r.score ?? "—"}</div>
              <div style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lender_notas ?? "—"}</div>
              <div style={{ fontSize: 11, color: "#3B82F6", fontWeight: 600, cursor: "pointer" }}>Ver</div>
            </div>
          );
        })}
      </div>

      {/* Drawer */}
      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.drawer} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em" }}>{selected.clients?.company_name}</h2>
                <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'Geist Mono',monospace", marginTop: 4 }}>{selected.clients?.rfc} &middot; {selected.lender_email}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4 }}>
                <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
              </button>
            </div>

            {/* Client info */}
            <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "14px 18px", marginBottom: 20, fontSize: 12, color: "#64748B", lineHeight: 1.8 }}>
              <div><strong>Sector:</strong> {selected.clients?.sector ?? "—"}</div>
              <div><strong>Rep. legal:</strong> {selected.clients?.rep_legal_nombre ?? "—"}</div>
              <div><strong>Solicitado:</strong> {new Date(selected.solicitado_at).toLocaleString("es-MX")}</div>
              <div><strong>Periodo:</strong> {selected.periodo_mes}</div>
              {selected.lender_notas && <div style={{ marginTop: 8, padding: "8px 12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8 }}><strong>Notas del lender:</strong> {selected.lender_notas}</div>}
            </div>

            {/* Edit form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Estado</label>
                <select value={editState} onChange={e => setEditState(e.target.value)} style={{ ...S.inp, cursor: "pointer" }}>
                  {["pendiente","procesando","completado","cancelado"].map(s => <option key={s} value={s}>{ESTADO_S[s]?.label ?? s}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Score (300-900)</label>
                <input type="number" min={300} max={900} value={editScore} onChange={e => setEditScore(e.target.value)} style={{ ...S.inp, fontFamily: "'Geist Mono',monospace" }} placeholder="Ej: 680" />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>
                  PDF del reporte {selected.reporte_pdf_filename && !pendingFile && <span style={{ color: "#059669", fontWeight: 400 }}>({selected.reporte_pdf_filename})</span>}
                </label>
                <input type="file" accept=".pdf" onChange={handleFileSelect} disabled={saving} style={{ fontSize: 12 }} />
                {pendingFile && (
                  <div style={{ fontSize: 11, color: "#1E40AF", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="#1E40AF" strokeWidth="1.4" strokeLinecap="round"><path d="M4 2h5l3 3v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M9 2v3h3"/></svg>
                    {pendingFile.name} ({(pendingFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Notas internas (admin)</label>
                <textarea value={editNotas} onChange={e => setEditNotas(e.target.value)} rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid #E2E8F0", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#0F172A", background: "#F8FAFC", outline: "none", resize: "vertical", boxSizing: "border-box" }} placeholder="Notas internas sobre este reporte..." />
              </div>

              <button onClick={save} disabled={saving} style={{ height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#0C1E4A,#1B3F8A)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'Geist',sans-serif", opacity: saving ? 0.6 : 1 }}>
                {saving ? savingLabel || "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
