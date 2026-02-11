/* app/admin/dashboard/page.tsx
   Plinius Admin Dashboard (ultimate, robust)
   - 4 módulos: Originación/Portafolio, Estatus de cartera, KYC, Garantías (RUG / fuente de pago)
   - Tema morado/azul neon (sin dependencias externas)
   - UI: sidebar + topbar + KPIs + tabs + tablas + filtros + drawers/modals simples
*/
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/* =========================
   TYPES
========================= */
type TabKey = "portfolio" | "status" | "kyc" | "collateral";

type LoanStatus = "current" | "watch" | "late" | "default";
type KycStatus = "pending" | "in_review" | "approved" | "rejected";
type CollateralType = "Fuente de pago" | "Activo fijo (RUG)";

type Loan = {
  id: string;
  borrower: string;
  rfc: string;
  product: "Revolvente" | "Simple" | "Factoraje" | "Arrendamiento";
  originationDate: string; // ISO
  principalMXN: number;
  outstandingMXN: number;
  rateAPR: number;
  termMonths: number;
  status: LoanStatus;
  dpd: number;
  riskScore: number; // 0-100
};

type KycCompany = {
  id: string;
  company: string;
  rfc: string;
  promotor: string;
  requestedAt: string;
  status: KycStatus;
  satCfdiMonths: number;
  buroScore?: number;
  flags: string[]; // red flags / notes
};

type Collateral = {
  id: string;
  company: string;
  rfc: string;
  type: CollateralType;
  description: string;
  valueMXN: number;
  coveragePct: number; // coverage on exposure
  rugFolio?: string;
  paymentSource?: string;
  verified: boolean;
  updatedAt: string;
};

type PortfolioSummary = {
  aumMXN: number;
  outstandingMXN: number;
  activeLoans: number;
  avgAPR: number;
  nplPct: number; // 0..1
  latePct: number; // 0..1
  watchPct: number; // 0..1
};

/* =========================
   PAGE
========================= */
export default function AdminDashboardPage() {
  const [tab, setTab] = useState<TabKey>("portfolio");

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<LoanStatus | "all">("all");
  const [kycFilter, setKycFilter] = useState<KycStatus | "all">("all");
  const [collateralFilter, setCollateralFilter] = useState<CollateralType | "all">("all");

  // UI states
  const [drawerLoan, setDrawerLoan] = useState<Loan | null>(null);
  const [drawerKyc, setDrawerKyc] = useState<KycCompany | null>(null);
  const [drawerCol, setDrawerCol] = useState<Collateral | null>(null);

  const data = useMemo(() => seedData(), []);
  const summary = useMemo(() => computeSummary(data.loans), [data.loans]);

  const filteredLoans = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return data.loans.filter((l) => {
      const matchQ =
        !qq ||
        l.borrower.toLowerCase().includes(qq) ||
        l.rfc.toLowerCase().includes(qq) ||
        l.id.toLowerCase().includes(qq);
      const matchStatus = statusFilter === "all" ? true : l.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [data.loans, q, statusFilter]);

  const filteredKyc = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return data.kyc.filter((c) => {
      const matchQ =
        !qq ||
        c.company.toLowerCase().includes(qq) ||
        c.rfc.toLowerCase().includes(qq) ||
        c.promotor.toLowerCase().includes(qq) ||
        c.id.toLowerCase().includes(qq);
      const match = kycFilter === "all" ? true : c.status === kycFilter;
      return matchQ && match;
    });
  }, [data.kyc, q, kycFilter]);

  const filteredCollateral = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return data.collateral.filter((c) => {
      const matchQ =
        !qq ||
        c.company.toLowerCase().includes(qq) ||
        c.rfc.toLowerCase().includes(qq) ||
        c.id.toLowerCase().includes(qq) ||
        (c.rugFolio || "").toLowerCase().includes(qq) ||
        (c.paymentSource || "").toLowerCase().includes(qq);
      const match = collateralFilter === "all" ? true : c.type === collateralFilter;
      return matchQ && match;
    });
  }, [data.collateral, q, collateralFilter]);

  return (
    <div className="min-h-screen plx-bg">
      <Ambient />

      {/* Layout */}
      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:py-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
          {/* Sidebar */}
          <aside className="plx-card plx-card-soft p-4 lg:p-5 h-fit lg:sticky lg:top-6">
            <div className="flex items-center gap-3">
              <img src="/plinius.png" alt="Plinius" className="h-10 w-auto" />
              <div className="min-w-0">
                <div className="text-white font-extrabold leading-tight">Plinius</div>
                <div className="text-white/60 text-xs truncate">Admin Console · Private Credit</div>
              </div>
            </div>

            <div className="mt-4 plx-pill">
              <span className="plx-dot" />
              <div className="text-white/80 text-xs font-semibold">DEMO MODE</div>
            </div>

            <nav className="mt-5 grid gap-2">
              <SideNav
                active={tab === "portfolio"}
                title="Originación & Portafolio"
                desc="Visualiza cartera, créditos, pipeline"
                onClick={() => setTab("portfolio")}
                icon="📌"
              />
              <SideNav
                active={tab === "status"}
                title="Estatus de Cartera"
                desc="DPD, atrasos, NPL, alertas"
                onClick={() => setTab("status")}
                icon="🧭"
              />
              <SideNav
                active={tab === "kyc"}
                title="KYC Empresas"
                desc="Promovidas / acreditadas"
                onClick={() => setTab("kyc")}
                icon="🧾"
              />
              <SideNav
                active={tab === "collateral"}
                title="Garantías"
                desc="Fuente de pago · Activo fijo (RUG)"
                onClick={() => setTab("collateral")}
                icon="🛡️"
              />
            </nav>

            <div className="mt-5 pt-5 border-t border-white/10">
              <div className="grid gap-2">
                <QuickLink href="/admin/login" label="Cambiar usuario" />
                <QuickLink href="/login" label="Login empresa" />
                <QuickLink href="/" label="Inicio" />
              </div>

              <div className="mt-4 text-[11px] text-white/45">
                © {new Date().getFullYear()} Plinius · Marca registrada.
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0">
            {/* Topbar */}
            <div className="plx-card p-4 lg:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white/80 text-xs font-semibold">Admin</div>
                  <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight">
                    {tabTitle(tab)}
                  </h1>
                  <div className="text-white/60 text-sm mt-1">
                    Datos demo · filtros rápidos · acciones operativas.
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="plx-search">
                    <span className="text-white/55 text-sm">⌕</span>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar: empresa, RFC, ID, folio..."
                      className="plx-search-input"
                    />
                    {q && (
                      <button
                        onClick={() => setQ("")}
                        className="text-white/55 hover:text-white text-sm px-2"
                        aria-label="Limpiar búsqueda"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: export")}>
                      Exportar
                    </button>
                    <button className="plx-btn plx-btn-primary" onClick={() => alert("Demo: crear")}>
                      Nueva acción
                    </button>
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="mt-4 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <KpiCard
                  label="AUM (MXN)"
                  value={mxn(summary.aumMXN)}
                  sub={`Outstanding: ${mxn(summary.outstandingMXN)}`}
                  tone="violet"
                />
                <KpiCard
                  label="Créditos activos"
                  value={String(summary.activeLoans)}
                  sub={`APR prom: ${pct(summary.avgAPR)}`}
                  tone="blue"
                />
                <KpiCard
                  label="NPL"
                  value={pct(summary.nplPct)}
                  sub={`Watch: ${pct(summary.watchPct)}`}
                  tone="pink"
                />
                <KpiCard
                  label="Atraso"
                  value={pct(summary.latePct)}
                  sub="DPD y alertas operativas"
                  tone="cyan"
                />
              </div>

              {/* Tabs row */}
              <div className="mt-4 flex flex-wrap gap-2">
                <TabChip active={tab === "portfolio"} onClick={() => setTab("portfolio")}>
                  Portafolio
                </TabChip>
                <TabChip active={tab === "status"} onClick={() => setTab("status")}>
                  Estatus
                </TabChip>
                <TabChip active={tab === "kyc"} onClick={() => setTab("kyc")}>
                  KYC
                </TabChip>
                <TabChip active={tab === "collateral"} onClick={() => setTab("collateral")}>
                  Garantías
                </TabChip>
              </div>
            </div>

            {/* Content */}
            <div className="mt-4 lg:mt-6 grid gap-4 lg:gap-6">
              {tab === "portfolio" && (
                <section className="grid xl:grid-cols-[1.3fr_0.7fr] gap-4 lg:gap-6">
                  <div className="plx-card p-4 lg:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-white font-bold">Originación & cartera</div>
                        <div className="text-white/60 text-sm">
                          Pipeline, créditos y performance base.
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={statusFilter}
                          onChange={(v) => setStatusFilter(v as any)}
                          options={[
                            { value: "all", label: "Todos" },
                            { value: "current", label: "Vigente" },
                            { value: "watch", label: "Watch" },
                            { value: "late", label: "Atraso" },
                            { value: "default", label: "Default" },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="mt-4 plx-tableWrap">
                      <table className="plx-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Empresa</th>
                            <th>Producto</th>
                            <th>Saldo</th>
                            <th>DPD</th>
                            <th>Riesgo</th>
                            <th>Estatus</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLoans.map((l) => (
                            <tr key={l.id}>
                              <td className="mono">{l.id}</td>
                              <td>
                                <div className="font-semibold text-white/90">{l.borrower}</div>
                                <div className="text-white/50 text-xs mono">{l.rfc}</div>
                              </td>
                              <td className="text-white/80">{l.product}</td>
                              <td className="text-white/85">{mxn(l.outstandingMXN)}</td>
                              <td className="text-white/80">{l.dpd}</td>
                              <td>
                                <RiskBar score={l.riskScore} />
                              </td>
                              <td>
                                <StatusPill status={l.status} />
                              </td>
                              <td className="text-right">
                                <button
                                  className="plx-btn plx-btn-mini"
                                  onClick={() => setDrawerLoan(l)}
                                >
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredLoans.length === 0 && (
                            <tr>
                              <td colSpan={8} className="text-center text-white/55 py-8">
                                No hay resultados con estos filtros.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:gap-6">
                    <div className="plx-card p-4 lg:p-5">
                      <div className="text-white font-bold">Mini Dash · Health</div>
                      <div className="text-white/60 text-sm mt-1">
                        Indicadores rápidos para comité.
                      </div>

                      <div className="mt-4 grid gap-3">
                        <MiniStat label="Saldo total" value={mxn(summary.outstandingMXN)} />
                        <MiniStat label="APR prom" value={pct(summary.avgAPR)} />
                        <MiniStat label="NPL" value={pct(summary.nplPct)} />
                        <MiniStat label="Atraso" value={pct(summary.latePct)} />
                      </div>

                      <div className="mt-4">
                        <div className="text-white/70 text-xs font-semibold mb-2">
                          Distribución (demo)
                        </div>
                        <StackedBreakdown
                          items={[
                            { label: "Vigente", value: 1 - summary.latePct - summary.nplPct, tone: "blue" },
                            { label: "Atraso", value: summary.latePct, tone: "cyan" },
                            { label: "NPL", value: summary.nplPct, tone: "pink" },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="plx-card p-4 lg:p-5">
                      <div className="text-white font-bold">Acciones rápidas</div>
                      <div className="text-white/60 text-sm mt-1">
                        Flujos operativos frecuentes.
                      </div>

                      <div className="mt-4 grid gap-2">
                        <ActionRow title="Crear alerta de riesgo" desc="Asigna owner, SLA y evidencia" />
                        <ActionRow title="Generar reporte PDF" desc="Selecciona empresa → periodo → export" />
                        <ActionRow title="Registrar garantía (RUG)" desc="Alta de folio + valuación + cobertura" />
                        <ActionRow title="Revisión KYC" desc="Semáforo + flags + checklist" />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {tab === "status" && (
                <section className="grid xl:grid-cols-[0.9fr_1.1fr] gap-4 lg:gap-6">
                  <div className="plx-card p-4 lg:p-5">
                    <div className="text-white font-bold">Semáforo de cartera</div>
                    <div className="text-white/60 text-sm mt-1">
                      Por estatus · DPD · alertas.
                    </div>

                    <div className="mt-4 grid gap-3">
                      <StatusTile
                        label="Vigente"
                        value={`${countBy(data.loans, "current")} créditos`}
                        tone="blue"
                        hint="DPD = 0"
                      />
                      <StatusTile
                        label="Watch"
                        value={`${countBy(data.loans, "watch")} créditos`}
                        tone="violet"
                        hint="Señales tempranas"
                      />
                      <StatusTile
                        label="Atraso"
                        value={`${countBy(data.loans, "late")} créditos`}
                        tone="cyan"
                        hint="DPD > 0"
                      />
                      <StatusTile
                        label="Default"
                        value={`${countBy(data.loans, "default")} créditos`}
                        tone="pink"
                        hint="NPL (demo)"
                      />
                    </div>

                    <div className="mt-5">
                      <div className="text-white/70 text-xs font-semibold mb-2">DPD (demo)</div>
                      <SparkBars
                        values={[
                          { label: "0", v: 0.64 },
                          { label: "1-7", v: 0.16 },
                          { label: "8-30", v: 0.11 },
                          { label: "31+", v: 0.09 },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="plx-card p-4 lg:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-white font-bold">Queue operativa</div>
                        <div className="text-white/60 text-sm">
                          Créditos con tareas pendientes.
                        </div>
                      </div>
                      <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: crear tarea")}>
                        Crear tarea
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {data.tasks.map((t) => (
                        <div key={t.id} className="plx-row">
                          <div className="min-w-0">
                            <div className="text-white font-semibold truncate">{t.title}</div>
                            <div className="text-white/55 text-xs truncate">
                              {t.company} · {t.owner} · SLA {t.sla}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Pill tone={t.tone}>{t.priority}</Pill>
                            <button className="plx-btn plx-btn-mini" onClick={() => alert("Demo: abrir")}>
                              Abrir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {tab === "kyc" && (
                <section className="grid xl:grid-cols-[1.3fr_0.7fr] gap-4 lg:gap-6">
                  <div className="plx-card p-4 lg:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-white font-bold">KYC · Empresas promovidas</div>
                        <div className="text-white/60 text-sm">
                          Checklist, flags, aprobación y evidencia.
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={kycFilter}
                          onChange={(v) => setKycFilter(v as any)}
                          options={[
                            { value: "all", label: "Todos" },
                            { value: "pending", label: "Pendiente" },
                            { value: "in_review", label: "En revisión" },
                            { value: "approved", label: "Aprobado" },
                            { value: "rejected", label: "Rechazado" },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="mt-4 plx-tableWrap">
                      <table className="plx-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Empresa</th>
                            <th>Promotor</th>
                            <th>CFDI</th>
                            <th>Score</th>
                            <th>Estatus</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredKyc.map((c) => (
                            <tr key={c.id}>
                              <td className="mono">{c.id}</td>
                              <td>
                                <div className="font-semibold text-white/90">{c.company}</div>
                                <div className="text-white/50 text-xs mono">{c.rfc}</div>
                              </td>
                              <td className="text-white/80">{c.promotor}</td>
                              <td className="text-white/80">{c.satCfdiMonths}m</td>
                              <td className="text-white/85">{c.buroScore ?? "—"}</td>
                              <td>
                                <KycPill status={c.status} />
                              </td>
                              <td className="text-right">
                                <button
                                  className="plx-btn plx-btn-mini"
                                  onClick={() => setDrawerKyc(c)}
                                >
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredKyc.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center text-white/55 py-8">
                                No hay resultados con estos filtros.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:gap-6">
                    <div className="plx-card p-4 lg:p-5">
                      <div className="text-white font-bold">Checklist (demo)</div>
                      <div className="text-white/60 text-sm mt-1">Evidencia mínima recomendada.</div>

                      <div className="mt-4 grid gap-2">
                        <ChecklistItem label="Identidad representante legal" />
                        <ChecklistItem label="Constancia fiscal + RFC" />
                        <ChecklistItem label="CFDI 24 meses (SAT)" />
                        <ChecklistItem label="Buró + score + consultas" />
                        <ChecklistItem label="Validación de beneficiario final" />
                        <ChecklistItem label="Fuente de pago / RUG (si aplica)" />
                      </div>

                      <div className="mt-4 text-xs text-white/55">
                        Tip: convierte flags en tareas con SLA.
                      </div>
                    </div>

                    <div className="plx-card p-4 lg:p-5">
                      <div className="text-white font-bold">Acciones</div>
                      <div className="text-white/60 text-sm mt-1">Operación KYC rápida.</div>

                      <div className="mt-4 grid gap-2">
                        <button className="plx-btn plx-btn-primary" onClick={() => alert("Demo: aprobar")}>
                          Aprobar KYC
                        </button>
                        <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: pedir info")}>
                          Solicitar info adicional
                        </button>
                        <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: rechazar")}>
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {tab === "collateral" && (
                <section className="grid xl:grid-cols-[1.3fr_0.7fr] gap-4 lg:gap-6">
                  <div className="plx-card p-4 lg:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-white font-bold">Garantías · RUG & fuente de pago</div>
                        <div className="text-white/60 text-sm">
                          Cobertura, valuación, verificación y folios.
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={collateralFilter}
                          onChange={(v) => setCollateralFilter(v as any)}
                          options={[
                            { value: "all", label: "Todos" },
                            { value: "Fuente de pago", label: "Fuente de pago" },
                            { value: "Activo fijo (RUG)", label: "Activo fijo (RUG)" },
                          ]}
                        />
                        <button className="plx-btn plx-btn-primary" onClick={() => alert("Demo: nueva garantía")}>
                          Nueva garantía
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 plx-tableWrap">
                      <table className="plx-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Empresa</th>
                            <th>Tipo</th>
                            <th>Valor</th>
                            <th>Cobertura</th>
                            <th>Verif.</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCollateral.map((c) => (
                            <tr key={c.id}>
                              <td className="mono">{c.id}</td>
                              <td>
                                <div className="font-semibold text-white/90">{c.company}</div>
                                <div className="text-white/50 text-xs mono">{c.rfc}</div>
                              </td>
                              <td className="text-white/80">{c.type}</td>
                              <td className="text-white/85">{mxn(c.valueMXN)}</td>
                              <td className="text-white/80">{pct(c.coveragePct / 100)}</td>
                              <td>
                                <Pill tone={c.verified ? "good" : "warn"}>{c.verified ? "OK" : "Pendiente"}</Pill>
                              </td>
                              <td className="text-right">
                                <button className="plx-btn plx-btn-mini" onClick={() => setDrawerCol(c)}>
                                  Ver
                                </button>
                              </td>
                            </tr>
                          ))}
                          {filteredCollateral.length === 0 && (
                            <tr>
                              <td colSpan={7} className="text-center text-white/55 py-8">
                                No hay resultados con estos filtros.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:gap-6">
                    <div className="plx-card p-4 lg:p-5">
                      <div className="text-white font-bold">Mini Dash · Garantías</div>
                      <div className="text-white/60 text-sm mt-1">Cobertura y concentración.</div>

                      <div className="mt-4 grid gap-3">
                        <MiniStat label="Garantías totales" value={String(data.collateral.length)} />
                        <MiniStat
                          label="Valor total (MXN)"
                          value={mxn(data.collateral.reduce((s, x) => s + x.valueMXN, 0))}
                        />
                        <MiniStat
                          label="Verificadas"
                          value={`${data.collateral.filter((x) => x.verified).length} / ${data.collateral.length}`}
                        />
                      </div>

                      <div className="mt-4">
                        <div className="text-white/70 text-xs font-semibold mb-2">Mix por tipo</div>
                        <StackedBreakdown
                          items={[
                            {
                              label: "Fuente de pago",
                              value:
                                data.collateral.filter((x) => x.type === "Fuente de pago").length /
                                Math.max(1, data.collateral.length),
                              tone: "violet",
                            },
                            {
                              label: "Activo fijo (RUG)",
                              value:
                                data.collateral.filter((x) => x.type === "Activo fijo (RUG)").length /
                                Math.max(1, data.collateral.length),
                              tone: "blue",
                            },
                          ]}
                        />
                      </div>
                    </div>

                    <div className="plx-card p-4 lg:p-5">
                      <div className="text-white font-bold">Acceso rápido</div>
                      <div className="text-white/60 text-sm mt-1">
                        Mini dashboard por empresa (demo).
                      </div>

                      <div className="mt-4 grid gap-2">
                        {data.collateral.slice(0, 4).map((c) => (
                          <button
                            key={c.id}
                            className="plx-row plx-row-click"
                            onClick={() => setDrawerCol(c)}
                          >
                            <div className="min-w-0 text-left">
                              <div className="text-white font-semibold truncate">{c.company}</div>
                              <div className="text-white/55 text-xs truncate">
                                {c.type} · {c.verified ? "Verificada" : "Pendiente"}
                              </div>
                            </div>
                            <div className="text-white/70 text-sm">→</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Drawers */}
      <Drawer open={!!drawerLoan} onClose={() => setDrawerLoan(null)} title="Detalle de crédito">
        {drawerLoan && <LoanDetail loan={drawerLoan} />}
      </Drawer>

      <Drawer open={!!drawerKyc} onClose={() => setDrawerKyc(null)} title="Detalle KYC">
        {drawerKyc && <KycDetail item={drawerKyc} />}
      </Drawer>

      <Drawer open={!!drawerCol} onClose={() => setDrawerCol(null)} title="Detalle de garantía">
        {drawerCol && <CollateralDetail item={drawerCol} />}
      </Drawer>

      <GlobalStyles />
    </div>
  );
}

/* =========================
   DETAILS
========================= */
function LoanDetail({ loan }: { loan: Loan }) {
  return (
    <div className="grid gap-4">
      <div className="plx-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-white font-extrabold text-lg truncate">{loan.borrower}</div>
            <div className="text-white/55 text-xs mono">{loan.rfc} · {loan.id}</div>
          </div>
          <StatusPill status={loan.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="Principal" value={mxn(loan.principalMXN)} />
          <MiniStat label="Saldo" value={mxn(loan.outstandingMXN)} />
          <MiniStat label="APR" value={pct(loan.rateAPR)} />
          <MiniStat label="DPD" value={String(loan.dpd)} />
        </div>

        <div className="mt-4">
          <div className="text-white/70 text-xs font-semibold mb-2">Riesgo</div>
          <RiskBar score={loan.riskScore} />
        </div>
      </div>

      <div className="plx-card p-4">
        <div className="text-white font-bold">Acciones (demo)</div>
        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          <button className="plx-btn plx-btn-primary" onClick={() => alert("Demo: generar PDF")}>
            Generar PDF
          </button>
          <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: crear alerta")}>
            Crear alerta
          </button>
          <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: renegociar")}>
            Renegociar
          </button>
          <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: registrar garantía")}>
            Registrar garantía
          </button>
        </div>
      </div>
    </div>
  );
}

function KycDetail({ item }: { item: KycCompany }) {
  return (
    <div className="grid gap-4">
      <div className="plx-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-white font-extrabold text-lg truncate">{item.company}</div>
            <div className="text-white/55 text-xs mono">{item.rfc} · {item.id}</div>
          </div>
          <KycPill status={item.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="Promotor" value={item.promotor} />
          <MiniStat label="CFDI" value={`${item.satCfdiMonths}m`} />
          <MiniStat label="Buró" value={item.buroScore ? String(item.buroScore) : "—"} />
          <MiniStat label="Solicitado" value={shortDate(item.requestedAt)} />
        </div>

        <div className="mt-4">
          <div className="text-white/70 text-xs font-semibold mb-2">Flags</div>
          <div className="flex flex-wrap gap-2">
            {item.flags.length ? item.flags.map((f) => <Tag key={f}>{f}</Tag>) : <div className="text-white/55 text-sm">Sin flags.</div>}
          </div>
        </div>
      </div>

      <div className="plx-card p-4">
        <div className="text-white font-bold">Decisión (demo)</div>
        <div className="mt-3 grid sm:grid-cols-3 gap-2">
          <button className="plx-btn plx-btn-primary" onClick={() => alert("Demo: aprobar")}>
            Aprobar
          </button>
          <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: solicitar info")}>
            Pedir info
          </button>
          <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: rechazar")}>
            Rechazar
          </button>
        </div>
      </div>
    </div>
  );
}

function CollateralDetail({ item }: { item: Collateral }) {
  return (
    <div className="grid gap-4">
      <div className="plx-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-white font-extrabold text-lg truncate">{item.company}</div>
            <div className="text-white/55 text-xs mono">{item.rfc} · {item.id}</div>
          </div>
          <Pill tone={item.verified ? "good" : "warn"}>{item.verified ? "Verificada" : "Pendiente"}</Pill>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="Tipo" value={item.type} />
          <MiniStat label="Valor" value={mxn(item.valueMXN)} />
          <MiniStat label="Cobertura" value={pct(item.coveragePct / 100)} />
          <MiniStat label="Actualizado" value={shortDate(item.updatedAt)} />
        </div>

        <div className="mt-4">
          <div className="text-white/70 text-xs font-semibold mb-2">Detalle</div>
          <div className="text-white/80 text-sm leading-relaxed">{item.description}</div>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <MiniStat label="RUG Folio" value={item.rugFolio || "—"} />
          <MiniStat label="Fuente de pago" value={item.paymentSource || "—"} />
        </div>
      </div>

      <div className="plx-card p-4">
        <div className="text-white font-bold">Acciones (demo)</div>
        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          <button className="plx-btn plx-btn-primary" onClick={() => alert("Demo: verificar")}>
            Marcar verificada
          </button>
          <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: actualizar valuación")}>
            Actualizar valuación
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   UI COMPONENTS
========================= */
function Ambient() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute -top-28 -left-28 h-96 w-96 rounded-full bg-violet-500/18 blur-3xl" />
      <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-sky-400/16 blur-3xl" />
      <div className="absolute -bottom-28 left-1/3 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/14 blur-3xl" />
      <div className="absolute inset-0 plx-gridNoise" />
    </div>
  );
}

function SideNav({
  active,
  title,
  desc,
  onClick,
  icon,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
  icon: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "text-left rounded-2xl border p-3 transition",
        active
          ? "border-white/22 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_18px_60px_rgba(0,0,0,0.25)]"
          : "border-white/12 bg-white/6 hover:bg-white/10 hover:border-white/18",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="text-lg">{icon}</div>
        <div className="min-w-0">
          <div className="text-white font-bold leading-tight">{title}</div>
          <div className="text-white/60 text-xs mt-1 leading-snug">{desc}</div>
        </div>
      </div>
    </button>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/12 bg-white/6 text-white/85 text-sm font-semibold py-2.5 px-3 hover:bg-white/10 transition"
    >
      {label}
    </Link>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "violet" | "blue" | "pink" | "cyan";
}) {
  const toneClass =
    tone === "violet"
      ? "before:bg-violet-400/22"
      : tone === "blue"
      ? "before:bg-sky-400/20"
      : tone === "pink"
      ? "before:bg-fuchsia-400/18"
      : "before:bg-cyan-400/18";

  return (
    <div className={["plx-kpi", toneClass].join(" ")}>
      <div className="relative">
        <div className="text-white/60 text-xs font-semibold">{label}</div>
        <div className="text-white text-2xl font-extrabold mt-1">{value}</div>
        <div className="text-white/55 text-xs mt-1">{sub}</div>
      </div>
    </div>
  );
}

function TabChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-white/25 bg-white/10 text-white"
          : "border-white/12 bg-white/6 text-white/75 hover:bg-white/10 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="plx-select"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function RiskBar({ score }: { score: number }) {
  const s = clamp(score, 0, 100);
  const tone =
    s >= 75 ? "bg-emerald-400/70" : s >= 55 ? "bg-sky-400/70" : s >= 35 ? "bg-violet-400/70" : "bg-fuchsia-400/70";
  return (
    <div className="w-[140px] max-w-full">
      <div className="flex items-center justify-between text-[11px] text-white/60 mb-1">
        <span>score</span>
        <span className="text-white/80 font-semibold">{s}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${s}%` }} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: LoanStatus }) {
  const map: Record<LoanStatus, { label: string; cls: string }> = {
    current: { label: "Vigente", cls: "plx-pill-blue" },
    watch: { label: "Watch", cls: "plx-pill-violet" },
    late: { label: "Atraso", cls: "plx-pill-cyan" },
    default: { label: "Default", cls: "plx-pill-pink" },
  };
  const x = map[status];
  return <span className={["plx-pillTag", x.cls].join(" ")}>{x.label}</span>;
}

function KycPill({ status }: { status: KycStatus }) {
  const map: Record<KycStatus, { label: string; cls: string }> = {
    pending: { label: "Pendiente", cls: "plx-pill-violet" },
    in_review: { label: "En revisión", cls: "plx-pill-cyan" },
    approved: { label: "Aprobado", cls: "plx-pill-good" },
    rejected: { label: "Rechazado", cls: "plx-pill-bad" },
  };
  const x = map[status];
  return <span className={["plx-pillTag", x.cls].join(" ")}>{x.label}</span>;
}

function Pill({ tone, children }: { tone: "good" | "warn" | "bad" | "info"; children: React.ReactNode }) {
  const cls =
    tone === "good"
      ? "plx-pill-good"
      : tone === "warn"
      ? "plx-pill-cyan"
      : tone === "bad"
      ? "plx-pill-bad"
      : "plx-pill-violet";
  return <span className={["plx-pillTag", cls].join(" ")}>{children}</span>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
      <div className="text-white/60 text-xs font-semibold">{label}</div>
      <div className="text-white/90 font-extrabold mt-1 truncate">{value}</div>
    </div>
  );
}

function StackedBreakdown({
  items,
}: {
  items: { label: string; value: number; tone: "blue" | "cyan" | "violet" | "pink" }[];
}) {
  const toneCls: Record<string, string> = {
    blue: "bg-sky-400/70",
    cyan: "bg-cyan-300/70",
    violet: "bg-violet-400/70",
    pink: "bg-fuchsia-400/70",
  };
  return (
    <div>
      <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
        {items.map((it) => (
          <div
            key={it.label}
            className={toneCls[it.tone]}
            style={{ width: `${Math.max(0, it.value) * 100}%` }}
            title={`${it.label}: ${pct(it.value)}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/60">
        {items.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${toneCls[it.tone]}`} />
            {it.label} <span className="text-white/80 font-semibold">{pct(it.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SparkBars({ values }: { values: { label: string; v: number }[] }) {
  const max = Math.max(...values.map((x) => x.v), 0.0001);
  return (
    <div className="grid gap-2">
      {values.map((x) => (
        <div key={x.label} className="flex items-center gap-3">
          <div className="w-12 text-white/60 text-xs font-semibold">{x.label}</div>
          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-sky-400/70" style={{ width: `${(x.v / max) * 100}%` }} />
          </div>
          <div className="w-14 text-right text-white/70 text-xs">{pct(x.v)}</div>
        </div>
      ))}
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "blue" | "violet" | "cyan" | "pink";
  hint: string;
}) {
  const cls =
    tone === "blue"
      ? "before:bg-sky-400/20"
      : tone === "violet"
      ? "before:bg-violet-400/22"
      : tone === "cyan"
      ? "before:bg-cyan-300/18"
      : "before:bg-fuchsia-400/18";
  return (
    <div className={["plx-tile", cls].join(" ")}>
      <div className="relative">
        <div className="text-white/70 text-xs font-semibold">{label}</div>
        <div className="text-white font-extrabold text-lg mt-1">{value}</div>
        <div className="text-white/50 text-xs mt-1">{hint}</div>
      </div>
    </div>
  );
}

function ActionRow({ title, desc }: { title: string; desc: string }) {
  return (
    <button className="plx-row plx-row-click" onClick={() => alert(`Demo: ${title}`)}>
      <div className="min-w-0 text-left">
        <div className="text-white font-semibold truncate">{title}</div>
        <div className="text-white/55 text-xs truncate">{desc}</div>
      </div>
      <div className="text-white/60 text-sm">→</div>
    </button>
  );
}

function ChecklistItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 p-3">
      <span className="h-6 w-6 rounded-full bg-emerald-400/18 border border-emerald-400/30 grid place-items-center">
        <span className="text-emerald-100 text-sm">✓</span>
      </span>
      <div className="text-white/80 text-sm font-semibold">{label}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] text-white/75">
      {children}
    </span>
  );
}

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className={open ? "fixed inset-0 z-50" : "hidden"} aria-hidden={!open}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] plx-drawer">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
          <div className="min-w-0">
            <div className="text-white font-extrabold truncate">{title}</div>
            <div className="text-white/55 text-xs">Detalle (demo)</div>
          </div>
          <button className="plx-btn plx-btn-mini" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">{children}</div>
      </div>
    </div>
  );
}

/* =========================
   STYLES (purple/blue neon)
========================= */
function GlobalStyles() {
  return (
    <style jsx global>{`
      .plx-bg{
        background:
          radial-gradient(1200px 700px at 18% 8%, rgba(139,92,246,0.12), transparent 55%),
          radial-gradient(900px 650px at 86% 28%, rgba(96,165,250,0.12), transparent 55%),
          radial-gradient(900px 650px at 62% 95%, rgba(217,70,239,0.08), transparent 60%),
          linear-gradient(180deg, rgba(3,7,18,1), rgba(2,6,23,1));
      }
      .plx-gridNoise{
        background-image:
          linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
        background-size: 44px 44px;
        opacity: 0.06;
        mask-image: radial-gradient(55% 55% at 50% 40%, black 60%, transparent 100%);
      }

      .plx-card{
        border-radius: 28px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        backdrop-filter: blur(16px);
        box-shadow: 0 22px 90px rgba(0,0,0,0.42);
      }
      .plx-card-soft{
        box-shadow: 0 18px 70px rgba(0,0,0,0.30);
      }

      .plx-pill{
        display:inline-flex;
        align-items:center;
        gap:10px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        padding: 10px 12px;
      }
      .plx-dot{
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: rgba(96,165,250,0.95);
        box-shadow: 0 0 20px rgba(96,165,250,0.55);
      }

      .plx-search{
        display:flex;
        align-items:center;
        gap: 10px;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        padding: 10px 12px;
        min-width: min(520px, 100%);
      }
      .plx-search-input{
        flex: 1;
        background: transparent;
        border: 0;
        outline: none;
        color: rgba(255,255,255,0.92);
        font-size: 14px;
      }
      .plx-search-input::placeholder{ color: rgba(255,255,255,0.45); }

      .plx-btn{
        border-radius: 16px;
        padding: 10px 12px;
        font-weight: 800;
        font-size: 13px;
        transition: 0.15s ease;
        border: 1px solid transparent;
      }
      .plx-btn-primary{
        background: rgba(255,255,255,0.95);
        color: rgba(0,0,0,0.90);
      }
      .plx-btn-primary:hover{ opacity: 0.92; }
      .plx-btn-ghost{
        border-color: rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.90);
      }
      .plx-btn-ghost:hover{
        background: rgba(255,255,255,0.10);
        border-color: rgba(255,255,255,0.18);
      }
      .plx-btn-mini{
        padding: 8px 10px;
        font-size: 12px;
        border-color: rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.88);
      }
      .plx-btn-mini:hover{
        background: rgba(255,255,255,0.10);
        border-color: rgba(255,255,255,0.18);
      }

      .plx-select{
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.88);
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 800;
        outline: none;
      }

      .plx-kpi{
        position: relative;
        overflow: hidden;
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        padding: 14px;
      }
      .plx-kpi:before{
        content:"";
        position:absolute;
        top:-44px;
        right:-44px;
        width: 180px;
        height: 180px;
        border-radius: 999px;
        filter: blur(26px);
      }

      .plx-tableWrap{
        overflow:auto;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.10);
      }
      .plx-table{
        width: 100%;
        border-collapse: collapse;
        min-width: 880px;
        background: rgba(2,6,23,0.25);
      }
      .plx-table thead th{
        text-align:left;
        font-size: 11px;
        letter-spacing: 0.10em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.55);
        padding: 12px 12px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
      }
      .plx-table tbody td{
        padding: 12px 12px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.75);
        vertical-align: middle;
      }
      .plx-table tbody tr:hover{
        background: rgba(255,255,255,0.04);
      }

      .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

      .plx-pillTag{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        border-radius: 999px;
        padding: 7px 10px;
        font-size: 11px;
        font-weight: 900;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.88);
        white-space: nowrap;
      }
      .plx-pill-blue{ border-color: rgba(96,165,250,0.30); background: rgba(96,165,250,0.12); }
      .plx-pill-violet{ border-color: rgba(139,92,246,0.30); background: rgba(139,92,246,0.12); }
      .plx-pill-cyan{ border-color: rgba(34,211,238,0.28); background: rgba(34,211,238,0.10); }
      .plx-pill-pink{ border-color: rgba(217,70,239,0.28); background: rgba(217,70,239,0.10); }
      .plx-pill-good{ border-color: rgba(34,197,94,0.30); background: rgba(34,197,94,0.10); }
      .plx-pill-bad{ border-color: rgba(239,68,68,0.30); background: rgba(239,68,68,0.10); }

      .plx-tile{
        position: relative;
        overflow: hidden;
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        padding: 14px;
      }
      .plx-tile:before{
        content:"";
        position:absolute;
        top:-56px;
        left:-56px;
        width: 220px;
        height: 220px;
        border-radius: 999px;
        filter: blur(30px);
      }

      .plx-row{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap: 12px;
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.06);
        padding: 12px 12px;
      }
      .plx-row-click{
        cursor: pointer;
        transition: 0.15s ease;
      }
      .plx-row-click:hover{
        background: rgba(255,255,255,0.10);
        border-color: rgba(255,255,255,0.16);
      }

      .plx-drawer{
        border-left: 1px solid rgba(255,255,255,0.12);
        background: rgba(6,10,22,0.88);
        backdrop-filter: blur(18px);
      }
    `}</style>
  );
}

/* =========================
   HELPERS
========================= */
function tabTitle(tab: TabKey) {
  if (tab === "portfolio") return "Originación & Portafolio";
  if (tab === "status") return "Estatus de Cartera";
  if (tab === "kyc") return "KYC Empresas";
  return "Garantías (RUG / fuente de pago)";
}

function mxn(n: number) {
  // best-effort formatting
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString("es-MX")} MXN`;
  }
}

function pct(x: number) {
  const v = Math.round(x * 1000) / 10;
  return `${v.toFixed(1)}%`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function shortDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", { year: "2-digit", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

function countBy(loans: Loan[], status: LoanStatus) {
  return loans.filter((l) => l.status === status).length;
}

function computeSummary(loans: Loan[]): PortfolioSummary {
  const aum = loans.reduce((s, x) => s + x.principalMXN, 0);
  const out = loans.reduce((s, x) => s + x.outstandingMXN, 0);
  const active = loans.length;
  const avgAPR = active ? loans.reduce((s, x) => s + x.rateAPR, 0) / active : 0;
  const npl = active ? loans.filter((x) => x.status === "default").length / active : 0;
  const late = active ? loans.filter((x) => x.status === "late").length / active : 0;
  const watch = active ? loans.filter((x) => x.status === "watch").length / active : 0;
  return { aumMXN: aum, outstandingMXN: out, activeLoans: active, avgAPR, nplPct: npl, latePct: late, watchPct: watch };
}

/* =========================
   DEMO DATA
========================= */
function seedData(): {
  loans: Loan[];
  kyc: KycCompany[];
  collateral: Collateral[];
  tasks: { id: string; title: string; company: string; owner: string; sla: string; priority: string; tone: "good" | "warn" | "bad" | "info" }[];
} {
  const loans: Loan[] = [
    {
      id: "LN-1042",
      borrower: "Transporte del Valle SA",
      rfc: "TVA1902218K1",
      product: "Revolvente",
      originationDate: "2025-10-14",
      principalMXN: 12000000,
      outstandingMXN: 9850000,
      rateAPR: 0.295,
      termMonths: 18,
      status: "watch",
      dpd: 0,
      riskScore: 62,
    },
    {
      id: "LN-1107",
      borrower: "Agroinsumos La Esperanza",
      rfc: "ALE2009183R2",
      product: "Simple",
      originationDate: "2025-08-03",
      principalMXN: 6000000,
      outstandingMXN: 4120000,
      rateAPR: 0.27,
      termMonths: 12,
      status: "current",
      dpd: 0,
      riskScore: 78,
    },
    {
      id: "LN-1219",
      borrower: "Rising Farms MX",
      rfc: "RFM2101079Z5",
      product: "Factoraje",
      originationDate: "2025-11-22",
      principalMXN: 4500000,
      outstandingMXN: 3180000,
      rateAPR: 0.32,
      termMonths: 9,
      status: "late",
      dpd: 11,
      riskScore: 41,
    },
    {
      id: "LN-1258",
      borrower: "Servicios Industriales Norte",
      rfc: "SIN1805032H7",
      product: "Arrendamiento",
      originationDate: "2025-07-12",
      principalMXN: 22000000,
      outstandingMXN: 18750000,
      rateAPR: 0.265,
      termMonths: 24,
      status: "current",
      dpd: 0,
      riskScore: 83,
    },
    {
      id: "LN-1304",
      borrower: "Comercializadora Kappa",
      rfc: "CKA1709111M3",
      product: "Simple",
      originationDate: "2025-05-29",
      principalMXN: 8000000,
      outstandingMXN: 6500000,
      rateAPR: 0.34,
      termMonths: 18,
      status: "default",
      dpd: 67,
      riskScore: 18,
    },
  ];

  const kyc: KycCompany[] = [
    {
      id: "KYC-3021",
      company: "Transporte del Valle SA",
      rfc: "TVA1902218K1",
      promotor: "Equipo Norte",
      requestedAt: "2026-01-28",
      status: "in_review",
      satCfdiMonths: 24,
      buroScore: 712,
      flags: ["Domicilio por verificar", "Beneficiario final pendiente"],
    },
    {
      id: "KYC-3090",
      company: "Rising Farms MX",
      rfc: "RFM2101079Z5",
      promotor: "Equipo Bajío",
      requestedAt: "2026-01-19",
      status: "pending",
      satCfdiMonths: 18,
      buroScore: 655,
      flags: ["CFDI incompleto (6m)"],
    },
    {
      id: "KYC-3115",
      company: "Servicios Industriales Norte",
      rfc: "SIN1805032H7",
      promotor: "Equipo Centro",
      requestedAt: "2026-01-09",
      status: "approved",
      satCfdiMonths: 24,
      buroScore: 780,
      flags: [],
    },
    {
      id: "KYC-3188",
      company: "Comercializadora Kappa",
      rfc: "CKA1709111M3",
      promotor: "Equipo Occidente",
      requestedAt: "2025-12-18",
      status: "rejected",
      satCfdiMonths: 12,
      buroScore: 590,
      flags: ["Inconsistencia fiscal", "PLD alto riesgo"],
    },
  ];

  const collateral: Collateral[] = [
    {
      id: "COL-8001",
      company: "Servicios Industriales Norte",
      rfc: "SIN1805032H7",
      type: "Activo fijo (RUG)",
      description: "Montacargas y equipo de almacén. Registro con folio RUG.",
      valueMXN: 5200000,
      coveragePct: 28,
      rugFolio: "RUG-19-558201",
      verified: true,
      updatedAt: "2026-01-30",
    },
    {
      id: "COL-8014",
      company: "Transporte del Valle SA",
      rfc: "TVA1902218K1",
      type: "Fuente de pago",
      description: "Cesión de derechos de cobro con pagador AAA (contrato anual).",
      valueMXN: 9000000,
      coveragePct: 45,
      paymentSource: "Cesión de cobranza · Pagador AAA",
      verified: false,
      updatedAt: "2026-02-02",
    },
    {
      id: "COL-8033",
      company: "Agroinsumos La Esperanza",
      rfc: "ALE2009183R2",
      type: "Fuente de pago",
      description: "Domiciliación de pagos + contrato de suministro (3 años).",
      valueMXN: 3200000,
      coveragePct: 35,
      paymentSource: "Domiciliación · Contrato suministro",
      verified: true,
      updatedAt: "2026-01-25",
    },
    {
      id: "COL-8051",
      company: "Rising Farms MX",
      rfc: "RFM2101079Z5",
      type: "Activo fijo (RUG)",
      description: "Tractor agrícola y remolques. Registro pendiente.",
      valueMXN: 2700000,
      coveragePct: 22,
      rugFolio: "—",
      verified: false,
      updatedAt: "2026-02-03",
    },
  ];

  const tasks = [
    { id: "T-01", title: "Revisar CFDI faltante (6m)", company: "Rising Farms MX", owner: "Ops KYC", sla: "48h", priority: "Alta", tone: "warn" as const },
    { id: "T-02", title: "Validar beneficiario final", company: "Transporte del Valle SA", owner: "Compliance", sla: "72h", priority: "Media", tone: "info" as const },
    { id: "T-03", title: "Gestionar cobranza (DPD 11)", company: "Rising Farms MX", owner: "Collections", sla: "24h", priority: "Alta", tone: "bad" as const },
    { id: "T-04", title: "Actualizar valuación garantía", company: "Servicios Industriales Norte", owner: "Risk", sla: "7d", priority: "Baja", tone: "good" as const },
  ];

  return { loans, kyc, collateral, tasks };
}
