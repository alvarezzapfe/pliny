"use client";

import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

// ─── Types ──────────────────────────────────────────────────────────────────

type Fondeador = {
  id: string;
  slug: string;
  nombre: string;
  tipo: string;
  logo_url: string | null;
  descripcion_corta: string | null;
  descripcion_larga: string | null;
  ticket_min_mxn: number | null;
  ticket_max_mxn: number | null;
  moneda: string;
  tasa_estimada_min: number | null;
  tasa_estimada_max: number | null;
  plazo_min_meses: number | null;
  plazo_max_meses: number | null;
  sectores_objetivo: string[] | null;
  requisitos: string[] | null;
  ventajas: string[] | null;
  website: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  destacado: boolean;
};

type TipoKey = "todos" | "banca_desarrollo" | "banca_multiple" | "fondo_deuda_privada" | "family_office" | "fintech_fondeo";

// ─── Constants ──────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  banca_desarrollo: "Banca Desarrollo",
  banca_multiple: "Banca Múltiple",
  fondo_deuda_privada: "Fondo Deuda Privada",
  family_office: "Family Office",
  fintech_fondeo: "Fintech Fondeo",
};

const TIPO_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  banca_desarrollo:    { bg: "#EFF6FF", color: "#1E40AF", border: "#BFDBFE" },
  banca_multiple:      { bg: "#F0FDF9", color: "#065F46", border: "#A7F3D0" },
  fondo_deuda_privada: { bg: "#FDF4FF", color: "#7E22CE", border: "#E9D5FF" },
  family_office:       { bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  fintech_fondeo:      { bg: "#FFF1F2", color: "#9F1239", border: "#FECDD3" },
};

const TABS: { key: TipoKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "banca_desarrollo", label: "Banca Desarrollo" },
  { key: "banca_multiple", label: "Banca Múltiple" },
  { key: "fondo_deuda_privada", label: "Fondos Privados" },
  { key: "family_office", label: "Family Offices" },
  { key: "fintech_fondeo", label: "Fintechs" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-MX")}`;
}

function fmtRange(min: number | null, max: number | null, suffix: string): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `${min}–${max}${suffix}`;
  return `${min ?? max}${suffix}`;
}

function Ic({ d, s = 14, c = "currentColor" }: { d: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none"
      stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const S = {
  page: { fontFamily: "'Geist', sans-serif", color: "#0F172A" } as React.CSSProperties,
  h1: { fontSize: 22, fontWeight: 900, letterSpacing: "-0.04em", marginBottom: 4 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 28 } as React.CSSProperties,
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 } as React.CSSProperties,
  kpi: { background: "#fff", border: "1px solid #E8EDF5", borderRadius: 14, padding: "16px 20px" } as React.CSSProperties,
  kpiLabel: { fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: ".04em", marginBottom: 6 } as React.CSSProperties,
  kpiVal: { fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em" } as React.CSSProperties,
  kpiSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 } as React.CSSProperties,
  tabs: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" as const } as React.CSSProperties,
  tab: (active: boolean) => ({
    padding: "7px 14px", borderRadius: 9, border: "1.5px solid", fontSize: 12, fontWeight: active ? 700 : 500,
    cursor: "pointer", fontFamily: "'Geist', sans-serif", transition: "all .15s",
    background: active ? "#0C1E4A" : "#fff", color: active ? "#fff" : "#64748B",
    borderColor: active ? "#0C1E4A" : "#E2E8F0",
  }) as React.CSSProperties,
  search: {
    height: 36, padding: "0 12px 0 36px", borderRadius: 9, border: "1.5px solid #E2E8F0",
    fontSize: 13, fontFamily: "'Geist', sans-serif", color: "#0F172A", background: "#fff",
    outline: "none", width: 280, boxSizing: "border-box" as const,
  } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 } as React.CSSProperties,
  card: (highlighted: boolean) => ({
    background: "#fff", border: `1.5px solid ${highlighted ? "#FDE68A" : "#E8EDF5"}`, borderRadius: 14,
    padding: "20px", cursor: "pointer", transition: "border-color .15s, box-shadow .15s",
    position: "relative" as const,
  }) as React.CSSProperties,
  badge: { position: "absolute" as const, top: 12, right: 12, fontSize: 9, fontWeight: 800, fontFamily: "'Geist Mono', monospace", letterSpacing: ".08em", background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A", borderRadius: 20, padding: "3px 9px" } as React.CSSProperties,
  tipo: (t: string) => {
    const c = TIPO_COLORS[t] ?? { bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0" };
    return { display: "inline-block", fontSize: 10, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}`, borderRadius: 20, padding: "2px 9px", marginBottom: 8 } as React.CSSProperties;
  },
  cardName: { fontSize: 15, fontWeight: 800, color: "#0F172A", marginBottom: 4, letterSpacing: "-0.02em" } as React.CSSProperties,
  cardDesc: { fontSize: 12, color: "#64748B", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" } as React.CSSProperties,
  cardMeta: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 } as React.CSSProperties,
  metaLabel: { fontSize: 9, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: ".04em" } as React.CSSProperties,
  metaVal: { fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: "'Geist Mono', monospace" } as React.CSSProperties,
  sector: { display: "inline-block", fontSize: 10, fontWeight: 500, background: "#F1F5F9", color: "#475569", borderRadius: 6, padding: "2px 7px", marginRight: 4, marginBottom: 4 } as React.CSSProperties,
  btnPrimary: { height: 34, padding: "0 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Geist', sans-serif" } as React.CSSProperties,
  btnOutline: { height: 34, padding: "0 16px", borderRadius: 9, border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist', sans-serif" } as React.CSSProperties,
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", justifyContent: "flex-end" } as React.CSSProperties,
  drawer: { width: 520, maxWidth: "90vw", height: "100vh", background: "#fff", overflowY: "auto" as const, boxShadow: "-8px 0 40px rgba(15,23,42,.15)", padding: "28px 32px" } as React.CSSProperties,
  toast: { position: "fixed" as const, bottom: 24, right: 24, zIndex: 200, padding: "11px 16px", background: "#fff", border: "1px solid #D1FAE5", borderRadius: 12, fontSize: 13, fontWeight: 600, color: "#065F46", boxShadow: "0 8px 32px rgba(0,0,0,.1)" } as React.CSSProperties,
  empty: { textAlign: "center" as const, padding: "60px 20px", color: "#94A3B8", fontSize: 14 } as React.CSSProperties,
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function FondeoPage() {
  const [fondeadores, setFondeadores] = useState<Fondeador[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TipoKey>("todos");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Fondeador | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/fondeadores", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setFondeadores(json.fondeadores ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const filtered = useMemo(() => {
    let list = fondeadores;
    if (tab !== "todos") list = list.filter(f => f.tipo === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.nombre.toLowerCase().includes(q) ||
        (f.descripcion_corta ?? "").toLowerCase().includes(q) ||
        (f.sectores_objetivo ?? []).some(s => s.includes(q))
      );
    }
    return list;
  }, [fondeadores, tab, search]);

  // KPIs
  const total = fondeadores.length;
  const avgTicket = fondeadores.length
    ? fondeadores.reduce((a, f) => a + ((f.ticket_min_mxn ?? 0) + (f.ticket_max_mxn ?? 0)) / 2, 0) / fondeadores.length
    : 0;
  const avgTasa = fondeadores.filter(f => f.tasa_estimada_min != null && f.tasa_estimada_min > 0).length
    ? fondeadores.filter(f => f.tasa_estimada_min != null && f.tasa_estimada_min > 0)
        .reduce((a, f) => a + ((f.tasa_estimada_min ?? 0) + (f.tasa_estimada_max ?? 0)) / 2, 0)
      / fondeadores.filter(f => f.tasa_estimada_min != null && f.tasa_estimada_min > 0).length
    : 0;
  const byTipo = fondeadores.reduce<Record<string, number>>((acc, f) => {
    acc[f.tipo] = (acc[f.tipo] ?? 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#94A3B8", fontFamily: "'Geist', sans-serif", fontSize: 13 }}>
        Cargando fondeadores...
      </div>
    );
  }

  return (
    <div style={S.page}>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Header */}
      <h1 style={S.h1}>Fondeo Institucional</h1>
      <p style={S.subtitle}>Conecta con fondeadores institucionales para escalar tu originación de crédito</p>

      {/* KPIs */}
      <div style={S.kpiGrid}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Fondeadores disponibles</div>
          <div style={S.kpiVal}>{total}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Ticket promedio</div>
          <div style={S.kpiVal}>{fmtMoney(avgTicket)}</div>
          <div style={S.kpiSub}>MXN</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Tasa promedio mercado</div>
          <div style={S.kpiVal}>{avgTasa.toFixed(1)}%</div>
          <div style={S.kpiSub}>Anual estimada</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>Por tipo</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {Object.entries(byTipo).map(([t, n]) => (
              <span key={t} style={{ ...S.tipo(t), marginBottom: 0 }}>{n} {TIPO_LABELS[t] ?? t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={S.tabs}>
          {TABS.map(t => (
            <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>
              {t.label}{t.key !== "todos" && byTipo[t.key] ? ` (${byTipo[t.key]})` : ""}
            </button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 11, top: 10 }}>
            <Ic d="M6.5 11a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM10 10l4 4" s={14} c="#94A3B8" />
          </div>
          <input
            style={S.search}
            placeholder="Buscar fondeador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>0</div>
          No se encontraron fondeadores con los filtros seleccionados.
        </div>
      ) : (
        <div style={S.grid}>
          {filtered.map(f => (
            <div key={f.id} style={S.card(f.destacado)} onClick={() => setSelected(f)}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#3B82F6"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(59,130,246,.10)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = f.destacado ? "#FDE68A" : "#E8EDF5"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
              {f.destacado && <span style={S.badge}>DESTACADO</span>}
              <span style={S.tipo(f.tipo)}>{TIPO_LABELS[f.tipo] ?? f.tipo}</span>
              <div style={S.cardName}>{f.nombre}</div>
              <div style={S.cardDesc}>{f.descripcion_corta}</div>
              <div style={S.cardMeta}>
                <div>
                  <div style={S.metaLabel}>Ticket</div>
                  <div style={S.metaVal}>{fmtMoney(f.ticket_min_mxn)}–{fmtMoney(f.ticket_max_mxn)}</div>
                </div>
                <div>
                  <div style={S.metaLabel}>Tasa</div>
                  <div style={S.metaVal}>{fmtRange(f.tasa_estimada_min, f.tasa_estimada_max, "%")}</div>
                </div>
                <div>
                  <div style={S.metaLabel}>Plazo</div>
                  <div style={S.metaVal}>{fmtRange(f.plazo_min_meses, f.plazo_max_meses, "m")}</div>
                </div>
              </div>
              {(f.sectores_objetivo ?? []).length > 0 && (
                <div>
                  {(f.sectores_objetivo ?? []).slice(0, 5).map(s => (
                    <span key={s} style={S.sector}>{s}</span>
                  ))}
                  {(f.sectores_objetivo ?? []).length > 5 && (
                    <span style={{ ...S.sector, color: "#94A3B8" }}>+{(f.sectores_objetivo ?? []).length - 5}</span>
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button style={S.btnPrimary} onClick={e => { e.stopPropagation(); setSelected(f); }}>Ver detalle</button>
                <button style={S.btnOutline} onClick={e => { e.stopPropagation(); showToast("Fase 2: próximamente postulaciones"); }}>Solicitar contacto</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer */}
      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.drawer} onClick={e => e.stopPropagation()}>
            {/* Close */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <span style={S.tipo(selected.tipo)}>{TIPO_LABELS[selected.tipo] ?? selected.tipo}</span>
                {selected.destacado && <span style={{ ...S.badge, position: "static", marginLeft: 8 }}>DESTACADO</span>}
                <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.03em", marginTop: 8 }}>{selected.nombre}</h2>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#94A3B8" }}>
                <Ic d="M3 3l10 10M13 3L3 13" s={18} />
              </button>
            </div>

            {/* Descripción */}
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
              {selected.descripcion_larga ?? selected.descripcion_corta}
            </p>

            {/* Métricas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px" }}>
                <div style={S.metaLabel}>Ticket</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", fontFamily: "'Geist Mono', monospace" }}>
                  {fmtMoney(selected.ticket_min_mxn)} – {fmtMoney(selected.ticket_max_mxn)}
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{selected.moneda}</div>
              </div>
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px" }}>
                <div style={S.metaLabel}>Tasa estimada</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", fontFamily: "'Geist Mono', monospace" }}>
                  {fmtRange(selected.tasa_estimada_min, selected.tasa_estimada_max, "% anual")}
                </div>
              </div>
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px" }}>
                <div style={S.metaLabel}>Plazo</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", fontFamily: "'Geist Mono', monospace" }}>
                  {fmtRange(selected.plazo_min_meses, selected.plazo_max_meses, " meses")}
                </div>
              </div>
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px" }}>
                <div style={S.metaLabel}>Sectores</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {(selected.sectores_objetivo ?? []).map(s => (
                    <span key={s} style={S.sector}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Requisitos */}
            {(selected.requisitos ?? []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>Requisitos</div>
                {(selected.requisitos ?? []).map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#EFF6FF", border: "1px solid #BFDBFE", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                      <Ic d="M4 8l2.5 2.5L12 5" s={10} c="#3B82F6" />
                    </div>
                    <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{r}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ventajas */}
            {(selected.ventajas ?? []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>Ventajas</div>
                {(selected.ventajas ?? []).map((v, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FFFBEB", border: "1px solid #FDE68A", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                      <Ic d="M8 2l1.8 3.7L14 6.5l-3 2.9.7 4.1L8 11.5 4.3 13.5l.7-4.1-3-2.9 4.2-.8z" s={10} c="#F59E0B" />
                    </div>
                    <span style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Contacto */}
            <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>Contacto</div>
              {selected.website && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Ic d="M2 8a6 6 0 1112 0A6 6 0 012 8zM2 8h12M8 2c2 2 3 4 3 6s-1 4-3 6M8 2c-2 2-3 4-3 6s1 4 3 6" s={14} c="#64748B" />
                  <a href={selected.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1E40AF", textDecoration: "none" }}>
                    {selected.website.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                </div>
              )}
              {selected.contacto_email && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Ic d="M2 4h12v8H2zM2 4l6 4.5L14 4" s={14} c="#64748B" />
                  <a href={`mailto:${selected.contacto_email}`} style={{ fontSize: 12, color: "#1E40AF", textDecoration: "none" }}>
                    {selected.contacto_email}
                  </a>
                </div>
              )}
              {selected.contacto_telefono && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Ic d="M3 2h3l2 4-2.5 1.5A10 10 0 009 11l1.5-2.5L14.5 11v3h-1A12 12 0 013 2z" s={14} c="#64748B" />
                  <span style={{ fontSize: 12, color: "#475569" }}>{selected.contacto_telefono}</span>
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              style={{ ...S.btnPrimary, width: "100%", height: 44, fontSize: 14 }}
              onClick={() => { setSelected(null); showToast("Fase 2: próximamente postulaciones"); }}
            >
              Postularme a este fondeador
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
