// components/calculadora/CreditDetailModal.tsx — Modal centrado con detalle de crédito individual
"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { CreditoDetalle } from "@/lib/cartera/types";

const MONO = "'JetBrains Mono', monospace";

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return (n * 100).toFixed(2) + "%";
}
function fmtYears(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(2) + " años";
}
function dpdColor(dpd: number): string {
  if (dpd === 0) return "#059669";
  if (dpd <= 30) return "#FBBF24";
  if (dpd <= 60) return "#F97316";
  return "#DC2626";
}

type Props = {
  credito: CreditoDetalle | null;
  onClose: () => void;
};

type KV = { label: string; value: string; color?: string; bold?: boolean };

export default function CreditDetailModal({ credito, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (credito) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [credito]);

  // Lock body scroll
  useEffect(() => {
    if (credito) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [credito]);

  // Escape key
  useEffect(() => {
    if (!credito) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") handleClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [credito]);

  const handleClose = useCallback(() => {
    setMounted(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  if (!credito) return null;

  const saldo = credito.saldo_insoluto_mxn ?? 0;
  const el = credito.expected_loss ?? 0;

  const section1: KV[] = [
    { label: "Tipo", value: credito.tipo_credito },
    { label: "Saldo insoluto", value: fmtMoney(credito.saldo_insoluto_mxn) },
    { label: "Tasa nominal", value: fmtPct(credito.tasa_nominal_anual) },
    { label: "Vencimiento", value: credito.fecha_vencimiento },
    { label: "DPD", value: String(credito.dpd), color: dpdColor(credito.dpd), bold: true },
  ];

  const section2: KV[] = [];
  if (credito.npv != null) section2.push({ label: "NPV", value: fmtMoney(credito.npv), bold: true });
  if (credito.ytm != null) section2.push({ label: "YTM", value: fmtPct(credito.ytm) });
  if (credito.duration_modified != null) section2.push({ label: "Duration modificada", value: fmtYears(credito.duration_modified) });
  if (credito.wal != null) section2.push({ label: "WAL", value: fmtYears(credito.wal) });
  if (credito.risk_adjusted_npv != null) section2.push({ label: "Risk-Adjusted NPV", value: fmtMoney(credito.risk_adjusted_npv) });

  const section3: KV[] = [];
  if (credito.expected_loss != null) section3.push({ label: "Expected Loss", value: fmtMoney(el), bold: true, color: el > 0 ? "#DC2626" : undefined });
  if (saldo > 0 && el > 0) section3.push({ label: "EL / Saldo", value: ((el / saldo) * 100).toFixed(2) + "%" });

  function renderSection(title: string, items: KV[], isFirst?: boolean) {
    if (items.length === 0) return null;
    return (
      <>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14, marginTop: isFirst ? 0 : 28 }}>{title}</div>
        <div>
          {items.map((kv, i) => (
            <div key={kv.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < items.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <span style={{ fontSize: 12, color: "#64748B" }}>{kv.label}</span>
              <span style={{ fontSize: 13, fontFamily: MONO, fontWeight: kv.bold ? 700 : 500, color: kv.color ?? "#0F172A" }}>{kv.value}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(15, 23, 42, 0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        opacity: mounted ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 680, width: "100%",
          maxHeight: "calc(100vh - 48px)",
          background: "#FFFFFF", borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          transform: mounted ? "scale(1)" : "scale(0.96)",
          transition: "transform 200ms cubic-bezier(.16,1,.3,1), opacity 200ms ease",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 14, fontFamily: MONO, fontWeight: 700, color: "#0F172A" }}>{credito.folio_credito}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>{credito.deudor}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 8 }}>
                <span style={{ fontSize: 11, background: "#F1F5F9", padding: "3px 10px", borderRadius: 4, color: "#475569" }}>{credito.sector}</span>
                <span style={{ color: "#94A3B8", padding: "0 8px" }}>•</span>
                <span style={{ fontSize: 12, color: "#64748B" }}>{credito.tipo_credito}</span>
              </div>
            </div>
            <button onClick={handleClose} style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0",
              background: "#fff", cursor: "pointer", display: "grid", placeItems: "center",
              flexShrink: 0,
            }}>
              <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="#64748B" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error banner */}
        {credito.calc_error && (
          <div style={{ background: "#FFF7ED", borderBottom: "1px solid #FED7AA", padding: "12px 24px", fontSize: 13, color: "#9A3412", flexShrink: 0 }}>
            ⚠️ Error de cálculo: {credito.calc_error}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {renderSection("INFORMACIÓN DEL CRÉDITO", section1, true)}
          {renderSection("MÉTRICAS FINANCIERAS", section2)}
          {renderSection("RIESGO", section3)}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleClose} style={{
            height: 38, padding: "0 20px", borderRadius: 8,
            border: "1px solid #E2E8F0", background: "#fff", color: "#0F172A",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Geist', sans-serif", transition: "background .1s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "#F8FAFC")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
