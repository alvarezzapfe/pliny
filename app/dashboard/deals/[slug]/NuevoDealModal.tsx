"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DEAL_TYPE_VALUES, DEAL_STAGE_VALUES, DEAL_TYPE_LABELS, DEAL_STAGE_LABELS } from "@/lib/deals/types";
import type { Deal, DealType, DealStage } from "@/lib/deals/types";

const MONO = "'Geist Mono', monospace";

const LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#94A3B8",
  letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6,
};

const INPUT: React.CSSProperties = {
  width: "100%", height: 38, padding: "0 12px",
  fontSize: 14, fontFamily: "'Geist', sans-serif", color: "#0F172A",
  background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8,
  outline: "none", boxSizing: "border-box" as const,
};

interface Props {
  workspaceId: string;
  initialDeal?: Deal;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NuevoDealModal({ workspaceId, initialDeal, onClose, onSuccess }: Props) {
  const isEdit = !!initialDeal;

  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [type, setType] = useState<DealType>("debt");
  const [stage, setStage] = useState<DealStage>("sourcing");
  const [amountMxn, setAmountMxn] = useState("");
  const [targetCloseDate, setTargetCloseDate] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDeal) {
      setName(initialDeal.name);
      setClientName(initialDeal.client_name || "");
      setType(initialDeal.type);
      setStage(initialDeal.stage);
      setAmountMxn(initialDeal.amount_mxn != null ? String(initialDeal.amount_mxn) : "");
      setTargetCloseDate(initialDeal.target_close_date || "");
      setNotes(initialDeal.notes || "");
    }
  }, [initialDeal]);

  async function handleSubmit() {
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    setError(null);
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("No autenticado"); setSaving(false); return; }

      const payload: Record<string, unknown> = {
        name: name.trim(),
        type,
        stage,
      };
      if (clientName.trim()) payload.client_name = clientName.trim();
      else if (isEdit) payload.client_name = null;
      if (amountMxn) payload.amount_mxn = parseFloat(amountMxn);
      else if (isEdit) payload.amount_mxn = null;
      if (targetCloseDate) payload.target_close_date = targetCloseDate;
      else if (isEdit) payload.target_close_date = null;
      if (notes.trim()) payload.notes = notes.trim();
      else if (isEdit) payload.notes = null;

      const url = isEdit
        ? `/api/deals/${initialDeal!.id}`
        : `/api/workspaces/${workspaceId}/deals`;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Error al ${isEdit ? "guardar" : "crear"} deal`);
        setSaving(false);
        return;
      }
      onSuccess();
    } catch (e: any) {
      setError(e?.message || "Error inesperado");
      setSaving(false);
    }
  }

  const canSubmit = name.trim().length >= 2 && !saving;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
      backdropFilter: "blur(2px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#FFFFFF", borderRadius: 12, padding: 28,
        width: 520, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: "0 0 24px 0", letterSpacing: "-0.01em" }}>
          {isEdit ? "Editar deal" : "Nuevo deal"}
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Nombre del deal *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="ej. Emisión Bursátil FEMSA" style={INPUT} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Cliente / Contraparte</label>
          <input value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="ej. FEMSA SAB de CV" style={INPUT} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={LABEL}>Tipo</label>
            <select value={type} onChange={e => setType(e.target.value as DealType)} style={INPUT}>
              {DEAL_TYPE_VALUES.map(t => <option key={t} value={t}>{DEAL_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>{isEdit ? "Stage" : "Stage inicial"}</label>
            <select value={stage} onChange={e => setStage(e.target.value as DealStage)} style={INPUT}>
              {DEAL_STAGE_VALUES.map(s => <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={LABEL}>Monto (MXN)</label>
            <input type="number" value={amountMxn} onChange={e => setAmountMxn(e.target.value)}
              placeholder="50000000" min={0} step={0.01}
              style={{ ...INPUT, fontFamily: MONO }} />
          </div>
          <div>
            <label style={LABEL}>Target close</label>
            <input type="date" value={targetCloseDate} onChange={e => setTargetCloseDate(e.target.value)}
              style={{ ...INPUT, fontFamily: MONO }} />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>Notas</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Contexto, condiciones especiales..."
            rows={3}
            style={{ ...INPUT, height: "auto", minHeight: 72, padding: "10px 12px", resize: "vertical" as const }} />
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", marginBottom: 16,
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
            fontSize: 12, color: "#991B1B",
          }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} disabled={saving} style={{
            padding: "9px 18px", borderRadius: 8,
            border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A",
            fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer",
            fontFamily: "'Geist', sans-serif",
          }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={!canSubmit} style={{
            padding: "9px 20px", borderRadius: 8,
            border: "none",
            background: canSubmit ? "linear-gradient(135deg, #0C1E4A, #1B3F8A)" : "#E2E8F0",
            color: canSubmit ? "#FFFFFF" : "#94A3B8",
            fontSize: 13, fontWeight: 600,
            cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "'Geist', sans-serif",
          }}>{saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear deal"}</button>
        </div>
      </div>
    </div>
  );
}
