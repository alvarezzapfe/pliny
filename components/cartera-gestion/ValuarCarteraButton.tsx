"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  onValuationComplete?: () => void;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  // ytm/yield come as decimal (e.g. 0.25 = 25%)
  const pct = Math.abs(n) < 1 ? n * 100 : n;
  return pct.toFixed(2) + "%";
}

export default function ValuarCarteraButton({ onValuationComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleValuar() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Sin sesión"); return; }

      const res = await fetch("/api/cartera/valuar-completa", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error al valuar cartera");
        return;
      }

      setResult(json);
      setShowResult(true);
      onValuationComplete?.();
    } catch (e) {
      console.error("[ValuarCarteraButton]", e);
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={handleValuar} disabled={loading}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "9px 16px", borderRadius: 10,
          background: "linear-gradient(135deg, #1B3F8A, #5B8DEF)",
          color: "#FFFFFF", border: "none",
          fontSize: 13, fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
          boxShadow: "0 2px 12px rgba(91,141,239,.25)",
          transition: "opacity .15s, transform .15s",
          fontFamily: "'Geist', sans-serif",
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 1l-4 8h3l-1 6 4-8h-3l1-6z" />
        </svg>
        {loading ? "Valuando..." : "Valuar cartera"}
      </button>

      {/* Error toast */}
      {error && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 1100,
          padding: "12px 16px",
          background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
          fontSize: 13, color: "#991B1B",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          maxWidth: 360, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{
            background: "transparent", border: "none",
            color: "inherit", cursor: "pointer", fontSize: 16,
          }}>×</button>
        </div>
      )}

      {/* Result modal */}
      {showResult && result && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
          display: "grid", placeItems: "center", zIndex: 1000,
        }} onClick={() => setShowResult(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{
              background: "#FFFFFF", borderRadius: 14, padding: 28,
              maxWidth: 480, width: "92%",
              boxShadow: "0 24px 64px rgba(0,0,0,0.24)",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "#ECFDF5", display: "grid", placeItems: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none"
                  stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l3 3 7-7" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.01em" }}>
                  Valuación completada
                </div>
                <div style={{ fontSize: 12, color: "#64748B", fontFamily: "'Geist Mono', monospace" }}>
                  {String(result.creditos_calculados)} de {String(result.total_creditos)} créditos valuados
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <Metric label="Saldo total" value={fmtMoney(result.saldo_total as number)} />
              <Metric label="NPV total" value={fmtMoney(result.npv_total as number)} highlight />
              <Metric label="Expected Loss" value={fmtMoney(result.expected_loss_total as number)} danger />
              <Metric label="YTM promedio" value={fmtPct(result.ytm_promedio as number)} />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowResult(false)}
                style={{
                  padding: "9px 20px", borderRadius: 8,
                  border: "none", background: "#0C1E4A", color: "#FFFFFF",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ label, value, highlight, danger }: {
  label: string; value: string; highlight?: boolean; danger?: boolean;
}) {
  return (
    <div style={{
      padding: "12px 14px",
      background: highlight ? "#F0F9FF" : danger ? "#FEF2F2" : "#F8FAFC",
      border: `1px solid ${highlight ? "#BAE6FD" : danger ? "#FECACA" : "#E2E8F0"}`,
      borderRadius: 10,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: "#94A3B8",
        letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontSize: 16, fontWeight: 700,
        color: danger ? "#991B1B" : highlight ? "#0369A1" : "#0F172A",
        fontFamily: "'Geist Mono', monospace",
      }}>{value}</div>
    </div>
  );
}
