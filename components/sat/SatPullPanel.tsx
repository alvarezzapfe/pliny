"use client";
import * as React from "react";

type Tipo = "emitidos" | "recibidos";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isBusinessDay(d: Date) {
  const day = d.getDay(); // 0=Sun,6=Sat
  return day !== 0 && day !== 6;
}
function subtractBusinessDays(from: Date, businessDays: number) {
  const d = new Date(from);
  let left = businessDays;
  while (left > 0) {
    d.setDate(d.getDate() - 1);
    if (isBusinessDay(d)) left--;
  }
  return d;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-semibold text-slate-700">{label}</div>
      {children}
    </div>
  );
}

export default function SatPullPanel({
  clientId,
  onDone,
  onStart,
}: {
  clientId: string;
  onDone?: () => void;
  onStart?: () => void;
}) {
  const [cer, setCer] = React.useState<File | null>(null);
  const [key, setKey] = React.useState<File | null>(null);
  const [password, setPassword] = React.useState("");

  const [tipo, setTipo] = React.useState<Tipo>("emitidos");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);

  React.useEffect(() => {
    // default: últimos 30 hábiles
    const today = new Date();
    const end = today;
    const start = subtractBusinessDays(today, 30);
    setFromDate(toISODate(start));
    setToDate(toISODate(end));
  }, []);

  function quickRange(businessDays: number) {
    const today = new Date();
    const start = subtractBusinessDays(today, businessDays);
    setFromDate(toISODate(start));
    setToDate(toISODate(today));
    setMsg({ kind: "info", text: `Rango listo: últimos ${businessDays} días hábiles.` });
  }

  async function start() {
    setMsg(null);

    if (!cer || !key || !password || !fromDate || !toDate) {
      setMsg({ kind: "err", text: "Faltan archivos o contraseña. (Fechas ya vienen por default)" });
      return;
    }

    setLoading(true);
    onStart?.();

    try {
      const fd = new FormData();
      fd.append("clientId", clientId);
      fd.append("cer", cer);
      fd.append("key", key);
      fd.append("password", password);
      fd.append("fromDate", fromDate);
      fd.append("toDate", toDate);
      fd.append("tipo", tipo);

      const res = await fetch("/api/sat/pull", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || "Error");

      setMsg({
        kind: "ok",
        text: `Listo. CFDI procesados: ${data.inserted ?? "—"}. Score: ${data.metrics?.score ?? "—"}`,
      });

      onDone?.();
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Error" });
    } finally {
      setLoading(false);
      setPassword(""); // no persistir
    }
  }

  const banner =
    msg?.kind === "ok"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
      : msg?.kind === "err"
        ? "bg-rose-50 text-rose-900 ring-rose-100"
        : "bg-slate-50 text-slate-700 ring-slate-200/70";

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 py-4 bg-slate-50/60 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-wide text-slate-500">SAT ENGINE</div>
          <div className="mt-1 text-[13px] font-semibold text-slate-900">
            Descarga masiva → XML → métricas
          </div>
          <div className="mt-1 text-[12px] text-slate-600">
            UX: botones rápidos para rango (días hábiles). La contraseña no se guarda.
          </div>
        </div>

        <button
          onClick={start}
          disabled={loading}
          className={[
            "shrink-0 rounded-xl px-3 py-2 text-[12px] font-semibold",
            "bg-[#071A3A] text-white hover:opacity-95",
            "disabled:opacity-60",
          ].join(" ")}
        >
          {loading ? "Procesando…" : "Procesar SAT"}
        </button>
      </div>

      <div className="p-4">
        {msg ? (
          <div className={["mb-3 rounded-2xl px-3 py-2 text-[12px] font-semibold ring-1", banner].join(" ")}>
            {msg.text}
          </div>
        ) : null}

        {/* Quick ranges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => quickRange(30)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-200"
          >
            Últimos 30 hábiles
          </button>
          <button
            type="button"
            onClick={() => quickRange(90)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-200"
          >
            Últimos 90 hábiles
          </button>

          <div className="ml-auto text-[11px] text-slate-500">
            Rango: <span className="font-semibold">{fromDate}</span> →{" "}
            <span className="font-semibold">{toDate}</span>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="e.firma (.cer)">
            <input
              type="file"
              accept=".cer"
              onChange={(e) => setCer(e.target.files?.[0] ?? null)}
              className="block w-full text-[12px]"
            />
          </Field>

          <Field label="e.firma (.key)">
            <input
              type="file"
              accept=".key"
              onChange={(e) => setKey(e.target.files?.[0] ?? null)}
              className="block w-full text-[12px]"
            />
          </Field>

          <Field label="Password (.key)">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30"
              placeholder="No se guarda"
            />
          </Field>

          <Field label="Tipo de CFDI">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as Tipo)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30"
            >
              <option value="emitidos">Emitidos (ingresos)</option>
              <option value="recibidos">Recibidos (egresos)</option>
            </select>
          </Field>

          {/* Fechas quedan pero ya no “obligas” al user */}
          <Field label="Desde (opcional)">
            <input
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              type="date"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30"
            />
          </Field>

          <Field label="Hasta (opcional)">
            <input
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              type="date"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#00E599]/30"
            />
          </Field>
        </div>

        <div className="mt-3 text-[11px] text-slate-500">
          Recomendación MVP: usa 30–90 hábiles para que el SAT responda rápido.
        </div>
      </div>
    </div>
  );
}