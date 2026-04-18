"use client";

import React, { useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Lender = { id: string; slug: string; name: string };

type FormData = {
  lender_id: string;
  slug: string;
  razon_social: string;
  rfc_cliente: string;
  domicilio_cliente: string;
  nombre_representante: string;
  cargo_representante: string;
  plan: "Basic" | "Pro" | "Enterprise";
  precio_mxn: string;
  fecha_inicio: string;
  plazo_meses: string;
  banco: string;
  clabe: string;
  referencia: string;
};

const INITIAL: FormData = {
  lender_id: "",
  slug: "",
  razon_social: "",
  rfc_cliente: "",
  domicilio_cliente: "",
  nombre_representante: "",
  cargo_representante: "Representante Legal",
  plan: "Basic",
  precio_mxn: "",
  fecha_inicio: new Date().toISOString().slice(0, 10),
  plazo_meses: "12",
  banco: "",
  clabe: "",
  referencia: "",
};

// ─── Styles (matches SuperAdmin theme) ──────────────────────────────────────

const S = {
  page: {
    fontFamily: "'Geist', sans-serif",
    color: "#0F172A",
    padding: "32px 40px",
    maxWidth: 900,
    margin: "0 auto",
  } as React.CSSProperties,
  h1: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    marginBottom: 4,
  } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 28 } as React.CSSProperties,
  card: {
    background: "#fff",
    border: "1px solid #E8EDF5",
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  } as React.CSSProperties,
  cardHeader: {
    padding: "14px 20px",
    borderBottom: "1px solid #F1F5F9",
    background: "#FAFAFA",
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#0F172A" } as React.CSSProperties,
  cardBody: { padding: 20 } as React.CSSProperties,
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  } as React.CSSProperties,
  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 14,
  } as React.CSSProperties,
  fieldGroup: { display: "flex", flexDirection: "column" as const, gap: 5 },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#64748B",
    textTransform: "uppercase" as const,
    letterSpacing: ".04em",
  } as React.CSSProperties,
  inp: {
    height: 36,
    padding: "0 12px",
    borderRadius: 9,
    border: "1.5px solid #E2E8F0",
    fontSize: 13,
    fontFamily: "'Geist', sans-serif",
    color: "#0F172A",
    background: "#F8FAFC",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  textarea: {
    padding: "10px 12px",
    borderRadius: 9,
    border: "1.5px solid #E2E8F0",
    fontSize: 13,
    fontFamily: "'Geist', sans-serif",
    color: "#0F172A",
    background: "#F8FAFC",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    resize: "vertical" as const,
    minHeight: 72,
  } as React.CSSProperties,
  select: {
    height: 36,
    padding: "0 10px",
    borderRadius: 9,
    border: "1.5px solid #E2E8F0",
    fontSize: 13,
    fontFamily: "'Geist', sans-serif",
    color: "#374151",
    background: "#F8FAFC",
    outline: "none",
    cursor: "pointer",
    width: "100%",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  btn: {
    height: 42,
    padding: "0 28px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Geist', sans-serif",
    transition: "box-shadow .15s",
  } as React.CSSProperties,
  toast: {
    position: "fixed" as const,
    bottom: 24,
    right: 24,
    zIndex: 999,
    padding: "11px 16px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "0 8px 32px rgba(0,0,0,.1)",
  } as React.CSSProperties,
  cardNum: {
    width: 22,
    height: 22,
    borderRadius: 7,
    background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 800,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  } as React.CSSProperties,
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ContratosPage() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [form, setForm] = useState<FormData>({ ...INITIAL });
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const adminSecret =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "")
      : "";

  useEffect(() => {
    fetch("/api/onb-lenders", {
      headers: { "x-admin-secret": adminSecret },
    })
      .then((r) => r.json())
      .then((d) => setLenders(d.lenders ?? d ?? []))
      .catch(() => {});
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function selectLender(id: string) {
    if (id === "__manual__") {
      setForm({ ...INITIAL, lender_id: "__manual__" });
      return;
    }
    const l = lenders.find((x) => x.id === id);
    if (!l) return;
    setForm((prev) => ({
      ...prev,
      lender_id: id,
      slug: l.slug,
      razon_social: l.name,
      referencia: l.slug,
    }));
  }

  function validate(): string | null {
    if (!form.razon_social.trim()) return "Razón social es requerida";
    if (!form.rfc_cliente.trim()) return "RFC del cliente es requerido";
    if (!form.domicilio_cliente.trim()) return "Domicilio fiscal es requerido";
    if (!form.nombre_representante.trim()) return "Nombre del representante es requerido";
    if (!form.precio_mxn || Number(form.precio_mxn) <= 0) return "Precio MXN debe ser mayor a 0";
    if (!form.banco.trim()) return "Banco es requerido";
    const clabe = form.clabe.replace(/\s/g, "");
    if (clabe.length !== 18 || !/^\d+$/.test(clabe)) return "CLABE debe tener exactamente 18 dígitos";
    if (!form.referencia.trim()) return "Referencia bancaria es requerida";
    return null;
  }

  async function generate() {
    const err = validate();
    if (err) {
      showToast(err, false);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/contracts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          ...form,
          precio_mxn: Number(form.precio_mxn),
          plazo_meses: Number(form.plazo_meses),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Error generando contrato");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        `contrato_plinius_${form.slug || "manual"}_${form.fecha_inicio}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("Contrato generado y descargado", true);
    } catch (e: any) {
      showToast(e.message ?? "Error inesperado", false);
    }
    setGenerating(false);
  }

  return (
    <div style={S.page}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            ...S.toast,
            background: "#fff",
            border: `1px solid ${toast.ok ? "#D1FAE5" : "#FECDD3"}`,
            color: toast.ok ? "#065F46" : "#9F1239",
          }}
        >
          {toast.msg}
        </div>
      )}

      <h1 style={S.h1}>Generar Contrato</h1>
      <p style={S.subtitle}>
        Contrato de Prestación de Servicios de Plataforma Tecnológica
      </p>

      {/* Card 1 — Selección de cliente */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardNum}>1</div>
          <span style={S.cardTitle}>Selección de cliente</span>
        </div>
        <div style={S.cardBody}>
          <div style={S.fieldGroup}>
            <label style={S.label}>Cliente</label>
            <select
              style={S.select}
              value={form.lender_id}
              onChange={(e) => selectLender(e.target.value)}
            >
              <option value="">— Seleccionar cliente —</option>
              <option value="__manual__">Cliente manual (ad-hoc)</option>
              {lenders.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.slug})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Card 2 — Datos del cliente */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardNum}>2</div>
          <span style={S.cardTitle}>Datos del cliente</span>
        </div>
        <div style={S.cardBody}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={S.grid2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Razón social *</label>
                <input
                  style={S.inp}
                  value={form.razon_social}
                  onChange={(e) => set("razon_social", e.target.value)}
                  placeholder="Nombre legal de la empresa"
                />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>RFC *</label>
                <input
                  style={{ ...S.inp, textTransform: "uppercase", fontFamily: "'Geist Mono', monospace" }}
                  value={form.rfc_cliente}
                  onChange={(e) => set("rfc_cliente", e.target.value.toUpperCase())}
                  placeholder="ABC123456XX0"
                  maxLength={13}
                />
              </div>
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Domicilio fiscal *</label>
              <textarea
                style={S.textarea}
                value={form.domicilio_cliente}
                onChange={(e) => set("domicilio_cliente", e.target.value)}
                placeholder="Calle, número, colonia, alcaldía, C.P., Ciudad, Estado"
              />
            </div>
            <div style={S.grid2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Nombre del representante legal *</label>
                <input
                  style={S.inp}
                  value={form.nombre_representante}
                  onChange={(e) => set("nombre_representante", e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Cargo del representante</label>
                <input
                  style={S.inp}
                  value={form.cargo_representante}
                  onChange={(e) => set("cargo_representante", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 — Plan y contraprestación */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardNum}>3</div>
          <span style={S.cardTitle}>Plan y contraprestación</span>
        </div>
        <div style={S.cardBody}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
            <div style={S.fieldGroup}>
              <label style={S.label}>Plan contratado</label>
              <select
                style={S.select}
                value={form.plan}
                onChange={(e) => set("plan", e.target.value as FormData["plan"])}
              >
                <option value="Basic">Basic</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Precio mensual MXN *</label>
              <input
                type="number"
                style={{ ...S.inp, fontFamily: "'Geist Mono', monospace" }}
                value={form.precio_mxn}
                onChange={(e) => set("precio_mxn", e.target.value)}
                placeholder="1,499.00"
                min={0}
                step={0.01}
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Fecha de inicio</label>
              <input
                type="date"
                style={S.inp}
                value={form.fecha_inicio}
                onChange={(e) => set("fecha_inicio", e.target.value)}
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Plazo inicial (meses)</label>
              <input
                type="number"
                style={{ ...S.inp, fontFamily: "'Geist Mono', monospace" }}
                value={form.plazo_meses}
                onChange={(e) => set("plazo_meses", e.target.value)}
                min={1}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 4 — Datos bancarios */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardNum}>4</div>
          <span style={S.cardTitle}>Datos bancarios Plinius (Anexo A)</span>
        </div>
        <div style={S.cardBody}>
          <div style={S.grid3}>
            <div style={S.fieldGroup}>
              <label style={S.label}>Banco *</label>
              <input
                style={S.inp}
                value={form.banco}
                onChange={(e) => set("banco", e.target.value)}
                placeholder="STP / Banorte / BBVA..."
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>CLABE (18 dígitos) *</label>
              <input
                style={{ ...S.inp, fontFamily: "'Geist Mono', monospace", letterSpacing: "0.08em" }}
                value={form.clabe}
                onChange={(e) => set("clabe", e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder="646180123456789012"
                maxLength={22}
              />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Referencia</label>
              <input
                style={{ ...S.inp, fontFamily: "'Geist Mono', monospace" }}
                value={form.referencia}
                onChange={(e) => set("referencia", e.target.value)}
                placeholder="slug-del-cliente"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botón generar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button
          style={{
            ...S.btn,
            opacity: generating ? 0.6 : 1,
            cursor: generating ? "not-allowed" : "pointer",
          }}
          onClick={generate}
          disabled={generating}
        >
          {generating ? "Generando..." : "Generar DOCX"}
        </button>
      </div>
    </div>
  );
}
