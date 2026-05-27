"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const MONO = "'Geist Mono', monospace";

const CARD: React.CSSProperties = {
  background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, marginBottom: 16,
};
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

type Lender = {
  id: string; slug: string; name: string; logo_url: string | null;
  primary_color: string | null; secondary_color: string | null;
  descripcion: string | null; tasa_min: number | null; tasa_max: number | null;
  monto_min: number | null; monto_max: number | null;
  sectores: string[] | null; tipo_credito: string | null; active: boolean;
  webhook_url: string | null;
};

export default function PortalConfigPage() {
  const [lender, setLender] = useState<Lender | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0C1E4A");
  const [secondaryColor, setSecondaryColor] = useState("#00E5A0");
  const [tasaMin, setTasaMin] = useState("");
  const [tasaMax, setTasaMax] = useState("");
  const [montoMin, setMontoMin] = useState("");
  const [montoMax, setMontoMax] = useState("");
  const [sectores, setSectores] = useState("");
  const [tipoCredito, setTipoCredito] = useState("");
  const [active, setActive] = useState(true);

  async function fetchLender() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const res = await fetch("/api/onb-lenders/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    if (!res.ok) { setLoading(false); return; }

    const { lender: l } = await res.json();
    setLender(l);
    setName(l.name || "");
    setDescripcion(l.descripcion || "");
    setPrimaryColor(l.primary_color || "#0C1E4A");
    setSecondaryColor(l.secondary_color || "#00E5A0");
    setTasaMin(l.tasa_min != null ? String(l.tasa_min) : "");
    setTasaMax(l.tasa_max != null ? String(l.tasa_max) : "");
    setMontoMin(l.monto_min != null ? String(l.monto_min) : "");
    setMontoMax(l.monto_max != null ? String(l.monto_max) : "");
    setSectores(Array.isArray(l.sectores) ? l.sectores.join(", ") : "");
    setTipoCredito(l.tipo_credito || "");
    setActive(l.active);
    setLoading(false);
  }

  useEffect(() => { fetchLender(); }, []);

  async function handleSave() {
    if (!lender) return;
    setSaving(true);
    setToast(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const payload: Record<string, unknown> = { name, active };
    if (descripcion) payload.descripcion = descripcion; else payload.descripcion = null;
    payload.primary_color = primaryColor;
    payload.secondary_color = secondaryColor;
    if (tasaMin) payload.tasa_min = parseFloat(tasaMin); else payload.tasa_min = null;
    if (tasaMax) payload.tasa_max = parseFloat(tasaMax); else payload.tasa_max = null;
    if (montoMin) payload.monto_min = parseFloat(montoMin); else payload.monto_min = null;
    if (montoMax) payload.monto_max = parseFloat(montoMax); else payload.monto_max = null;
    if (sectores.trim()) payload.sectores = sectores.split(",").map(s => s.trim()).filter(Boolean);
    else payload.sectores = null;
    if (tipoCredito.trim()) payload.tipo_credito = tipoCredito.trim(); else payload.tipo_credito = null;

    const res = await fetch("/api/onb-lenders/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      setLender(data.lender);
      setToast("Cambios guardados");
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast(`Error: ${data.error}`);
    }
    setSaving(false);
  }

  function copyLink() {
    if (!lender) return;
    navigator.clipboard.writeText(`https://plinius.mx/onboarding/${lender.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        <div style={{ height: 100, borderRadius: 12, marginBottom: 16, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ height: 400, borderRadius: 12, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ fontFamily: "'Geist', sans-serif", color: "#0F172A" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 8 }}>Portal de Onboarding</h1>
        <div style={{ ...CARD, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>
            No tienes un portal configurado
          </div>
          <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>
            Contacta a soporte para activar tu portal de onboarding white-label.
          </div>
        </div>
      </div>
    );
  }

  if (!lender) return null;

  const portalUrl = `https://plinius.mx/onboarding/${lender.slug}`;

  return (
    <div style={{ fontFamily: "'Geist', sans-serif", color: "#0F172A", maxWidth: 900 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 1100,
          padding: "12px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: toast.startsWith("Error") ? "#FEF2F2" : "#ECFDF5",
          color: toast.startsWith("Error") ? "#991B1B" : "#065F46",
          border: `1px solid ${toast.startsWith("Error") ? "#FECACA" : "#A7F3D0"}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}>{toast}</div>
      )}

      <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", marginBottom: 6 }}>Portal de Onboarding</h1>
      <p style={{ fontSize: 12, color: "#64748B", marginBottom: 24 }}>Configura tu portal white-label de captación de prospectos.</p>

      {/* ── TU LINK ── */}
      <div style={{
        ...CARD, padding: 28,
        background: "linear-gradient(135deg, #F0FDF9 0%, #ECFDF5 100%)",
        border: "1px solid #A7F3D0",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#065F46", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 12 }}>
          Tu link de portal
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 12,
          padding: "10px 14px", background: "#FFFFFF", border: "1px solid #D1FAE5",
          borderRadius: 8,
        }}>
          <code style={{ flex: 1, fontSize: 13, fontFamily: MONO, color: "#065F46", wordBreak: "break-all" as const }}>
            {portalUrl}
          </code>
          <button onClick={copyLink} style={{
            padding: "6px 14px", borderRadius: 6, border: "1px solid #10B981",
            background: "#FFFFFF", color: "#065F46", fontSize: 12, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap" as const, fontFamily: "'Geist', sans-serif",
          }}>{copied ? "Copiado" : "Copiar link"}</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 12, color: "#065F46", textDecoration: "none", fontWeight: 600,
          }}>Abrir portal ↗</a>
        </div>
        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 10 }}>
          Comparte este link con tus prospectos para que soliciten crédito directamente en tu portal.
        </div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6, fontFamily: MONO }}>
          Slug: <strong>{lender.slug}</strong> (no editable)
        </div>
      </div>

      {/* ── MINI PREVIEW ── */}
      <div style={CARD}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 12 }}>
          Preview del portal
        </div>
        <div style={{
          borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0",
        }}>
          <div style={{
            height: 48, background: primaryColor,
            display: "flex", alignItems: "center", padding: "0 16px", gap: 10,
          }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.2)" }} />
            <span style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 700 }}>{name || "Tu Portal"}</span>
          </div>
          <div style={{ padding: 16, background: "#FAFBFC" }}>
            <div style={{ height: 8, width: "60%", borderRadius: 4, background: secondaryColor, opacity: 0.6, marginBottom: 8 }} />
            <div style={{ height: 6, width: "80%", borderRadius: 4, background: "#E2E8F0", marginBottom: 6 }} />
            <div style={{ height: 6, width: "45%", borderRadius: 4, background: "#E2E8F0" }} />
          </div>
        </div>
      </div>

      {/* ── FORM ── */}
      <div style={CARD}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 20 }}>
          Configuración
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Nombre del portal</label>
          <input value={name} onChange={e => setName(e.target.value)} style={INPUT} placeholder="Mi Financiera" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Descripción</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
            rows={3} placeholder="Breve descripción de tu oferta crediticia..."
            style={{ ...INPUT, height: "auto", minHeight: 72, padding: "10px 12px", resize: "vertical" as const }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={LABEL}>Color primario</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                style={{ width: 38, height: 38, border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer", padding: 2 }} />
              <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                style={{ ...INPUT, fontFamily: MONO, fontSize: 12 }} />
            </div>
          </div>
          <div>
            <label style={LABEL}>Color secundario</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                style={{ width: 38, height: 38, border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer", padding: 2 }} />
              <input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                style={{ ...INPUT, fontFamily: MONO, fontSize: 12 }} />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={LABEL}>Tasa mínima (%)</label>
            <input type="number" value={tasaMin} onChange={e => setTasaMin(e.target.value)}
              placeholder="12" min={0} max={200} step={0.1} style={{ ...INPUT, fontFamily: MONO }} />
          </div>
          <div>
            <label style={LABEL}>Tasa máxima (%)</label>
            <input type="number" value={tasaMax} onChange={e => setTasaMax(e.target.value)}
              placeholder="36" min={0} max={200} step={0.1} style={{ ...INPUT, fontFamily: MONO }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={LABEL}>Monto mínimo (MXN)</label>
            <input type="number" value={montoMin} onChange={e => setMontoMin(e.target.value)}
              placeholder="500000" min={0} style={{ ...INPUT, fontFamily: MONO }} />
          </div>
          <div>
            <label style={LABEL}>Monto máximo (MXN)</label>
            <input type="number" value={montoMax} onChange={e => setMontoMax(e.target.value)}
              placeholder="50000000" min={0} style={{ ...INPUT, fontFamily: MONO }} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Sectores (separados por coma)</label>
          <input value={sectores} onChange={e => setSectores(e.target.value)}
            placeholder="Manufactura, Comercio, Servicios" style={INPUT} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Tipo de crédito</label>
          <input value={tipoCredito} onChange={e => setTipoCredito(e.target.value)}
            placeholder="Crédito simple, Arrendamiento, Factoraje" style={INPUT} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={LABEL}>Portal activo</label>
          <button onClick={() => setActive(!active)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 14px",
            borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF",
            cursor: "pointer", fontSize: 13, fontFamily: "'Geist', sans-serif",
          }}>
            <span style={{
              width: 36, height: 20, borderRadius: 10, padding: 2,
              background: active ? "#10B981" : "#D1D5DB", transition: "background .2s",
              display: "flex", alignItems: "center",
            }}>
              <span style={{
                width: 16, height: 16, borderRadius: "50%", background: "#FFFFFF",
                transform: active ? "translateX(16px)" : "translateX(0)",
                transition: "transform .2s", boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }} />
            </span>
            <span style={{ color: active ? "#065F46" : "#6B7280", fontWeight: 600 }}>
              {active ? "Activo" : "Inactivo"}
            </span>
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "10px 24px", borderRadius: 8, border: "none",
            background: saving ? "#94A3B8" : "linear-gradient(135deg, #0C1E4A, #1B3F8A)",
            color: "#FFFFFF", fontSize: 13, fontWeight: 600,
            cursor: saving ? "wait" : "pointer", fontFamily: "'Geist', sans-serif",
          }}>{saving ? "Guardando..." : "Guardar cambios"}</button>
        </div>
      </div>
    </div>
  );
}
