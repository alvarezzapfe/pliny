import React from "react";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";

export default function DocumentosPage() {
  return (
    <PageShell title="Documentos" subtitle="Carga y administración de archivos.">
      <SectionCard title="Carga rápida">
        <div className="text-[13px] text-slate-600">
          Dropzone / listado (placeholder).
        </div>
      </SectionCard>
    </PageShell>
  );
}