// Tab Detalle — tabla virtualizada de créditos individuales con sort + filtros
"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "@/lib/supabaseClient";
import type { CreditoDetalle } from "@/lib/cartera/types";
import CreditDetailModal from "@/components/calculadora/CreditDetailModal";

type Props = { valuacionId: string; onSelectCredit?: (id: string) => void };
type SortKey = "folio_credito" | "deudor" | "sector" | "saldo_insoluto_mxn" | "tasa_nominal_anual" | "fecha_vencimiento" | "dpd" | "npv" | "expected_loss";
type SortDir = "asc" | "desc";

const MONO = "'JetBrains Mono', monospace";

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dpdColor(dpd: number): string {
  if (dpd === 0) return "#059669";
  if (dpd <= 30) return "#FBBF24";
  if (dpd <= 60) return "#F97316";
  return "#DC2626";
}

type ColDef = { key: SortKey | ""; label: string; width: string; align?: "right" | "center"; sortable?: boolean };
const COLS: ColDef[] = [
  { key: "folio_credito",      label: "FOLIO",       width: "100px", sortable: true },
  { key: "deudor",             label: "DEUDOR",      width: "1fr",   sortable: true },
  { key: "sector",             label: "SECTOR",      width: "110px", sortable: true },
  { key: "saldo_insoluto_mxn", label: "SALDO",       width: "120px", align: "right", sortable: true },
  { key: "tasa_nominal_anual", label: "TASA",        width: "80px",  align: "right", sortable: true },
  { key: "fecha_vencimiento",  label: "VENCIMIENTO", width: "110px", sortable: true },
  { key: "dpd",                label: "DPD",         width: "70px",  align: "center", sortable: true },
  { key: "npv",                label: "NPV",         width: "130px", align: "right", sortable: true },
  { key: "expected_loss",      label: "EL",          width: "110px", align: "right", sortable: true },
];
const GRID_COLS = COLS.map(c => c.width).join(" ");

export default function TabDetalle({ valuacionId, onSelectCredit }: Props) {
  const [creditos, setCreditos] = useState<CreditoDetalle[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string[]>([]);
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  async function load() {
    setLoading(true); setError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError(true); return; }
      const res = await fetch(`/api/calculadora/cartera/${valuacionId}/creditos`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError(true); return; }
      const json = await res.json();
      setCreditos(json.creditos ?? []);
    } catch { setError(true); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [valuacionId]);

  const sectors = useMemo(() => {
    if (!creditos) return [];
    return [...new Set(creditos.map(c => c.sector))].sort();
  }, [creditos]);

  const filtered = useMemo(() => {
    if (!creditos) return [];
    let list = creditos;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(c => c.folio_credito.toLowerCase().includes(q) || c.deudor.toLowerCase().includes(q));
    }
    if (sectorFilter.length > 0) {
      list = list.filter(c => sectorFilter.includes(c.sector));
    }
    return list;
  }, [creditos, debouncedSearch, sectorFilter]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir("desc"); }
    else if (sortDir === "desc") { setSortDir("asc"); }
    else { setSortKey(null); setSortDir(null); }
  }

  const toggleSector = useCallback((s: string) => {
    setSectorFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }, []);

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  if (loading) return (
    <div style={{ padding: 24 }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      <div style={{ height: 36, borderRadius: 8, marginBottom: 16, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ height: 44, borderRadius: 4, marginBottom: 1, background: "linear-gradient(90deg,#F8FAFC 25%,#F1F5F9 50%,#F8FAFC 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", animationDelay: `${i * 0.05}s` }} />
      ))}
    </div>
  );

  if (error) return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}>No pudimos cargar los créditos. Refresca la página.</div>
      <button onClick={load} style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>Reintentar</button>
    </div>
  );

  if (!creditos || creditos.length === 0) return (
    <div style={{ padding: 48, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>Esta valuación no tiene créditos individuales.</div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Buscar folio o deudor..."
          style={{ width: 280, height: 36, borderRadius: 8, border: "1px solid #E2E8F0", padding: "0 12px", fontSize: 13, fontFamily: "'Geist',sans-serif", color: "#0F172A", outline: "none", boxSizing: "border-box" }} />

        <div style={{ position: "relative" }}>
          <button onClick={() => setSectorDropdownOpen(v => !v)}
            style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: sectorFilter.length > 0 ? "#EFF6FF" : "#fff", color: "#0F172A", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Geist',sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
            Sectores{sectorFilter.length > 0 && ` (${sectorFilter.length})`} ▾
          </button>
          {sectorDropdownOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setSectorDropdownOpen(false)} />
              <div style={{ position: "absolute", top: 40, left: 0, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.08)", zIndex: 10, minWidth: 180, padding: "6px 0" }}>
                {sectors.map(s => (
                  <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, color: "#0F172A" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <input type="checkbox" checked={sectorFilter.includes(s)} onChange={() => toggleSector(s)} style={{ accentColor: "#0C1E4A" }} />
                    {s}
                  </label>
                ))}
                {sectorFilter.length > 0 && (
                  <button onClick={() => setSectorFilter([])} style={{ display: "block", width: "100%", padding: "6px 14px", border: "none", background: "none", color: "#DC2626", fontSize: 12, cursor: "pointer", textAlign: "left", fontFamily: "'Geist',sans-serif" }}>Limpiar filtros</button>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748B" }}>Mostrando {sorted.length} de {creditos.length}</div>
      </div>

      {sorted.length === 0 && (
        <div style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 8 }}>Ningún crédito coincide con los filtros.</div>
          <button onClick={() => { setSearchText(""); setSectorFilter([]); }} style={{ fontSize: 12, color: "#0C1E4A", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "'Geist',sans-serif" }}>Limpiar filtros</button>
        </div>
      )}

      {sorted.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: GRID_COLS, padding: "10px 12px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", minWidth: 1010 }}>
            {COLS.map(col => (
              <div key={col.key || col.label} onClick={() => col.sortable && col.key && toggleSort(col.key as SortKey)}
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: sortKey === col.key ? "#0F172A" : "#94A3B8", cursor: col.sortable ? "pointer" : "default",
                  textAlign: col.align ?? "left", fontFamily: MONO, userSelect: "none", display: "flex", alignItems: "center",
                  justifyContent: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start", gap: 2 }}>
                {col.label}{sortKey === col.key && <span>{sortDir === "desc" ? " ▾" : " ▴"}</span>}
              </div>
            ))}
          </div>

          {/* Virtualized rows */}
          <div ref={scrollRef} style={{ height: Math.min(600, sorted.length * 44 + 4), overflow: "auto", minWidth: 1010 }}>
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map(vRow => {
                const c = sorted[vRow.index];
                const hasError = !!c.calc_error;
                return (
                  <div key={c.id} onClick={() => { setSelectedId(c.id); onSelectCredit?.(c.id); }}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vRow.start}px)`, height: 44,
                      display: "grid", gridTemplateColumns: GRID_COLS, alignItems: "center", padding: "0 12px",
                      borderBottom: "1px solid #F1F5F9", cursor: "pointer", transition: "background .08s",
                      background: hasError ? "#FEFCE8" : "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = hasError ? "#FEF9C3" : "#F8FAFC")}
                    onMouseLeave={e => (e.currentTarget.style.background = hasError ? "#FEFCE8" : "transparent")}>
                    <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {hasError && <span title={c.calc_error ?? ""} style={{ marginRight: 4 }}>⚠️</span>}{c.folio_credito}
                    </div>
                    <div title={c.deudor} style={{ fontSize: 13, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{c.deudor}</div>
                    <div><span style={{ fontSize: 11, background: "#F1F5F9", padding: "2px 8px", borderRadius: 4, color: "#475569" }}>{c.sector}</span></div>
                    <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A", textAlign: "right" }}>{hasError ? "—" : fmtMoney(c.saldo_insoluto_mxn)}</div>
                    <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A", textAlign: "right" }}>{c.tasa_nominal_anual != null ? (c.tasa_nominal_anual * 100).toFixed(2) + "%" : "—"}</div>
                    <div style={{ fontSize: 13, fontFamily: MONO, color: "#64748B" }}>{c.fecha_vencimiento}</div>
                    <div style={{ fontSize: 13, fontFamily: MONO, color: dpdColor(c.dpd), textAlign: "center", fontWeight: 600 }}>{c.dpd}</div>
                    <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A", textAlign: "right" }}>{hasError ? "—" : fmtMoney(c.npv)}</div>
                    <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A", textAlign: "right" }}>{hasError ? "—" : fmtMoney(c.expected_loss)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <CreditDetailModal
        credito={selectedId ? (sorted.find(c => c.id === selectedId) ?? null) : null}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
