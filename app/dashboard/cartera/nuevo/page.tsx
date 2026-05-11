"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  TIPO_CREDITO_VALUES, AMORTIZA_VALUES,
  type CreditoTipo, type CreditoAmortiza,
} from "@/lib/cartera-gestion/types";
import { CreditoInputSchema } from "@/lib/cartera-gestion/zod-schema";

const MONO = "'Geist Mono', monospace";

const CARD: React.CSSProperties = {
  background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12,
  padding: 24, marginBottom: 16,
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#94A3B8",
  letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 16,
  fontFamily: MONO,
};

const LABEL: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#475569",
  marginBottom: 6, fontFamily: "'Geist', sans-serif",
};

const INPUT: React.CSSProperties = {
  width: "100%", height: 38, padding: "0 12px",
  fontSize: 14, fontFamily: "'Geist', sans-serif", color: "#0F172A",
  background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8,
  outline: "none", transition: "border-color .12s, box-shadow .12s",
};

const INPUT_MONO: React.CSSProperties = { ...INPUT, fontFamily: MONO };

const TEXTAREA: React.CSSProperties = {
  ...INPUT, height: "auto", minHeight: 72, padding: "10px 12px",
  resize: "vertical" as const,
};

const REQ: React.CSSProperties = { color: "#DC2626" };
const ERROR_MSG: React.CSSProperties = { fontSize: 11, color: "#DC2626", marginTop: 4 };

export default function NuevoCreditoPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [deudor, setDeudor] = useState("");
  const [rfc, setRfc] = useState("");
  const [sector, setSector] = useState("");
  const [tipoCredito, setTipoCredito] = useState<CreditoTipo>("Crédito simple");
  const [montoOriginal, setMontoOriginal] = useState("");
  const [saldoActual, setSaldoActual] = useState("");
  const [tasaAnual, setTasaAnual] = useState("");
  const [plazoMeses, setPlazoMeses] = useState("");
  const [amortiza, setAmortiza] = useState<CreditoAmortiza>("SI");
  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [garantia, setGarantia] = useState("");
  const [notas, setNotas] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleMontoChange(v: string) {
    setMontoOriginal(v);
    if (!saldoActual || saldoActual === montoOriginal) {
      setSaldoActual(v);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    const payload: Record<string, unknown> = {
      deudor: deudor.trim(),
      tipo_credito: tipoCredito,
      monto_original: parseFloat(montoOriginal) || 0,
      saldo_actual: parseFloat(saldoActual) || 0,
    };

    if (rfc.trim()) payload.rfc = rfc.trim().toUpperCase();
    if (sector.trim()) payload.sector = sector.trim();
    if (tasaAnual) payload.tasa_anual = parseFloat(tasaAnual);
    if (plazoMeses) payload.plazo_meses = parseInt(plazoMeses, 10);
    payload.amortiza = amortiza;
    if (fechaInicio) payload.fecha_inicio = fechaInicio;
    if (fechaVencimiento) payload.fecha_vencimiento = fechaVencimiento;
    if (garantia.trim()) payload.garantia = garantia.trim();
    if (notas.trim()) payload.notas = notas.trim();

    const parsed = CreditoInputSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach(err => {
        const field = err.path.join(".");
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      setSubmitError("Hay errores en el formulario");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSubmitError("No hay sesión activa"); return; }

      const res = await fetch("/api/cartera", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(parsed.data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.details?.fieldErrors) {
          const fieldErrors: Record<string, string> = {};
          for (const [k, v] of Object.entries(json.details.fieldErrors)) {
            if (Array.isArray(v) && v[0]) fieldErrors[k] = v[0] as string;
          }
          setErrors(fieldErrors);
        }
        setSubmitError(json.error || "Error al crear el crédito");
        return;
      }

      router.push(`/dashboard/cartera/${json.credito.id}`);
    } catch (err) {
      console.error("[NuevoCredito] submit", err);
      setSubmitError("Error de red. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard/cartera" style={{ fontSize: 12, color: "#64748B", textDecoration: "none" }}>← Cartera</Link>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0F172A", marginBottom: 6, letterSpacing: "-0.02em" }}>
          Nuevo crédito
        </h1>
        <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>
          Crea un crédito nuevo en tu cartera de gestión.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* CARD 1: Deudor */}
        <div style={CARD}>
          <div style={SECTION_TITLE}>INFORMACIÓN DEL DEUDOR</div>
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Deudor <span style={REQ}>*</span></label>
            <input type="text" value={deudor} onChange={e => setDeudor(e.target.value)}
              placeholder="Razón social"
              style={{ ...INPUT, borderColor: errors.deudor ? "#DC2626" : "#E2E8F0" }} />
            {errors.deudor && <div style={ERROR_MSG}>{errors.deudor}</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={LABEL}>RFC</label>
              <input type="text" value={rfc} onChange={e => setRfc(e.target.value.toUpperCase())}
                placeholder="ABC123456ABC" maxLength={13}
                style={{ ...INPUT_MONO, borderColor: errors.rfc ? "#DC2626" : "#E2E8F0" }} />
              {errors.rfc && <div style={ERROR_MSG}>{errors.rfc}</div>}
            </div>
            <div>
              <label style={LABEL}>Sector</label>
              <input type="text" value={sector} onChange={e => setSector(e.target.value)}
                placeholder="Industria, Comercio, Servicios..."
                style={INPUT} />
            </div>
          </div>
        </div>

        {/* CARD 2: Características */}
        <div style={CARD}>
          <div style={SECTION_TITLE}>CARACTERÍSTICAS DEL CRÉDITO</div>
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Tipo de crédito <span style={REQ}>*</span></label>
            <select value={tipoCredito} onChange={e => setTipoCredito(e.target.value as CreditoTipo)}
              style={INPUT}>
              {TIPO_CREDITO_VALUES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={LABEL}>Monto original (MXN) <span style={REQ}>*</span></label>
              <input type="number" value={montoOriginal} onChange={e => handleMontoChange(e.target.value)}
                placeholder="1500000" min={0} step={0.01}
                style={{ ...INPUT_MONO, borderColor: errors.monto_original ? "#DC2626" : "#E2E8F0" }} />
              {errors.monto_original && <div style={ERROR_MSG}>{errors.monto_original}</div>}
            </div>
            <div>
              <label style={LABEL}>Saldo actual (MXN) <span style={REQ}>*</span></label>
              <input type="number" value={saldoActual} onChange={e => setSaldoActual(e.target.value)}
                placeholder="1500000" min={0} step={0.01}
                style={{ ...INPUT_MONO, borderColor: errors.saldo_actual ? "#DC2626" : "#E2E8F0" }} />
              {errors.saldo_actual && <div style={ERROR_MSG}>{errors.saldo_actual}</div>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <label style={LABEL}>Tasa anual (%)</label>
              <input type="number" value={tasaAnual} onChange={e => setTasaAnual(e.target.value)}
                placeholder="25" min={0} max={200} step={0.01}
                style={{ ...INPUT_MONO, borderColor: errors.tasa_anual ? "#DC2626" : "#E2E8F0" }} />
              {errors.tasa_anual && <div style={ERROR_MSG}>{errors.tasa_anual}</div>}
            </div>
            <div>
              <label style={LABEL}>Plazo (meses)</label>
              <input type="number" value={plazoMeses} onChange={e => setPlazoMeses(e.target.value)}
                placeholder="36" min={1} max={600} step={1}
                style={{ ...INPUT_MONO, borderColor: errors.plazo_meses ? "#DC2626" : "#E2E8F0" }} />
              {errors.plazo_meses && <div style={ERROR_MSG}>{errors.plazo_meses}</div>}
            </div>
            <div>
              <label style={LABEL}>Amortiza</label>
              <select value={amortiza} onChange={e => setAmortiza(e.target.value as CreditoAmortiza)}
                style={INPUT}>
                {AMORTIZA_VALUES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* CARD 3: Fechas y garantía */}
        <div style={CARD}>
          <div style={SECTION_TITLE}>FECHAS Y GARANTÍA</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={LABEL}>Fecha inicio</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                style={INPUT_MONO} />
            </div>
            <div>
              <label style={LABEL}>Fecha vencimiento</label>
              <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)}
                style={INPUT_MONO} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={LABEL}>Garantía</label>
            <input type="text" value={garantia} onChange={e => setGarantia(e.target.value)}
              placeholder="Descripción de la garantía"
              style={INPUT} />
          </div>

          <div>
            <label style={LABEL}>Notas</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)}
              placeholder="Notas internas sobre este crédito..."
              style={TEXTAREA as React.CSSProperties} />
          </div>
        </div>

        {/* Error global */}
        {submitError && (
          <div style={{
            padding: "12px 16px", marginBottom: 16,
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
            fontSize: 13, color: "#991B1B",
          }}>
            {submitError}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Link href="/dashboard/cartera" style={{
            padding: "10px 20px", borderRadius: 8,
            border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A",
            fontSize: 13, fontWeight: 600, textDecoration: "none",
            display: "inline-flex", alignItems: "center",
          }}>Cancelar</Link>
          <button type="submit" disabled={submitting}
            style={{
              padding: "10px 24px", borderRadius: 8,
              border: "none", background: "#0C1E4A", color: "#FFFFFF",
              fontSize: 13, fontWeight: 600,
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}>
            {submitting ? "Creando..." : "Crear crédito"}
          </button>
        </div>
      </form>
    </div>
  );
}
