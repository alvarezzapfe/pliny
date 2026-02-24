import React from "react";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";

export default function DatosPage() {
  return (
    <PageShell title="Datos" subtitle="Perfil, info fiscal y financiera.">
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Empresa">
          <div className="text-[13px] text-slate-600">Formulario / vista (placeholder).</div>
        </SectionCard>
        <SectionCard title="Finanzas">
          <div className="text-[13px] text-slate-600">Revenue, métricas (placeholder).</div>
        </SectionCard>
      </div>
    </PageShell>
  );
}