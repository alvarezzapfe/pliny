"use client";

import React, { useMemo, useState } from "react";

export default function SatPullPanel({
  clientId,
  onStart,
  onDone,
}: {
  clientId: string;
  onStart?: () => void | Promise<void>;
  onDone?: () => void | Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fileLabel = useMemo(() => {
    if (!files.length) return "Ningún ZIP seleccionado";
    if (files.length === 1) return files[0].name;
    return `${files.length} ZIPs seleccionados`;
  }, [files]);

  async function submit() {
    setMsg(null);
    if (!clientId) return setMsg("Falta clientId.");
    if (!files.length) return setMsg("Selecciona al menos 1 ZIP del SAT.");

    setLoading(true);
    try {
      await onStart?.();

      const fd = new FormData();
      fd.set("clientId", clientId);
      for (const f of files) fd.append("zipFiles", f);

      const res = await fetch("/api/sat/pull", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Error procesando ZIP");
      }

      setMsg(
        `Listo: ZIPs ${data.zipCount} · XML ${data.xmlCount} · CFDI ${data.inserted}`
      );

      await onDone?.();
    } catch (e: any) {
      setMsg(String(e?.message ?? "Error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-slate-900">SAT · Importar ZIP(s)</div>
          <div className="mt-1 text-[12px] text-slate-500">
            Sube ZIP(s) del SAT (Descarga Masiva). Se guardan en Storage y se procesan a CFDI.
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/70">
          <span className="h-2 w-2 rounded-full bg-[#00E599]" />
          ZIP mode
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-[12px] font-semibold text-slate-800">{fileLabel}</div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white hover:opacity-95">
                Seleccionar ZIP(s)
                <input
                  type="file"
                  className="hidden"
                  accept=".zip,application/zip"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                />
              </label>

              <button
                onClick={() => setFiles([])}
                className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-200"
                type="button"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            Tip: puedes subir varios ZIPs (p. ej. por mes).
          </div>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          className="rounded-xl bg-[#071A3A] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-95 disabled:opacity-60"
        >
          {loading ? "Procesando…" : "Importar y calcular"}
        </button>

        {msg ? (
          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[12px] text-slate-700 ring-1 ring-slate-200/70">
            {msg}
          </div>
        ) : null}
      </div>
    </div>
  );
}