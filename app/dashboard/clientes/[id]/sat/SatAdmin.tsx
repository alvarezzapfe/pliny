"use client";

import React from "react";
import Link from "next/link";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import SatPullPanel from "@/components/sat/SatPullPanel";
import SatMetricsCard from "@/components/sat/SatMetricsCard";

export default function SatAdmin({ clientId }: { clientId: string }) {
  return (
    <PageShell
      title="SAT"
      subtitle="Administración y procesamiento de CFDI"
      right={
        <Link
          href={`/dashboard/clientes/${encodeURIComponent(clientId)}`}
          className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-200"
        >
          Volver al cliente
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Conectar y procesar" subtle="e.firma → descarga masiva">
          <SatPullPanel clientId={clientId} />
        </SectionCard>

        <SectionCard title="Resultados" subtle="score & métricas">
          <SatMetricsCard clientId={clientId} />
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4">
        <SectionCard title="Próximo" subtle="backlog corto">
          <ul className="list-disc pl-5 text-[12px] text-slate-600 space-y-1">
            <li>Histórico por mes (chart ingresos).</li>
            <li>Top 10 clientes (concentración por receptor).</li>
            <li>Jobs asíncronos + reintento automático.</li>
          </ul>
        </SectionCard>
      </div>
    </PageShell>
  );
}