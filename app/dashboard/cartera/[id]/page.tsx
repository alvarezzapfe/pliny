"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { Credito, CreditoEstatus } from "@/lib/cartera-gestion/types";

const MONO = "'Geist Mono', monospace";

const ESTATUS_BADGES: Record<CreditoEstatus, { bg: string; fg: string; dot: string; label: string }> = {
  vigente:   { bg: "#ECFDF5", fg: "#065F46", dot: "#10B981", label: "Vigente" },
  mora_30:   { bg: "#FFFBEB", fg: "#92400E", dot: "#F59E0B", label: "Mora 30" },
  mora_60:   { bg: "#FFF7ED", fg: "#9A3412", dot: "#F97316", label: "Mora 60" },
  mora_90:   { bg: "#FEF2F2", fg: "#991B1B", dot: "#DC2626", label: "Mora 90" },
  liquidado: { bg: "#F1F5F9", fg: "#475569", dot: "#94A3B8", label: "Liquidado" },
  castigado: { bg: "#FEF2F2", fg: "#7F1D1D", dot: "#7F1D1D", label: "Castigado" },
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(2) + "%";
}
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return s.split("T")[0];
}
function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("es-MX", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function CreditoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [credito, setCredito] = useState<Credito | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [creditoId, setCreditoId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setCreditoId(p.id));
  }, [params]);

  async function load() {
    if (!creditoId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("No hay sesión activa"); return; }
      const res = await fetch(`/api/cartera/${creditoId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 404) { setError("Crédito no encontrado"); return; }
      if (!res.ok) { setError("Error al cargar el crédito"); return; }
      const json = await res.json();
      setCredito(json.credito);
    } catch (e) {
      console.error("[CreditoDetail] load", e);
      setError("Error al cargar el crédito");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (creditoId) load(); }, [creditoId]);

  async function handleDelete() {
    if (!credito) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/cartera/${credito.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        router.push("/dashboard/cartera");
      }
    } catch (e) {
      console.error("[CreditoDetail] delete", e);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        <div style={{ height: 120, marginBottom: 16, borderRadius: 12, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 240, borderRadius: 12, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !credito) {
    return (
      <div style={{ padding: 64, textAlign: "center" }}>
        <div style={{ fontSize: 16, color: "#0F172A", marginBottom: 16, fontWeight: 600 }}>
          {error || "Crédito no encontrado"}
        </div>
        <Link href="/dashboard/cartera" style={{
          display: "inline-block", padding: "10px 20px",
          background: "#0C1E4A", color: "#FFF", borderRadius: 8,
          fontSize: 13, fontWeight: 600, textDecoration: "none",
        }}>Volver a Cartera</Link>
      </div>
    );
  }

  const badge = ESTATUS_BADGES[credito.estatus] || ESTATUS_BADGES.vigente;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 12, color: "#64748B" }}>
        <Link href="/dashboard/cartera" style={{ color: "#64748B", textDecoration: "none" }}>← Cartera</Link>
        <span>·</span>
        <span style={{ color: "#0F172A", fontFamily: MONO, fontWeight: 600 }}>{credito.folio}</span>
      </div>

      {/* Header Card */}
      <div style={{
        background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 28, marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontFamily: MONO, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em" }}>
                {credito.folio}
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 100,
                background: badge.bg, color: badge.fg,
                fontSize: 11, fontWeight: 600,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot }} />
                {badge.label}
              </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", marginBottom: 4, letterSpacing: "-0.01em" }}>
              {credito.deudor}
            </div>
            <div style={{ fontSize: 13, color: "#64748B", fontFamily: MONO }}>
              {credito.rfc || "Sin RFC"} · {credito.tipo_credito}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              disabled
              title="Disponible en el siguiente release"
              style={{
                padding: "8px 16px", borderRadius: 8,
                border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#94A3B8",
                fontSize: 13, fontWeight: 600, cursor: "not-allowed",
              }}>
              Editar
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: "8px 16px", borderRadius: 8,
                border: "1px solid #FECACA", background: "#FFFFFF", color: "#DC2626",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Grid 2×2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Características Financieras */}
        <div style={CARD}>
          <div style={SECTION_TITLE}>CARACTERÍSTICAS FINANCIERAS</div>
          <Field label="Monto original" value={fmtMoney(credito.monto_original)} mono />
          <Field label="Saldo actual" value={fmtMoney(credito.saldo_actual)} mono />
          <Field label="Tasa anual" value={fmtPct(credito.tasa_anual)} mono />
          <Field label="Plazo" value={credito.plazo_meses ? `${credito.plazo_meses} meses` : "—"} mono />
          <Field label="Amortiza" value={credito.amortiza || "—"} />
          <Field label="Fecha inicio" value={fmtDate(credito.fecha_inicio)} mono />
          <Field label="Vencimiento" value={fmtDate(credito.fecha_vencimiento)} mono />
          <Field label="Último pago" value={fmtDate(credito.ultimo_pago)} mono />
          <Field
            label="DPD"
            value={String(credito.dpd ?? 0)}
            valueColor={(credito.dpd ?? 0) > 0 ? "#DC2626" : "#0F172A"}
            mono
          />
        </div>

        {/* Métricas de Valuación */}
        <div style={CARD}>
          <div style={SECTION_TITLE}>MÉTRICAS DE VALUACIÓN</div>
          <Field label="NPV" value={fmtMoney(credito.npv_mxn)} mono />
          <Field label="Duration mod." value={credito.duration_modified != null ? `${credito.duration_modified.toFixed(2)}y` : "—"} mono />
          <Field label="YTM" value={fmtPct(credito.ytm ? credito.ytm * 100 : null)} mono />
          <Field label="Expected Loss" value={fmtMoney(credito.expected_loss_mxn)} mono />
          <Field label="Última valuación" value={fmtDateTime(credito.last_valuation_at)} mono />

          {credito.npv_mxn == null && (
            <div style={{
              marginTop: 16, padding: "12px 16px",
              background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8,
              fontSize: 12, color: "#9A3412",
            }}>
              Este crédito no ha sido valuado. Las métricas se calculan desde la Calculadora.
            </div>
          )}
        </div>

        {/* Datos Generales */}
        <div style={CARD}>
          <div style={SECTION_TITLE}>DATOS GENERALES</div>
          <Field label="Sector" value={credito.sector || "—"} />
          <Field label="Garantía" value={credito.garantia || "Sin garantía"} />
          <Field label="RFC" value={credito.rfc || "—"} mono />
          <Field label="Notas" value={credito.notas || "—"} />
        </div>

        {/* Historial */}
        <div style={CARD}>
          <div style={SECTION_TITLE}>HISTORIAL</div>
          <Field label="Creado" value={fmtDateTime(credito.created_at)} mono />
          <Field label="Actualizado" value={fmtDateTime(credito.updated_at)} mono />
          <Field label="Fuente" value={credito.fuente || "—"} />
          <Field label="ID interno" value={credito.id.slice(0, 8) + "..."} mono valueColor="#94A3B8" />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "grid", placeItems: "center", zIndex: 1000,
        }} onClick={() => setShowDeleteConfirm(false)}>
          <div style={{
            background: "#FFFFFF", borderRadius: 12, padding: 24,
            maxWidth: 400, width: "90%",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
              ¿Eliminar este crédito?
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
              Vas a eliminar permanentemente el crédito <strong>{credito.folio}</strong> ({credito.deudor}).
              Esta acción no se puede deshacer.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A",
                  fontSize: 13, fontWeight: 600, cursor: deleting ? "wait" : "pointer",
                }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                style={{
                  padding: "8px 16px", borderRadius: 8,
                  border: "none", background: "#DC2626", color: "#FFFFFF",
                  fontSize: 13, fontWeight: 600, cursor: deleting ? "wait" : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}>{deleting ? "Eliminando..." : "Eliminar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CARD: React.CSSProperties = {
  background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24,
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#94A3B8",
  letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 16,
  fontFamily: "'Geist Mono', monospace",
};

function Field({ label, value, mono, valueColor }: {
  label: string; value: string; mono?: boolean; valueColor?: string;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: "1px solid #F1F5F9",
      fontSize: 13,
    }}>
      <span style={{ color: "#64748B" }}>{label}</span>
      <span style={{
        color: valueColor || "#0F172A",
        fontFamily: mono ? "'Geist Mono', monospace" : "'Geist', sans-serif",
        fontWeight: 600,
      }}>{value}</span>
    </div>
  );
}
