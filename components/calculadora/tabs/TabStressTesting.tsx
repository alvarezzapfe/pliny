// Tab Stress Testing — heatmap 5×4 de sensibilidad NPV
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ValuacionFull, StressGridRow } from "@/lib/cartera/types";

type Props = { valuacionId: string };

const MONO = "'JetBrains Mono', monospace";

function fmtMoneyShort(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function cellColor(pctChange: number): { bg: string; text: string } {
  if (pctChange >= 0) return { bg: "#ECFDF5", text: "#065F46" };
  if (pctChange >= -2.5) return { bg: "#F0FDF4", text: "#15803D" };
  if (pctChange >= -5) return { bg: "#FEFCE8", text: "#854D0E" };
  if (pctChange >= -10) return { bg: "#FFF7ED", text: "#9A3412" };
  if (pctChange >= -20) return { bg: "#FED7AA", text: "#7C2D12" };
  return { bg: "#FECACA", text: "#7F1D1D" };
}

const RATE_LABELS = ["+0 bps", "+100 bps", "+200 bps", "+300 bps", "+500 bps"];

const LEGEND = [
  { bg: "#ECFDF5", label: "Sin pérdida" },
  { bg: "#F0FDF4", label: "≤ 2.5%" },
  { bg: "#FEFCE8", label: "≤ 5%" },
  { bg: "#FFF7ED", label: "≤ 10%" },
  { bg: "#FED7AA", label: "≤ 20%" },
  { bg: "#FECACA", label: "> 20%" },
];

export default function TabStressTesting({ valuacionId }: Props) {
  const [grid, setGrid] = useState<StressGridRow[] | null>(null);
  const [baseRate, setBaseRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true); setError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError(true); return; }
      const res = await fetch(`/api/calculadora/cartera/${valuacionId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError(true); return; }
      const json = await res.json();
      const v = json.valuacion as ValuacionFull;
      setGrid(v.stress_grid);
      setBaseRate(v.discount_rate);
    } catch { setError(true); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [valuacionId]);

  if (loading) return (
    <div style={{ padding: 32 }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 60, borderRadius: 8, marginBottom: 8, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      ))}
    </div>
  );

  if (error) return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}>No pudimos cargar el stress testing. Refresca la página.</div>
      <button onClick={load} style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>Reintentar</button>
    </div>
  );

  if (!grid || grid.length === 0) return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 4 }}>Esta valuación no incluye análisis de stress testing.</div>
      <div style={{ fontSize: 12, color: "#CBD5E1" }}>Esto puede ocurrir si la valuación es antigua o tuvo errores.</div>
    </div>
  );

  const baseNpv = grid[0]?.pd_scenarios?.[0]?.npv ?? 0;
  const pdMultipliers = grid[0]?.pd_scenarios?.map(s => s.pd_multiplier) ?? [];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 20, lineHeight: 1.6 }}>
        Sensibilidad del NPV ante shocks de tasa de descuento (eje vertical) y multiplicadores de probabilidad de incumplimiento (eje horizontal).
        Caso base: NPV <strong style={{ color: "#0F172A", fontFamily: MONO }}>{fmtMoneyShort(baseNpv)}</strong>, Tasa <strong style={{ color: "#0F172A", fontFamily: MONO }}>{(baseRate * 100).toFixed(2)}%</strong>.
      </div>

      {/* Heatmap table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 4 }}>
          <thead>
            <tr>
              <th style={{ width: 100, padding: 10 }} />
              {pdMultipliers.map(m => (
                <th key={m} style={{ padding: 10, fontSize: 11, fontWeight: 600, color: "#64748B", textAlign: "center", textTransform: "uppercase", letterSpacing: ".06em", minWidth: 140 }}>
                  PD ×{m.toFixed(1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, ri) => (
              <tr key={ri}>
                {/* Rate label */}
                <td style={{ width: 100, padding: 10, textAlign: "right", verticalAlign: "middle" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>{RATE_LABELS[ri] ?? `+${ri}`}</div>
                  <div style={{ fontSize: 10, color: "#94A3B8" }}>({(row.discount_rate * 100).toFixed(2)}%)</div>
                </td>
                {/* NPV cells */}
                {row.pd_scenarios.map((sc, ci) => {
                  const delta = sc.npv - baseNpv;
                  const pctChange = baseNpv !== 0 ? (delta / baseNpv) * 100 : 0;
                  const colors = cellColor(pctChange);
                  const isBase = ri === 0 && ci === 0;
                  return (
                    <td
                      key={ci}
                      title={`NPV: $${sc.npv.toLocaleString("es-MX", { minimumFractionDigits: 2 })} | Δ ${delta > 0 ? "+" : ""}${fmtMoneyShort(delta)} (${pctChange > 0 ? "+" : ""}${pctChange.toFixed(2)}%)`}
                      style={{
                        padding: "16px 12px", textAlign: "center",
                        background: colors.bg, color: colors.text,
                        borderRadius: 6, cursor: "help",
                        position: "relative", minWidth: 140,
                      }}
                    >
                      {isBase && (
                        <div style={{ position: "absolute", top: 4, left: 8, fontSize: 9, fontWeight: 700, color: "#059669", letterSpacing: ".06em", textTransform: "uppercase" }}>BASE</div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO }}>{fmtMoneyShort(sc.npv)}</div>
                      <div style={{ fontSize: 11, fontFamily: MONO, opacity: 0.8, marginTop: 2 }}>
                        {pctChange > 0 ? "+" : ""}{pctChange.toFixed(2)}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: l.bg, border: "1px solid #E2E8F0" }} />
            <span style={{ fontSize: 11, color: "#64748B" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
