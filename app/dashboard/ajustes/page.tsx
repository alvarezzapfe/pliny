"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Building2,
  User,
  Bell,
  ShieldCheck,
  Palette,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "perfil" | "seguridad" | "notificaciones" | "apariencia";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "perfil",         label: "Perfil de empresa", icon: <Building2 size={14} /> },
  { id: "seguridad",      label: "Seguridad",          icon: <ShieldCheck size={14} /> },
  { id: "notificaciones", label: "Notificaciones",     icon: <Bell size={14} /> },
  { id: "apariencia",     label: "Apariencia",         icon: <Palette size={14} /> },
];

const INSTITUTION_TYPES = [
  { value: "banco",           label: "Banco" },
  { value: "sofom",           label: "SOFOM" },
  { value: "sofipo",          label: "SOFIPO" },
  { value: "union_credito",   label: "Unión de Crédito" },
  { value: "caja_popular",    label: "Caja Popular" },
  { value: "arrendadora",     label: "Arrendadora" },
  { value: "empresa_privada", label: "Empresa Privada" },
  { value: "otro",            label: "Otro" },
];

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
  page: {
    fontFamily: "'Geist', system-ui, sans-serif",
    color: "#0F172A",
  } as React.CSSProperties,

  pageHeader: {
    marginBottom: 28,
  } as React.CSSProperties,
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0F172A",
    letterSpacing: "-0.03em",
    lineHeight: 1.2,
  } as React.CSSProperties,
  pageSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  } as React.CSSProperties,

  tabBar: {
    display: "flex",
    gap: 6,
    marginBottom: 28,
    overflowX: "auto" as const,
    paddingBottom: 2,
  } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 14px",
    borderRadius: 9,
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    cursor: "pointer",
    border: "none",
    whiteSpace: "nowrap",
    transition: "background .14s, color .14s",
    background: active ? "#071A3A" : "rgba(15,23,42,0.06)",
    color: active ? "#fff" : "#475569",
  }),

  card: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.08)",
    marginBottom: 16,
    overflow: "hidden",
  } as React.CSSProperties,
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderBottom: "1px solid rgba(15,23,42,0.07)",
  } as React.CSSProperties,
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#0F172A",
  } as React.CSSProperties,
  cardBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: "#64748B",
    background: "#F1F5F9",
    padding: "2px 8px",
    borderRadius: 20,
  } as React.CSSProperties,
  cardMeta: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    color: "#94A3B8",
  } as React.CSSProperties,
  cardBody: {
    padding: "20px",
  } as React.CSSProperties,

  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  } as React.CSSProperties,

  fieldWrap: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  } as React.CSSProperties,
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#475569",
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,
  fieldHint: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  } as React.CSSProperties,

  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 9,
    border: "1px solid #E2E8F0",
    background: "#F8FAFC",
    fontSize: 13,
    color: "#0F172A",
    outline: "none",
    transition: "border .14s, background .14s",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  select: {
    width: "100%",
    padding: "9px 32px 9px 12px",
    borderRadius: 9,
    border: "1px solid #E2E8F0",
    background: "#F8FAFC",
    fontSize: 13,
    color: "#0F172A",
    outline: "none",
    appearance: "none" as const,
    cursor: "pointer",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,

  saveBtn: (saving: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 18px",
    borderRadius: 9,
    border: "none",
    background: saving ? "#334155" : "#071A3A",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: saving ? "not-allowed" : "pointer",
    opacity: saving ? 0.7 : 1,
    transition: "background .14s",
  }),

  toast: (type: "success" | "error"): React.CSSProperties => ({
    position: "fixed",
    bottom: 24,
    right: 24,
    zIndex: 999,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 16px",
    borderRadius: 12,
    background: "#fff",
    border: `1px solid ${type === "success" ? "#D1FAE5" : "#FEE2E2"}`,
    boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
    fontSize: 13,
    fontWeight: 500,
    color: type === "success" ? "#065F46" : "#991B1B",
  }),

  placeholder: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    gap: 12,
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: 500,
  } as React.CSSProperties,
};

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={S.toast(type)}>
      {type === "success"
        ? <CheckCircle2 size={15} color="#10B981" />
        : <AlertCircle size={15} color="#EF4444" />}
      {message}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={S.fieldWrap}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
      {hint && <p style={S.fieldHint}>{hint}</p>}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ title, badge, meta, children }: { title: string; badge?: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={S.cardTitle}>{title}</span>
          {badge && <span style={S.cardBadge}>{badge}</span>}
        </div>
        {meta && <div style={S.cardMeta}>{meta}</div>}
      </div>
      <div style={S.cardBody}>{children}</div>
    </div>
  );
}

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────

function TabPerfil() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [userId, setUserId]   = useState<string | null>(null);
  const [toast, setToast]     = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    institution_type:             "",
    institution_name:             "",
    rfc:                          "",
    legal_rep_first_names:        "",
    legal_rep_last_name_paternal: "",
    legal_rep_email:              "",
    legal_rep_phone_country:      "+52",
    legal_rep_phone_national:     "",
  });

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      setUserId(auth.user.id);

      const { data } = await supabase
        .from("lenders_profile")
        .select("institution_type,institution_name,rfc,legal_rep_first_names,legal_rep_last_name_paternal,legal_rep_email,legal_rep_phone_country,legal_rep_phone_national")
        .eq("owner_id", auth.user.id)
        .maybeSingle();

      if (data) setForm({
        institution_type:             data.institution_type             ?? "",
        institution_name:             data.institution_name             ?? "",
        rfc:                          data.rfc                          ?? "",
        legal_rep_first_names:        data.legal_rep_first_names        ?? "",
        legal_rep_last_name_paternal: data.legal_rep_last_name_paternal ?? "",
        legal_rep_email:              data.legal_rep_email              ?? "",
        legal_rep_phone_country:      data.legal_rep_phone_country      ?? "+52",
        legal_rep_phone_national:     data.legal_rep_phone_national     ?? "",
      });

      setLoading(false);
    })();
  }, []);

  function set(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("lenders_profile")
        .upsert({ owner_id: userId, ...form, rfc: form.rfc.toUpperCase().trim() }, { onConflict: "owner_id" });
      if (error) throw error;
      setToast({ type: "success", message: "Perfil actualizado correctamente." });
    } catch {
      setToast({ type: "error", message: "Error al guardar. Intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={S.placeholder}>
      <Loader2 size={20} style={{ opacity: 0.3 }} />
      Cargando perfil...
    </div>
  );

  return (
    <>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <Card title="Institución" badge="Datos fiscales" meta={<><Building2 size={12} /> Otorgante</>}>
        <div style={S.grid2}>
          <Field label="Tipo de institución">
            <div style={{ position: "relative" }}>
              <select style={S.select} value={form.institution_type} onChange={e => set("institution_type", e.target.value)}>
                <option value="">Selecciona tipo</option>
                {INSTITUTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <ChevronRight size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: "#94A3B8", pointerEvents: "none" }} />
            </div>
          </Field>

          <Field label="Razón social">
            <input style={S.input} placeholder="Ej. Financiera Norte SA de CV" value={form.institution_name} onChange={e => set("institution_name", e.target.value)} />
          </Field>

          <Field label="RFC" hint="12 o 13 caracteres. Se guarda en mayúsculas.">
            <input style={S.input} placeholder="Ej. FNO910101ABC" value={form.rfc} onChange={e => set("rfc", e.target.value.toUpperCase())} maxLength={13} />
          </Field>
        </div>
      </Card>

      <Card title="Representante legal" badge="Contacto principal" meta={<><User size={12} /> Rep. legal</>}>
        <div style={S.grid2}>
          <Field label="Nombre(s)">
            <input style={S.input} placeholder="Ej. Carlos Alberto" value={form.legal_rep_first_names} onChange={e => set("legal_rep_first_names", e.target.value)} />
          </Field>

          <Field label="Apellido paterno">
            <input style={S.input} placeholder="Ej. Martínez" value={form.legal_rep_last_name_paternal} onChange={e => set("legal_rep_last_name_paternal", e.target.value)} />
          </Field>

          <Field label="Correo electrónico">
            <input style={S.input} type="email" placeholder="rep@empresa.com" value={form.legal_rep_email} onChange={e => set("legal_rep_email", e.target.value)} />
          </Field>

          <Field label="Teléfono">
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...S.input, width: 70, flexShrink: 0 }} placeholder="+52" value={form.legal_rep_phone_country} onChange={e => set("legal_rep_phone_country", e.target.value)} maxLength={4} />
              <input style={S.input} placeholder="55 1234 5678" value={form.legal_rep_phone_national} onChange={e => set("legal_rep_phone_national", e.target.value)} maxLength={10} />
            </div>
          </Field>
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button style={S.saveBtn(saving)} onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} /> : <Save size={14} />}
          Guardar cambios
        </button>
      </div>
    </>
  );
}

// ─── Tab placeholder ──────────────────────────────────────────────────────────

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div style={S.card}>
      <div style={S.placeholder}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F1F5F9", display: "grid", placeItems: "center" }}>
          <Loader2 size={18} style={{ opacity: 0.25 }} />
        </div>
        <span>{label} — disponible pronto.</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AjustesPage() {
  const [active, setActive] = useState<Tab>("perfil");

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <h1 style={S.pageTitle}>Configuración</h1>
        <p style={S.pageSubtitle}>Perfil de empresa, seguridad y preferencias.</p>
      </div>

      <div style={S.tabBar}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActive(tab.id)} style={S.tab(active === tab.id)}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {active === "perfil"         && <TabPerfil />}
      {active === "seguridad"      && <TabPlaceholder label="Seguridad" />}
      {active === "notificaciones" && <TabPlaceholder label="Notificaciones" />}
      {active === "apariencia"     && <TabPlaceholder label="Apariencia" />}
    </div>
  );
}
