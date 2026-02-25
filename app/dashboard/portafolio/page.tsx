import React from "react";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";

function KPI({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <SectionCard title={label} subtle={sub}>
      <div className="text-[26px] font-semibold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-[12px] text-slate-500">{sub}</div>
    </SectionCard>
  );
}

function StatusPill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white">
      <span className="h-2 w-2 rounded-full bg-[#00E599]" />
      {text}
    </span>
  );
}

export default function PortfolioPage() {
  return (
    <PageShell
      title="Portafolio"
      subtitle="Vista ejecutiva de tu cartera de crédito (MVP)."
      right={<StatusPill text="Portfolio: Ready" />}
    >
      {/* KPIs */}
      <div className="grid gap-4 lg:grid-cols-4">
        <KPI label="Cartera viva" value="—" sub="MXN" />
        <KPI label="Créditos activos" value="—" sub="conteo" />
        <KPI label="Mora 30+" value="—" sub="MXN / %" />
        <KPI label="Originación" value="—" sub="últimos 30 días" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <KPI label="Ticket promedio" value="—" sub="MXN" />
        <KPI label="Plazo prom." value="—" sub="meses" />
        <KPI label="Yield prom." value="—" sub="% anual" />
      </div>

      {/* Tabla */}
      <div className="mt-4">
        <SectionCard title="Cartera" subtle="créditos">
          <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Crédito</th>
                    <th className="px-4 py-3 font-semibold">Deudor</th>
                    <th className="px-4 py-3 font-semibold">Saldo</th>
                    <th className="px-4 py-3 font-semibold">Tasa</th>
                    <th className="px-4 py-3 font-semibold">Estatus</th>
                    <th className="px-4 py-3 font-semibold">DPD</th>
                    <th className="px-4 py-3 font-semibold">Último pago</th>
                  </tr>
                </thead>

                <tbody className="text-slate-900">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-t border-slate-200/70">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">—</div>
                        <div className="text-[11px] text-slate-500">ID: —</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">—</td>
                      <td className="px-4 py-3 text-slate-900">—</td>
                      <td className="px-4 py-3 text-slate-900">—</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/70">
                          —
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">—</td>
                      <td className="px-4 py-3 text-slate-700">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 text-[12px] text-slate-500">
            Siguiente paso: crear tabla <span className="font-mono">loans</span> y llenar KPIs desde DB.
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}