import React from "react";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white">
      {label}
    </span>
  );
}

export default function DashboardPage() {
  return (
    <PageShell
      title="Dashboard"
      subtitle="Estado del sistema, conectores y actividad reciente."
      right={<Pill label="System: OK" />}
    >
      {/* KPI row */}
      <div className="grid gap-4 lg:grid-cols-4">
        <SectionCard title="Pipeline" subtle="MXN" >
          <div className="text-[24px] font-semibold tracking-tight text-slate-900">
            —
          </div>
          <div className="mt-1 text-[12px] text-slate-500">Monto en evaluación</div>
        </SectionCard>

        <SectionCard title="Solicitudes" subtle="30 días">
          <div className="text-[24px] font-semibold tracking-tight text-slate-900">
            —
          </div>
          <div className="mt-1 text-[12px] text-slate-500">Nuevas solicitudes</div>
        </SectionCard>

        <SectionCard title="Buro" subtle="conector">
          <div className="text-[13px] font-semibold text-slate-900">Sin conexión</div>
          <div className="mt-1 text-[12px] text-slate-500">Configura backend / API</div>
        </SectionCard>

        <SectionCard title="SAT" subtle="conector">
          <div className="text-[13px] font-semibold text-slate-900">Sin conexión</div>
          <div className="mt-1 text-[12px] text-slate-500">Carga CIEC / flujo de procesamiento</div>
        </SectionCard>
      </div>

      {/* Lower grid */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title="Actividad" subtle="últimos eventos">
            <div className="space-y-2 text-[13px] text-slate-600">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-slate-900 font-semibold text-[12px]">—</div>
                <div className="text-[12px] text-slate-500">Eventos del sistema (placeholder)</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <div className="text-slate-900 font-semibold text-[12px]">—</div>
                <div className="text-[12px] text-slate-500">Acciones recientes (placeholder)</div>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Acciones" subtle="quick ops">
          <div className="grid gap-2">
            <button className="rounded-xl bg-[#071A3A] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-95">
              Iniciar solicitud
            </button>
            <button className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-200">
              Subir documentos
            </button>
            <button className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-200">
              Configurar conectores
            </button>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}