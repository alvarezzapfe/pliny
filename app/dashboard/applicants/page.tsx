"use client";

import React, { useEffect, useState } from "react";
import { useLender } from "@/lib/hooks/useLender";
import { LenderSetupWizard } from "@/components/onboarding/LenderSetupWizard";
import { LenderEditModal } from "@/components/onboarding/LenderEditModal";
import { FlowConfigurator } from "@/components/onboarding/FlowConfigurator";
import { ApplicantDetailDrawer } from "@/components/onboarding/ApplicantDetailDrawer";
import { supabase } from "@/lib/supabaseClient";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.plinius.mx";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? "";

type Applicant = {
  id: string; status: string; email: string | null;
  full_name: string | null; phone: string | null;
  created_at: string; completed_at: string | null;
};
type Flow = { id: string; name: string };
type Tab = "solicitudes" | "diseno" | "flow" | "notificaciones";
type PlanKey = "free" | "basic" | "pro";

const STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:       { label: "Borrador",    color: "#475569", bg: "#F8FAFC", border: "#E2E8F0" },
  in_progress: { label: "En progreso", color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
  completed:   { label: "Completada",  color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  rejected:    { label: "Rechazada",   color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" },
};

const TEMPLATES = [
  {
    id: "kyc_basico",
    label: "KYC Básico",
    desc: "Nombre, RFC, CURP, domicilio y documento de identidad.",
    icon: "🪪",
    steps: [
      { id: "s1", title: "Datos personales", order: 1, fields: [
        { id: "f1", label: "Nombre completo", type: "text", required: true },
        { id: "f2", label: "Correo electrónico", type: "email", required: true },
        { id: "f3", label: "Teléfono", type: "phone", required: true },
        { id: "f4", label: "Fecha de nacimiento", type: "date", required: true },
      ]},
      { id: "s2", title: "Datos fiscales", order: 2, fields: [
        { id: "f5", label: "RFC", type: "text", required: true },
        { id: "f6", label: "CURP", type: "text", required: false },
        { id: "f7", label: "Domicilio fiscal", type: "text", required: true },
      ]},
      { id: "s3", title: "Documentos", order: 3, fields: [
        { id: "f8", label: "Identificación oficial", type: "file", required: true, accept: "image/*,application/pdf", maxSizeMB: 5 },
        { id: "f9", label: "Comprobante de domicilio", type: "file", required: true, accept: "image/*,application/pdf", maxSizeMB: 5 },
      ]},
    ],
  },
  {
    id: "pyme_credito",
    label: "PyME Crédito",
    desc: "Información empresarial, financiera y documentos para crédito.",
    icon: "🏢",
    steps: [
      { id: "s1", title: "Empresa", order: 1, fields: [
        { id: "f1", label: "Razón social", type: "text", required: true },
        { id: "f2", label: "RFC empresa", type: "text", required: true },
        { id: "f3", label: "Sector", type: "select", required: true, options: ["Comercio","Manufactura","Servicios","Construcción","Tecnología","Agro","Salud","Otro"] },
        { id: "f4", label: "Antigüedad (años)", type: "number", required: true },
      ]},
      { id: "s2", title: "Financiero", order: 2, fields: [
        { id: "f5", label: "Ventas anuales (MXN)", type: "number", required: true },
        { id: "f6", label: "Monto solicitado (MXN)", type: "number", required: true },
        { id: "f7", label: "Destino del crédito", type: "select", required: true, options: ["Capital de trabajo","Activos fijos","Expansión","Refinanciamiento","Otro"] },
        { id: "f8", label: "Plazo deseado (meses)", type: "number", required: false },
      ]},
      { id: "s3", title: "Representante legal", order: 3, fields: [
        { id: "f9",  label: "Nombre del representante", type: "text", required: true },
        { id: "f10", label: "Correo representante", type: "email", required: true },
        { id: "f11", label: "Teléfono representante", type: "phone", required: true },
      ]},
      { id: "s4", title: "Documentos", order: 4, fields: [
        { id: "f12", label: "Estados financieros (último año)", type: "file", required: true, accept: "application/pdf", maxSizeMB: 10 },
        { id: "f13", label: "Acta constitutiva", type: "file", required: true, accept: "application/pdf", maxSizeMB: 10 },
        { id: "f14", label: "Identificación rep. legal", type: "file", required: true, accept: "image/*,application/pdf", maxSizeMB: 5 },
      ]},
    ],
  },
  {
    id: "sofom",
    label: "SOFOM / Arrendadora",
    desc: "Flow completo con análisis de riesgo, garantías y expediente regulatorio.",
    icon: "🏦",
    steps: [
      { id: "s1", title: "Solicitante", order: 1, fields: [
        { id: "f1", label: "Nombre o razón social", type: "text", required: true },
        { id: "f2", label: "RFC", type: "text", required: true },
        { id: "f3", label: "Tipo de persona", type: "select", required: true, options: ["Persona Física","Persona Moral"] },
        { id: "f4", label: "Correo electrónico", type: "email", required: true },
        { id: "f5", label: "Teléfono", type: "phone", required: true },
      ]},
      { id: "s2", title: "Operación", order: 2, fields: [
        { id: "f6", label: "Tipo de operación", type: "select", required: true, options: ["Crédito simple","Arrendamiento puro","Arrendamiento financiero","Factoraje","Crédito puente"] },
        { id: "f7", label: "Monto (MXN)", type: "number", required: true },
        { id: "f8", label: "Plazo (meses)", type: "number", required: true },
        { id: "f9", label: "Destino específico", type: "text", required: true },
      ]},
      { id: "s3", title: "Garantías", order: 3, fields: [
        { id: "f10", label: "Tipo de garantía", type: "select", required: true, options: ["Hipotecaria","Prendaria","Aval","Fianza","Sin garantía"] },
        { id: "f11", label: "Descripción de garantía", type: "text", required: false },
        { id: "f12", label: "Valor estimado garantía (MXN)", type: "number", required: false },
      ]},
      { id: "s4", title: "Análisis financiero", order: 4, fields: [
        { id: "f13", label: "Ventas anuales (MXN)", type: "number", required: true },
        { id: "f14", label: "EBITDA anual (MXN)", type: "number", required: false },
        { id: "f15", label: "Deuda total vigente (MXN)", type: "number", required: false },
        { id: "f16", label: "¿Tiene historial en Buró?", type: "boolean", required: true },
      ]},
      { id: "s5", title: "Documentos", order: 5, fields: [
        { id: "f17", label: "Estados financieros 2 años", type: "file", required: true, accept: "application/pdf", maxSizeMB: 10 },
        { id: "f18", label: "Declaración anual SAT", type: "file", required: true, accept: "application/pdf", maxSizeMB: 10 },
        { id: "f19", label: "Identificación oficial", type: "file", required: true, accept: "image/*,application/pdf", maxSizeMB: 5 },
        { id: "f20", label: "Acta constitutiva (persona moral)", type: "file", required: false, accept: "application/pdf", maxSizeMB: 10 },
      ]},
    ],
  },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function PlanGate({ plan, required, children }: { plan: PlanKey; required: PlanKey; children: React.ReactNode }) {
  const order: Record<PlanKey, number> = { free: 0, basic: 1, pro: 2 };
  if (order[plan] >= order[required]) return <>{children}</>;
  const labels: Record<PlanKey, string> = { free: "FREE", basic: "BASIC", pro: "PRO" };
  const colors: Record<PlanKey, string> = { free: "#94A3B8", basic: "#38BDF8", pro: "#00E5A0" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 16, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "#F1F5F9", display: "grid", placeItems: "center", fontSize: 24 }}>🔒</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginBottom: 6 }}>Requiere Plan {labels[required]}</div>
        <div style={{ fontSize: 13, color: "#64748B", maxWidth: 320 }}>
          Actualiza tu plan para acceder a esta funcionalidad.
        </div>
      </div>
      <a href="/dashboard/plan" style={{ padding: "10px 24px", borderRadius: 10, background: colors[required], color: required === "pro" ? "#071A3A" : "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", border: "none" }}>
        Ver planes →
      </a>
    </div>
  );
}

function TemplateCard({ t, onApply, applying }: { t: typeof TEMPLATES[0]; onApply: (t: typeof TEMPLATES[0]) => void; applying: boolean }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "18px 20px", cursor: "pointer", transition: "all .15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1B3A6B"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(27,58,107,.08)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{t.label}</div>
      <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5, marginBottom: 14 }}>{t.desc}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "#94A3B8" }}>{t.steps.length} pasos</span>
        <span style={{ fontSize: 11, color: "#E2E8F0" }}>·</span>
        <span style={{ fontSize: 11, color: "#94A3B8" }}>{t.steps.reduce((a, s) => a + s.fields.length, 0)} campos</span>
      </div>
      <button onClick={() => onApply(t)} disabled={applying}
        style={{ width: "100%", height: 34, borderRadius: 9, border: "none", background: "#071A3A", color: "#fff", fontSize: 12, fontWeight: 700, cursor: applying ? "not-allowed" : "pointer", opacity: applying ? 0.6 : 1 }}>
        {applying ? "Aplicando..." : "Usar template →"}
      </button>
    </div>
  );
}

export default function OnboardingDashboard() {
  const { lender, loading, userId, refresh } = useLender();
  const [plan, setPlan]         = useState<PlanKey>("free");
  const [activeTab, setActiveTab] = useState<Tab>("solicitudes");
  const [showSetup, setShowSetup] = useState(false);
  const [showEdit, setShowEdit]   = useState(false);
  const [showFlow, setShowFlow]   = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [flow, setFlow]           = useState<Flow | null>(null);
  const [apLoading, setApLoading] = useState(false);
  const [stats, setStats]         = useState({ total: 0, completed: 0, in_progress: 0, draft: 0, rejected: 0 });
  const [copied, setCopied]       = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [templateApplied, setTemplateApplied]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase.from("plinius_profiles").select("plan").eq("user_id", auth.user.id).maybeSingle();
      setPlan((data?.plan ?? "free") as PlanKey);
    })();
  }, []);

  useEffect(() => {
    if (!lender) return;
    setApLoading(true);
    Promise.all([
      fetch(`/api/onb-applicants?lender_id=${lender.id}&limit=50`, { headers: { "x-admin-secret": ADMIN_SECRET } }).then(r => r.json()),
      fetch(`/api/onb-lenders/${lender.id}/flows`, { headers: { "x-admin-secret": ADMIN_SECRET } }).then(r => r.json()),
    ]).then(([apJson, flowJson]) => {
      const apps: Applicant[] = apJson.applicants ?? [];
      setApplicants(apps);
      setStats({
        total: apps.length, completed: apps.filter(a => a.status === "completed").length,
        in_progress: apps.filter(a => a.status === "in_progress").length,
        draft: apps.filter(a => a.status === "draft").length,
        rejected: apps.filter(a => a.status === "rejected").length,
      });
      const flows = flowJson.flows ?? [];
      if (flows.length > 0) setFlow(flows[0]);
      setApLoading(false);
    }).catch(() => setApLoading(false));
  }, [lender]);

  async function applyTemplate(t: typeof TEMPLATES[0]) {
    if (!lender || !flow) return;
    setApplyingTemplate(true);
    await fetch(`/api/onb-lenders/${lender.id}/flows/${flow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-secret": ADMIN_SECRET },
      body: JSON.stringify({ steps: t.steps }),
    });
    setApplyingTemplate(false);
    setTemplateApplied(t.id);
    setTimeout(() => setTemplateApplied(null), 3000);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${APP_URL}/onboarding/${lender!.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleStatusChange(id: string, status: string) {
    setApplicants(p => p.map(a => a.id === id ? { ...a, status } : a));
  }

  if (loading) return <div style={{ padding: "80px 0", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Cargando...</div>;

  if (!lender && !showSetup) return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 0", textAlign: "center", fontFamily: "'Geist',sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🏦</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 12 }}>Crea tu portal de onboarding</h2>
      <p style={{ fontSize: 15, color: "#64748B", lineHeight: 1.6, marginBottom: 32, maxWidth: 420, margin: "0 auto 32px" }}>
        Recibe solicitudes de crédito directamente en tu portal personalizado. Tarda menos de 3 minutos.
      </p>
      {plan === "free" ? (
        <div style={{ padding: "24px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: "#9A3412", fontWeight: 600, marginBottom: 8 }}>🔒 Requiere Plan BASIC o PRO</div>
          <div style={{ fontSize: 12, color: "#C2410C", marginBottom: 16 }}>El portal de onboarding está disponible desde el plan BASIC.</div>
          <a href="/dashboard/plan" style={{ padding: "9px 20px", borderRadius: 9, background: "#071A3A", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Ver planes →</a>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
            {["Portal personalizado", "Link único", "Solicitudes organizadas", "Templates listos"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", background: "#F1F5F9", padding: "6px 14px", borderRadius: 20, border: "1px solid #E2E8F0" }}>
                <span style={{ color: "#10B981" }}>✓</span> {f}
              </div>
            ))}
          </div>
          <button onClick={() => setShowSetup(true)} style={{ height: 48, padding: "0 32px", borderRadius: 12, border: "none", background: "#1A3A6B", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Configurar mi portal →
          </button>
        </>
      )}
      {showSetup && userId && <LenderSetupWizard userId={userId} adminSecret={ADMIN_SECRET} onDone={() => { setShowSetup(false); refresh(); }}/>}
    </div>
  );

  if (showSetup && userId) return <LenderSetupWizard userId={userId} adminSecret={ADMIN_SECRET} onDone={() => { setShowSetup(false); refresh(); }}/>;

  const portalUrl = `${APP_URL}/onboarding/${lender!.slug}`;
  const primary = lender!.primary_color ?? "#1A3A6B";

  const TABS: { id: Tab; label: string; icon: string; badge?: string }[] = [
    { id: "solicitudes",    label: "Solicitudes",    icon: "M2 2h12v2H2zM2 6h9M2 10h7" },
    { id: "diseno",         label: "Diseño",         icon: "M2 13l4-4 3 3 4-5 3 3", badge: plan === "free" ? "BASIC" : undefined },
    { id: "flow",           label: "Flow",           icon: "M3 4h10M3 8h7M3 12h4M11 9l2 2 3-3", badge: plan === "free" ? "BASIC" : undefined },
    { id: "notificaciones", label: "Notificaciones", icon: "M8 2a5 5 0 00-5 5v1l-1 3h12l-1-3V7a5 5 0 00-5-5zM6 14a2 2 0 004 0", badge: plan !== "pro" ? "PRO" : undefined },
  ];

  return (
    <div style={{ fontFamily: "'Geist',sans-serif", color: "#0F172A" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94A3B8", margin: "0 0 6px" }}>{lender!.name}</p>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.03em", margin: "0 0 6px" }}>Portal de onboarding</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#3B82F6", textDecoration: "none" }}>{portalUrl}</a>
              <button onClick={copyLink} style={{ height: 24, padding: "0 9px", borderRadius: 6, border: "1px solid #E2E8F0", background: copied ? "#ECFDF5" : "#F8FAFC", fontSize: 11, fontWeight: 600, color: copied ? "#059669" : "#475569", cursor: "pointer", fontFamily: "inherit" }}>
                {copied ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{ height: 36, padding: "0 14px", borderRadius: 9, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center" }}>
              Ver portal →
            </a>
            <button onClick={() => setShowEdit(true)} style={{ height: 36, padding: "0 14px", borderRadius: 9, border: "none", background: primary, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Editar portal
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #E2E8F0", paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: "9px 9px 0 0", border: "none", borderBottom: activeTab === tab.id ? `2px solid ${primary}` : "2px solid transparent", background: activeTab === tab.id ? "#fff" : "transparent", color: activeTab === tab.id ? "#0F172A" : "#64748B", fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500, cursor: "pointer", fontFamily: "inherit", position: "relative", marginBottom: -1 }}>
            <svg width={13} height={13} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon}/></svg>
            {tab.label}
            {tab.badge && (
              <span style={{ fontSize: 9, fontWeight: 800, fontFamily: "monospace", background: tab.badge === "PRO" ? "rgba(0,229,160,.15)" : "rgba(56,189,248,.15)", color: tab.badge === "PRO" ? "#00C896" : "#0EA5E9", border: `1px solid ${tab.badge === "PRO" ? "rgba(0,229,160,.3)" : "rgba(56,189,248,.3)"}`, borderRadius: 20, padding: "1px 6px", letterSpacing: ".06em" }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Solicitudes */}
      {activeTab === "solicitudes" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total", val: stats.total, color: "#0F172A" },
              { label: "Completadas", val: stats.completed, color: "#059669" },
              { label: "En progreso", val: stats.in_progress, color: "#1D4ED8" },
              { label: "Borradores", val: stats.draft, color: "#94A3B8" },
              { label: "Rechazadas", val: stats.rejected, color: "#B91C1C" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#94A3B8", margin: "0 0 6px" }}>{s.label}</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0, letterSpacing: "-0.03em" }}>{s.val}</p>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAFAFA" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>Solicitudes</p>
              <span style={{ fontSize: 12, color: "#94A3B8" }}>{applicants.length} total</span>
            </div>
            {apLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Cargando...</div>
            ) : applicants.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 16 }}>Sin solicitudes aún. Comparte tu portal para empezar.</p>
                <button onClick={copyLink} style={{ height: 36, padding: "0 18px", borderRadius: 9, border: "none", background: primary, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Copiar link del portal
                </button>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
                    {["Solicitante", "Status", "Registrado", "Completado", ""].map(h => (
                      <th key={h} style={{ padding: "10px 18px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((app, i) => {
                    const s = STATUS[app.status] ?? STATUS.draft;
                    return (
                      <tr key={app.id} style={{ borderBottom: i < applicants.length - 1 ? "1px solid #F8FAFC" : "none", cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#F8FAFF"}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                        onClick={() => setSelectedApplicant(app.id)}>
                        <td style={{ padding: "12px 18px" }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{app.full_name ?? "—"}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8" }}>{app.email ?? "—"}</p>
                        </td>
                        <td style={{ padding: "12px 18px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 7, background: s.bg, border: `1px solid ${s.border}`, fontSize: 11, fontWeight: 600, color: s.color }}>{s.label}</span>
                        </td>
                        <td style={{ padding: "12px 18px", fontSize: 12, color: "#64748B" }}>{timeAgo(app.created_at)}</td>
                        <td style={{ padding: "12px 18px", fontSize: 12, color: app.completed_at ? "#059669" : "#CBD5E1" }}>{app.completed_at ? timeAgo(app.completed_at) : "—"}</td>
                        <td style={{ padding: "12px 18px" }}>
                          <button onClick={e => { e.stopPropagation(); setSelectedApplicant(app.id); }}
                            style={{ height: 26, padding: "0 10px", borderRadius: 7, border: "1px solid #E2E8F0", background: "#F8FAFC", fontSize: 11, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>
                            Ver detalle →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Tab: Diseño */}
      {activeTab === "diseno" && (
        <PlanGate plan={plan} required="basic">
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Personalización del portal</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Color primario</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="color" defaultValue={lender!.primary_color ?? "#1A3A6B"} style={{ width: 40, height: 36, borderRadius: 8, border: "1px solid #E2E8F0", cursor: "pointer", padding: 2 }}/>
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: "#475569" }}>{lender!.primary_color ?? "#1A3A6B"}</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Color secundario</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="color" defaultValue={lender!.secondary_color ?? "#00C896"} style={{ width: 40, height: 36, borderRadius: 8, border: "1px solid #E2E8F0", cursor: "pointer", padding: 2 }}/>
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: "#475569" }}>{lender!.secondary_color ?? "#00C896"}</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Descripción del portal</label>
                  <textarea defaultValue={lender!.descripcion ?? ""} rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13, color: "#0F172A", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} placeholder="Describe tu institución y proceso de crédito..." />
                </div>
                <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setShowEdit(true)} style={{ height: 36, padding: "0 16px", borderRadius: 9, border: "none", background: "#071A3A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    Guardar cambios
                  </button>
                </div>
              </div>
              {plan === "pro" && (
                <div style={{ background: "rgba(0,229,160,.06)", border: "1px solid rgba(0,229,160,.2)", borderRadius: 14, padding: "16px 20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#00C896", marginBottom: 8 }}>✦ PRO — Dominio personalizado</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input placeholder="solicitudes.tuempresa.com" style={{ flex: 1, height: 36, borderRadius: 9, border: "1px solid rgba(0,229,160,.3)", padding: "0 12px", fontSize: 13, outline: "none", fontFamily: "inherit" }}/>
                    <button style={{ height: 36, padding: "0 14px", borderRadius: 9, border: "none", background: "#00C896", color: "#071A3A", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Configurar</button>
                  </div>
                </div>
              )}
            </div>
            {/* Preview */}
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Preview</div>
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.08)" }}>
                <div style={{ background: lender!.primary_color ?? "#1A3A6B", padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{lender!.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }}>Portal de crédito</div>
                </div>
                <div style={{ padding: "14px 16px", background: "#fff" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Solicita tu crédito</div>
                  <div style={{ height: 8, background: "#F1F5F9", borderRadius: 4, marginBottom: 6 }}/>
                  <div style={{ height: 8, background: "#F1F5F9", borderRadius: 4, width: "70%", marginBottom: 14 }}/>
                  <div style={{ height: 32, borderRadius: 8, background: lender!.primary_color ?? "#1A3A6B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Iniciar solicitud →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PlanGate>
      )}

      {/* Tab: Flow */}
      {activeTab === "flow" && (
        <PlanGate plan={plan} required="basic">
          <div>
            {templateApplied && (
              <div style={{ padding: "10px 16px", background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600, color: "#059669" }}>
                ✓ Template aplicado correctamente. Abre el editor para personalizarlo.
              </div>
            )}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Editor de flow</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>Diseña el proceso de solicitud que verán tus acreditados.</div>
              </div>
              {flow && (
                <button onClick={() => setShowFlow(true)} style={{ height: 38, padding: "0 18px", borderRadius: 10, border: "none", background: "#071A3A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width={13} height={13} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4h10M2 7h10M2 10h6"/></svg>
                  Abrir editor →
                </button>
              )}
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Templates listos para usar</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
              {TEMPLATES.map(t => (
                <TemplateCard key={t.id} t={t} onApply={applyTemplate} applying={applyingTemplate} />
              ))}
            </div>

            {plan === "pro" && (
              <div style={{ background: "rgba(0,229,160,.06)", border: "1px solid rgba(0,229,160,.2)", borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#00C896", marginBottom: 6 }}>✦ PRO — Lógica condicional</div>
                <div style={{ fontSize: 12, color: "#475569" }}>Muestra u oculta campos según las respuestas del solicitante. Disponible en el editor avanzado.</div>
              </div>
            )}
          </div>
        </PlanGate>
      )}

      {/* Tab: Notificaciones */}
      {activeTab === "notificaciones" && (
        <PlanGate plan={plan} required="pro">
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Email de confirmación</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Asunto del email</label>
                <input defaultValue="Recibimos tu solicitud" style={{ width: "100%", height: 36, borderRadius: 9, border: "1px solid #E2E8F0", padding: "0 12px", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}/>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>Cuerpo del mensaje</label>
                <textarea rows={5} defaultValue={`Hola {{nombre}},\n\nHemos recibido tu solicitud correctamente. Nos pondremos en contacto contigo en 24-48 horas.\n\nSaludos,\n${lender!.name}`} style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #E2E8F0", fontSize: 13, color: "#0F172A", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}/>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button style={{ height: 36, padding: "0 16px", borderRadius: 9, border: "none", background: "#071A3A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Guardar configuración
                </button>
              </div>
            </div>
          </div>
        </PlanGate>
      )}

      {/* Modals */}
      {showEdit && <LenderEditModal lender={lender!} adminSecret={ADMIN_SECRET} onDone={() => { setShowEdit(false); refresh(); }}/>}
      {showFlow && flow && (
        <FlowConfigurator lenderId={lender!.id} flowId={flow.id} adminSecret={ADMIN_SECRET}
          primaryColor={primary} secondaryColor={lender!.secondary_color ?? "#00C896"}
          onClose={() => setShowFlow(false)}
        />
      )}
      {selectedApplicant && (
        <ApplicantDetailDrawer applicantId={selectedApplicant} adminSecret={ADMIN_SECRET}
          primaryColor={primary} onClose={() => setSelectedApplicant(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
