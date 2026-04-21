"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = { open: boolean; onClose: () => void; onCreated: () => void };

const SECTORES = ["comercio","manufactura","servicios","agro","construccion","tecnologia","salud","educacion","transporte","energia","otro"];
const TIPOS_CREDITO = ["capital_trabajo","expansion","refinanciamiento","maquinaria","inventario","otro"];
const ESTADOS_MX = ["Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua","CDMX","Coahuila","Colima","Durango","Guanajuato","Guerrero","Hidalgo","Jalisco","Estado de México","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"];

const STEPS = ["Empresa", "Representante Legal", "Financieros", "Confirmación"];

const S = {
  overlay: { position: "fixed" as const, inset: 0, zIndex: 50, display: "grid", placeItems: "center", background: "rgba(2,6,23,.55)", backdropFilter: "blur(4px)", padding: 16, fontFamily: "'Geist',sans-serif" },
  modal: { background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640, maxHeight: "90vh", overflow: "auto", boxShadow: "0 32px 80px rgba(15,23,42,.25)" },
  header: { padding: "20px 28px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" } as React.CSSProperties,
  body: { padding: "24px 28px" },
  footer: { padding: "16px 28px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", gap: 8 } as React.CSSProperties,
  label: { fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase" as const, letterSpacing: ".06em", display: "block", marginBottom: 6 } as React.CSSProperties,
  inp: { width: "100%", height: 40, borderRadius: 9, border: "1.5px solid #E2E8F0", padding: "0 12px", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#0F172A", background: "#F8FAFC", outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
  select: { width: "100%", height: 40, borderRadius: 9, border: "1.5px solid #E2E8F0", padding: "0 10px", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#374151", background: "#F8FAFC", outline: "none", cursor: "pointer", boxSizing: "border-box" as const } as React.CSSProperties,
  textarea: { width: "100%", minHeight: 72, borderRadius: 9, border: "1.5px solid #E2E8F0", padding: "10px 12px", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#0F172A", background: "#F8FAFC", outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const } as React.CSSProperties,
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } as React.CSSProperties,
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 } as React.CSSProperties,
  btnPrimary: { height: 40, padding: "0 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#0C1E4A,#1B3F8A)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif" } as React.CSSProperties,
  btnSecondary: { height: 40, padding: "0 20px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" } as React.CSSProperties,
};

type Form = Record<string, string>;
const INIT: Form = {
  company_name:"",rfc:"",sector:"",website:"",
  direccion_calle:"",direccion_numero:"",direccion_colonia:"",direccion_cp:"",direccion_municipio:"",direccion_estado:"",
  telefono_empresa:"",email_empresa:"",anios_operando:"",numero_empleados:"",
  rep_legal_nombre:"",rep_legal_rfc:"",rep_legal_curp:"",rep_legal_cargo:"Representante Legal",
  rep_legal_telefono:"",rep_legal_email:"",
  ingresos_anuales_mxn:"",tipo_credito_solicitado:"",monto_solicitado_mxn:"",plazo_solicitado_meses:"",uso_fondos:"",
};

function Field({ label, name, form, set, type="text", required, mono, placeholder }: { label:string; name:string; form:Form; set:(f:Form)=>void; type?:string; required?:boolean; mono?:boolean; placeholder?:string }) {
  return (
    <div>
      <label style={S.label}>{label}{required && " *"}</label>
      <input style={{ ...S.inp, fontFamily: mono ? "'Geist Mono',monospace" : "inherit" }} type={type} value={form[name]} onChange={e=>set({...form,[name]:e.target.value})} placeholder={placeholder} />
    </div>
  );
}

function SField({ label, name, form, set, options, required }: { label:string; name:string; form:Form; set:(f:Form)=>void; options:string[]; required?:boolean }) {
  return (
    <div>
      <label style={S.label}>{label}{required && " *"}</label>
      <select style={S.select} value={form[name]} onChange={e=>set({...form,[name]:e.target.value})}>
        <option value="">— Seleccionar —</option>
        {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1).replace(/_/g," ")}</option>)}
      </select>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #F8FAFC" }}>
      <span style={{ fontSize: 12, color: "#64748B" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", textAlign: "right", maxWidth: "55%" }}>{value}</span>
    </div>
  );
}

export default function ClientWizard({ open, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({ ...INIT });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() { setStep(0); setForm({ ...INIT }); setError(null); onClose(); }

  function validate(): string | null {
    if (!form.company_name.trim()) return "Razón social es requerida";
    if (!form.rep_legal_nombre.trim()) return "Nombre del representante es requerido";
    if (!form.rep_legal_telefono.trim()) return "Teléfono del representante es requerido";
    if (!form.rep_legal_email.trim()) return "Email del representante es requerido";
    if (!form.tipo_credito_solicitado) return "Tipo de crédito es requerido";
    if (!form.monto_solicitado_mxn) return "Monto solicitado es requerido";
    if (!form.plazo_solicitado_meses) return "Plazo solicitado es requerido";
    return null;
  }

  async function submit() {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Sesión expirada"); setLoading(false); return; }

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        ...form,
        razon_social: form.company_name,
        anios_operando: form.anios_operando ? Number(form.anios_operando) : null,
        numero_empleados: form.numero_empleados ? Number(form.numero_empleados) : null,
        ingresos_anuales_mxn: form.ingresos_anuales_mxn ? Number(form.ingresos_anuales_mxn) : null,
        monto_solicitado_mxn: form.monto_solicitado_mxn ? Number(form.monto_solicitado_mxn) : null,
        plazo_solicitado_meses: form.plazo_solicitado_meses ? Number(form.plazo_solicitado_meses) : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error creando cliente");
      setLoading(false);
      return;
    }

    setLoading(false);
    handleClose();
    onCreated();
  }

  if (!open) return null;

  const fmtMoney = (v: string) => v ? `$${Number(v).toLocaleString("es-MX")}` : "";

  return (
    <div style={S.overlay} onClick={handleClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>Nuevo cliente</div>
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>Paso {step + 1} de {STEPS.length} — {STEPS[step]}</div>
          </div>
          <button onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4 }}>
            <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
          </button>
        </div>

        {/* Stepper */}
        <div style={{ padding: "12px 28px 0", display: "flex", gap: 6 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 999, background: i <= step ? "#0C1E4A" : "#E2E8F0", transition: "background .2s" }} />
          ))}
        </div>

        {/* Body */}
        <div style={S.body}>
          {error && (
            <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#9F1239", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Step 0: Empresa */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={S.grid2}>
                <Field label="Razón social" name="company_name" form={form} set={setForm} required />
                <Field label="RFC" name="rfc" form={form} set={setForm} mono placeholder="ABC123456XX0" />
              </div>
              <div style={S.grid2}>
                <SField label="Sector" name="sector" form={form} set={setForm} options={SECTORES} />
                <Field label="Website" name="website" form={form} set={setForm} placeholder="www.empresa.com" />
              </div>
              <div style={S.grid3}>
                <Field label="Calle" name="direccion_calle" form={form} set={setForm} />
                <Field label="Número" name="direccion_numero" form={form} set={setForm} />
                <Field label="Colonia" name="direccion_colonia" form={form} set={setForm} />
              </div>
              <div style={S.grid3}>
                <Field label="C.P." name="direccion_cp" form={form} set={setForm} />
                <Field label="Municipio" name="direccion_municipio" form={form} set={setForm} />
                <SField label="Estado" name="direccion_estado" form={form} set={setForm} options={ESTADOS_MX} />
              </div>
              <div style={S.grid2}>
                <Field label="Teléfono empresa" name="telefono_empresa" form={form} set={setForm} type="tel" />
                <Field label="Email empresa" name="email_empresa" form={form} set={setForm} type="email" />
              </div>
              <div style={S.grid2}>
                <Field label="Años operando" name="anios_operando" form={form} set={setForm} type="number" />
                <Field label="Número de empleados" name="numero_empleados" form={form} set={setForm} type="number" />
              </div>
            </div>
          )}

          {/* Step 1: Representante Legal */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={S.grid2}>
                <Field label="Nombre completo" name="rep_legal_nombre" form={form} set={setForm} required />
                <Field label="Cargo" name="rep_legal_cargo" form={form} set={setForm} />
              </div>
              <div style={S.grid2}>
                <Field label="RFC" name="rep_legal_rfc" form={form} set={setForm} mono />
                <Field label="CURP" name="rep_legal_curp" form={form} set={setForm} mono />
              </div>
              <div style={S.grid2}>
                <Field label="Teléfono" name="rep_legal_telefono" form={form} set={setForm} type="tel" required />
                <Field label="Email" name="rep_legal_email" form={form} set={setForm} type="email" required />
              </div>
            </div>
          )}

          {/* Step 2: Financieros */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Ingresos anuales MXN" name="ingresos_anuales_mxn" form={form} set={setForm} type="number" mono />
              <SField label="Tipo de crédito solicitado" name="tipo_credito_solicitado" form={form} set={setForm} options={TIPOS_CREDITO} required />
              <div style={S.grid2}>
                <Field label="Monto solicitado MXN" name="monto_solicitado_mxn" form={form} set={setForm} type="number" mono required />
                <Field label="Plazo solicitado (meses)" name="plazo_solicitado_meses" form={form} set={setForm} type="number" required />
              </div>
              <div>
                <label style={S.label}>Uso de fondos</label>
                <textarea style={S.textarea} value={form.uso_fondos} onChange={e => setForm({ ...form, uso_fondos: e.target.value })} placeholder="Describe brevemente para qué se usará el financiamiento..." />
              </div>
            </div>
          )}

          {/* Step 3: Confirmación */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>Empresa</div>
              <ReviewRow label="Razón social" value={form.company_name} />
              <ReviewRow label="RFC" value={form.rfc} />
              <ReviewRow label="Sector" value={form.sector} />
              <ReviewRow label="Dirección" value={[form.direccion_calle, form.direccion_numero, form.direccion_colonia, form.direccion_cp, form.direccion_municipio, form.direccion_estado].filter(Boolean).join(", ")} />

              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12, marginTop: 20 }}>Representante Legal</div>
              <ReviewRow label="Nombre" value={form.rep_legal_nombre} />
              <ReviewRow label="Cargo" value={form.rep_legal_cargo} />
              <ReviewRow label="Teléfono" value={form.rep_legal_telefono} />
              <ReviewRow label="Email" value={form.rep_legal_email} />

              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 12, marginTop: 20 }}>Financieros</div>
              <ReviewRow label="Tipo de crédito" value={form.tipo_credito_solicitado?.replace(/_/g, " ")} />
              <ReviewRow label="Monto" value={fmtMoney(form.monto_solicitado_mxn)} />
              <ReviewRow label="Plazo" value={form.plazo_solicitado_meses ? `${form.plazo_solicitado_meses} meses` : ""} />
              <ReviewRow label="Uso de fondos" value={form.uso_fondos} />

              <div style={{ marginTop: 16, padding: "10px 14px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, fontSize: 12, color: "#1E40AF" }}>
                El cliente se creará con estatus "Onboarding".
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button style={S.btnSecondary} onClick={step === 0 ? handleClose : () => setStep(s => s - 1)}>
            {step === 0 ? "Cancelar" : "Anterior"}
          </button>
          {step < 3 ? (
            <button style={S.btnPrimary} onClick={() => { setError(null); setStep(s => s + 1); }}>
              Siguiente
            </button>
          ) : (
            <button style={{ ...S.btnPrimary, opacity: loading ? 0.6 : 1 }} onClick={submit} disabled={loading}>
              {loading ? "Creando..." : "Crear cliente"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
