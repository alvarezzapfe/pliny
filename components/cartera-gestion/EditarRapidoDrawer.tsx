"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Credito, CreditoEstatus } from "@/lib/cartera-gestion/types";
import { ESTATUS_VALUES } from "@/lib/cartera-gestion/types";

const MONO = "'Geist Mono', monospace";

const ESTATUS_LABELS: Record<CreditoEstatus, string> = {
  vigente: "Vigente",
  mora_30: "Mora 30",
  mora_60: "Mora 60",
  mora_90: "Mora 90",
  liquidado: "Liquidado",
  castigado: "Castigado",
};

const FIELD_LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8",
  letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8,
};

const FIELD_INPUT: React.CSSProperties = {
  width: "100%", height: 38, padding: "0 12px",
  fontSize: 14, color: "#0F172A",
  background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8,
  outline: "none",
};

interface Props {
  credito: Credito | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditarRapidoDrawer({ credito, open, onClose, onSaved }: Props) {
  const [estatus, setEstatus] = useState<CreditoEstatus>("vigente");
  const [dpd, setDpd] = useState("");
  const [saldoActual, setSaldoActual] = useState("");
  const [ultimoPago, setUltimoPago] = useState("");
  const [notas, setNotas] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!credito) return;
    setEstatus(credito.estatus);
    setDpd(String(credito.dpd ?? 0));
    setSaldoActual(String(credito.saldo_actual ?? ""));
    setUltimoPago(credito.ultimo_pago ? credito.ultimo_pago.split("T")[0] : "");
    setNotas(credito.notas || "");
    setError(null);
  }, [credito]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  async function handleSave() {
    if (!credito) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Sin sesión"); return; }

      const payload: Record<string, unknown> = {
        estatus,
        dpd: parseInt(dpd, 10) || 0,
      };
      const saldoNum = parseFloat(saldoActual);
      if (!isNaN(saldoNum) && saldoNum >= 0) payload.saldo_actual = saldoNum;
      if (ultimoPago) payload.ultimo_pago = ultimoPago;
      if (notas !== (credito.notas || "")) payload.notas = notas || null;

      const res = await fetch(`/api/cartera/${credito.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error al guardar");
        return;
      }

      onSaved();
      onClose();
    } catch (e) {
      console.error("[EditarRapidoDrawer] save", e);
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !credito) return null;

  return (
    <>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
          zIndex: 999, animation: "fadeIn .15s ease-out",
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(420px, 92vw)",
        background: "#FFFFFF",
        boxShadow: "-12px 0 32px rgba(15,23,42,0.12)",
        zIndex: 1000,
        display: "flex", flexDirection: "column",
        animation: "slideInRight .2s cubic-bezier(.16,1,.3,1)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #E2E8F0",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 4, letterSpacing: "-0.01em" }}>
              Edición rápida
            </div>
            <div style={{ fontSize: 12, color: "#64748B", fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {credito.folio} · {credito.deudor}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            style={{
              width: 32, height: 32, borderRadius: 8, border: "none",
              background: "#F8FAFC", color: "#64748B",
              fontSize: 18, cursor: "pointer", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
          <div style={{ marginBottom: 20 }}>
            <label style={FIELD_LABEL}>Estatus</label>
            <select value={estatus} onChange={e => setEstatus(e.target.value as CreditoEstatus)}
              style={FIELD_INPUT}>
              {ESTATUS_VALUES.map(s => <option key={s} value={s}>{ESTATUS_LABELS[s]}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={FIELD_LABEL}>DPD (días de mora)</label>
            <input type="number" value={dpd} onChange={e => setDpd(e.target.value)}
              min={0} step={1} placeholder="0"
              style={{ ...FIELD_INPUT, fontFamily: MONO }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={FIELD_LABEL}>Saldo actual (MXN)</label>
            <input type="number" value={saldoActual} onChange={e => setSaldoActual(e.target.value)}
              min={0} step={0.01} placeholder="0"
              style={{ ...FIELD_INPUT, fontFamily: MONO }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={FIELD_LABEL}>Último pago</label>
            <input type="date" value={ultimoPago} onChange={e => setUltimoPago(e.target.value)}
              style={{ ...FIELD_INPUT, fontFamily: MONO }} />
          </div>

          <div>
            <label style={FIELD_LABEL}>Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones (opcional)"
              style={{
                width: "100%", minHeight: 80, padding: "10px 12px",
                fontSize: 13, color: "#0F172A",
                background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8,
                outline: "none", resize: "vertical" as const,
              }} />
          </div>

          {error && (
            <div style={{
              marginTop: 16, padding: "10px 14px",
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
              fontSize: 12, color: "#991B1B",
            }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid #E2E8F0",
          display: "flex", justifyContent: "flex-end", gap: 8,
          background: "#F8FAFC",
        }}>
          <button onClick={onClose} disabled={saving}
            style={{
              padding: "9px 18px", borderRadius: 8,
              border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A",
              fontSize: 13, fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
            }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{
              padding: "9px 20px", borderRadius: 8,
              border: "none", background: "#0C1E4A", color: "#FFFFFF",
              fontSize: 13, fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}
