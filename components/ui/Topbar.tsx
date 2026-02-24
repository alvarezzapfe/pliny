"use client";

import React from "react";

export default function Topbar({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 bg-white px-6 py-4">
      <div className="min-w-0">
        <div className="text-[12px] font-semibold tracking-wide text-slate-400">
          PLINIUS / CONSOLE
        </div>
        <div className="mt-0.5 text-[18px] font-semibold tracking-tight text-slate-900">
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-[13px] text-slate-500">{subtitle}</div>
        ) : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}