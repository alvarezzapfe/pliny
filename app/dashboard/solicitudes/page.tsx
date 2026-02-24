import React from "react";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";

export default function SolicitudesPage() {
  return (
    <PageShell
      title="Solicitudes"
      subtitle="Lista de solicitudes y acciones rápidas."
    >
      <SectionCard
        title="Solicitudes"
        right={
          <button className="rounded-xl bg-[#071A3A] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-95">
            Iniciar solicitud
          </button>
        }
      >
        <div className="overflow-hidden rounded-xl ring-1 ring-slate-200/70">
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">ID</th>
                  <th className="px-3 py-2 font-semibold">Tipo</th>
                  <th className="px-3 py-2 font-semibold">Monto</th>
                  <th className="px-3 py-2 font-semibold">Estatus</th>
                  <th className="px-3 py-2 font-semibold">Actualizado</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                {Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-200/70">
                    <td className="px-3 py-2">SOL-{1000 + i}</td>
                    <td className="px-3 py-2">Capital de trabajo</td>
                    <td className="px-3 py-2">$1,500,000</td>
                    <td className="px-3 py-2">En revisión</td>
                    <td className="px-3 py-2">Hoy</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}