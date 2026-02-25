"use client";
import * as React from "react";

export default function SatMetricsCard({ clientId }: { clientId: string }) {
  const [metrics, setMetrics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/sat/metrics/${clientId}`);
    const data = await res.json().catch(() => ({}));
    setMetrics(data.metrics ?? null);
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, [clientId]);

  if (loading) {
    return <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">Cargando métricas…</div>;
  }

  if (!metrics) {
    return <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">Aún no hay métricas SAT.</div>;
  }

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
      <div className="text-[11px] font-semibold tracking-wide text-slate-500">SAT UNDERWRITING</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="text-[26px] font-semibold text-slate-900">{metrics.score}/100</div>
        <div className="text-[12px] text-slate-500">{metrics.months_analyzed} meses</div>
      </div>

      <div className="mt-3 grid gap-2 text-[12px] text-slate-700 lg:grid-cols-2">
        <div>Promedio mensual: <span className="font-semibold">${Number(metrics.avg_monthly_income || 0).toLocaleString()}</span></div>
        <div>Total ingresos: <span className="font-semibold">${Number(metrics.total_income || 0).toLocaleString()}</span></div>
        <div>Volatilidad: <span className="font-semibold">{(Number(metrics.income_volatility || 0) * 100).toFixed(1)}%</span></div>
        <div>Concentración top: <span className="font-semibold">{(Number(metrics.top_client_concentration || 0) * 100).toFixed(1)}%</span></div>
      </div>
    </div>
  );
}