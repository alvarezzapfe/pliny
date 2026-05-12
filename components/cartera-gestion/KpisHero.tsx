"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { CarteraKPIs } from "@/lib/cartera-gestion/types";

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function fmtMoneyFull(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(2) + "%";
}

function fmtNum(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "—";
  return n.toFixed(decimals);
}

const KPI_CARD: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const KPI_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "#94A3B8",
  letterSpacing: ".08em",
  textTransform: "uppercase",
  fontFamily: "'Geist Mono', monospace",
};

const KPI_VALUE: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: "#0F172A",
  fontFamily: "'Geist Mono', monospace",
  letterSpacing: "-0.02em",
  lineHeight: 1,
};

const KPI_HINT: React.CSSProperties = {
  fontSize: 12,
  color: "#64748B",
};

export default function KpisHero() {
  const [kpis, setKpis] = useState<CarteraKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError(true); return; }
      const res = await fetch("/api/cartera/kpis", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setError(true); return; }
      const json: CarteraKPIs = await res.json();
      setKpis(json);
    } catch (e) {
      console.error("[KpisHero] load", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: 110, borderRadius: 12,
            background: "linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)",
            backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
          }} />
        ))}
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <div style={{
        padding: 20, marginBottom: 16,
        background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12,
        fontSize: 13, color: "#991B1B",
      }}>
        No pudimos cargar los KPIs.{" "}
        <button onClick={load} style={{
          marginLeft: 8, padding: "4px 12px", border: "1px solid #DC2626",
          background: "#fff", color: "#DC2626", borderRadius: 6, cursor: "pointer",
          fontSize: 12, fontWeight: 600,
        }}>Reintentar</button>
      </div>
    );
  }

  return (
    <>
      {/* Fila 1: 4 KPIs principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        <div style={KPI_CARD}>
          <div style={KPI_LABEL}>CARTERA VIVA</div>
          <div style={KPI_VALUE} title={fmtMoneyFull(kpis.cartera_viva_mxn)}>
            {fmtMoney(kpis.cartera_viva_mxn)}
          </div>
          <div style={KPI_HINT}>saldo vigente MXN</div>
        </div>

        <div style={KPI_CARD}>
          <div style={KPI_LABEL}>CR&Eacute;DITOS ACTIVOS</div>
          <div style={KPI_VALUE}>{kpis.creditos_vigentes}</div>
          <div style={KPI_HINT}>de {kpis.total_creditos} totales</div>
        </div>

        <div style={KPI_CARD}>
          <div style={KPI_LABEL}>MORA 30+</div>
          <div style={{ ...KPI_VALUE, color: kpis.mora_30_plus_count > 0 ? "#DC2626" : "#0F172A" }} title={fmtMoneyFull(kpis.mora_30_plus_mxn)}>
            {fmtMoney(kpis.mora_30_plus_mxn)}
          </div>
          <div style={KPI_HINT}>{kpis.mora_30_plus_count} créditos en mora</div>
        </div>

        <div style={KPI_CARD}>
          <div style={KPI_LABEL}>YIELD PROM.</div>
          <div style={KPI_VALUE}>{fmtPct(kpis.yield_promedio_ponderado)}</div>
          <div style={KPI_HINT}>tasa promedio ponderada</div>
        </div>
      </div>

      {/* Fila 2: 3 KPIs secundarios */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={KPI_CARD}>
          <div style={KPI_LABEL}>TICKET PROMEDIO</div>
          <div style={KPI_VALUE} title={fmtMoneyFull(kpis.ticket_promedio_mxn)}>
            {fmtMoney(kpis.ticket_promedio_mxn)}
          </div>
          <div style={KPI_HINT}>promedio por crédito vigente</div>
        </div>

        <div style={KPI_CARD}>
          <div style={KPI_LABEL}>PLAZO PROMEDIO</div>
          <div style={KPI_VALUE}>
            {kpis.plazo_promedio_meses != null ? `${fmtNum(kpis.plazo_promedio_meses, 1)}m` : "—"}
          </div>
          <div style={KPI_HINT}>plazo promedio en meses</div>
        </div>

        <div style={KPI_CARD}>
          <div style={KPI_LABEL}>TOTAL CR&Eacute;DITOS</div>
          <div style={KPI_VALUE}>{kpis.total_creditos}</div>
          <div style={KPI_HINT}>en cartera</div>
        </div>
      </div>
    </>
  );
}
