"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Applicant = { id: string; status: string; email: string | null; full_name: string | null; data: Record<string, unknown> | null; failed_rules: unknown; created_at: string; updated_at: string | null };
type Status = "loading" | "no_lender" | "requires_pro" | "ready";

const STATUS_META: Record<string, { emoji: string; label: string; bg: string; color: string; border: string }> = {
  submitted:       { emoji: "📥", label: "Enviada",       bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0" },
  pre_approved:    { emoji: "🟢", label: "Pre-aprobada",  bg: "#F0FDF9", color: "#065F46", border: "#A7F3D0" },
  pending_review:  { emoji: "🟡", label: "Revisión",      bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  in_review:       { emoji: "🔵", label: "En revisión",   bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
  docs_requested:  { emoji: "📄", label: "Docs pedidos",  bg: "#FDF4FF", color: "#7E22CE", border: "#E9D5FF" },
  approved:        { emoji: "✅", label: "Aprobada",      bg: "#ECFDF5", color: "#047857", border: "#6EE7B7" },
  rejected:        { emoji: "❌", label: "Rechazada",     bg: "#FFF1F2", color: "#9F1239", border: "#FECDD3" },
  abandoned:       { emoji: "⚫", label: "Abandonada",    bg: "#F1F5F9", color: "#475569", border: "#CBD5E1" },
};

function ago(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `hace ${days}d`;
  return `hace ${Math.floor(days / 7)}sem`;
}

function fmtMoney(n: unknown): string {
  const num = Number(n);
  if (isNaN(num)) return "—";
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toLocaleString("es-MX")}`;
}

export default function ApplicantsListPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [token, setToken] = useState("");

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setToken(session.access_token);
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (search) params.set("search", search);
    const res = await fetch(`/api/onb-applicants/admin/list?${params}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.status === 404) { setStatus("no_lender"); return; }
    if (res.status === 402) { setStatus("requires_pro"); return; }
    if (!res.ok) return;
    const j = await res.json();
    setApplicants(j.applicants ?? []);
    setTotal(j.total ?? 0);
    setStatus("ready");
  }

  useEffect(() => { load(); }, [filter, search]);

  const S = {
    page: { fontFamily: "'Geist', sans-serif", color: "#0F172A" } as React.CSSProperties,
    btn: { height: 36, padding: "0 14px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 12, fontWeight: 500 as const, cursor: "pointer", fontFamily: "'Geist', sans-serif" } as React.CSSProperties,
    btnActive: { background: "#0C1E4A", color: "#fff", borderColor: "#0C1E4A", fontWeight: 700 as const } as React.CSSProperties,
  };

  if (status === "loading") return <div style={{ padding: 40, color: "#94A3B8", fontFamily: "'Geist',sans-serif" }}>Cargando...</div>;
  if (status === "no_lender") return <div style={{ ...S.page, padding: "60px 20px", textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Configura tu portal primero</div><a href="/dashboard/applicants" style={{ color: "#1E40AF", fontSize: 13 }}>Configurar portal →</a></div>;
  if (status === "requires_pro") return <div style={{ ...S.page, padding: "60px 20px", textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Esta función requiere plan PRO</div><a href="/dashboard/plan" style={{ color: "#1E40AF", fontSize: 13 }}>Actualizar plan →</a></div>;

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');
        .app-row{display:grid;grid-template-columns:110px 1fr 120px 100px;padding:12px 16px;border-bottom:1px solid #F1F5F9;align-items:center;cursor:pointer;transition:background .12s;}
        .app-row:hover{background:#FAFBFF;}
        @media(max-width:640px){.app-row{grid-template-columns:1fr;gap:6px;}}
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Applicants</h1>
          <p style={{ fontSize: 13, color: "#64748B" }}>Solicitudes recibidas en tu portal de onboarding</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button style={{ ...S.btn, ...(filter === "" ? S.btnActive : {}) }} onClick={() => setFilter("")}>Todos</button>
        {Object.entries(STATUS_META).map(([k, v]) => (
          <button key={k} style={{ ...S.btn, ...(filter === k ? S.btnActive : {}) }} onClick={() => setFilter(k)}>{v.emoji} {v.label}</button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} style={{ height: 36, width: 220, padding: "0 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 13, fontFamily: "'Geist',sans-serif", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 120px 100px", padding: "10px 16px", background: "#FAFBFF", borderBottom: "1px solid #E8EDF5" }}>
          {["Status", "Empresa", "Monto", "Fecha"].map(h => <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono',monospace", letterSpacing: ".06em", textTransform: "uppercase" }}>{h}</div>)}
        </div>

        {applicants.length === 0 && (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
            {filter ? "Sin applicants con ese status" : "Sin applicants todavía. Comparte tu portal para empezar."}
          </div>
        )}

        {applicants.map(a => {
          const sm = STATUS_META[a.status] ?? STATUS_META.submitted;
          const d = a.data ?? {};
          return (
            <div key={a.id} className="app-row" onClick={() => router.push(`/dashboard/onboarding/applicants/${a.id}`)}>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Geist Mono',monospace", background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, borderRadius: 999, padding: "3px 9px", display: "inline-flex", alignItems: "center", gap: 4, width: "fit-content" }}>
                {sm.emoji} {sm.label}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{(d.razon_social as string) ?? a.full_name ?? "—"}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{a.email ?? "—"}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Geist Mono',monospace" }}>{fmtMoney(d.monto_solicitado_mxn)}</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{ago(a.created_at)}</div>
            </div>
          );
        })}
      </div>

      {total > 0 && <div style={{ marginTop: 12, fontSize: 12, color: "#94A3B8", textAlign: "center" }}>Mostrando {applicants.length} de {total}</div>}
    </div>
  );
}
