"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ClientWizard from "@/components/clients/ClientWizard";

function Ic({ d, s = 14, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

type Client = Record<string, any>;
type StatusKey = "Todos" | "Active" | "Onboarding" | "Paused" | "Risk Hold";

const STATUS_S: Record<string, { bg: string; color: string; border: string; label: string }> = {
  Active:      { bg: "#F0FDF9", color: "#065F46", border: "#A7F3D0", label: "Activo" },
  Onboarding:  { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE", label: "Onboarding" },
  Paused:      { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A", label: "Pausado" },
  "Risk Hold": { bg: "#FFF1F2", color: "#9F1239", border: "#FECDD3", label: "Risk Hold" },
};

const SECTOR_COLORS: Record<string, { bg: string; color: string }> = {
  comercio:      { bg: "#EFF6FF", color: "#1E40AF" },
  manufactura:   { bg: "#FFF7ED", color: "#92400E" },
  servicios:     { bg: "#F0FDF9", color: "#065F46" },
  agro:          { bg: "#ECFDF5", color: "#047857" },
  construccion:  { bg: "#FFFBEB", color: "#854D0E" },
  tecnologia:    { bg: "#FDF4FF", color: "#7E22CE" },
  salud:         { bg: "#FFF1F2", color: "#9F1239" },
};

const FILTER_TABS: StatusKey[] = ["Todos", "Active", "Onboarding", "Paused", "Risk Hold"];
const SECTORES = ["","comercio","manufactura","servicios","agro","construccion","tecnologia","salud","educacion","transporte","energia","otro"];
const TIPOS_CRED = ["","capital_trabajo","expansion","refinanciamiento","maquinaria","inventario","otro"];

function fmt(n: number | null) {
  if (n == null) return "\u2014";
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
  if (s == null) return "#CBD5E1";
  if (s >= 80) return "#059669";
  if (s >= 60) return "#F59E0B";
  return "#EF4444";
}

export default function ClientesPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filter, setFilter] = useState<StatusKey>("Todos");
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  async function load() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const res = await fetch("/api/clients", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const j = await res.json();
      setClients(j.clients ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = clients;
    if (filter !== "Todos") list = list.filter(c => c.status === filter);
    if (sectorFilter) list = list.filter(c => c.sector === sectorFilter);
    if (tipoFilter) list = list.filter(c => c.tipo_credito_solicitado === tipoFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.company_name ?? "").toLowerCase().includes(q) ||
        (c.rfc ?? "").toLowerCase().includes(q) ||
        (c.rep_legal_nombre ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [clients, filter, search, sectorFilter, tipoFilter]);

  const total = clients.length;
  const active = clients.filter(c => c.status === "Active").length;
  const onboarding = clients.filter(c => c.status === "Onboarding").length;
  const avgScore = (() => {
    const withScore = clients.map(c => c.client_connectors?.[0]?.buro_score).filter((s): s is number => s != null);
    return withScore.length ? Math.round(withScore.reduce((a, b) => a + b, 0) / withScore.length) : null;
  })();

  return (
    <div style={{ fontFamily: "'Geist',sans-serif", color: "#0F172A" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both;}
        .d1{animation-delay:.05s;}.d2{animation-delay:.10s;}
        .trow{display:grid;grid-template-columns:1fr 110px 140px 110px 100px 100px 90px 44px;align-items:center;padding:12px 16px;border-bottom:1px solid #F1F5F9;transition:background .12s;cursor:pointer;}
        .trow:last-child{border-bottom:none;}
        .trow:hover{background:#FAFBFF;}
      `}</style>

      <ClientWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onCreated={load} />

      {/* Header */}
      <div className="fade" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 }}>Clientes</h1>
          <p style={{ fontSize: 13, color: "#64748B" }}>Cartera de empresas evaluadas y acreditadas</p>
        </div>
        <button onClick={() => setWizardOpen(true)} style={{ height: 40, padding: "0 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#0C1E4A,#1B3F8A)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 12px rgba(12,30,74,.22)" }}>
          <Ic d="M8 2v12M2 8h12" c="#fff" s={13} /> Nuevo cliente
        </button>
      </div>

      {/* KPIs */}
      <div className="fade d1" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total clientes", val: total, color: "#5B8DEF", icon: "M5.5 7.5a2.5 2.5 0 100-5M1 14s.5-4 4.5-4M11 10l2 2 2-2" },
          { label: "Activos", val: active, color: "#00E5A0", icon: "M4 8l3.5 3.5L13 4" },
          { label: "En onboarding", val: onboarding, color: "#3B82F6", icon: "M8 2a6 6 0 100 12M8 6v2.5M8 11h.01" },
          { label: "Score promedio", val: avgScore ?? "\u2014", color: "#F5A623", icon: "M2 12L6 7l3 3 3-4 2 2" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", fontFamily: "'Geist Mono',monospace", letterSpacing: ".08em", textTransform: "uppercase" }}>{k.label}</div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${k.color}18`, display: "grid", placeItems: "center" }}>
                <Ic d={k.icon} s={13} c={k.color} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", color: "#0F172A" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="fade d2" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {FILTER_TABS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 13px", borderRadius: 8, fontSize: 12, fontWeight: filter === f ? 700 : 500,
              cursor: "pointer", fontFamily: "'Geist',sans-serif", border: "1.5px solid",
              background: filter === f ? "#0C1E4A" : "#fff", color: filter === f ? "#fff" : "#64748B",
              borderColor: filter === f ? "#0C1E4A" : "#E2E8F0",
            }}>
              {f === "Todos" ? "Todos" : STATUS_S[f]?.label ?? f}
            </button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 11, top: 9 }}><Ic d="M6.5 11a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM10 10l4 4" s={14} c="#94A3B8" /></div>
          <input
            placeholder="Buscar por raz\u00F3n social, RFC o representante..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ height: 36, width: 320, padding: "0 12px 0 34px", borderRadius: 9, border: "1.5px solid #E2E8F0", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#0F172A", background: "#fff", outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} style={{ height: 36, borderRadius: 9, border: "1.5px solid #E2E8F0", padding: "0 10px", fontSize: 12, fontFamily: "'Geist',sans-serif", color: "#374151", background: "#fff", cursor: "pointer", outline: "none" }}>
          <option value="">Sector</option>
          {SECTORES.filter(Boolean).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} style={{ height: 36, borderRadius: 9, border: "1.5px solid #E2E8F0", padding: "0 10px", fontSize: 12, fontFamily: "'Geist',sans-serif", color: "#374151", background: "#fff", cursor: "pointer", outline: "none" }}>
          <option value="">Tipo cr\u00E9dito</option>
          {TIPOS_CRED.filter(Boolean).map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 140px 110px 100px 100px 90px 44px", padding: "10px 16px", background: "#FAFBFF", borderBottom: "1px solid #E8EDF5" }}>
          {["Empresa", "Sector", "Representante", "Monto", "Estatus", "Score", "Actividad", ""].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", fontFamily: "'Geist Mono',monospace", letterSpacing: ".06em", textTransform: "uppercase" }}>{h}</div>
          ))}
        </div>

        {loading && (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Cargando clientes...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#F1F5F9", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <Ic d="M5.5 7.5a2.5 2.5 0 100-5M1 14s.5-4 4.5-4M11 10l2 2 2-2" s={24} c="#94A3B8" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>
              {filter === "Todos" && !search ? "A\u00FAn no tienes clientes" : "Sin resultados"}
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 16 }}>
              {filter === "Todos" && !search ? "Agrega tu primer cliente para comenzar a gestionar tu cartera." : "Intenta con otros filtros."}
            </div>
            {filter === "Todos" && !search && (
              <button onClick={() => setWizardOpen(true)} style={{ height: 38, padding: "0 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#0C1E4A,#1B3F8A)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>
                Nuevo cliente
              </button>
            )}
          </div>
        )}

        {!loading && filtered.map(c => {
          const st = STATUS_S[c.status] ?? STATUS_S.Onboarding;
          const sc = c.client_connectors?.[0]?.buro_score ?? null;
          const sec = SECTOR_COLORS[c.sector] ?? { bg: "#F8FAFC", color: "#475569" };
          return (
            <div key={c.id} className="trow" onClick={() => router.push(`/dashboard/clientes/${c.id}`)}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{c.company_name}</div>
                {c.rfc && <div style={{ fontSize: 10, fontFamily: "'Geist Mono',monospace", color: "#94A3B8", marginTop: 2 }}>{c.rfc}</div>}
              </div>
              <div>
                {c.sector && <span style={{ fontSize: 10, fontWeight: 600, background: sec.bg, color: sec.color, borderRadius: 6, padding: "2px 8px" }}>{c.sector}</span>}
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>{c.rep_legal_nombre ?? "\u2014"}</div>
              <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'Geist Mono',monospace" }}>{fmt(c.monto_solicitado_mxn)}</div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'Geist Mono',monospace", background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 999, padding: "3px 9px", letterSpacing: ".04em" }}>
                  {st.label}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Geist Mono',monospace", color: scoreColor(sc) }}>{sc ?? "\u2014"}</span>
                {sc != null && (
                  <div style={{ width: 40, height: 4, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(sc, 100)}%`, height: "100%", background: scoreColor(sc), borderRadius: 999 }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>{c.updated_at ? ago(c.updated_at) : c.created_at ? ago(c.created_at) : "\u2014"}</div>
              <Link href={`/dashboard/clientes/${c.id}`} onClick={e => e.stopPropagation()} style={{ width: 28, height: 28, borderRadius: 7, background: "#F8FAFC", border: "1px solid #E8EDF5", display: "grid", placeItems: "center", color: "#94A3B8", textDecoration: "none" }}>
                <Ic d="M3 8h10M8 4l4 4-4 4" s={12} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
