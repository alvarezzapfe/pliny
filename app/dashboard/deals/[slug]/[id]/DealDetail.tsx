"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Deal, DealStage, DealType } from "@/lib/deals/types";
import { DEAL_STAGE_VALUES, DEAL_STAGE_LABELS, DEAL_TYPE_LABELS } from "@/lib/deals/types";
import NuevoDealModal from "../NuevoDealModal";
import InvitarExternoModal from "./InvitarExternoModal";

const MONO = "'Geist Mono', monospace";

type TabId = "resumen" | "miembros" | "notas";

interface Props {
  slug: string;
  dealId: string;
}

export default function DealDetail({ slug, dealId }: Props) {
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("resumen");

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [members, setMembers] = useState<Array<{ user_id: string; role: string; is_external: boolean }>>([]);
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; email: string; role: string; expires_at: string }>>([]);

  const fetchDeal = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const res = await fetch(`/api/deals/${dealId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();

    if (!res.ok) { setError(data.error || "Error cargando deal"); setLoading(false); return; }

    setDeal(data.deal);
    setNameValue(data.deal.name);
    setNotesDraft(data.deal.notes || "");
    setLoading(false);
  }, [dealId, router]);

  useEffect(() => { fetchDeal(); }, [fetchDeal]);

  async function fetchMembersAndInvites() {
    const { data: membersData } = await supabase
      .from("deal_members").select("user_id, role, is_external").eq("deal_id", dealId);
    setMembers(membersData || []);

    const { data: invitesData } = await supabase
      .from("deal_invitations").select("id, email, role, expires_at")
      .eq("deal_id", dealId).is("accepted_at", null);
    setPendingInvites(invitesData || []);
  }

  useEffect(() => { if (deal) fetchMembersAndInvites(); }, [deal]);

  async function updateDeal(updates: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (res.ok) { setDeal(data.deal); return true; }
    setError(data.error || "Error actualizando");
    return false;
  }

  async function handleSaveName() {
    if (!nameValue.trim() || nameValue === deal?.name) { setEditingName(false); return; }
    const ok = await updateDeal({ name: nameValue.trim() });
    if (ok) setEditingName(false);
  }

  async function handleStageChange(newStage: DealStage) {
    await updateDeal({ stage: newStage });
  }

  async function handleSaveNotes() {
    if (notesDraft === (deal?.notes || "")) return;
    setNotesSaving(true);
    await updateDeal({ notes: notesDraft });
    setNotesSaving(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        <div style={{ height: 36, width: 200, marginBottom: 16, borderRadius: 8, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ height: 80, marginBottom: 24, borderRadius: 12, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
        <div style={{ height: 300, borderRadius: 12, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div style={{ padding: 32 }}>
        <button onClick={() => router.push(`/dashboard/deals/${slug}`)} style={{
          color: "#5B8DEF", background: "transparent", border: "none", cursor: "pointer",
          fontSize: 13, marginBottom: 16, padding: 0, fontFamily: "'Geist', sans-serif",
        }}>← Pipeline</button>
        <div style={{ padding: 24, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#991B1B" }}>
          {error || "Deal no encontrado"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Geist', sans-serif", color: "#0F172A" }}>
      {/* Breadcrumb */}
      <button onClick={() => router.push(`/dashboard/deals/${slug}`)} style={{
        color: "#64748B", background: "transparent", border: "none", cursor: "pointer",
        fontSize: 12, marginBottom: 16, padding: 0, fontFamily: "'Geist', sans-serif",
      }}>← Pipeline</button>

      {/* Header */}
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1 }}>
            {editingName ? (
              <input value={nameValue} onChange={e => setNameValue(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setNameValue(deal.name); setEditingName(false); } }}
                autoFocus
                style={{
                  fontSize: 24, fontWeight: 700, color: "#0F172A",
                  background: "#F8FAFC", border: "1px solid #93B4F8", borderRadius: 6,
                  padding: "4px 8px", width: "100%", fontFamily: "'Geist', sans-serif",
                  outline: "none",
                }} />
            ) : (
              <h1 onClick={() => setEditingName(true)} style={{
                fontSize: 24, fontWeight: 700, color: "#0F172A", margin: 0,
                cursor: "text", padding: "4px 8px", marginLeft: -8, borderRadius: 6,
                transition: "background .12s", letterSpacing: "-0.02em",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                title="Click para editar"
              >{deal.name}</h1>
            )}

            {/* Metadata */}
            <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{
                background: "#ECFDF5", color: "#065F46", fontSize: 10, fontWeight: 700,
                padding: "3px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: ".04em",
              }}>{DEAL_TYPE_LABELS[deal.type as DealType]}</span>

              <select value={deal.stage} onChange={e => handleStageChange(e.target.value as DealStage)} style={{
                background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE",
                borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 700,
                cursor: "pointer", textTransform: "uppercase", letterSpacing: ".04em",
                fontFamily: "'Geist', sans-serif",
              }}>
                {DEAL_STAGE_VALUES.map(s => (
                  <option key={s} value={s}>{DEAL_STAGE_LABELS[s as DealStage]}</option>
                ))}
              </select>

              {deal.client_name && (
                <span style={{ fontSize: 12, color: "#64748B" }}>
                  Cliente: <strong style={{ color: "#0F172A" }}>{deal.client_name}</strong>
                </span>
              )}

              {deal.amount_mxn != null && (
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: "#0F172A" }}>
                  ${(deal.amount_mxn / 1e6).toFixed(2)}M {deal.currency}
                </span>
              )}

              {deal.target_close_date && (
                <span style={{ fontSize: 11, color: "#64748B", fontFamily: MONO }}>
                  Cierre: {deal.target_close_date}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #E2E8F0" }}>
        {(["resumen", "miembros", "notas"] as TabId[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "transparent", border: "none",
            color: tab === t ? "#0F172A" : "#94A3B8",
            padding: "10px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer",
            borderBottom: tab === t ? "2px solid #0C1E4A" : "2px solid transparent",
            textTransform: "capitalize", marginBottom: -1,
            fontFamily: "'Geist', sans-serif",
          }}>{t}</button>
        ))}
      </div>

      {tab === "resumen" && <ResumenTab deal={deal} onEdit={() => setShowEditModal(true)} />}
      {tab === "miembros" && (
        <MiembrosTab members={members} pendingInvites={pendingInvites} onInvite={() => setShowInviteModal(true)} />
      )}
      {tab === "notas" && <NotasTab value={notesDraft} onChange={setNotesDraft} onBlur={handleSaveNotes} saving={notesSaving} />}

      {showEditModal && deal && (
        <NuevoDealModal
          workspaceId={deal.workspace_id}
          initialDeal={deal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); fetchDeal(); }}
        />
      )}

      {showInviteModal && (
        <InvitarExternoModal
          dealId={dealId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => { setShowInviteModal(false); fetchMembersAndInvites(); }}
        />
      )}
    </div>
  );
}

function ResumenTab({ deal, onEdit }: { deal: Deal; onEdit: () => void }) {
  const rows = [
    { label: "ID", value: deal.id.slice(0, 8) + "...", mono: true },
    { label: "Nombre", value: deal.name },
    { label: "Cliente / Contraparte", value: deal.client_name || "—" },
    { label: "Tipo", value: DEAL_TYPE_LABELS[deal.type as DealType] },
    { label: "Stage", value: DEAL_STAGE_LABELS[deal.stage as DealStage] },
    { label: "Monto", value: deal.amount_mxn ? `$${deal.amount_mxn.toLocaleString("es-MX")} ${deal.currency}` : "—", mono: true },
    { label: "Fecha cierre objetivo", value: deal.target_close_date || "—", mono: true },
    { label: "Creado", value: new Date(deal.created_at).toLocaleString("es-MX"), mono: true },
    { label: "Actualizado", value: new Date(deal.updated_at).toLocaleString("es-MX"), mono: true },
  ];

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24, maxWidth: 700 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={onEdit} style={{
          padding: "7px 14px", borderRadius: 8,
          border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#0F172A",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          fontFamily: "'Geist', sans-serif",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 1.5l3 3L5 14H2v-3l9.5-9.5z" /><path d="M9 4l3 3" />
          </svg>
          Editar
        </button>
      </div>
      {rows.map((row, i) => (
        <div key={row.label} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid #F1F5F9" : "none",
          fontSize: 13,
        }}>
          <span style={{ color: "#64748B" }}>{row.label}</span>
          <span style={{ color: "#0F172A", fontWeight: 600, fontFamily: row.mono ? MONO : "'Geist', sans-serif" }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function MiembrosTab({ members, pendingInvites, onInvite }: {
  members: Array<{ user_id: string; role: string; is_external: boolean }>;
  pendingInvites: Array<{ id: string; email: string; role: string; expires_at: string }>;
  onInvite: () => void;
}) {
  const roleColors: Record<string, { bg: string; color: string }> = {
    lead: { bg: "#DCFCE7", color: "#15803D" },
    contributor: { bg: "#DBEAFE", color: "#1E40AF" },
    viewer: { bg: "#F1F5F9", color: "#475569" },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ color: "#0F172A", fontSize: 16, fontWeight: 600, margin: 0 }}>
          {members.length} {members.length === 1 ? "miembro" : "miembros"}
        </h3>
        <button onClick={onInvite} style={{
          background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)", color: "#fff",
          border: "none", padding: "8px 16px", borderRadius: 8,
          cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Geist', sans-serif",
        }}>+ Invitar externo</button>
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", maxWidth: 700, marginBottom: 24 }}>
        {members.map((m, i) => {
          const colors = roleColors[m.role] || roleColors.viewer;
          return (
            <div key={m.user_id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px",
              borderBottom: i < members.length - 1 ? "1px solid #F1F5F9" : "none",
            }}>
              <div>
                <div style={{ color: "#0F172A", fontSize: 13, fontFamily: "'Geist Mono', monospace" }}>
                  {m.user_id.slice(0, 8)}...
                </div>
                <div style={{ color: "#64748B", fontSize: 11, marginTop: 2 }}>
                  {m.is_external ? "Externo" : "Equipo interno"}
                </div>
              </div>
              <span style={{
                background: colors.bg, color: colors.color,
                fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 4,
                textTransform: "uppercase", letterSpacing: ".04em",
              }}>{m.role}</span>
            </div>
          );
        })}
      </div>

      {pendingInvites.length > 0 && (
        <>
          <h3 style={{ color: "#0F172A", fontSize: 14, fontWeight: 600, margin: "0 0 12px 0" }}>
            Invitaciones pendientes ({pendingInvites.length})
          </h3>
          <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, overflow: "hidden", maxWidth: 700 }}>
            {pendingInvites.map((inv, i) => (
              <div key={inv.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 18px",
                borderBottom: i < pendingInvites.length - 1 ? "1px solid #FDE68A" : "none",
              }}>
                <div>
                  <div style={{ color: "#0F172A", fontSize: 13 }}>{inv.email}</div>
                  <div style={{ color: "#92400E", fontSize: 11, marginTop: 2 }}>
                    Expira: {new Date(inv.expires_at).toLocaleDateString("es-MX")}
                  </div>
                </div>
                <span style={{
                  background: "#FEF3C7", color: "#92400E",
                  fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 4,
                  textTransform: "uppercase", letterSpacing: ".04em",
                }}>{inv.role}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NotasTab({ value, onChange, onBlur, saving }: {
  value: string; onChange: (v: string) => void; onBlur: () => void; saving: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ color: "#94A3B8", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>
          Notas del deal
        </span>
        {saving && <span style={{ color: "#10B981", fontSize: 12 }}>Guardando...</span>}
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur}
        placeholder="Contexto, estructura, próximos pasos, riesgos..."
        rows={20}
        style={{
          width: "100%", padding: 16, background: "#FFFFFF",
          border: "1px solid #E2E8F0", borderRadius: 12,
          color: "#0F172A", fontSize: 14, fontFamily: "'Geist', sans-serif",
          lineHeight: 1.6, resize: "vertical", boxSizing: "border-box" as const,
          outline: "none",
        }} />
      <p style={{ color: "#94A3B8", fontSize: 11, marginTop: 8 }}>
        Las notas se guardan automáticamente al salir del campo.
      </p>
    </div>
  );
}
