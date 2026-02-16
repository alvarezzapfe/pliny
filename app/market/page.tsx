"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Status = "LIVE" | "DUE DILIGENCE" | "CERRANDO";
type Opportunity = {
  id: string;
  name: string;
  rate: number;      // %
  termMonths: number;
  amountMXN: number;
  guarantee: string; // e.g. "Sin garantía / Aval"
  sector: string;    // e.g. "Retail"
  status: Status;
  risk: number;      // 0-100 (demo)
  tags: string[];
};

const fmtMXN = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export default function MarketPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | Status>("LIVE");
  const [sector, setSector] = useState<"ALL" | string>("ALL");

  const data: Opportunity[] = useMemo(
    () => [
      { id: "OP-001", name: "Poke Burrito | Expansión retail", rate: 18.0, termMonths: 36, amountMXN: 1500000, guarantee: "Obligado solidario", sector: "Retail", status: "LIVE", risk: 42, tags: ["SAT/CFDI", "Bullet", "Friends&Family"] },
      { id: "OP-002", name: "Logística última milla | Flotilla", rate: 22.0, termMonths: 24, amountMXN: 8000000, guarantee: "Prenda sin transmisión", sector: "Logística", status: "LIVE", risk: 55, tags: ["Covenants", "GPS", "Asset-backed"] },
      { id: "OP-003", name: "Agroindustria | Capital de trabajo", rate: 19.5, termMonths: 18, amountMXN: 6000000, guarantee: "Cesión de derechos de cobro", sector: "Agro", status: "LIVE", risk: 50, tags: ["CFDI", "Temporada", "Cuentas"] },
      { id: "OP-004", name: "Manufactura ligera | Equipo", rate: 21.0, termMonths: 30, amountMXN: 12000000, guarantee: "Garantía mobiliaria", sector: "Manufactura", status: "DUE DILIGENCE", risk: 47, tags: ["Collateral", "CapEx", "Audited"] },
      { id: "OP-005", name: "Servicios B2B | Factoraje", rate: 17.0, termMonths: 12, amountMXN: 10000000, guarantee: "Facturas / cesión", sector: "Servicios", status: "LIVE", risk: 38, tags: ["Factoring", "Invoice", "Short tenor"] },

      { id: "OP-006", name: "Construcción | Anticipos obra", rate: 24.0, termMonths: 12, amountMXN: 15000000, guarantee: "Cesión contrato", sector: "Construcción", status: "CERRANDO", risk: 62, tags: ["Project", "Escrow", "Milestones"] },
      { id: "OP-007", name: "Educación | Flujo colegiaturas", rate: 20.0, termMonths: 24, amountMXN: 4500000, guarantee: "Cobranza domiciliada", sector: "Educación", status: "LIVE", risk: 40, tags: ["Recurring", "Collections", "Low churn"] },
      { id: "OP-008", name: "Salud | Clínica privada", rate: 19.0, termMonths: 36, amountMXN: 9000000, guarantee: "Aval + equipo", sector: "Salud", status: "DUE DILIGENCE", risk: 46, tags: ["Equipment", "DSCR", "Insurance"] },
      { id: "OP-009", name: "E-commerce | Inventario", rate: 23.5, termMonths: 9, amountMXN: 3000000, guarantee: "Reserva inventario", sector: "E-commerce", status: "LIVE", risk: 58, tags: ["Inventory", "Marketplace", "Seasonal"] },
      { id: "OP-010", name: "Transporte | Refacciones", rate: 22.5, termMonths: 18, amountMXN: 7000000, guarantee: "Garantía mobiliaria", sector: "Transporte", status: "LIVE", risk: 53, tags: ["Fleet", "Collateral", "Covenants"] },

      { id: "OP-011", name: "Alimentos | Capital trabajo", rate: 18.8, termMonths: 24, amountMXN: 5500000, guarantee: "Aval", sector: "Alimentos", status: "LIVE", risk: 41, tags: ["CFDI", "Margins", "Stable demand"] },
      { id: "OP-012", name: "Energía | Proveedor", rate: 20.5, termMonths: 24, amountMXN: 14000000, guarantee: "Cesión de cobros", sector: "Energía", status: "DUE DILIGENCE", risk: 49, tags: ["Receivables", "PO", "Blue-chip"] },
      { id: "OP-013", name: "Turismo | Operación", rate: 21.5, termMonths: 18, amountMXN: 6800000, guarantee: "Aval + cuentas", sector: "Turismo", status: "LIVE", risk: 57, tags: ["Seasonality", "Collections", "FX exposure"] },
      { id: "OP-014", name: "Textil | Órdenes de compra", rate: 19.9, termMonths: 12, amountMXN: 4000000, guarantee: "OC / cesión", sector: "Textil", status: "LIVE", risk: 45, tags: ["PO finance", "Short tenor", "B2B"] },
      { id: "OP-015", name: "Servicios IT | Contratos recurrentes", rate: 18.5, termMonths: 30, amountMXN: 11000000, guarantee: "Cesión contratos", sector: "Tecnología", status: "CERRANDO", risk: 36, tags: ["SaaS", "Recurring", "Low default"] },

      { id: "OP-016", name: "Agrícola | Temporada", rate: 24.5, termMonths: 10, amountMXN: 9500000, guarantee: "Garantía prendaria", sector: "Agro", status: "LIVE", risk: 66, tags: ["Seasonal", "Collateral", "Weather"] },
      { id: "OP-017", name: "Cadena retail | Aperturas", rate: 20.2, termMonths: 36, amountMXN: 18000000, guarantee: "Aval + activos", sector: "Retail", status: "DUE DILIGENCE", risk: 52, tags: ["Expansion", "Unit economics", "Covenants"] },
      { id: "OP-018", name: "Importación | Trade", rate: 17.9, termMonths: 12, amountMXN: 13000000, guarantee: "Garantía líquida parcial", sector: "Comercio", status: "LIVE", risk: 44, tags: ["Trade", "LC", "Customs"] },
      { id: "OP-019", name: "Servicios B2B | Revolvente", rate: 23.0, termMonths: 24, amountMXN: 20000000, guarantee: "Sin garantía / DSCR", sector: "Servicios", status: "LIVE", risk: 61, tags: ["Revolver", "Covenants", "Monitoring"] },
      { id: "OP-020", name: "Manufactura | Expansión planta", rate: 21.8, termMonths: 48, amountMXN: 35000000, guarantee: "Hipoteca + mobiliaria", sector: "Manufactura", status: "DUE DILIGENCE", risk: 48, tags: ["Mortgage", "Collateral", "Audit"] },
    ],
    []
  );

  const sectors = useMemo(() => {
    const s = Array.from(new Set(data.map((d) => d.sector))).sort();
    return ["ALL", ...s] as const;
  }, [data]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return data
      .filter((d) => (status === "ALL" ? true : d.status === status))
      .filter((d) => (sector === "ALL" ? true : d.sector === sector))
      .filter((d) => {
        if (!qq) return true;
        return (
          d.name.toLowerCase().includes(qq) ||
          d.id.toLowerCase().includes(qq) ||
          d.guarantee.toLowerCase().includes(qq) ||
          d.sector.toLowerCase().includes(qq) ||
          d.tags.join(" ").toLowerCase().includes(qq)
        );
      });
  }, [data, q, status, sector]);

  const liveCount = data.filter((d) => d.status === "LIVE").length;
  const totalMXN = filtered.reduce((a, b) => a + b.amountMXN, 0);

  return (
    <main className="min-h-screen pliny-bg px-4 py-6">
      {/* neon overlays */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-cyan-400/18 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-fuchsia-500/14 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-lime-400/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="rounded-[28px] border border-white/15 bg-white/6 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <header className="px-5 md:px-8 py-6 border-b border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-2xl bg-cyan-400/10 blur-xl" />
                  <img src="/plinius.png" alt="Plinius" className="relative h-10 w-auto" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-white font-semibold leading-tight truncate">
                      Mercado en vivo de crédito
                    </div>
                    <span className="livePill">
                      <span className="liveDot" />
                      LIVE
                    </span>
                  </div>
                  <div className="text-white/65 text-sm truncate">
                    Outsource underwriting para bancos y SOFOMES · señales SAT/CFDI · reportes ejecutivos
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/pricing/lead?plan=pro"
                  className="hidden sm:inline-flex items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-50 font-semibold py-2.5 px-4 hover:bg-cyan-300/15 transition shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_10px_30px_rgba(34,211,238,0.10)]"
                >
                  Solicitar integración
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/6 text-white font-semibold py-2.5 px-4 hover:bg-white/10 transition"
                >
                  Volver
                </Link>
              </div>
            </div>

            {/* Top stats */}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <StatCard label="Oportunidades (Live)" value={`${liveCount}`} tone="lime" />
              <StatCard label="Oportunidades (filtradas)" value={`${filtered.length}`} tone="cyan" />
              <StatCard label="Monto total (filtrado)" value={fmtMXN(totalMXN)} tone="violet" />
            </div>

            {/* Controls */}
            <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_200px_220px]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por empresa, sector, garantía, tag…"
                className="w-full rounded-2xl bg-black/35 border border-white/15 text-white px-4 py-3 outline-none focus:border-white/35 text-sm"
              />

              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded-2xl bg-black/35 border border-white/15 text-white px-4 py-3 outline-none focus:border-white/35 text-sm"
              >
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s === "ALL" ? "Sector: Todos" : `Sector: ${s}`}
                  </option>
                ))}
              </select>

              <div className="segmented">
                {(["ALL", "LIVE", "DUE DILIGENCE", "CERRANDO"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setStatus(k)}
                    className={["segBtn", status === k ? "active" : ""].join(" ")}
                  >
                    {k === "ALL" ? "Todos" : k}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 text-[11px] text-white/55">
              Tip: escribe “SAT”, “collateral”, “bullet”, “covenants” para filtrar por tags.
            </div>
          </header>

          {/* Grid */}
          <section className="px-5 md:px-8 py-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((o) => (
                <OppCard key={o.id} o={o} />
              ))}
            </div>

            <div className="mt-6 text-[11px] text-white/55 flex flex-wrap items-center justify-between gap-2">
              <span>Demo: datos ilustrativos. Conecta tu feed real cuando quieras.</span>
              <span>© {new Date().getFullYear()} Plinius</span>
            </div>
          </section>
        </div>
      </div>

      {/* keep your original bg + add high-tech utilities */}
      <style jsx global>{`
        .pliny-bg {
          background: radial-gradient(1200px 700px at 20% 10%, rgba(34, 211, 238, 0.08), transparent 55%),
            radial-gradient(900px 650px at 85% 35%, rgba(217, 70, 239, 0.08), transparent 55%),
            radial-gradient(900px 650px at 55% 95%, rgba(163, 230, 53, 0.07), transparent 60%),
            linear-gradient(180deg, rgba(3, 7, 18, 1), rgba(2, 6, 23, 1));
        }

        .livePill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(163, 230, 53, 0.28);
          background: rgba(163, 230, 53, 0.12);
          color: rgba(236, 253, 245, 0.98);
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .liveDot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(163, 230, 53, 1);
          box-shadow: 0 0 18px rgba(163, 230, 53, 0.55);
          animation: livePulse 1.1s ease-in-out infinite;
        }
        @keyframes livePulse {
          0% { transform: scale(0.85); opacity: 0.6; }
          55% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.85); opacity: 0.6; }
        }

        .segmented {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          padding: 6px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.05);
        }
        .segBtn {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.18);
          color: rgba(255,255,255,0.82);
          font-size: 12px;
          font-weight: 700;
          padding: 10px 10px;
          transition: 180ms ease;
          white-space: nowrap;
        }
        .segBtn:hover { background: rgba(255,255,255,0.08); }
        .segBtn.active {
          color: rgba(10, 10, 10, 0.95);
          background: rgba(255,255,255,0.92);
          border-color: rgba(255,255,255,0.25);
          box-shadow: 0 10px 26px rgba(0,0,0,0.25);
        }

        @keyframes shimmer {
          0% { transform: translateX(-30%); opacity: 0; }
          35% { opacity: 1; }
          100% { transform: translateX(80%); opacity: 0; }
        }
      `}</style>
    </main>
  );
}

/* ---------- components ---------- */

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "lime" | "violet";
}) {
  const map: Record<string, { ring: string; blob: string }> = {
    cyan: { ring: "border-cyan-300/20", blob: "bg-cyan-400/16" },
    lime: { ring: "border-lime-300/22", blob: "bg-lime-400/14" },
    violet: { ring: "border-violet-300/20", blob: "bg-violet-400/16" },
  };

  const c = map[tone];

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${c.ring} bg-white/6 p-4`}>
      <div className={`absolute -top-10 -right-10 h-44 w-44 rounded-full blur-3xl ${c.blob}`} />
      <div className="relative">
        <div className="text-white/60 text-[11px]">{label}</div>
        <div className="mt-1 text-white font-semibold text-2xl leading-none">{value}</div>
        <div className="mt-2 h-[2px] w-full bg-white/10 overflow-hidden rounded-full">
          <div className="h-full w-1/2 bg-white/55 animate-[shimmer_1.8s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

function OppCard({ o }: { o: Opportunity }) {
  const statusTone =
    o.status === "LIVE" ? "lime" : o.status === "CERRANDO" ? "amber" : "violet";

  const pill =
    statusTone === "lime"
      ? "border-lime-300/28 bg-lime-300/12 text-lime-50"
      : statusTone === "amber"
      ? "border-amber-300/28 bg-amber-300/12 text-amber-50"
      : "border-violet-300/28 bg-violet-300/12 text-violet-50";

  const glow =
    statusTone === "lime"
      ? "before:bg-lime-400/16"
      : statusTone === "amber"
      ? "before:bg-amber-400/14"
      : "before:bg-violet-400/14";

  // risk bar (demo)
  const riskPct = Math.max(0, Math.min(100, o.risk));
  const riskLabel =
    riskPct < 40 ? "Bajo" : riskPct < 65 ? "Medio" : "Alto";

  return (
    <div
      className={[
        "relative rounded-3xl border border-white/15 bg-white/6 p-5 overflow-hidden transition",
        "hover:border-white/25 hover:translate-y-[-1px]",
        "before:content-[''] before:absolute before:-top-12 before:-right-12 before:h-44 before:w-44 before:rounded-full before:blur-3xl",
        glow,
      ].join(" ")}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white/60 text-[11px]">{o.id} · {o.sector}</div>
          <div className="mt-1 text-white font-semibold leading-snug">
            {o.name}
          </div>
        </div>
        <span className={`shrink-0 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${pill}`}>
          {o.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Kpi label="Tasa" value={`${o.rate.toFixed(1)}%`} />
        <Kpi label="Plazo" value={`${o.termMonths}m`} />
        <Kpi label="Monto" value={fmtMXN(o.amountMXN)} />
      </div>

      <div className="mt-3 rounded-2xl border border-white/12 bg-black/20 px-3 py-2">
        <div className="text-[11px] text-white/55">Garantía</div>
        <div className="text-sm text-white/85">{o.guarantee}</div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {o.tags.slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded-full border border-white/12 bg-white/6 px-2.5 py-1 text-[10px] text-white/75"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/12 bg-black/20 px-3 py-3">
        <div className="flex items-center justify-between text-[11px] text-white/55">
          <span>Risk meter</span>
          <span className="text-white/75 font-semibold">{riskLabel}</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-white/70"
            style={{ width: `${riskPct}%`, filter: "drop-shadow(0 0 14px rgba(255,255,255,0.14))" }}
          />
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/pricing/lead?plan=pro"
          className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-50 font-semibold py-2.5 px-3 hover:bg-cyan-300/15 transition text-sm"
        >
          Integrar
        </Link>
        <button
          type="button"
          onClick={() => alert("Demo: abrir detalle / underwriting")}
          className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/6 text-white font-semibold py-2.5 px-3 hover:bg-white/10 transition text-sm"
        >
          Ver detalle
        </button>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-black/20 px-3 py-2">
      <div className="text-[11px] text-white/55">{label}</div>
      <div className="text-sm text-white/90 font-semibold truncate">{value}</div>
    </div>
  );
}
