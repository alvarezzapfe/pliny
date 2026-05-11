// Tab Resumen Ejecutivo — KPIs de rentabilidad, riesgo y composición
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ValuacionFull } from "@/lib/cartera/types";

type Props = { valuacionId: string };

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(decimal: number | null | undefined): string {
  if (decimal == null) return "—";
  return (decimal * 100).toFixed(2) + "%";
}
function fmtYears(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(2) + " años";
}
function fmtMoneyShort(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

const MONO = "'JetBrains Mono', monospace";

const DPD_COLORS: Record<string, string> = {
  "0": "#059669", "1-30": "#FBBF24", "31-60": "#F97316", "61-90": "#DC2626", "90+": "#7F1D1D",
};

const HHI_INTERP = (hhi: number) => {
  if (hhi < 1500) return { text: "Cartera diversificada", color: "#059669" };
  if (hhi <= 2500) return { text: "Concentración moderada", color: "#D97706" };
  return { text: "Alta concentración", color: "#DC2626" };
};

export default function TabResumenEjecutivo({ valuacionId }: Props) {
  const [data, setData] = useState<ValuacionFull | null>(null);
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
      setData(json.valuacion);
    } catch { setError(true); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [valuacionId]);

  if (loading) return (
    <div style={{ padding: 32 }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 80, borderRadius: 12, marginBottom: 16, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
      ))}
    </div>
  );

  if (error || !data) return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}>No pudimos cargar el resumen. Refresca la página.</div>
      <button onClick={load} style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>Reintentar</button>
    </div>
  );

  const npv = data.npv_total_mxn ?? 0;
  const saldo = data.saldo_total_mxn ?? 0;
  const el = data.el_total_mxn ?? 0;
  const ratio = saldo > 0 ? (npv / saldo) : 0;
  const ratioInterp = ratio > 1 ? { text: "Cartera valoriza arriba del par", color: "#059669" } : ratio === 1 ? { text: "Cartera valoriza al par", color: "#64748B" } : { text: "Cartera valoriza abajo del par", color: "#D97706" };

  const conc = data.concentracion;
  const dpdBuckets = conc?.dpd_buckets ?? {};
  const dpdTotal = Object.values(dpdBuckets).reduce((s, v) => s + (v as number), 0);
  const sectorDist = conc?.sector_distribution ?? {};
  const sectorTotal = Object.values(sectorDist).reduce((s, v) => s + (v as number), 0);
  const sectorEntries = Object.entries(sectorDist).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5);
  const hhi = conc?.hhi_sector;
  const top3 = (conc?.top_10_deudores ?? []).slice(0, 3);

  const S = {
    section: { fontSize: 11, fontWeight: 600 as const, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 12, marginTop: 32 } as React.CSSProperties,
    card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 24 } as React.CSSProperties,
    bigNum: { fontSize: 24, fontWeight: 700, fontFamily: MONO, color: "#0F172A", letterSpacing: "-0.02em" } as React.CSSProperties,
    label: { fontSize: 10, fontWeight: 700 as const, color: "#94A3B8", letterSpacing: ".06em", textTransform: "uppercase" as const, marginBottom: 4 } as React.CSSProperties,
    sub: { fontSize: 12, color: "#64748B", marginTop: 6 } as React.CSSProperties,
  };

  return (
    <div style={{ padding: "24px 24px 32px" }}>
      {/* SECCIÓN A — RENTABILIDAD */}
      <div style={{ ...S.section, marginTop: 0 }}>RENTABILIDAD</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <div style={S.card}>
          <div style={S.label}>RATIO NPV / SALDO</div>
          <div style={S.bigNum}>{(ratio * 100).toFixed(2)}%</div>
          <div style={{ ...S.sub, color: ratioInterp.color, fontWeight: 600 }}>{ratioInterp.text}</div>
        </div>
        <div style={S.card}>
          <div style={S.label}>YTM PROMEDIO PONDERADO</div>
          <div style={S.bigNum}>{fmtPct(data.yield_ponderado)}</div>
          <div style={S.sub}>vs tasa descuento: {fmtPct(data.discount_rate)}</div>
        </div>
        <div style={S.card}>
          <div style={S.label}>DURATION MODIFICADA</div>
          <div style={S.bigNum}>{fmtYears(data.duration_ponderada)}</div>
          <div style={S.sub}>Sensibilidad a tasas</div>
        </div>
        <div style={S.card}>
          <div style={S.label}>WAL</div>
          <div style={S.bigNum}>{fmtYears(data.wal_ponderado)}</div>
          <div style={S.sub}>Vida media ponderada</div>
        </div>
      </div>

      {/* SECCIÓN B — RIESGO */}
      <div style={S.section}>RIESGO</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={S.card}>
          <div style={S.label}>EXPECTED LOSS</div>
          <div style={S.bigNum}>{fmtMoney(el)}</div>
          <div style={S.sub}>{saldo > 0 ? ((el / saldo) * 100).toFixed(2) + "% del saldo" : "—"}</div>
        </div>
        <div style={S.card}>
          <div style={S.label}>CRÉDITOS POR ESTATUS DPD</div>
          {dpdTotal > 0 ? (
            <>
              {/* Stacked bar */}
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 12, marginBottom: 12 }}>
                {Object.entries(DPD_COLORS).map(([bucket, color]) => {
                  const val = (dpdBuckets[bucket] as number) ?? 0;
                  const pct = dpdTotal > 0 ? (val / dpdTotal) * 100 : 0;
                  if (pct === 0) return null;
                  return <div key={bucket} style={{ width: `${pct}%`, background: color, minWidth: pct > 0 ? 2 : 0 }} />;
                })}
              </div>
              {/* Legend */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {Object.entries(DPD_COLORS).map(([bucket, color]) => {
                  const val = (dpdBuckets[bucket] as number) ?? 0;
                  if (val === 0) return null;
                  return (
                    <div key={bucket} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748B" }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                      {bucket}: {fmtMoneyShort(val)}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 8 }}>—</div>
          )}
        </div>
      </div>

      {/* SECCIÓN C — COMPOSICIÓN */}
      <div style={S.section}>COMPOSICIÓN</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Sector distribution */}
        <div style={S.card}>
          <div style={S.label}>DISTRIBUCIÓN POR SECTOR</div>
          {sectorEntries.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              {sectorEntries.map(([sector, saldo]) => {
                const pct = sectorTotal > 0 ? ((saldo as number) / sectorTotal) * 100 : 0;
                return (
                  <div key={sector} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "#0F172A", fontWeight: 500 }}>{sector}</span>
                      <span style={{ fontSize: 11, fontFamily: MONO, color: "#64748B" }}>{fmtMoneyShort(saldo as number)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div style={{ height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "#0C1E4A", borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 8 }}>Sin datos</div>
          )}
        </div>

        {/* HHI + top deudores */}
        <div style={S.card}>
          <div style={S.label}>ÍNDICE DE CONCENTRACIÓN</div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>HHI Sector</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: MONO, color: "#0F172A" }}>{hhi != null ? Math.round(hhi) : "—"}</div>
            {hhi != null && (
              <div style={{ fontSize: 12, fontWeight: 600, color: HHI_INTERP(hhi).color, marginTop: 4 }}>{HHI_INTERP(hhi).text}</div>
            )}
          </div>
          {top3.length > 0 && (
            <div style={{ marginTop: 16, borderTop: "1px solid #F1F5F9", paddingTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", marginBottom: 8 }}>TOP 3 DEUDORES</div>
              {top3.map((d, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                  <span style={{ color: "#0F172A", fontWeight: 500 }}>{d.deudor}</span>
                  <span style={{ fontFamily: MONO, color: "#64748B" }}>{fmtMoneyShort(d.saldo)} ({d.pct.toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
