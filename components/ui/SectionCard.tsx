import React from "react";

export default function SectionCard({
  title,
  children,
  right,
  subtle,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  subtle?: string; // mini label a la derecha o abajo del título
}) {
  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-semibold tracking-tight text-slate-900">
              {title}
            </div>
            {subtle ? (
              <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {subtle}
              </span>
            ) : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="px-5 py-5">{children}</div>
    </section>
  );
}