// Tab Concentración — HHI hero, top deudores, sectores, DPD buckets
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ValuacionFull, ConcentracionData } from "@/lib/cartera/types";

type Props = { valuacionId: string };

const MONO = "'JetBrains Mono', monospace";

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtMoneyShort(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function hhiInterp(hhi: number): { text: string; color: string } {
  if (hhi < 1500) return { text: "Cartera diversificada", color: "#059669" };
  if (hhi <= 2500) return { text: "Concentración moderada", color: "#D97706" };
  return { text: "Alta concentración", color: "#DC2626" };
}

const DPD_COLORS: Record<string, string> = {
  "0": "#059669", "1-30": "#FBBF24", "31-60": "#F97316", "61-90": "#DC2626", "90+": "#7F1D1D",
};
const SECTOR_COLORS = ["#0C1E4A", "#1E40AF", "#3B82F6", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0"];

const SC = {
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" as const } as React.CSSProperties,
  section: { fontSize: 11, fontWeight: 700 as const, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: ".06em", marginBottom: 14, marginTop: 32 } as React.CSSProperties,
};

export default function TabConcentracion({ valuacionId }: Props) {
  const [conc, setConc] = useState<ConcentracionData | null>(null);
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
      setConc((json.valuacion as ValuacionFull).concentracion);
    } catch { setError(true); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [valuacionId]);

  if (loading) return (
    <div style={{ padding: 32 }}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      {[1, 2, 3].map(i => <div key={i} style={{ height: 80, borderRadius: 12, marginBottom: 16, background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />)}
    </div>
  );

  if (error) return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}>No pudimos cargar el análisis. Refresca la página.</div>
      <button onClick={load} style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>Reintentar</button>
    </div>
  );

  if (!conc) return (
    <div style={{ padding: 48, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>Análisis de concentración no disponible para esta valuación.</div>
  );

  const hhi = conc.hhi_sector ?? 0;
  const hhiI = hhiInterp(hhi);
  const top10 = conc.top_10_deudores ?? [];
  const sectorDist = conc.sector_distribution ?? {};
  const sectorEntries = Object.entries(sectorDist).sort((a, b) => (b[1] as number) - (a[1] as number));
  const sectorTotal = sectorEntries.reduce((s, [, v]) => s + (v as number), 0);
  const dpdBuckets = conc.dpd_buckets ?? {};
  const dpdTotal = Object.values(dpdBuckets).reduce((s, v) => s + (v as number), 0);
  const top3Pct = top10.slice(0, 3).reduce((s, d) => s + d.pct, 0);
  const top10Pct = top10.reduce((s, d) => s + d.pct, 0);
  const maxDeudorSaldo = top10.length > 0 ? top10[0].saldo : 1;
  const hhiPos = Math.min((hhi / 10000) * 100, 100);

  return (
    <div style={{ padding: 24 }}>
      {/* SECCIÓN A — HHI HERO */}
      <div style={{ ...SC.card, padding: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>ÍNDICE HHI</div>
            <div style={{ fontSize: 48, fontWeight: 800, fontFamily: MONO, color: hhiI.color, letterSpacing: "-0.03em" }}>{Math.round(hhi)}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: hhiI.color, marginTop: 4 }}>{hhiI.text}</div>
          </div>
          <div>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: "15%", background: "#10B981" }} />
                <div style={{ width: "10%", background: "#F59E0B" }} />
                <div style={{ width: "75%", background: "#EF4444" }} />
              </div>
              <div style={{ position: "absolute", top: -4, left: `${hhiPos}%`, transform: "translateX(-50%)", width: 4, height: 20, background: "#0F172A", borderRadius: 2 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", fontFamily: MONO }}>
              <span>0</span><span>1,500</span><span>2,500</span><span>10,000</span>
            </div>
            <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5, marginTop: 12 }}>
              El Índice Herfindahl-Hirschman (HHI) mide concentración. &lt; 1500: diversificada · 1500–2500: moderada · &gt; 2500: alta.
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN B — TOP DEUDORES */}
      <div style={SC.section}>TOP DEUDORES</div>
      <div style={SC.card}>
        <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 140px 100px 200px", padding: "10px 24px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          {["RANK", "DEUDOR", "SALDO", "% SALDO", "PARTICIPACIÓN"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", fontFamily: MONO, textAlign: h === "SALDO" || h === "% SALDO" ? "right" : "left" }}>{h}</div>
          ))}
        </div>
        {top10.map((d, i) => {
          const barW = maxDeudorSaldo > 0 ? (d.saldo / maxDeudorSaldo) * 100 : 0;
          const rankColors = ["#D97706", "#94A3B8", "#B45309"];
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "50px 1fr 140px 100px 200px", padding: "12px 24px", borderBottom: i < top10.length - 1 ? "1px solid #F1F5F9" : "none", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontFamily: MONO, fontWeight: 700, color: i < 3 ? rankColors[i] : "#64748B" }}>#{i + 1}</div>
              <div style={{ fontSize: 13, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>{d.deudor}</div>
              <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A", textAlign: "right" }}>{fmtMoney(d.saldo)}</div>
              <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A", textAlign: "right" }}>{d.pct.toFixed(2)}%</div>
              <div><div style={{ height: 8, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${barW}%`, height: "100%", background: "#0C1E4A", borderRadius: 4 }} /></div></div>
            </div>
          );
        })}
        {top10.length > 0 && (
          <div style={{ padding: "12px 24px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", fontSize: 12, color: "#64748B" }}>
            Top 3 concentran <strong style={{ color: "#0F172A" }}>{top3Pct.toFixed(1)}%</strong> del saldo total
            {top10.length > 3 && <> · Top {top10.length} concentran <strong style={{ color: "#0F172A" }}>{top10Pct.toFixed(1)}%</strong></>}
          </div>
        )}
      </div>

      {/* SECCIÓN C — DISTRIBUCIÓN POR SECTOR */}
      <div style={SC.section}>DISTRIBUCIÓN POR SECTOR</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={SC.card}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 80px", padding: "10px 24px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
            {["SECTOR", "SALDO", "% SALDO"].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", fontFamily: MONO, textAlign: h !== "SECTOR" ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {sectorEntries.map(([sector, saldo], i) => {
            const pct = sectorTotal > 0 ? ((saldo as number) / sectorTotal) * 100 : 0;
            return (
              <div key={sector} style={{ display: "grid", gridTemplateColumns: "1fr 130px 80px", padding: "12px 24px", alignItems: "center", borderBottom: i < sectorEntries.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: SECTOR_COLORS[i % SECTOR_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#0F172A" }}>{sector}</span>
                </div>
                <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A", textAlign: "right" }}>{fmtMoneyShort(saldo as number)}</div>
                <div style={{ fontSize: 13, fontFamily: MONO, color: "#0F172A", textAlign: "right" }}>{pct.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>

        <div style={{ ...SC.card, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <svg width={180} height={180} viewBox="0 0 100 100">
            {(() => {
              let offset = 0;
              const circ = 2 * Math.PI * 38;
              return sectorEntries.map(([sector, saldo], i) => {
                const pct = sectorTotal > 0 ? (saldo as number) / sectorTotal : 0;
                const dash = pct * circ;
                const el = <circle key={sector} cx="50" cy="50" r="38" fill="none" stroke={SECTOR_COLORS[i % SECTOR_COLORS.length]} strokeWidth="16" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" />;
                offset += dash;
                return el;
              });
            })()}
            <text x="50" y="48" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily={MONO} fill="#0F172A">{fmtMoneyShort(sectorTotal)}</text>
            <text x="50" y="58" textAnchor="middle" fontSize="6" fill="#94A3B8">SALDO TOTAL</text>
          </svg>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            {sectorEntries.map(([sector, saldo], i) => {
              const pct = sectorTotal > 0 ? ((saldo as number) / sectorTotal) * 100 : 0;
              return (
                <div key={sector} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B" }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                  {sector}: {pct.toFixed(1)}%
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECCIÓN D — DPD BUCKETS */}
      <div style={SC.section}>DISTRIBUCIÓN POR MORA (DPD)</div>
      <div style={{ ...SC.card, padding: 24 }}>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
          {dpdTotal > 0 ? `${fmtMoneyShort(dpdTotal)} en saldo analizado` : "Sin datos"}
        </div>
        {dpdTotal > 0 && (
          <>
            <div style={{ display: "flex", height: 32, borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
              {Object.entries(DPD_COLORS).map(([bucket, color]) => {
                const val = (dpdBuckets[bucket] as number) ?? 0;
                const pct = dpdTotal > 0 ? (val / dpdTotal) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <div key={bucket} style={{ width: `${pct}%`, background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {pct > 8 && <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: MONO }}>{pct.toFixed(0)}%</span>}
                  </div>
                );
              })}
            </div>
            <div>
              {Object.entries(DPD_COLORS).map(([bucket, color]) => {
                const val = (dpdBuckets[bucket] as number) ?? 0;
                if (val === 0) return null;
                const pct = dpdTotal > 0 ? (val / dpdTotal) * 100 : 0;
                return (
                  <div key={bucket} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #F8FAFC" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#0F172A", width: 60 }}>{bucket} días</span>
                    <span style={{ fontSize: 12, fontFamily: MONO, color: "#0F172A" }}>{fmtMoneyShort(val)}</span>
                    <span style={{ fontSize: 11, fontFamily: MONO, color: "#64748B", marginLeft: "auto" }}>{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
