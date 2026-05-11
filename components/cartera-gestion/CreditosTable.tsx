"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "@/lib/supabaseClient";
import type { Credito, CreditoEstatus } from "@/lib/cartera-gestion/types";

const MONO = "'Geist Mono', monospace";

const GRID_COLS = "100px 1fr 160px 140px 80px 80px 60px 110px 40px";
const COL_HEADERS = [
  { key: "folio", label: "FOLIO", align: "left" as const },
  { key: "deudor", label: "DEUDOR", align: "left" as const },
  { key: "tipo_credito", label: "TIPO", align: "left" as const },
  { key: "saldo_actual", label: "SALDO", align: "right" as const },
  { key: "tasa_anual", label: "TASA", align: "right" as const },
  { key: "plazo_meses", label: "PLAZO", align: "right" as const },
  { key: "dpd", label: "DPD", align: "right" as const },
  { key: "estatus", label: "ESTATUS", align: "left" as const },
  { key: "_action", label: "", align: "center" as const },
];

const FILTROS: { key: string; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "vigente", label: "Vigente" },
  { key: "mora_30", label: "Mora 30+" },
  { key: "mora_60", label: "Mora 60+" },
  { key: "mora_90", label: "Mora 90+" },
  { key: "liquidado", label: "Liquidado" },
  { key: "castigado", label: "Castigado" },
];

const ESTATUS_BADGES: Record<CreditoEstatus, { bg: string; fg: string; dot: string; label: string }> = {
  vigente:   { bg: "#ECFDF5", fg: "#065F46", dot: "#10B981", label: "Vigente" },
  mora_30:   { bg: "#FFFBEB", fg: "#92400E", dot: "#F59E0B", label: "Mora 30" },
  mora_60:   { bg: "#FFF7ED", fg: "#9A3412", dot: "#F97316", label: "Mora 60" },
  mora_90:   { bg: "#FEF2F2", fg: "#991B1B", dot: "#DC2626", label: "Mora 90" },
  liquidado: { bg: "#F1F5F9", fg: "#475569", dot: "#94A3B8", label: "Liquidado" },
  castigado: { bg: "#FEF2F2", fg: "#7F1D1D", dot: "#7F1D1D", label: "Castigado" },
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(2) + "%";
}

export default function CreditosTable({ refreshKey = 0 }: { refreshKey?: number }) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [estatus, setEstatus] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError(true); return; }
      const params = new URLSearchParams();
      if (estatus !== "todos") params.set("estatus", estatus);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("limit", "500");

      const res = await fetch(`/api/cartera?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError(true); return; }
      const json = await res.json();
      setCreditos(json.creditos ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      console.error("[CreditosTable] load", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [estatus, debouncedSearch, refreshKey]);

  const rowVirtualizer = useVirtualizer({
    count: creditos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden",
    }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "12px 16px", borderBottom: "1px solid #E2E8F0", background: "#FAFBFC", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setEstatus(f.key)} style={{
              padding: "6px 12px", fontSize: 12, fontWeight: 600,
              background: estatus === f.key ? "#0C1E4A" : "transparent",
              color: estatus === f.key ? "#FFFFFF" : "#64748B",
              border: "1px solid " + (estatus === f.key ? "#0C1E4A" : "transparent"),
              borderRadius: 6, cursor: "pointer", fontFamily: "'Geist', sans-serif",
              transition: "all .12s",
            }}>{f.label}</button>
          ))}
        </div>

        <div style={{ position: "relative" }}>
          <input
            type="text" placeholder="Buscar folio, deudor o RFC..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              height: 34, padding: "0 12px 0 32px", width: 280,
              fontSize: 12, fontFamily: "'Geist', sans-serif",
              border: "1px solid #E2E8F0", borderRadius: 8,
              background: "#FFFFFF", color: "#0F172A", outline: "none",
            }}
          />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"
            style={{ position: "absolute", left: 10, top: 10 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid", gridTemplateColumns: GRID_COLS, gap: "0 8px",
        padding: "10px 16px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0",
        minWidth: 1010,
      }}>
        {COL_HEADERS.map(c => (
          <div key={c.key} style={{
            fontSize: 10, fontWeight: 700, color: "#94A3B8",
            letterSpacing: ".06em", fontFamily: MONO, textAlign: c.align,
          }}>{c.label}</div>
        ))}
      </div>

      {/* Body */}
      {loading && creditos.length === 0 ? (
        <div style={{ padding: 32 }}>
          <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 36, marginBottom: 8, borderRadius: 6,
              background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)",
              backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
            }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 12 }}>No pudimos cargar los créditos.</div>
          <button onClick={load} style={{
            height: 34, padding: "0 16px", borderRadius: 8,
            border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>Reintentar</button>
        </div>
      ) : creditos.length === 0 ? (
        <div style={{ padding: 64, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
          {debouncedSearch || estatus !== "todos"
            ? "No hay créditos con esos filtros."
            : "Aún no tienes créditos en tu cartera. Empieza con \"Nuevo crédito\" o \"Subir Excel\"."}
        </div>
      ) : (
        <div ref={parentRef} style={{ height: Math.min(600, creditos.length * 48 + 16), overflow: "auto" }}>
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative", minWidth: 1010 }}>
            {rowVirtualizer.getVirtualItems().map(vRow => {
              const c = creditos[vRow.index];
              const badge = ESTATUS_BADGES[c.estatus] || ESTATUS_BADGES.vigente;
              const isLast = vRow.index === creditos.length - 1;
              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/dashboard/cartera/${c.id}`)}
                  style={{
                    position: "absolute", top: 0, left: 0, width: "100%",
                    transform: `translateY(${vRow.start}px)`, height: 48,
                    display: "grid", gridTemplateColumns: GRID_COLS, gap: "0 8px",
                    alignItems: "center", padding: "0 16px",
                    borderBottom: isLast ? "none" : "1px solid #F1F5F9",
                    cursor: "pointer", transition: "background .08s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontSize: 12, fontFamily: MONO, fontWeight: 700, color: "#0F172A" }}>{c.folio ?? "—"}</div>
                  <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ fontSize: 13, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.deudor}</div>
                    {c.rfc && <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: MONO }}>{c.rfc}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.tipo_credito}</div>
                  <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A", textAlign: "right" }}>{fmtMoney(c.saldo_actual)}</div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: "#64748B", textAlign: "right" }}>{fmtPct(c.tasa_anual)}</div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: "#64748B", textAlign: "right" }}>{c.plazo_meses != null ? `${c.plazo_meses}m` : "—"}</div>
                  <div style={{ fontSize: 12, fontFamily: MONO, color: (c.dpd ?? 0) > 0 ? "#DC2626" : "#64748B", textAlign: "right" }}>{c.dpd ?? 0}</div>
                  <div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "3px 10px", borderRadius: 100,
                      background: badge.bg, color: badge.fg,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot }} />
                      {badge.label}
                    </span>
                  </div>
                  <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 16 }}>→</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: "10px 16px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC",
        fontSize: 11, color: "#64748B", fontFamily: MONO,
      }}>
        Mostrando {creditos.length} de {total} créditos
        {(debouncedSearch || estatus !== "todos") && (
          <span> · <button onClick={() => { setEstatus("todos"); setSearch(""); }} style={{
            background: "transparent", border: "none", color: "#0C1E4A",
            fontSize: 11, fontFamily: MONO, cursor: "pointer", textDecoration: "underline",
          }}>limpiar filtros</button></span>
        )}
      </div>
    </div>
  );
}
