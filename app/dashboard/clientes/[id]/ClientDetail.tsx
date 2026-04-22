"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import InlineField from "@/components/clients/InlineField";
import KycDocCard from "@/components/clients/KycDocCard";

type Tab = "resumen"|"empresa"|"representante"|"financieros"|"kyc"|"reporte"|"notas"|"actividad";
type Client = Record<string, any>;
type Nota = { id: string; author_name: string; contenido: string; pinned: boolean; created_at: string };
type BuroScore = { id: string; score: number; fecha_consulta: string; fuente: string; notas: string | null };
type ReporteCredito = { id: string; estado: string; score: number | null; solicitado_at: string; completado_at: string | null; reporte_pdf_url: string | null; lender_notas: string | null };
type Cuota = { usados_mes: number; limite_mes: number; restantes: number; ilimitado: boolean; periodo: string; plan: string };

function Ic({ d, s = 14, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

const STATUS_S: Record<string, { bg: string; color: string; border: string }> = {
  Active:     { bg: "#F0FDF9", color: "#065F46", border: "#A7F3D0" },
  Onboarding: { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
  Paused:     { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  "Risk Hold":{ bg: "#FFF1F2", color: "#9F1239", border: "#FECDD3" },
};

const TABS: { key: Tab; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "empresa", label: "Empresa" },
  { key: "representante", label: "Rep. Legal" },
  { key: "financieros", label: "Financieros" },
  { key: "kyc", label: "KYC" },
  { key: "reporte", label: "Reporte Crediticio" },
  { key: "notas", label: "Notas" },
  { key: "actividad", label: "Actividad" },
];

function fmt(n: number | null) {
  if (n == null) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString("es-MX")}`;
}

function ago(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function scoreColor(s: number | null) {
  if (s == null) return "#94A3B8";
  if (s >= 80) return "#059669";
  if (s >= 60) return "#F59E0B";
  return "#EF4444";
}

const S = {
  page: { fontFamily: "'Geist',sans-serif", color: "#0F172A" } as React.CSSProperties,
  card: { background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, padding: "20px 22px", marginBottom: 14 } as React.CSSProperties,
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 14 } as React.CSSProperties,
  badge: (s: string) => {
    const c = STATUS_S[s] ?? STATUS_S.Onboarding;
    return { fontSize: 10, fontWeight: 700, fontFamily: "'Geist Mono',monospace", background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 999, padding: "3px 10px", letterSpacing: ".04em" } as React.CSSProperties;
  },
  tab: (active: boolean) => ({
    padding: "8px 16px", borderRadius: 9, border: "1.5px solid",
    fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer",
    fontFamily: "'Geist',sans-serif", transition: "all .15s",
    background: active ? "#0C1E4A" : "#fff", color: active ? "#fff" : "#64748B",
    borderColor: active ? "#0C1E4A" : "#E2E8F0",
  }) as React.CSSProperties,
  inp: { height: 38, borderRadius: 9, border: "1.5px solid #E2E8F0", padding: "0 12px", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#0F172A", background: "#F8FAFC", outline: "none", width: "100%", boxSizing: "border-box" as const } as React.CSSProperties,
};

export default function ClientDetail({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<Client | null>(null);
  const [connector, setConnector] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("resumen");
  const [notas, setNotas] = useState<Nota[]>([]);
  const [scores, setScores] = useState<BuroScore[]>([]);
  const [reportes, setReportes] = useState<ReporteCredito[]>([]);
  const [cuota, setCuota] = useState<Cuota | null>(null);
  const [notaDraft, setNotaDraft] = useState("");
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [solicitarNotas, setSolicitarNotas] = useState("");
  const [solicitando, setSolicitando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const getAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const load = useCallback(async () => {
    const { data: c } = await supabase.from("clients").select("*").eq("id", clientId).single();
    const { data: conn } = await supabase.from("client_connectors").select("*").eq("client_id", clientId).maybeSingle();
    setClient(c); setConnector(conn); setLoading(false);
  }, [clientId]);

  const loadNotas = useCallback(async () => {
    const token = await getAuth();
    if (!token) return;
    const res = await fetch(`/api/clients/${clientId}/notas`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const j = await res.json(); setNotas(j.notas ?? []); }
  }, [clientId, getAuth]);

  const loadScores = useCallback(async () => {
    const token = await getAuth();
    if (!token) return;
    const res = await fetch(`/api/clients/${clientId}/buro`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const j = await res.json(); setScores(j.scores ?? []); }
  }, [clientId, getAuth]);

  const loadReportes = useCallback(async () => {
    const token = await getAuth();
    if (!token) return;
    const res = await fetch(`/api/reportes-crediticios?client_id=${clientId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const j = await res.json(); setReportes(j.reportes ?? []); }
  }, [clientId, getAuth]);

  const loadCuota = useCallback(async () => {
    const token = await getAuth();
    if (!token) return;
    const res = await fetch("/api/reportes-crediticios/cuota", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const j = await res.json(); setCuota(j); }
  }, [getAuth]);

  async function solicitarReporte() {
    setSolicitando(true);
    const token = await getAuth();
    if (!token) { setSolicitando(false); return; }
    const res = await fetch("/api/reportes-crediticios", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ client_id: clientId, lender_notas: solicitarNotas || null }),
    });
    setSolicitando(false);
    setShowSolicitarModal(false);
    setSolicitarNotas("");
    if (res.ok) {
      showToast("Reporte solicitado — te notificaremos cuando esté listo (típicamente 2-4 horas hábiles)");
      loadReportes();
      loadCuota();
    } else {
      const j = await res.json();
      showToast(j.message ?? j.error ?? "Error al solicitar");
    }
  }

  async function descargarPdf(reporteId: string) {
    const token = await getAuth();
    if (!token) return;
    const res = await fetch(`/api/reportes-crediticios/${reporteId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const j = await res.json();
      if (j.reporte?.signed_url) window.open(j.reporte.signed_url, "_blank");
      else showToast("PDF no disponible aún");
    }
  }

  useEffect(() => { load(); loadNotas(); loadScores(); loadReportes(); loadCuota(); }, [load, loadNotas, loadScores, loadReportes, loadCuota]);

  async function saveField(field: string, value: string) {
    const { error } = await supabase.from("clients").update({ [field]: value || null, updated_at: new Date().toISOString() }).eq("id", clientId);
    if (error) { showToast("Error guardando"); return; }
    showToast("Guardado"); load();
  }

  async function addNota() {
    if (!notaDraft.trim()) return;
    const token = await getAuth();
    if (!token) return;
    await fetch(`/api/clients/${clientId}/notas`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contenido: notaDraft }),
    });
    setNotaDraft(""); loadNotas(); showToast("Nota agregada");
  }

  async function deleteNota(id: string) {
    const token = await getAuth();
    if (!token) return;
    await fetch(`/api/clients/${clientId}/notas/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadNotas();
  }

  async function addBuroScore() {
    const raw = prompt("Score de buró (número):");
    if (!raw) return;
    const score = Number(raw);
    if (isNaN(score) || score < 0) return;
    const token = await getAuth();
    if (!token) return;
    await fetch(`/api/clients/${clientId}/buro`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ score, fuente: "manual" }),
    });
    loadScores(); showToast("Score registrado");
  }

  if (loading) return <div style={{ padding: 40, color: "#94A3B8", fontFamily: "'Geist',sans-serif" }}>Cargando...</div>;
  if (!client) return <div style={{ padding: 40, color: "#94A3B8", fontFamily: "'Geist',sans-serif" }}>Cliente no encontrado</div>;

  const buroScore = connector?.buro_score ?? scores[0]?.score ?? null;
  const kycDocs = [
    { key: "kyc_acta_constitutiva", label: "Acta constitutiva" },
    { key: "kyc_poderes", label: "Poderes del representante" },
    { key: "kyc_rep_legal_ine", label: "INE del representante legal" },
    { key: "kyc_comprobante_domicilio", label: "Comprobante de domicilio" },
    { key: "kyc_rfc_constancia", label: "Constancia de situación fiscal" },
    { key: "kyc_estados_financieros", label: "Estados financieros" },
  ];
  const kycTotal = kycDocs.length;
  const kycDone = kycDocs.filter(d => client[d.key]?.url).length;
  const kycPct = Math.round((kycDone / kycTotal) * 100);

  const filledFields = ["company_name","rfc","sector","rep_legal_nombre","rep_legal_email","rep_legal_telefono","tipo_credito_solicitado","monto_solicitado_mxn"].filter(f => client[f]).length;
  const onboardingPct = Math.round((filledFields / 8 + kycDone / kycTotal) / 2 * 100);

  return (
    <div style={S.page}>
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, padding: "11px 16px", background: "#fff", border: "1px solid #D1FAE5", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#065F46", boxShadow: "0 8px 32px rgba(0,0,0,.1)" }}>{toast}</div>}

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16, display: "flex", gap: 6, alignItems: "center" }}>
        <Link href="/dashboard" style={{ color: "#94A3B8", textDecoration: "none" }}>Dashboard</Link>
        <span>/</span>
        <Link href="/dashboard/clientes" style={{ color: "#94A3B8", textDecoration: "none" }}>Clientes</Link>
        <span>/</span>
        <span style={{ color: "#0F172A", fontWeight: 600 }}>{client.company_name}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#EEF2FF,#DBEAFE)", display: "grid", placeItems: "center", flexShrink: 0, border: "1px solid #C7D2FE" }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#1E40AF" }}>{(client.company_name ?? "C")[0]}</span>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>{client.company_name}</h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {client.rfc && <span style={{ fontSize: 11, fontFamily: "'Geist Mono',monospace", color: "#64748B" }}>{client.rfc}</span>}
              <span style={S.badge(client.status)}>{client.status}</span>
              {client.sector && <span style={{ fontSize: 10, fontWeight: 500, background: "#F1F5F9", color: "#475569", borderRadius: 6, padding: "2px 8px" }}>{client.sector}</span>}
              {(client.tags ?? []).map((t: string) => <span key={t} style={{ fontSize: 10, fontWeight: 500, background: "#FDF4FF", color: "#7E22CE", borderRadius: 6, padding: "2px 8px" }}>{t}</span>)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={addBuroScore} style={{ height: 36, padding: "0 14px", borderRadius: 9, border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>Consultar Bur&oacute;</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(t => <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {/* TAB: Resumen */}
      {tab === "resumen" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={S.card}>
              <div style={S.cardTitle}>Informaci&oacute;n Clave</div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.8 }}>
                <div><strong>Raz&oacute;n social:</strong> {client.company_name ?? "—"}</div>
                <div><strong>RFC:</strong> <span style={{ fontFamily: "'Geist Mono',monospace" }}>{client.rfc ?? "—"}</span></div>
                <div><strong>Sector:</strong> {client.sector ?? "—"}</div>
                <div><strong>Antig&uuml;edad:</strong> {client.anios_operando ? `${client.anios_operando} años` : "—"}</div>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Contacto Principal</div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.8 }}>
                <div><strong>Rep. legal:</strong> {client.rep_legal_nombre ?? "—"}</div>
                <div><strong>Email:</strong> {client.rep_legal_email ?? "—"}</div>
                <div><strong>Tel:</strong> {client.rep_legal_telefono ?? "—"}</div>
                <div><strong>Cargo:</strong> {client.rep_legal_cargo ?? "—"}</div>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Cr&eacute;dito Solicitado</div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.8 }}>
                <div><strong>Tipo:</strong> {client.tipo_credito_solicitado?.replace(/_/g, " ") ?? "—"}</div>
                <div><strong>Monto:</strong> {fmt(client.monto_solicitado_mxn)}</div>
                <div><strong>Plazo:</strong> {client.plazo_solicitado_meses ? `${client.plazo_solicitado_meses} meses` : "—"}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={S.card}>
              <div style={S.cardTitle}>Progreso de Onboarding</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#64748B" }}>Completitud</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Geist Mono',monospace" }}>{onboardingPct}%</span>
              </div>
              <div style={{ height: 6, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${onboardingPct}%`, height: "100%", background: onboardingPct >= 80 ? "#059669" : onboardingPct >= 50 ? "#F59E0B" : "#3B82F6", borderRadius: 999, transition: "width .5s" }} />
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>&Uacute;ltimo Bur&oacute;</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Geist Mono',monospace", color: scoreColor(buroScore) }}>{buroScore ?? "—"}</span>
                {scores[0]?.fecha_consulta && <span style={{ fontSize: 11, color: "#94A3B8" }}>{ago(scores[0].fecha_consulta)}</span>}
              </div>
              <button onClick={() => setTab("reporte")} style={{ marginTop: 8, fontSize: 11, color: "#1E40AF", background: "none", border: "none", cursor: "pointer", fontFamily: "'Geist',sans-serif", fontWeight: 600, padding: 0 }}>Ver reportes &rarr;</button>
            </div>
          </div>
          {notas.length > 0 && (
            <div style={{ ...S.card, marginTop: 14 }}>
              <div style={S.cardTitle}>&Uacute;ltimas notas</div>
              {notas.slice(0, 3).map(n => (
                <div key={n.id} style={{ padding: "8px 0", borderBottom: "1px solid #F8FAFC", fontSize: 12, color: "#475569" }}>
                  <span style={{ fontWeight: 600 }}>{n.author_name}</span> <span style={{ color: "#CBD5E1" }}>{ago(n.created_at)}</span>
                  <div style={{ marginTop: 4 }}>{n.contenido}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: Empresa */}
      {tab === "empresa" && (
        <div style={S.card}>
          <div style={S.cardTitle}>Datos Generales</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <InlineField label="Razón social" value={client.company_name} field="company_name" onSave={saveField} />
            <InlineField label="RFC" value={client.rfc} field="rfc" mono onSave={saveField} />
            <InlineField label="Sector" value={client.sector} field="sector" onSave={saveField} />
            <InlineField label="Website" value={client.website} field="website" onSave={saveField} />
            <InlineField label="Años operando" value={client.anios_operando} field="anios_operando" type="number" onSave={saveField} />
            <InlineField label="Número de empleados" value={client.numero_empleados} field="numero_empleados" type="number" onSave={saveField} />
          </div>
          <div style={{ ...S.cardTitle, marginTop: 20 }}>Direcci&oacute;n</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 24px" }}>
            <InlineField label="Calle" value={client.direccion_calle} field="direccion_calle" onSave={saveField} />
            <InlineField label="Número" value={client.direccion_numero} field="direccion_numero" onSave={saveField} />
            <InlineField label="Colonia" value={client.direccion_colonia} field="direccion_colonia" onSave={saveField} />
            <InlineField label="C.P." value={client.direccion_cp} field="direccion_cp" onSave={saveField} />
            <InlineField label="Municipio" value={client.direccion_municipio} field="direccion_municipio" onSave={saveField} />
            <InlineField label="Estado" value={client.direccion_estado} field="direccion_estado" onSave={saveField} />
          </div>
          <div style={{ ...S.cardTitle, marginTop: 20 }}>Contacto empresa</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <InlineField label="Teléfono" value={client.telefono_empresa} field="telefono_empresa" type="tel" onSave={saveField} />
            <InlineField label="Email" value={client.email_empresa} field="email_empresa" type="email" onSave={saveField} />
          </div>
        </div>
      )}

      {/* TAB: Representante */}
      {tab === "representante" && (
        <div style={S.card}>
          <div style={S.cardTitle}>Representante Legal</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <InlineField label="Nombre completo" value={client.rep_legal_nombre} field="rep_legal_nombre" onSave={saveField} />
            <InlineField label="Cargo" value={client.rep_legal_cargo} field="rep_legal_cargo" onSave={saveField} />
            <InlineField label="RFC" value={client.rep_legal_rfc} field="rep_legal_rfc" mono onSave={saveField} />
            <InlineField label="CURP" value={client.rep_legal_curp} field="rep_legal_curp" mono onSave={saveField} />
            <InlineField label="Teléfono" value={client.rep_legal_telefono} field="rep_legal_telefono" type="tel" onSave={saveField} />
            <InlineField label="Email" value={client.rep_legal_email} field="rep_legal_email" type="email" onSave={saveField} />
          </div>
        </div>
      )}

      {/* TAB: Financieros */}
      {tab === "financieros" && (
        <div style={S.card}>
          <div style={S.cardTitle}>Informaci&oacute;n Financiera</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <InlineField label="Ingresos anuales MXN" value={client.ingresos_anuales_mxn} field="ingresos_anuales_mxn" type="number" mono onSave={saveField} />
            <InlineField label="Tipo de crédito" value={client.tipo_credito_solicitado} field="tipo_credito_solicitado" onSave={saveField} />
            <InlineField label="Monto solicitado MXN" value={client.monto_solicitado_mxn} field="monto_solicitado_mxn" type="number" mono onSave={saveField} />
            <InlineField label="Plazo (meses)" value={client.plazo_solicitado_meses} field="plazo_solicitado_meses" type="number" onSave={saveField} />
          </div>
          <InlineField label="Uso de fondos" value={client.uso_fondos} field="uso_fondos" type="textarea" onSave={saveField} />
        </div>
      )}

      {/* TAB: KYC */}
      {tab === "kyc" && (
        <>
          <div style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Documentos KYC</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{kycDone} de {kycTotal} documentos</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 120, height: 6, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${kycPct}%`, height: "100%", background: kycPct === 100 ? "#059669" : "#3B82F6", borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Geist Mono',monospace" }}>{kycPct}%</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {kycDocs.map(d => (
              <KycDocCard key={d.key} label={d.label} doc={client[d.key]} onUpload={() => showToast("Upload de documentos — Próximamente")} />
            ))}
          </div>
        </>
      )}

      {/* TAB: Reporte Crediticio */}
      {tab === "reporte" && (
        <>
          {/* Cuota card */}
          {cuota && (
            <div style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Reportes este mes</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Geist Mono',monospace" }}>
                    {cuota.ilimitado ? `${cuota.usados_mes}` : `${cuota.usados_mes}/${cuota.limite_mes}`}
                  </span>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>{cuota.ilimitado ? "usados (ilimitado)" : "usados"}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Geist Mono',monospace", background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE", borderRadius: 999, padding: "2px 8px" }}>{cuota.plan.toUpperCase()}</span>
                </div>
                {!cuota.ilimitado && (
                  <div style={{ width: 180, height: 4, background: "#F1F5F9", borderRadius: 999, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min((cuota.usados_mes / cuota.limite_mes) * 100, 100)}%`, height: "100%", background: cuota.restantes <= 0 ? "#EF4444" : "#3B82F6", borderRadius: 999 }} />
                  </div>
                )}
              </div>
              {!cuota.ilimitado && cuota.restantes <= 0 && (
                <div style={{ padding: "8px 14px", background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#9F1239" }}>Cuota agotada</div>
                  <a href="mailto:luis@plinius.mx?subject=Upgrade%20de%20plan" style={{ fontSize: 11, color: "#1E40AF", fontWeight: 600, textDecoration: "none" }}>Upgrade a {cuota.plan === "basic" ? "Pro" : "Enterprise"} &rarr;</a>
                </div>
              )}
            </div>
          )}

          {/* Solicitar button */}
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={() => setShowSolicitarModal(true)}
              disabled={cuota != null && !cuota.ilimitado && cuota.restantes <= 0}
              style={{
                height: 42, padding: "0 22px", borderRadius: 10, border: "none",
                background: (cuota && !cuota.ilimitado && cuota.restantes <= 0) ? "#E2E8F0" : "linear-gradient(135deg,#0C1E4A,#1B3F8A)",
                color: (cuota && !cuota.ilimitado && cuota.restantes <= 0) ? "#94A3B8" : "#fff",
                fontSize: 13, fontWeight: 700, cursor: (cuota && !cuota.ilimitado && cuota.restantes <= 0) ? "not-allowed" : "pointer",
                fontFamily: "'Geist',sans-serif", boxShadow: (cuota && !cuota.ilimitado && cuota.restantes <= 0) ? "none" : "0 2px 12px rgba(12,30,74,.22)",
              }}
            >
              Solicitar Reporte Crediticio
            </button>
          </div>

          {/* Historial */}
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Historial de reportes</div>
          {reportes.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: "40px 20px", color: "#94A3B8" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sin reportes crediticios</div>
              <div style={{ fontSize: 12 }}>Solicita el primer reporte para este cliente.</div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 100px 100px 1fr 90px", padding: "10px 16px", background: "#FAFBFF", borderBottom: "1px solid #E8EDF5" }}>
                {["Solicitado","Estado","Score","Notas","Acciones"].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono',monospace", letterSpacing: ".06em", textTransform: "uppercase" }}>{h}</div>)}
              </div>
              {reportes.map(r => {
                const estS: Record<string, { bg: string; color: string; border: string; label: string }> = {
                  pendiente:  { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A", label: "Pendiente" },
                  procesando: { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE", label: "Procesando" },
                  completado: { bg: "#F0FDF9", color: "#065F46", border: "#A7F3D0", label: "Completado" },
                  cancelado:  { bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0", label: "Cancelado" },
                };
                const es = estS[r.estado] ?? estS.pendiente;
                return (
                  <div key={r.id} style={{ display: "grid", gridTemplateColumns: "120px 100px 100px 1fr 90px", padding: "12px 16px", borderBottom: "1px solid #F8FAFC", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#64748B" }}>{new Date(r.solicitado_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Geist Mono',monospace", background: es.bg, color: es.color, border: `1px solid ${es.border}`, borderRadius: 999, padding: "3px 8px", justifySelf: "start" }}>{es.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Geist Mono',monospace", color: scoreColor(r.score) }}>{r.score ?? "—"}</span>
                    <span style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.lender_notas ?? "—"}</span>
                    <div>
                      {r.estado === "completado" && r.reporte_pdf_url ? (
                        <button onClick={() => descargarPdf(r.id)} style={{ fontSize: 11, fontWeight: 600, color: "#1E40AF", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>Descargar</button>
                      ) : (
                        <span style={{ fontSize: 10, color: "#94A3B8" }}>Esperando...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal solicitar */}
          {showSolicitarModal && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(6px)", zIndex: 100, display: "grid", placeItems: "center", padding: 16 }} onClick={() => setShowSolicitarModal(false)}>
              <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460, padding: "28px 32px", boxShadow: "0 32px 80px rgba(15,23,42,.25)" }} onClick={e => e.stopPropagation()}>
                <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 8 }}>Solicitar Reporte Crediticio</h3>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 20 }}>
                  Se generará un reporte crediticio integral de <strong>{client?.company_name}</strong> incluyendo situación en Buró, análisis fiscal y scoring propietario.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>Notas u observaciones (opcional)</label>
                  <textarea value={solicitarNotas} onChange={e => setSolicitarNotas(e.target.value)} rows={3} placeholder="Contexto adicional para el equipo de análisis..." style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid #E2E8F0", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#0F172A", background: "#F8FAFC", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setShowSolicitarModal(false)} style={{ flex: 1, height: 42, borderRadius: 10, border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>Cancelar</button>
                  <button onClick={solicitarReporte} disabled={solicitando} style={{ flex: 1, height: 42, borderRadius: 10, border: "none", background: "linear-gradient(135deg,#0C1E4A,#1B3F8A)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif", opacity: solicitando ? 0.6 : 1 }}>
                    {solicitando ? "Solicitando..." : `Solicitar reporte${cuota && !cuota.ilimitado ? ` (usa 1 de ${cuota.limite_mes})` : ""}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB: Notas */}
      {tab === "notas" && (
        <>
          <div style={{ ...S.card, display: "flex", gap: 10 }}>
            <input style={{ ...S.inp, flex: 1 }} placeholder="Agregar nota..." value={notaDraft} onChange={e => setNotaDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && addNota()} />
            <button onClick={addNota} style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: "#0C1E4A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif", whiteSpace: "nowrap" }}>Guardar nota</button>
          </div>
          {notas.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: "40px 20px", color: "#94A3B8" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sin notas</div>
              <div style={{ fontSize: 12 }}>Agrega la primera nota sobre este cliente.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {notas.map(n => (
                <div key={n.id} style={{ ...S.card, padding: "14px 18px", marginBottom: 0, position: "relative" }}>
                  {n.pinned && <span style={{ position: "absolute", top: 10, right: 12, fontSize: 9, fontWeight: 700, background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A", borderRadius: 999, padding: "2px 8px" }}>FIJADA</span>}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>{n.author_name}</span>
                    <span style={{ fontSize: 11, color: "#CBD5E1" }}>{ago(n.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{n.contenido}</div>
                  <button onClick={() => deleteNota(n.id)} style={{ marginTop: 8, fontSize: 11, color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontFamily: "'Geist',sans-serif", padding: 0 }}>Eliminar</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB: Actividad */}
      {tab === "actividad" && (
        <div style={{ ...S.card, textAlign: "center", padding: "60px 20px", color: "#94A3B8" }}>
          <Ic d="M8 2v12M2 8h12" s={32} c="#E2E8F0" />
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12, color: "#475569" }}>Timeline de actividades</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Pr&oacute;ximamente</div>
        </div>
      )}
    </div>
  );
}
