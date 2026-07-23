"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Building2,
  User,
  Users,
  Bell,
  ShieldCheck,
  Palette,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Crown,
  Shield,
  UserCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "perfil" | "usuarios" | "seguridad" | "notificaciones" | "apariencia";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "perfil",         label: "Perfil de empresa", icon: <Building2 size={14} /> },
  { id: "usuarios",       label: "Usuarios",          icon: <Users size={14} /> },
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

// ─── Tab Usuarios ────────────────────────────────────────────────────────────

type EmpresaMember = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  email: string | null;
};

type EmpresaInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
};

type EmpresaInfo = {
  id: string;
  name: string;
  max_seats: number;
  plan: string;
};

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  owner:  { label: "Owner",  color: "#92400E", bg: "#FFFBEB", icon: <Crown size={12} /> },
  admin:  { label: "Admin",  color: "#1E40AF", bg: "#EFF6FF", icon: <Shield size={12} /> },
  member: { label: "Miembro", color: "#065F46", bg: "#F0FDF9", icon: <UserCircle size={12} /> },
};

function TabUsuarios() {
  const [members, setMembers] = useState<EmpresaMember[]>([]);
  const [invitations, setInvitations] = useState<EmpresaInvitation[]>([]);
  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<"member" | "admin">("member");
  const [invSending, setInvSending] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setError("No autenticado"); setLoading(false); return; }

      const res = await fetch("/api/empresa/members", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? `Error ${res.status}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setEmpresa(data.empresa);
      setMembers(data.members ?? []);
      setInvitations(data.invitations ?? []);
      setMyRole(data.my_role);
    } catch (e: any) {
      setError(e.message ?? "Error cargando datos");
    }
    setLoading(false);
  }

  async function sendInvite() {
    if (!invEmail.trim()) return;
    setInvSending(true);
    setInvError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setInvError("No autenticado"); setInvSending(false); return; }

      const res = await fetch("/api/empresa/invitations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: invEmail.trim(), role: invRole }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setInvError(err.error ?? `Error ${res.status}`);
        setInvSending(false);
        return;
      }

      setInvEmail("");
      setInvRole("member");
      setShowInvite(false);
      setInvSending(false);
      loadData(); // Refresh list
    } catch (e: any) {
      setInvError(e.message ?? "Error enviando invitación");
      setInvSending(false);
    }
  }

  const seatCount = members.length + invitations.length;
  const maxSeats = empresa?.max_seats ?? 3;
  const canManage = myRole === "owner" || myRole === "admin";
  const seatsFull = seatCount >= maxSeats;

  if (loading) {
    return (
      <div style={S.card}>
        <div style={S.placeholder}>
          <Loader2 size={18} style={{ opacity: 0.4, animation: "spin 1s linear infinite" }} />
          <span>Cargando equipo...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.card}>
        <div style={S.placeholder}>
          <AlertCircle size={18} style={{ color: "#EF4444" }} />
          <span style={{ color: "#EF4444" }}>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header card */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={S.cardTitle}>Equipo</span>
            <span style={{
              ...S.cardBadge,
              background: seatsFull ? "#FEF2F2" : "#F0FDF9",
              color: seatsFull ? "#991B1B" : "#065F46",
            }}>
              {seatCount}/{maxSeats} asientos
            </span>
          </div>
          {canManage && (
            <button
              onClick={() => { setShowInvite(true); setInvError(null); }}
              disabled={seatsFull}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, border: "none",
                background: seatsFull ? "#E2E8F0" : "#071A3A",
                color: seatsFull ? "#94A3B8" : "#fff",
                fontSize: 12, fontWeight: 600,
                cursor: seatsFull ? "not-allowed" : "pointer",
                transition: "background .14s",
              }}
            >
              <Users size={13} />
              {seatsFull ? "Sin asientos" : "Invitar usuario"}
            </button>
          )}
        </div>
        <div style={S.cardBody}>
          <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
            {empresa?.name ?? "Tu empresa"} — miembros activos con acceso a la cartera.
          </p>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center",
        }} onClick={() => setShowInvite(false)}>
          <div style={{
            background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0F172A" }}>Invitar usuario</h3>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B" }}>
                Se enviará una invitación por correo para unirse a {empresa?.name ?? "tu empresa"}.
              </p>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={S.fieldWrap}>
                <label style={S.fieldLabel}>Email</label>
                <input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  style={S.input}
                  autoFocus
                />
              </div>
              {/* TODO: reactivar selector de rol cuando se aplique migración 004_add_admin_role */}
              {/* <div style={S.fieldWrap}>
                <label style={S.fieldLabel}>Rol</label>
                <select
                  value={invRole}
                  onChange={e => setInvRole(e.target.value as "member" | "admin")}
                  style={S.select}
                >
                  <option value="member">Miembro — ve y opera cartera</option>
                  <option value="admin">Admin — gestiona usuarios y perfil</option>
                </select>
              </div> */}
              {invError && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", borderRadius: 8,
                  background: "#FEF2F2", color: "#991B1B", fontSize: 12,
                }}>
                  <AlertCircle size={14} />
                  {invError}
                </div>
              )}
            </div>
            <div style={{
              padding: "14px 22px", borderTop: "1px solid rgba(15,23,42,0.07)",
              display: "flex", justifyContent: "flex-end", gap: 8,
            }}>
              <button
                onClick={() => setShowInvite(false)}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid #E2E8F0",
                  background: "#fff", color: "#475569", fontSize: 13, fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={sendInvite}
                disabled={invSending || !invEmail.trim()}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: invSending || !invEmail.trim() ? "#94A3B8" : "#071A3A",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  cursor: invSending || !invEmail.trim() ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {invSending && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                {invSending ? "Enviando..." : "Enviar invitación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Miembros activos</span>
        </div>
        <div style={{ padding: 0 }}>
          {members.map((m, i) => {
            const rc = ROLE_CONFIG[m.role] ?? ROLE_CONFIG.member;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 20px",
                  borderBottom: i < members.length - 1 ? "1px solid rgba(15,23,42,0.06)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "#F1F5F9",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#475569",
                  }}>
                    {(m.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>
                      {m.email ?? m.user_id.slice(0, 8) + "..."}
                    </div>
                    {m.joined_at && (
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                        Desde {new Date(m.joined_at).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Role badge */}
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: rc.color,
                  background: rc.bg,
                  padding: "3px 10px",
                  borderRadius: 20,
                }}>
                  {rc.icon}
                  {rc.label}
                </span>
              </div>
            );
          })}

          {members.length === 0 && (
            <div style={{ padding: "24px 20px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
              No hay miembros registrados.
            </div>
          )}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>Invitaciones pendientes</span>
            <span style={S.cardBadge}>{invitations.length}</span>
          </div>
          <div style={{ padding: 0 }}>
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 20px",
                  borderBottom: i < invitations.length - 1 ? "1px solid rgba(15,23,42,0.06)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: "#FEF3C7", display: "grid", placeItems: "center",
                    fontSize: 13, fontWeight: 600, color: "#92400E",
                  }}>
                    {inv.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{inv.email}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                      Expira {new Date(inv.expires_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: "#92400E", background: "#FFFBEB",
                  padding: "3px 10px", borderRadius: 20,
                }}>
                  Pendiente
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
      {active === "usuarios"       && <TabUsuarios />}
      {active === "seguridad"      && <TabPlaceholder label="Seguridad" />}
      {active === "notificaciones" && <TabPlaceholder label="Notificaciones" />}
      {active === "apariencia"     && <TabPlaceholder label="Apariencia" />}
    </div>
  );
}
