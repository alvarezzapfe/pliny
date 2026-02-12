/* app/admin/dashboard/page.tsx
   Plinius Admin Dashboard (minimal + geométrico, sin mini-dash)
   Cambios:
   - Quitado mini dash (panel derecho) -> tabla ocupa TODO el ancho disponible
   - Sidebar fijo izq + main con padding-left (sin overlap)
   - Tabla: font-size más pequeña
   - No sideways scroll global: se “fija” el ancho del layout (overflow-x hidden)
   - Tabla sin horizontal scroll (se fuerza a truncar/compactar columnas)
   - Sin emojis: iconos SVG inline (profesionales)
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
  originationDate: string;
  principalMXN: number;
  outstandingMXN: number;
  rateAPR: number;
  termMonths: number;
  status: LoanStatus;
  dpd: number;
  riskScore: number;
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
  flags: string[];
};

type Collateral = {
  id: string;
  company: string;
  rfc: string;
  type: CollateralType;
  description: string;
  valueMXN: number;
  coveragePct: number;
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
  nplPct: number;
  latePct: number;
  watchPct: number;
};

/* =========================
   PAGE
========================= */
export default function AdminDashboardPage() {
  const [tab, setTab] = useState<TabKey>("portfolio");

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<LoanStatus | "all">("all");
  const [kycFilter, setKycFilter] = useState<KycStatus | "all">("all");
  const [collateralFilter, setCollateralFilter] = useState<CollateralType | "all">("all");

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
      <GlobalStyles />

      {/* Sidebar fijo (sin emojis) */}
      <aside className="plx-side" aria-label="Sidebar">
        <div className="plx-sideInner">
          <div className="plx-brand">
            <img src="/plinius.png" alt="Plinius" className="plx-logo" />
            <div className="min-w-0">
              <div className="plx-brandTitle">Plinius</div>
              <div className="plx-brandSub">Admin Console</div>
            </div>
          </div>

          <div className="plx-demo">
            <span className="plx-dot" />
            <span>DEMO MODE</span>
          </div>

          <nav className="plx-nav" aria-label="Navegación">
            <SideNav
              active={tab === "portfolio"}
              title="Originación"
              desc="Portafolio y créditos"
              onClick={() => setTab("portfolio")}
              icon={<IconGrid />}
            />
            <SideNav
              active={tab === "status"}
              title="Estatus"
              desc="DPD y alertas"
              onClick={() => setTab("status")}
              icon={<IconPulse />}
            />
            <SideNav
              active={tab === "kyc"}
              title="KYC"
              desc="Empresas"
              onClick={() => setTab("kyc")}
              icon={<IconShield />}
            />
            <SideNav
              active={tab === "collateral"}
              title="Garantías"
              desc="RUG / fuente de pago"
              onClick={() => setTab("collateral")}
              icon={<IconLink />}
            />
          </nav>

          <div className="plx-sideFoot">
            <div className="plx-quick">
              <QuickLink href="/admin/login" label="Cambiar usuario" />
              <QuickLink href="/login" label="Login empresa" />
              <QuickLink href="/" label="Inicio" />
            </div>
            <div className="plx-copyright">
              © {new Date().getFullYear()} Plinius
            </div>
          </div>
        </div>
      </aside>

      {/* Main sin sideways */}
      <main className="plx-main">
        {/* Topbar sticky */}
        <div className="plx-topbar">
          <div className="plx-topbarInner">
            <div className="min-w-0">
              <div className="plx-kicker">Admin</div>
              <div className="plx-title">{tabTitle(tab)}</div>
              <div className="plx-sub">Datos demo · filtros · acciones.</div>
            </div>

            <div className="plx-topActions">
              <div className="plx-search">
                <span className="plx-searchIcon">
                  <IconSearch />
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar empresa, RFC, ID..."
                  className="plx-searchInput"
                />
                {q && (
                  <button onClick={() => setQ("")} className="plx-searchClear" aria-label="Limpiar">
                    <IconX />
                  </button>
                )}
              </div>

              <div className="plx-btnRow">
                <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: export")}>
                  Exportar
                </button>
                <button className="plx-btn plx-btn-primary" onClick={() => alert("Demo: crear")}>
                  Nueva acción
                </button>
              </div>
            </div>
          </div>

          <div className="plx-tabs">
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

        <div className="plx-content">
          {/* KPIs (se quedan) */}
          <section className="plx-kpis">
            <KpiCard label="AUM (MXN)" value={mxn(summary.aumMXN)} sub={`Outstanding: ${mxn(summary.outstandingMXN)}`} tone="violet" />
            <KpiCard label="Créditos activos" value={String(summary.activeLoans)} sub={`APR prom: ${pct(summary.avgAPR)}`} tone="blue" />
            <KpiCard label="NPL" value={pct(summary.nplPct)} sub={`Watch: ${pct(summary.watchPct)}`} tone="pink" />
            <KpiCard label="Atraso" value={pct(summary.latePct)} sub="DPD & alertas" tone="cyan" />
          </section>

          {/* Portafolio: tabla ocupa TODO el ancho */}
          {tab === "portfolio" && (
            <section className="plx-card plx-pad">
              <div className="plx-headRow">
                <div className="min-w-0">
                  <div className="plx-hTitle">Originación & cartera</div>
                  <div className="plx-hSub">Créditos y performance base.</div>
                </div>
                <div className="plx-headRowRight">
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

              {/* Sin sideways: se fuerza layout fijo y truncado */}
              <div className="plx-tableWrap plx-tableNoX">
                <table className="plx-table plx-tableSmall">
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>ID</th>
                      <th>Empresa</th>
                      <th style={{ width: 120 }}>Producto</th>
                      <th style={{ width: 130 }}>Saldo</th>
                      <th style={{ width: 60 }}>DPD</th>
                      <th style={{ width: 160 }}>Riesgo</th>
                      <th style={{ width: 110 }}>Estatus</th>
                      <th style={{ width: 70 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.map((l) => (
                      <tr key={l.id}>
                        <td className="mono">{l.id}</td>
                        <td className="plx-cellClamp">
                          <div className="plx-strong">{l.borrower}</div>
                          <div className="plx-muted mono">{l.rfc}</div>
                        </td>
                        <td className="plx-cellClamp">{l.product}</td>
                        <td className="plx-strong">{mxn(l.outstandingMXN)}</td>
                        <td>{l.dpd}</td>
                        <td>
                          <RiskBar score={l.riskScore} />
                        </td>
                        <td>
                          <StatusPill status={l.status} />
                        </td>
                        <td className="plx-right">
                          <button className="plx-btn plx-btn-mini" onClick={() => setDrawerLoan(l)}>
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredLoans.length === 0 && (
                      <tr>
                        <td colSpan={8} className="plx-empty">
                          No hay resultados con estos filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "status" && (
            <section className="plx-grid2b">
              <div className="plx-card plx-pad">
                <div className="plx-hTitle">Semáforo de cartera</div>
                <div className="plx-hSub">Por estatus · DPD · alertas.</div>

                <div className="plx-tiles">
                  <StatusTile label="Vigente" value={`${countBy(data.loans, "current")} créditos`} tone="blue" hint="DPD = 0" />
                  <StatusTile label="Watch" value={`${countBy(data.loans, "watch")} créditos`} tone="violet" hint="Señales tempranas" />
                  <StatusTile label="Atraso" value={`${countBy(data.loans, "late")} créditos`} tone="cyan" hint="DPD > 0" />
                  <StatusTile label="Default" value={`${countBy(data.loans, "default")} créditos`} tone="pink" hint="NPL (demo)" />
                </div>

                <div className="plx-break">
                  <div className="plx-labelSm">DPD (demo)</div>
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

              <div className="plx-card plx-pad">
                <div className="plx-headRow">
                  <div>
                    <div className="plx-hTitle">Queue operativa</div>
                    <div className="plx-hSub">Tareas pendientes.</div>
                  </div>
                  <button className="plx-btn plx-btn-ghost" onClick={() => alert("Demo: crear tarea")}>
                    Crear tarea
                  </button>
                </div>

                <div className="plx-list">
                  {data.tasks.map((t) => (
                    <div key={t.id} className="plx-row">
                      <div className="min-w-0">
                        <div className="plx-strong truncate">{t.title}</div>
                        <div className="plx-muted truncate">
                          {t.company} · {t.owner} · SLA {t.sla}
                        </div>
                      </div>
                      <div className="plx-rowRight">
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
            <section className="plx-card plx-pad">
              <div className="plx-headRow">
                <div className="min-w-0">
                  <div className="plx-hTitle">KYC · Empresas</div>
                  <div className="plx-hSub">Checklist, flags, evidencia.</div>
                </div>
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

              <div className="plx-tableWrap plx-tableNoX">
                <table className="plx-table plx-tableSmall">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>ID</th>
                      <th>Empresa</th>
                      <th style={{ width: 160 }}>Promotor</th>
                      <th style={{ width: 70 }}>CFDI</th>
                      <th style={{ width: 80 }}>Score</th>
                      <th style={{ width: 140 }}>Estatus</th>
                      <th style={{ width: 70 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKyc.map((c) => (
                      <tr key={c.id}>
                        <td className="mono">{c.id}</td>
                        <td className="plx-cellClamp">
                          <div className="plx-strong">{c.company}</div>
                          <div className="plx-muted mono">{c.rfc}</div>
                        </td>
                        <td className="plx-cellClamp">{c.promotor}</td>
                        <td>{c.satCfdiMonths}m</td>
                        <td className="plx-strong">{c.buroScore ?? "—"}</td>
                        <td>
                          <KycPill status={c.status} />
                        </td>
                        <td className="plx-right">
                          <button className="plx-btn plx-btn-mini" onClick={() => setDrawerKyc(c)}>
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredKyc.length === 0 && (
                      <tr>
                        <td colSpan={7} className="plx-empty">
                          No hay resultados con estos filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "collateral" && (
            <section className="plx-card plx-pad">
              <div className="plx-headRow">
                <div className="min-w-0">
                  <div className="plx-hTitle">Garantías</div>
                  <div className="plx-hSub">RUG & fuente de pago.</div>
                </div>
                <div className="plx-headRowRight">
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

              <div className="plx-tableWrap plx-tableNoX">
                <table className="plx-table plx-tableSmall">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>ID</th>
                      <th>Empresa</th>
                      <th style={{ width: 170 }}>Tipo</th>
                      <th style={{ width: 120 }}>Valor</th>
                      <th style={{ width: 90 }}>Cobertura</th>
                      <th style={{ width: 90 }}>Verif.</th>
                      <th style={{ width: 70 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCollateral.map((c) => (
                      <tr key={c.id}>
                        <td className="mono">{c.id}</td>
                        <td className="plx-cellClamp">
                          <div className="plx-strong">{c.company}</div>
                          <div className="plx-muted mono">{c.rfc}</div>
                        </td>
                        <td className="plx-cellClamp">{c.type}</td>
                        <td className="plx-strong">{mxn(c.valueMXN)}</td>
                        <td>{pct(c.coveragePct / 100)}</td>
                        <td>
                          <Pill tone={c.verified ? "good" : "warn"}>{c.verified ? "OK" : "Pendiente"}</Pill>
                        </td>
                        <td className="plx-right">
                          <button className="plx-btn plx-btn-mini" onClick={() => setDrawerCol(c)}>
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCollateral.length === 0 && (
                      <tr>
                        <td colSpan={7} className="plx-empty">
                          No hay resultados con estos filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>

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
    </div>
  );
}

/* =========================
   DETAILS
========================= */
function LoanDetail({ loan }: { loan: Loan }) {
  return (
    <div className="grid gap-4">
      <div className="plx-card plx-pad">
        <div className="plx-headRow">
          <div className="min-w-0">
            <div className="plx-hTitle truncate">{loan.borrower}</div>
            <div className="plx-muted mono">
              {loan.rfc} · {loan.id}
            </div>
          </div>
          <StatusPill status={loan.status} />
        </div>

        <div className="plx-miniGrid">
          <MiniStat label="Principal" value={mxn(loan.principalMXN)} />
          <MiniStat label="Saldo" value={mxn(loan.outstandingMXN)} />
          <MiniStat label="APR" value={pct(loan.rateAPR)} />
          <MiniStat label="DPD" value={String(loan.dpd)} />
        </div>

        <div className="plx-break">
          <div className="plx-labelSm">Riesgo</div>
          <RiskBar score={loan.riskScore} />
        </div>
      </div>
    </div>
  );
}

function KycDetail({ item }: { item: KycCompany }) {
  return (
    <div className="grid gap-4">
      <div className="plx-card plx-pad">
        <div className="plx-headRow">
          <div className="min-w-0">
            <div className="plx-hTitle truncate">{item.company}</div>
            <div className="plx-muted mono">
              {item.rfc} · {item.id}
            </div>
          </div>
          <KycPill status={item.status} />
        </div>

        <div className="plx-miniGrid">
          <MiniStat label="Promotor" value={item.promotor} />
          <MiniStat label="CFDI" value={`${item.satCfdiMonths}m`} />
          <MiniStat label="Buró" value={item.buroScore ? String(item.buroScore) : "—"} />
          <MiniStat label="Solicitado" value={shortDate(item.requestedAt)} />
        </div>

        <div className="plx-break">
          <div className="plx-labelSm">Flags</div>
          <div className="flex flex-wrap gap-2">
            {item.flags.length ? item.flags.map((f) => <Tag key={f}>{f}</Tag>) : <div className="plx-muted">Sin flags.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CollateralDetail({ item }: { item: Collateral }) {
  return (
    <div className="grid gap-4">
      <div className="plx-card plx-pad">
        <div className="plx-headRow">
          <div className="min-w-0">
            <div className="plx-hTitle truncate">{item.company}</div>
            <div className="plx-muted mono">
              {item.rfc} · {item.id}
            </div>
          </div>
          <Pill tone={item.verified ? "good" : "warn"}>{item.verified ? "Verificada" : "Pendiente"}</Pill>
        </div>

        <div className="plx-miniGrid">
          <MiniStat label="Tipo" value={item.type} />
          <MiniStat label="Valor" value={mxn(item.valueMXN)} />
          <MiniStat label="Cobertura" value={pct(item.coveragePct / 100)} />
          <MiniStat label="Actualizado" value={shortDate(item.updatedAt)} />
        </div>

        <div className="plx-break">
          <div className="plx-labelSm">Detalle</div>
          <div className="text-white/80 text-sm leading-relaxed">{item.description}</div>
        </div>

        <div className="plx-miniGrid">
          <MiniStat label="RUG Folio" value={item.rugFolio || "—"} />
          <MiniStat label="Fuente de pago" value={item.paymentSource || "—"} />
          <MiniStat label="Verificación" value={item.verified ? "OK" : "Pendiente"} />
          <MiniStat label="Cobertura %" value={String(item.coveragePct)} />
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
  icon: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className={["plx-navItem", active ? "plx-navItemActive" : ""].join(" ")}>
      <span className="plx-navIcon">{icon}</span>
      <span className="min-w-0">
        <span className="plx-navTitle">{title}</span>
        <span className="plx-navDesc">{desc}</span>
      </span>
    </button>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="plx-quickLink">
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
      ? "plx-kpi-violet"
      : tone === "blue"
      ? "plx-kpi-blue"
      : tone === "pink"
      ? "plx-kpi-pink"
      : "plx-kpi-cyan";

  return (
    <div className={["plx-kpi", toneClass].join(" ")}>
      <div className="plx-kpiLabel">{label}</div>
      <div className="plx-kpiValue">{value}</div>
      <div className="plx-kpiSub">{sub}</div>
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
    <button onClick={onClick} className={["plx-tab", active ? "plx-tabActive" : ""].join(" ")}>
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
    <select value={value} onChange={(e) => onChange(e.target.value)} className="plx-select">
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
      <div className="flex items-center justify-between text-[10px] text-white/60 mb-1">
        <span>score</span>
        <span className="text-white/85 font-semibold">{s}</span>
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
    <div className="plx-mini">
      <div className="plx-miniLabel">{label}</div>
      <div className="plx-miniValue">{value}</div>
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
      ? "plx-tile-blue"
      : tone === "violet"
      ? "plx-tile-violet"
      : tone === "cyan"
      ? "plx-tile-cyan"
      : "plx-tile-pink";
  return (
    <div className={["plx-tile", cls].join(" ")}>
      <div className="text-white/70 text-xs font-semibold">{label}</div>
      <div className="text-white font-extrabold text-lg mt-1">{value}</div>
      <div className="text-white/50 text-xs mt-1">{hint}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="plx-tag">{children}</span>;
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
        <div className="plx-drawerHead">
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
   ICONS (SVG inline)
========================= */
function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconPulse() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 20 6v7c0 5-3.6 8-8 8s-8-3-8-8V6l8-3Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 12.2 11.4 14l3.6-4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M21 21l-4.2-4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* =========================
   STYLES (no sideways + tabla compacta)
========================= */
function GlobalStyles() {
  return (
    <style jsx global>{`
      :root{
        --side: 280px;
      }
      html, body{
        max-width: 100%;
        overflow-x: hidden; /* fija recorrido sideways */
      }

      .plx-bg{
        background:
          radial-gradient(1200px 700px at 18% 8%, rgba(139,92,246,0.12), transparent 55%),
          radial-gradient(900px 650px at 86% 28%, rgba(96,165,250,0.12), transparent 55%),
          radial-gradient(900px 650px at 62% 95%, rgba(217,70,239,0.08), transparent 60%),
          linear-gradient(180deg, rgba(3,7,18,1), rgba(2,6,23,1));
        color: rgba(255,255,255,0.88);
      }
      .plx-gridNoise{
        background-image:
          linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
        background-size: 44px 44px;
        opacity: 0.06;
        mask-image: radial-gradient(55% 55% at 50% 40%, black 60%, transparent 100%);
      }

      /* Sidebar */
      .plx-side{
        position: fixed;
        inset: 0 auto 0 0;
        width: var(--side);
        z-index: 30;
        border-right: 1px solid rgba(255,255,255,0.08);
        background: rgba(2,6,23,0.55);
        backdrop-filter: blur(16px);
      }
      .plx-sideInner{
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 18px 16px;
        gap: 14px;
      }

      .plx-brand{
        display:flex;
        align-items:center;
        gap: 12px;
        padding: 10px 10px;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
      }
      .plx-logo{ height: 34px; width: auto; }
      .plx-brandTitle{ font-weight: 900; color: rgba(255,255,255,0.92); }
      .plx-brandSub{ font-size: 12px; color: rgba(255,255,255,0.56); }

      .plx-demo{
        display:flex;
        align-items:center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.05);
        font-weight: 900;
        font-size: 12px;
        color: rgba(255,255,255,0.78);
      }
      .plx-dot{
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: rgba(96,165,250,0.95);
        box-shadow: 0 0 18px rgba(96,165,250,0.55);
      }

      .plx-nav{ display: grid; gap: 10px; padding-top: 4px; }
      .plx-navItem{
        width: 100%;
        text-align: left;
        display:flex;
        gap: 12px;
        align-items:flex-start;
        border-radius: 18px;
        padding: 12px 12px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
        transition: .15s ease;
        color: rgba(255,255,255,0.80);
      }
      .plx-navItem:hover{
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.14);
      }
      .plx-navItemActive{
        background: rgba(255,255,255,0.09);
        border-color: rgba(255,255,255,0.18);
        box-shadow: 0 18px 70px rgba(0,0,0,0.25);
        color: rgba(255,255,255,0.92);
      }
      .plx-navIcon{
        margin-top: 2px;
        width: 18px;
        height: 18px;
        color: rgba(255,255,255,0.72);
        flex: 0 0 auto;
      }
      .plx-navTitle{
        display:block;
        font-weight: 950;
        color: rgba(255,255,255,0.90);
        line-height: 1.05;
      }
      .plx-navDesc{
        display:block;
        margin-top: 3px;
        font-size: 12px;
        color: rgba(255,255,255,0.55);
        line-height: 1.25;
      }

      .plx-sideFoot{
        margin-top: auto;
        padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.08);
      }
      .plx-quick{ display: grid; gap: 8px; }
      .plx-quickLink{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.04);
        padding: 10px 12px;
        font-weight: 900;
        font-size: 13px;
        color: rgba(255,255,255,0.82);
        text-decoration: none;
        transition: .15s ease;
      }
      .plx-quickLink:hover{
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.14);
      }
      .plx-copyright{
        margin-top: 10px;
        font-size: 11px;
        color: rgba(255,255,255,0.45);
      }

      /* Main */
      .plx-main{ padding-left: var(--side); min-height: 100vh; }
      .plx-topbar{
        position: sticky;
        top: 0;
        z-index: 20;
        padding: 18px 18px 12px;
        backdrop-filter: blur(14px);
        background: linear-gradient(180deg, rgba(2,6,23,0.78), rgba(2,6,23,0.35));
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .plx-topbarInner{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap: 14px;
        max-width: 1320px;
        margin: 0 auto;
      }
      .plx-kicker{ font-size: 12px; font-weight: 900; color: rgba(255,255,255,0.70); }
      .plx-title{
        margin-top: 2px;
        font-size: 26px;
        font-weight: 950;
        letter-spacing: -0.02em;
        color: rgba(255,255,255,0.95);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 680px;
      }
      .plx-sub{ margin-top: 4px; font-size: 13px; color: rgba(255,255,255,0.55); }

      .plx-topActions{
        display:flex;
        flex-direction: column;
        gap: 10px;
        align-items:flex-end;
        min-width: min(520px, 100%);
      }
      .plx-search{
        display:flex;
        align-items:center;
        gap: 10px;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        padding: 10px 12px;
        width: min(520px, 100%);
      }
      .plx-searchIcon{ color: rgba(255,255,255,0.55); display:grid; place-items:center; }
      .plx-searchInput{
        flex:1;
        background: transparent;
        border: 0;
        outline: none;
        color: rgba(255,255,255,0.92);
        font-size: 14px;
      }
      .plx-searchInput::placeholder{ color: rgba(255,255,255,0.45); }
      .plx-searchClear{
        border: 0;
        background: transparent;
        color: rgba(255,255,255,0.55);
        padding: 4px 6px;
        cursor: pointer;
        display:grid;
        place-items:center;
      }
      .plx-searchClear:hover{ color: rgba(255,255,255,0.85); }

      .plx-btnRow{ display:flex; gap: 10px; }
      .plx-btn{
        border-radius: 16px;
        padding: 10px 12px;
        font-weight: 900;
        font-size: 13px;
        transition: 0.15s ease;
        border: 1px solid transparent;
      }
      .plx-btn-primary{ background: rgba(255,255,255,0.95); color: rgba(0,0,0,0.90); }
      .plx-btn-primary:hover{ opacity: 0.92; }
      .plx-btn-ghost{
        border-color: rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.90);
      }
      .plx-btn-ghost:hover{ background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.18); }
      .plx-btn-mini{
        padding: 7px 9px;
        font-size: 11px;
        border-color: rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.88);
      }
      .plx-btn-mini:hover{ background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.18); }

      .plx-tabs{
        max-width: 1320px;
        margin: 10px auto 0;
        display:flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .plx-tab{
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.05);
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 900;
        color: rgba(255,255,255,0.72);
        transition: .15s ease;
      }
      .plx-tab:hover{ background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.9); }
      .plx-tabActive{ background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.18); color: rgba(255,255,255,0.92); }

      .plx-content{
        max-width: 1320px;
        margin: 0 auto;
        padding: 18px;
        display: grid;
        gap: 16px;
      }

      .plx-kpis{
        display:grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      @media (max-width: 1100px){ .plx-kpis{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 560px){
        :root{ --side: 0px; }
        .plx-side{ display:none; }
        .plx-main{ padding-left: 0; }
        .plx-kpis{ grid-template-columns: 1fr; }
        .plx-topbarInner{ flex-direction: column; }
        .plx-topActions{ align-items: stretch; min-width: 100%; }
        .plx-title{ max-width: 100%; white-space: normal; }
      }

      .plx-card{
        border-radius: 24px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        backdrop-filter: blur(16px);
        box-shadow: 0 20px 90px rgba(0,0,0,0.38);
      }
      .plx-pad{ padding: 16px; }

      .plx-headRow{ display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; }
      .plx-headRowRight{ display:flex; gap: 10px; align-items:center; }
      .plx-hTitle{ font-weight: 950; color: rgba(255,255,255,0.92); }
      .plx-hSub{ margin-top: 4px; font-size: 13px; color: rgba(255,255,255,0.55); }

      .plx-select{
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.88);
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 900;
        outline: none;
      }

      /* TABLE: sin scroll X y letra pequeña */
      .plx-tableWrap{
        margin-top: 14px;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.10);
        overflow: hidden; /* importante: mata scroll lateral */
      }
      .plx-tableNoX{ overflow-x: hidden; }
      .plx-table{
        width: 100%;
        table-layout: fixed; /* fuerza que quepa */
        border-collapse: collapse;
        background: rgba(2,6,23,0.22);
      }
      .plx-tableSmall{
        font-size: 12px; /* más pequeña */
      }
      .plx-table thead th{
        text-align:left;
        font-size: 10px;
        letter-spacing: 0.10em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.55);
        padding: 10px 10px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .plx-table tbody td{
        padding: 10px 10px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.75);
        vertical-align: middle;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .plx-table tbody tr:hover{ background: rgba(255,255,255,0.04); }

      .plx-cellClamp{ white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,"Liberation Mono","Courier New", monospace; }
      .plx-strong{ font-weight: 900; color: rgba(255,255,255,0.90); }
      .plx-muted{ font-size: 11px; color: rgba(255,255,255,0.55); }

      .plx-right{ text-align:right; }
      .plx-empty{ text-align:center; color: rgba(255,255,255,0.55); padding: 22px 10px; }

      .plx-kpi{
        position: relative;
        overflow: hidden;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.06);
        padding: 14px;
      }
      .plx-kpi:before{
        content:"";
        position:absolute;
        top:-50px;
        right:-50px;
        width: 190px;
        height: 190px;
        border-radius: 999px;
        filter: blur(28px);
        opacity: 0.9;
      }
      .plx-kpiLabel{ font-size: 12px; font-weight: 900; color: rgba(255,255,255,0.62); }
      .plx-kpiValue{ margin-top: 6px; font-size: 24px; font-weight: 950; color: rgba(255,255,255,0.94); }
      .plx-kpiSub{ margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.55); }
      .plx-kpi-violet:before{ background: rgba(139,92,246,0.22); }
      .plx-kpi-blue:before{ background: rgba(96,165,250,0.20); }
      .plx-kpi-pink:before{ background: rgba(217,70,239,0.18); }
      .plx-kpi-cyan:before{ background: rgba(34,211,238,0.16); }

      .plx-pillTag{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        border-radius: 999px;
        padding: 6px 9px;
        font-size: 10.5px;
        font-weight: 950;
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

      .plx-miniGrid{
        margin-top: 14px;
        display:grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .plx-mini{
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.05);
        padding: 12px 12px;
        min-width: 0;
      }
      .plx-miniLabel{ font-size: 12px; font-weight: 900; color: rgba(255,255,255,0.60); }
      .plx-miniValue{
        margin-top: 6px;
        font-weight: 950;
        color: rgba(255,255,255,0.92);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .plx-labelSm{
        font-size: 11px;
        font-weight: 900;
        color: rgba(255,255,255,0.62);
        margin-bottom: 8px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .plx-break{ margin-top: 14px; }

      .plx-grid2b{
        display:grid;
        grid-template-columns: 420px minmax(0, 1fr);
        gap: 16px;
        align-items:start;
      }
      @media (max-width: 1100px){ .plx-grid2b{ grid-template-columns: 1fr; } }

      .plx-tiles{ margin-top: 14px; display:grid; gap: 10px; }
      .plx-tile{
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.06);
        padding: 14px;
        position: relative;
        overflow: hidden;
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
      .plx-tile-blue:before{ background: rgba(96,165,250,0.18); }
      .plx-tile-violet:before{ background: rgba(139,92,246,0.20); }
      .plx-tile-cyan:before{ background: rgba(34,211,238,0.16); }
      .plx-tile-pink:before{ background: rgba(217,70,239,0.14); }

      .plx-row{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap: 12px;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.06);
        padding: 12px 12px;
      }
      .plx-rowRight{ display:flex; align-items:center; gap: 10px; }

      .plx-list{ margin-top: 14px; display:grid; gap: 10px; }
      .plx-drawer{
        border-left: 1px solid rgba(255,255,255,0.12);
        background: rgba(6,10,22,0.88);
        backdrop-filter: blur(18px);
      }
      .plx-drawerHead{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.10);
      }
      .plx-tag{
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        padding: 6px 10px;
        font-size: 11px;
        color: rgba(255,255,255,0.75);
        font-weight: 900;
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
    { id: "LN-1042", borrower: "Transporte del Valle SA", rfc: "TVA1902218K1", product: "Revolvente", originationDate: "2025-10-14", principalMXN: 12000000, outstandingMXN: 9850000, rateAPR: 0.295, termMonths: 18, status: "watch", dpd: 0, riskScore: 62 },
    { id: "LN-1107", borrower: "Agroinsumos La Esperanza", rfc: "ALE2009183R2", product: "Simple", originationDate: "2025-08-03", principalMXN: 6000000, outstandingMXN: 4120000, rateAPR: 0.27, termMonths: 12, status: "current", dpd: 0, riskScore: 78 },
    { id: "LN-1219", borrower: "Rising Farms MX", rfc: "RFM2101079Z5", product: "Factoraje", originationDate: "2025-11-22", principalMXN: 4500000, outstandingMXN: 3180000, rateAPR: 0.32, termMonths: 9, status: "late", dpd: 11, riskScore: 41 },
    { id: "LN-1258", borrower: "Servicios Industriales Norte", rfc: "SIN1805032H7", product: "Arrendamiento", originationDate: "2025-07-12", principalMXN: 22000000, outstandingMXN: 18750000, rateAPR: 0.265, termMonths: 24, status: "current", dpd: 0, riskScore: 83 },
    { id: "LN-1304", borrower: "Comercializadora Kappa", rfc: "CKA1709111M3", product: "Simple", originationDate: "2025-05-29", principalMXN: 8000000, outstandingMXN: 6500000, rateAPR: 0.34, termMonths: 18, status: "default", dpd: 67, riskScore: 18 },
  ];

  const kyc: KycCompany[] = [
    { id: "KYC-3021", company: "Transporte del Valle SA", rfc: "TVA1902218K1", promotor: "Equipo Norte", requestedAt: "2026-01-28", status: "in_review", satCfdiMonths: 24, buroScore: 712, flags: ["Domicilio por verificar", "Beneficiario final pendiente"] },
    { id: "KYC-3090", company: "Rising Farms MX", rfc: "RFM2101079Z5", promotor: "Equipo Bajío", requestedAt: "2026-01-19", status: "pending", satCfdiMonths: 18, buroScore: 655, flags: ["CFDI incompleto (6m)"] },
    { id: "KYC-3115", company: "Servicios Industriales Norte", rfc: "SIN1805032H7", promotor: "Equipo Centro", requestedAt: "2026-01-09", status: "approved", satCfdiMonths: 24, buroScore: 780, flags: [] },
    { id: "KYC-3188", company: "Comercializadora Kappa", rfc: "CKA1709111M3", promotor: "Equipo Occidente", requestedAt: "2025-12-18", status: "rejected", satCfdiMonths: 12, buroScore: 590, flags: ["Inconsistencia fiscal", "PLD alto riesgo"] },
  ];

  const collateral: Collateral[] = [
    { id: "COL-8001", company: "Servicios Industriales Norte", rfc: "SIN1805032H7", type: "Activo fijo (RUG)", description: "Montacargas y equipo de almacén. Registro con folio RUG.", valueMXN: 5200000, coveragePct: 28, rugFolio: "RUG-19-558201", verified: true, updatedAt: "2026-01-30" },
    { id: "COL-8014", company: "Transporte del Valle SA", rfc: "TVA1902218K1", type: "Fuente de pago", description: "Cesión de derechos de cobro con pagador AAA (contrato anual).", valueMXN: 9000000, coveragePct: 45, paymentSource: "Cesión de cobranza · Pagador AAA", verified: false, updatedAt: "2026-02-02" },
    { id: "COL-8033", company: "Agroinsumos La Esperanza", rfc: "ALE2009183R2", type: "Fuente de pago", description: "Domiciliación de pagos + contrato de suministro (3 años).", valueMXN: 3200000, coveragePct: 35, paymentSource: "Domiciliación · Contrato suministro", verified: true, updatedAt: "2026-01-25" },
    { id: "COL-8051", company: "Rising Farms MX", rfc: "RFM2101079Z5", type: "Activo fijo (RUG)", description: "Tractor agrícola y remolques. Registro pendiente.", valueMXN: 2700000, coveragePct: 22, rugFolio: "—", verified: false, updatedAt: "2026-02-03" },
  ];

  const tasks = [
    { id: "T-01", title: "Revisar CFDI faltante (6m)", company: "Rising Farms MX", owner: "Ops KYC", sla: "48h", priority: "Alta", tone: "warn" as const },
    { id: "T-02", title: "Validar beneficiario final", company: "Transporte del Valle SA", owner: "Compliance", sla: "72h", priority: "Media", tone: "info" as const },
    { id: "T-03", title: "Gestionar cobranza (DPD 11)", company: "Rising Farms MX", owner: "Collections", sla: "24h", priority: "Alta", tone: "bad" as const },
    { id: "T-04", title: "Actualizar valuación garantía", company: "Servicios Industriales Norte", owner: "Risk", sla: "7d", priority: "Baja", tone: "good" as const },
  ];

  return { loans, kyc, collateral, tasks };
}
