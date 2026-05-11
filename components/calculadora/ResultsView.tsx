// components/calculadora/ResultsView.tsx — Tab shell for valuation results
"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TabResumenEjecutivo from "./tabs/TabResumenEjecutivo";
import TabDetalle from "./tabs/TabDetalle";
import TabStressTesting from "./tabs/TabStressTesting";
import TabConcentracion from "./tabs/TabConcentracion";
import TabErrores from "./tabs/TabErrores";

type TabKey = "resumen" | "detalle" | "stress" | "concentracion" | "errores";

const TABS: { key: TabKey; label: string }[] = [
  { key: "resumen", label: "Resumen Ejecutivo" },
  { key: "detalle", label: "Detalle" },
  { key: "stress", label: "Stress Testing" },
  { key: "concentracion", label: "Concentración" },
  { key: "errores", label: "Errores" },
];

type Props = {
  valuacionId: string;
  kpis: {
    npv: number | null;
    saldo: number | null;
    el: number | null;
    nCreditos: number;
    nCreditosCalculados: number | null;
  };
  onReset: () => void;
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ResultsView({ valuacionId, kpis, onReset }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(
    tabParam && TABS.some(t => t.key === tabParam) ? tabParam : "resumen"
  );

  // Sync tab from URL on mount and changes
  useEffect(() => {
    const t = searchParams.get("tab") as TabKey | null;
    if (t && TABS.some(tab => tab.key === t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  function switchTab(key: TabKey) {
    setActiveTab(key);
    router.replace(`?tab=${key}`, { scroll: false });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "#64748B" }}>
            Valuación <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#0F172A" }}>{valuacionId.slice(0, 8)}...{valuacionId.slice(-4)}</span>
          </div>
        </div>
        <button onClick={onReset} style={{
          height: 34, padding: "0 14px", borderRadius: 8,
          border: "1px solid #E2E8F0", background: "#FFFFFF", color: "#64748B",
          fontSize: 12, fontWeight: 500, cursor: "pointer",
          fontFamily: "'Geist', sans-serif",
        }}>
          Subir otra cartera
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "NPV TOTAL", value: fmtMoney(kpis.npv) },
          { label: "SALDO TOTAL", value: fmtMoney(kpis.saldo) },
          { label: "EL TOTAL", value: fmtMoney(kpis.el) },
          { label: "CRÉDITOS", value: `${kpis.nCreditosCalculados ?? kpis.nCreditos} / ${kpis.nCreditos}` },
        ].map(k => (
          <div key={k.label} style={{
            background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8,
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: "1px solid #E2E8F0", marginBottom: 0, display: "flex", overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            style={{
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: activeTab === t.key ? 600 : 500,
              color: activeTab === t.key ? "#0C1E4A" : "#64748B",
              background: "none",
              border: "none",
              borderBottom: activeTab === t.key ? "2px solid #0C1E4A" : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
              fontFamily: "'Geist', sans-serif",
              whiteSpace: "nowrap",
              transition: "color .15s",
            }}
            onMouseEnter={e => { if (activeTab !== t.key) e.currentTarget.style.color = "#0F172A"; }}
            onMouseLeave={e => { if (activeTab !== t.key) e.currentTarget.style.color = "#64748B"; }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderTop: "none", borderRadius: "0 0 8px 8px", minHeight: 200 }}>
        {activeTab === "resumen" && <TabResumenEjecutivo valuacionId={valuacionId} />}
        {activeTab === "detalle" && <TabDetalle valuacionId={valuacionId} />}
        {activeTab === "stress" && <TabStressTesting valuacionId={valuacionId} />}
        {activeTab === "concentracion" && <TabConcentracion valuacionId={valuacionId} />}
        {activeTab === "errores" && <TabErrores />}
      </div>
    </div>
  );
}
