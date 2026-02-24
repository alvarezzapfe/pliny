import React from "react";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";

export default function AjustesPage() {
  return (
    <PageShell title="Ajustes" subtitle="Configuración y seguridad.">
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Cuenta">
          <div className="text-[13px] text-slate-600">Email, password (placeholder).</div>
        </SectionCard>
        <SectionCard title="Seguridad">
          <div className="text-[13px] text-slate-600">Sesiones, 2FA (placeholder).</div>
        </SectionCard>
      </div>
    </PageShell>
  );
}