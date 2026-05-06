"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Applicant = Record<string, unknown>;

const STATUS_META: Record<string, { emoji: string; label: string; bg: string; color: string; border: string }> = {
  submitted:       { emoji: "📥", label: "Enviada",       bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0" },
  pre_approved:    { emoji: "🟢", label: "Pre-aprobada",  bg: "#F0FDF9", color: "#065F46", border: "#A7F3D0" },
  pending_review:  { emoji: "🟡", label: "Revisión",      bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  in_review:       { emoji: "🔵", label: "En revisión",   bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
  docs_requested:  { emoji: "📄", label: "Docs pedidos",  bg: "#FDF4FF", color: "#7E22CE", border: "#E9D5FF" },
  approved:        { emoji: "✅", label: "Aprobada",      bg: "#ECFDF5", color: "#047857", border: "#6EE7B7" },
  rejected:        { emoji: "❌", label: "Rechazada",     bg: "#FFF1F2", color: "#9F1239", border: "#FECDD3" },
  abandoned:       { emoji: "⚫", label: "Abandonada",    bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" },
};

const VALID_STATUSES = ["submitted", "pre_approved", "pending_review", "in_review", "docs_requested", "approved", "rejected", "abandoned"];

function ago(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function fmtMoney(n: unknown): string {
  const num = Number(n);
  if (isNaN(num) || !num) return "—";
  return "$" + num.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

const SECTIONS: { title: string; fields: { key: string; label: string }[] }[] = [
  { title: "Información básica", fields: [{ key: "razon_social", label: "Razón social" }, { key: "rfc_empresa", label: "RFC" }, { key: "sector", label: "Sector" }, { key: "antiguedad_anos", label: "Antigüedad (años)" }] },
  { title: "Datos fiscales", fields: [{ key: "regimen_fiscal", label: "Régimen fiscal" }, { key: "estado", label: "Estado" }, { key: "cp_fiscal", label: "C.P." }, { key: "email_cfdi", label: "Email CFDI" }] },
  { title: "Información del negocio", fields: [{ key: "ventas_rango", label: "Ventas anuales" }, { key: "monto_solicitado_mxn", label: "Monto solicitado" }, { key: "plazo_meses", label: "Plazo (meses)" }, { key: "destino_credito", label: "Destino" }] },
  { title: "Contacto", fields: [{ key: "nombre_rep_legal", label: "Rep. legal" }, { key: "email_rep_legal", label: "Email" }, { key: "telefono_rep_legal", label: "Teléfono" }, { key: "cargo", label: "Cargo" }] },
];

export default function ApplicantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [app, setApp] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [token, setToken] = useState("");

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setToken(session.access_token);
    const res = await fetch(`/api/onb-applicants/admin/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!res.ok) { setLoading(false); return; }
    const j = await res.json();
    setApp(j.applicant);
    setNewStatus((j.applicant?.status as string) ?? "");
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function changeStatus() {
    if (!newStatus || newStatus === app?.status) return;
    setSaving(true);
    await fetch(`/api/onb-applicants/admin/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "status", status: newStatus, reason }),
    });
    setSaving(false); setReason(""); load(); flash("Status actualizado");
  }

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true);
    await fetch(`/api/onb-applicants/admin/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "note", note }),
    });
    setSaving(false); setNote(""); load(); flash("Nota agregada");
  }

  if (loading) return <div style={{ padding: 40, color: "#94A3B8", fontFamily: "'Geist',sans-serif" }}>Cargando...</div>;
  if (!app) return <div style={{ padding: 40, color: "#94A3B8", fontFamily: "'Geist',sans-serif" }}>No encontrado</div>;

  const data = (app.data ?? {}) as Record<string, unknown>;
  const sm = STATUS_META[app.status as string] ?? STATUS_META.submitted;
  const failedRules = Array.isArray(app.failed_rules) ? app.failed_rules : [];
  const history = Array.isArray(app.status_history) ? app.status_history : [];
  const notes = (app.internal_notes as string) ?? "";

  const S = {
    card: { background: "#fff", border: "1px solid #E8EDF5", borderRadius: 12, padding: "18px 22px", marginBottom: 14 } as React.CSSProperties,
    label: { fontSize: 11, fontWeight: 600 as const, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: ".05em", marginBottom: 4 } as React.CSSProperties,
    inp: { width: "100%", height: 38, borderRadius: 8, border: "1.5px solid #E2E8F0", padding: "0 12px", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#0F172A", outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
    btn: { height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: "#0C1E4A", color: "#fff", fontSize: 13, fontWeight: 700 as const, cursor: "pointer", fontFamily: "'Geist',sans-serif" } as React.CSSProperties,
  };

  return (
    <div style={{ fontFamily: "'Geist', sans-serif", color: "#0F172A" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');`}</style>
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, padding: "11px 16px", background: "#fff", border: "1px solid #D1FAE5", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#065F46", boxShadow: "0 8px 32px rgba(0,0,0,.1)" }}>{toast}</div>}

      {/* Back */}
      <button onClick={() => router.push("/dashboard/onboarding/applicants")} style={{ background: "none", border: "none", color: "#64748B", fontSize: 13, cursor: "pointer", fontFamily: "'Geist',sans-serif", marginBottom: 16, padding: 0 }}>
        ← Volver a applicants
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em" }}>{(data.razon_social as string) ?? app.full_name ?? "Applicant"}</h1>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Geist Mono',monospace", background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 999, padding: "3px 10px" }}>{sm.emoji} {sm.label}</span>
      </div>
      <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 24 }}>Recibido {ago(app.created_at as string)} · {String(app.email ?? "—")}</div>

      {/* 2 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }}>
        {/* LEFT — Data */}
        <div>
          {SECTIONS.map(s => (
            <div key={s.title} style={S.card}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".04em" }}>{s.title}</div>
              {s.fields.map(f => (
                <div key={f.key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F8FAFC" }}>
                  <span style={{ fontSize: 13, color: "#64748B" }}>{f.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", textAlign: "right", maxWidth: "55%" }}>
                    {f.key === "monto_solicitado_mxn" ? fmtMoney(data[f.key]) : String(data[f.key] ?? "—")}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* RIGHT — Actions */}
        <div>
          {/* Change status */}
          <div style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Cambiar status</div>
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ ...S.inp, cursor: "pointer", marginBottom: 8 }}>
              {VALID_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.emoji} {STATUS_META[s]?.label ?? s}</option>)}
            </select>
            <input placeholder="Razón (opcional)" value={reason} onChange={e => setReason(e.target.value)} style={{ ...S.inp, marginBottom: 10 }} />
            <button style={{ ...S.btn, width: "100%", opacity: saving || newStatus === app.status ? 0.5 : 1 }} disabled={saving || newStatus === (app.status as string)} onClick={changeStatus}>
              {saving ? "Guardando..." : "Guardar cambio"}
            </button>
          </div>

          {/* Failed rules */}
          {failedRules.length > 0 && (
            <div style={{ ...S.card, background: "#FFFBEB", borderColor: "#FDE68A" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>Reglas no cumplidas</div>
              {failedRules.map((r: { field?: string; message?: string }, i: number) => (
                <div key={i} style={{ fontSize: 12, color: "#78350F", lineHeight: 1.6, marginBottom: 4 }}>⚠️ {(r as { message?: string }).message ?? String(r)}</div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Notas internas</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input placeholder="Agregar nota..." value={note} onChange={e => setNote(e.target.value)} style={{ ...S.inp, flex: 1 }} onKeyDown={e => e.key === "Enter" && addNote()} />
              <button style={{ ...S.btn, padding: "0 14px" }} onClick={addNote} disabled={saving}>+</button>
            </div>
            {notes ? (
              <div style={{ fontSize: 12, color: "#475569", whiteSpace: "pre-wrap", lineHeight: 1.7, background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", maxHeight: 200, overflowY: "auto" }}>{notes}</div>
            ) : (
              <div style={{ fontSize: 12, color: "#94A3B8" }}>Sin notas aún</div>
            )}
          </div>

          {/* Timeline */}
          <div style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Timeline</div>
            {history.length === 0 && <div style={{ fontSize: 12, color: "#94A3B8" }}>Sin historial</div>}
            {(history as { from: string; to: string; by: string; at: string; reason?: string }[]).map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#CBD5E1", marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ color: "#0F172A" }}>
                    <strong>{h.from}</strong> → <strong>{h.to}</strong>
                    <span style={{ color: "#94A3B8", marginLeft: 6 }}>por {h.by === "system" ? "sistema" : h.by?.slice(0, 8)}</span>
                  </div>
                  <div style={{ color: "#94A3B8" }}>{new Date(h.at).toLocaleString("es-MX")}</div>
                  {h.reason && <div style={{ color: "#64748B", fontStyle: "italic" }}>Razón: {h.reason}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
