/* app/dashboard/page.tsx
   - ✅ Sin scroll vertical (todo cabe en 1 vista) usando height fijo + grids compactos
   - ✅ Más ancho horizontal (max-w-7xl + px más generoso)
   - ✅ Sidebar y contenido con alturas controladas; contenido interno con overflow-hidden
*/
"use client";

import React, { useEffect, useMemo, useState } from "react";

type RevenuePoint = { month: string; value: number };

type Authorization = {
  directorName?: string;
  directorEmail?: string;
  acceptedTerms?: boolean;
  acceptedAt?: string;
};

type Profile = {
  updatedAt: string;
  revenueMonthlyMXN: RevenuePoint[];
  buroScore: number; // 100-900
  companyCaptured?: {
    companyName?: string;
    rfc?: string;
    activity?: string;
    incorporationDate?: string;
    email?: string;
    phone?: string;
    efirmaSerial?: string;
  };
  satIdentity?: { companyName?: string; rfc?: string; verifiedAt?: string };
  authorization?: Authorization;
};

const MONTHS_24: string[] = [
  "Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic","Ene",
  "Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic","Ene",
];

const FALLBACK_24: RevenuePoint[] = MONTHS_24.map((m) => ({ month: m, value: 0 }));

const FALLBACK: Profile = {
  updatedAt: new Date(0).toISOString(),
  revenueMonthlyMXN: FALLBACK_24,
  buroScore: 100,
  companyCaptured: {
    companyName: "—",
    rfc: "—",
    activity: "—",
    incorporationDate: "—",
    email: "—",
    phone: "—",
    efirmaSerial: "—",
  },
  satIdentity: { companyName: "—", rfc: "—" },
  authorization: {},
};

type Tab = "panel" | "empresa" | "capturados" | "pdf";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile>(FALLBACK);
  const [tab, setTab] = useState<Tab>("panel");

  const [printMode, setPrintMode] = useState<"none" | "report" | "authorization">("none");

  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem("plinius_profile");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Profile;

        const revRaw = Array.isArray(parsed.revenueMonthlyMXN) ? parsed.revenueMonthlyMXN : [];
        const rev24: RevenuePoint[] =
          revRaw.length >= 24
            ? revRaw.slice(0, 24)
            : [...revRaw, ...FALLBACK_24.slice(0, 24 - revRaw.length)];

        setProfile({
          ...FALLBACK,
          ...parsed,
          revenueMonthlyMXN: rev24,
          companyCaptured: { ...FALLBACK.companyCaptured, ...(parsed.companyCaptured || {}) },
          satIdentity: { ...FALLBACK.satIdentity, ...(parsed.satIdentity || {}) },
          authorization: { ...(FALLBACK.authorization || {}), ...(parsed.authorization || {}) },
        });
      } catch {
        setProfile(FALLBACK);
      }
    }
  }, []);

  const revenue = profile.revenueMonthlyMXN || FALLBACK_24;

  const maxVal = useMemo(() => Math.max(1, ...revenue.map((r) => r.value || 0)), [revenue]);

  const avgVal = useMemo(() => {
    const sum = revenue.reduce((a, b) => a + (b.value || 0), 0);
    return Math.round(sum / Math.max(1, revenue.length));
  }, [revenue]);

  const updatedDate = useMemo(() => formatUTC(profile.updatedAt), [profile.updatedAt]);

  const capturedName = profile.companyCaptured?.companyName || "—";
  const capturedRFC = profile.companyCaptured?.rfc || "—";
  const satName = profile.satIdentity?.companyName || "—";
  const satRFC = profile.satIdentity?.rfc || "—";

  const rfcMatch =
    normalize(capturedRFC) !== "—" && normalize(satRFC) !== "—"
      ? normalize(capturedRFC) === normalize(satRFC)
      : null;

  const nameMatch =
    normalize(capturedName) !== "—" && normalize(satName) !== "—"
      ? normalize(capturedName) === normalize(satName)
      : null;

  const auth: Authorization = profile.authorization || {};
  const hasAuthorization = !!(
    auth.acceptedTerms &&
    (auth.directorEmail || "").trim() &&
    isValidEmail((auth.directorEmail || "").trim())
  );
  const authDate = auth.acceptedAt ? formatUTC(auth.acceptedAt) : "—";

  const logout = () => {
    localStorage.removeItem("plinius_profile");
    localStorage.removeItem("bcl_session");
    window.location.href = "/login";
  };

  const printReport = () => {
    setPrintMode("report");
    setTimeout(() => window.print(), 60);
  };

  const printAuthorization = () => {
    setPrintMode("authorization");
    setTimeout(() => window.print(), 60);
  };

  useEffect(() => {
    const handler = () => setPrintMode("none");
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, []);

  // --- scoring boxes ---
  const scoreBand = useMemo(() => scoreToBand(profile.buroScore), [profile.buroScore]);

  const yoy = useMemo(() => {
    const last12 = revenue.slice(-12).reduce((a, b) => a + (b.value || 0), 0);
    const prev12 = revenue.slice(0, 12).reduce((a, b) => a + (b.value || 0), 0);
    if (!prev12) return null;
    return Math.round(((last12 - prev12) / Math.max(1, prev12)) * 100);
  }, [revenue]);

  const stability = useMemo(() => {
    const xs = revenue.slice(-12).map((x) => x.value || 0).filter((x) => x >= 0);
    const mean = avg(xs);
    if (!xs.length || mean === 0) return { pct: 0, label: "N/D" };
    const variance = xs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / xs.length;
    const stdev = Math.sqrt(variance);
    const cv = stdev / mean;
    const est = Math.round(100 * Math.max(0, Math.min(1, 1 - cv)));
    const label = est >= 75 ? "Alta" : est >= 50 ? "Media" : "Baja";
    return { pct: est, label };
  }, [revenue]);

  const creditGrade = useMemo(() => {
    const s = profile.buroScore || 100;
    if (s >= 760) return "A";
    if (s >= 680) return "B";
    if (s >= 580) return "C";
    return "D";
  }, [profile.buroScore]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-white text-black overflow-hidden">
      {/* Print styles */}
      <style>{`
        @media print{
          header, aside, .no-print{ display:none !important; }
          body{ background:white !important; }
          .print-only{ display:block !important; }
          .print-report{ display: ${printMode === "report" ? "block" : "none"} !important; }
          .print-authorization{ display: ${printMode === "authorization" ? "block" : "none"} !important; }
        }
      `}</style>

      {/* Topbar */}
      <header className="bg-[#0084FF] text-white no-print">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/plinius.png"
              alt="Plinius"
              className="h-9 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <div className="min-w-0">
              <div className="font-semibold leading-tight truncate">Plinius Dashboard</div>
              <div className="text-white/85 text-xs truncate">Actualizado: {updatedDate}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl bg-white text-black font-semibold px-4 py-2.5 hover:opacity-90 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Layout (altura fija, sin scroll) */}
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-5 no-print">
        <div className="grid lg:grid-cols-[270px_1fr] gap-4 items-stretch h-[calc(100vh-92px-40px)]">
          {/* Sidebar (altura completa) */}
          <aside className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl p-4 h-full flex flex-col overflow-hidden">
            <div className="min-h-0 flex flex-col">
              <div className="text-black/55 text-[11px] uppercase tracking-wider">Secciones</div>

              <nav className="mt-3 space-y-2">
                <SideBtn active={tab === "panel"} onClick={() => setTab("panel")} title="Panel" desc="Score + Facturación" />
                <SideBtn active={tab === "empresa"} onClick={() => setTab("empresa")} title="Datos de empresa" desc="Capturado vs SAT" />
                <SideBtn active={tab === "capturados"} onClick={() => setTab("capturados")} title="Datos capturados" desc="Solo lectura" />
                <SideBtn
                  active={tab === "pdf"}
                  onClick={() => {
                    setTab("pdf");
                    printReport();
                  }}
                  title="Imprimir Reporte (PDF)"
                  desc="Gráficas + resumen"
                />
              </nav>

              <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4">
                <div className="text-black/60 text-xs">Empresa</div>
                <div className="mt-1 font-semibold text-black truncate">{capturedName}</div>
                <div className="text-black/55 text-xs truncate">{capturedRFC}</div>
              </div>

              {/* Autorización DG (compacto) */}
              <div className="mt-3 rounded-2xl border border-black/10 bg-white/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-black/60 text-xs">Autorización</div>
                  <span
                    className={[
                      "rounded-full border px-2.5 py-1 text-[11px]",
                      hasAuthorization
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                        : "border-black/10 bg-black/5 text-black/60",
                    ].join(" ")}
                  >
                    {hasAuthorization ? "Firmada" : "Pendiente"}
                  </span>
                </div>

                <div className="mt-2 text-sm">
                  <div className="text-black/55 text-xs">DG</div>
                  <div className="font-semibold truncate">{auth.directorName || "—"}</div>
                  <div className="text-black/55 text-xs truncate">{auth.directorEmail || "—"}</div>
                  <div className="text-black/45 text-[11px] mt-1">Fecha: {authDate}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!hasAuthorization}
                    onClick={printAuthorization}
                    className="rounded-2xl bg-black text-white font-semibold px-3.5 py-2 text-xs hover:opacity-95 transition disabled:opacity-50"
                  >
                    Descargar (PDF)
                  </button>
                  <div className="text-[11px] text-black/45 flex items-center">*Print → PDF</div>
                </div>
              </div>

              <div className="mt-auto pt-4 text-[11px] text-black/35">
                © {new Date().getFullYear()} Plinius
              </div>
            </div>
          </aside>

          {/* Content (altura completa, sin scroll) */}
          <section className="min-w-0 h-full flex flex-col overflow-hidden">
            {/* Top metrics (compacto) */}
            <div className="grid md:grid-cols-3 gap-3">
              <MiniCard
                title="Credit Grade"
                subtitle="Clasificación"
                value={creditGrade}
                hint={`Buró ${profile.buroScore} • ${scoreBand.label}`}
              />
              <MiniCard
                title="Estabilidad ingresos"
                subtitle="Últimos 12 meses"
                value={`${stability.pct}%`}
                hint={`Volatilidad → ${stability.label}`}
              />
              <MiniCard
                title="Crecimiento YoY"
                subtitle="12m vs 12m previos"
                value={yoy === null ? "—" : `${yoy >= 0 ? "+" : ""}${yoy}%`}
                hint="Estimación simple"
              />
            </div>

            {/* Main area: fill remaining height */}
            <div className="flex-1 mt-3 min-h-0 overflow-hidden">
              {/* PANEL (sin overflow; barras compactas) */}
              {tab === "panel" && (
                <div className="h-full flex flex-col min-h-0">
                  <div className="grid md:grid-cols-3 gap-3">
                    <StatCard label="Score Buró" value={String(profile.buroScore ?? "—")} sub="100–900" />
                    <StatCard label="Prom. mensual" value={`$${avgVal.toLocaleString("es-MX")}`} sub="MXN" />
                    <StatCard label="Máx. mensual" value={`$${maxVal.toLocaleString("es-MX")}`} sub="MXN" />
                  </div>

                  {/* 2 cards que ocupan el resto */}
                  <div className="mt-3 grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
                    <Card title="Facturación (24 meses)" subtitle="MXN • placeholder / API" className="h-full">
                      <div className="mt-3 rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl p-3 h-[calc(100%-52px)]">
                        {/* chart compacto (altura fija) */}
                        <div className="h-[180px] overflow-hidden">
                          <div className="h-full flex items-end gap-2">
                            {revenue.slice(0, 24).map((p, idx) => {
                              const h = Math.round(((p.value || 0) / maxVal) * 100);
                              return (
                                <div key={`${p.month}-${idx}`} className="flex-1 flex flex-col items-center gap-1">
                                  <div
                                    className="w-full rounded-xl bg-[#0084FF]"
                                    style={{ height: `${Math.max(6, h)}%`, transition: "height .35s ease" }}
                                    title={`${p.month}: $${(p.value || 0).toLocaleString("es-MX")}`}
                                  />
                                  {/* labels cada 3 */}
                                  {idx % 3 === 2 ? (
                                    <div className="text-black/60 text-[10px] leading-none">{p.month}</div>
                                  ) : (
                                    <div className="h-[10px]" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-black/65 text-xs">
                          <span>Máx: ${maxVal.toLocaleString("es-MX")}</span>
                          <span>Prom: ${avgVal.toLocaleString("es-MX")}</span>
                        </div>

                        <div className="mt-1 text-[10.5px] text-black/45">
                          Nota: conector e.firma/CFDI llenará esto.
                        </div>
                      </div>
                    </Card>

                    <Card title="Score Buró" subtitle="Velocímetro • 100 → 900" className="h-full">
                      <div className="mt-3 rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl p-3 h-[calc(100%-52px)] flex flex-col">
                        <div className="flex-1 flex items-center justify-center">
                          <Gauge score={profile.buroScore} compact />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-black/60 text-xs">
                          <span>100</span>
                          <span className="text-black font-semibold">{profile.buroScore}</span>
                          <span>900</span>
                        </div>
                        <div className="mt-1 text-[10.5px] text-black/45">
                          Placeholder visual. Score real vendrá de Buró/motor.
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* EMPRESA (compacto, 1 vista) */}
              {tab === "empresa" && (
                <div className="h-full min-h-0">
                  <Card title="Datos de empresa" subtitle="Capturado vs SAT" className="h-full">
                    <div className="mt-3 grid lg:grid-cols-2 gap-3">
                      <InfoCard
                        label="Capturado"
                        rows={[
                          { k: "Razón social", v: capturedName },
                          { k: "RFC", v: capturedRFC },
                        ]}
                      />
                      <InfoCard
                        label="SAT"
                        rows={[
                          { k: "Razón social", v: satName },
                          { k: "RFC", v: satRFC },
                        ]}
                      />
                    </div>

                    <div className="mt-3 grid md:grid-cols-2 gap-3">
                      <VerifyCard
                        title="Match RFC"
                        ok={rfcMatch}
                        detail={rfcMatch === null ? "Pendiente: conecta SAT." : rfcMatch ? "RFC coincide." : "RFC NO coincide."}
                      />
                      <VerifyCard
                        title="Match Razón social"
                        ok={nameMatch}
                        detail={nameMatch === null ? "Pendiente: conecta SAT." : nameMatch ? "Razón social coincide." : "Razón social NO coincide."}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const next: Profile = {
                            ...profile,
                            satIdentity: {
                              companyName: capturedName === "—" ? "EMPRESA DEMO SA DE CV" : capturedName,
                              rfc: capturedRFC === "—" ? "AAAA010101AAA" : capturedRFC,
                              verifiedAt: new Date().toISOString(),
                            },
                            updatedAt: new Date().toISOString(),
                          };
                          setProfile(next);
                          localStorage.setItem("plinius_profile", JSON.stringify(next));
                        }}
                        className="rounded-2xl bg-black text-white font-semibold px-4 py-2.5 hover:opacity-95 transition"
                      >
                        Simular SAT OK
                      </button>

                      <button
                        onClick={() => {
                          const next: Profile = {
                            ...profile,
                            satIdentity: { companyName: "—", rfc: "—" },
                            updatedAt: new Date().toISOString(),
                          };
                          setProfile(next);
                          localStorage.setItem("plinius_profile", JSON.stringify(next));
                        }}
                        className="rounded-2xl border border-black/10 bg-white/70 px-4 py-2.5 hover:bg-white transition"
                      >
                        Limpiar SAT
                      </button>
                    </div>

                    <div className="mt-2 text-[11px] text-black/45">
                      En producción: constancia fiscal, régimen, actividad y hash de verificación.
                    </div>
                  </Card>
                </div>
              )}

              {/* CAPTURADOS (compacto, solo lectura) */}
              {tab === "capturados" && (
                <div className="h-full min-h-0">
                  <Card title="Datos capturados (solo lectura)" subtitle="Ingresados en onboarding" className="h-full">
                    <div className="mt-3 grid md:grid-cols-2 gap-3">
                      <InfoCard
                        label="Empresa"
                        rows={[
                          { k: "Razón social", v: profile.companyCaptured?.companyName || "—" },
                          { k: "RFC", v: profile.companyCaptured?.rfc || "—" },
                          { k: "Actividad", v: profile.companyCaptured?.activity || "—" },
                          { k: "Constitución", v: profile.companyCaptured?.incorporationDate || "—" },
                        ]}
                      />
                      <InfoCard
                        label="Contacto"
                        rows={[
                          { k: "Correo", v: profile.companyCaptured?.email || "—" },
                          { k: "Teléfono", v: profile.companyCaptured?.phone || "—" },
                          { k: "Serie e.firma", v: profile.companyCaptured?.efirmaSerial || "—" },
                        ]}
                      />
                    </div>

                    <div className="mt-2 text-[11px] text-black/45">
                      Nota: lectura solamente. “Editar” sería flujo con permisos y auditoría.
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {/* Footer inline (sin empujar a scroll) */}
            <div className="mt-3 flex items-center justify-between text-xs text-black/40">
              <span>© {new Date().getFullYear()} Plinius</span>
              <span className="text-black/30">plinius</span>
            </div>
          </section>
        </div>
      </div>

      {/* ===========================
          PRINT-ONLY: REPORTE
          =========================== */}
      <section className="print-only print-report hidden">
        <div style={{ padding: 28, fontFamily: "Arial, Helvetica, sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Reporte • Plinius</div>
            <div style={{ fontSize: 12, color: "#444" }}>{updatedDate}</div>
          </div>

          <div style={{ marginTop: 6, fontSize: 11, color: "#666" }}>
            Documento generado automáticamente. En producción: SAT (CFDI) + Buró (score real) + firma electrónica.
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "#666" }}>Razón social (capturada)</div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{capturedName}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#666" }}>RFC (capturado)</div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{capturedRFC}</div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#666" }}>Razón social (SAT)</div>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{satName}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#666" }}>RFC (SAT)</div>
              <div style={{ fontWeight: 700, fontSize: 12 }}>{satRFC}</div>
            </div>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Resumen ejecutivo</div>
            <div style={{ fontSize: 12, color: "#222", lineHeight: 1.55 }}>
              <div>
                • <b>Score Buró:</b> {profile.buroScore} ({scoreBand.label}).{" "}
                <span style={{ color: "#666" }}>{scoreBand.note}</span>
              </div>
              <div>
                • <b>Facturación promedio mensual:</b> ${avgVal.toLocaleString("es-MX")} MXN.
              </div>
              <div>
                • <b>YoY:</b> {yoy === null ? "N/D" : `${yoy >= 0 ? "+" : ""}${yoy}%`}{" "}
                <span style={{ color: "#666" }}>(estimación simple con 24 meses).</span>
              </div>
              <div>
                • <b>Recomendación (placeholder):</b> {scoreBand.reco}
              </div>
            </div>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "#666" }}>Score Buró</div>
              <div style={{ fontWeight: 900, fontSize: 30 }}>{profile.buroScore}</div>
              <div style={{ fontSize: 11, color: "#666" }}>Escala 100–900</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#666" }}>Prom. mensual</div>
              <div style={{ fontWeight: 900, fontSize: 30 }}>${avgVal.toLocaleString("es-MX")}</div>
              <div style={{ fontSize: 11, color: "#666" }}>MXN</div>
            </div>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 16, alignItems: "start" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Facturación (24 meses)</div>
              <RevenueChartPrint data={revenue} maxVal={maxVal} />
              <div style={{ marginTop: 6, fontSize: 11, color: "#666" }}>
                Máx: ${maxVal.toLocaleString("es-MX")} • Prom: ${avgVal.toLocaleString("es-MX")}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Score Buró</div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <GaugePrint score={profile.buroScore} />
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: "#666", textAlign: "center" }}>
                100 (malo) → 900 (bueno)
              </div>
            </div>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ fontSize: 10.5, color: "#666", lineHeight: 1.5 }}>
            Nota: Este reporte es un placeholder. En producción se adjunta evidencia, constancia fiscal, régimen, hash de verificación y acuse.
          </div>
        </div>
      </section>

      {/* ===========================
          PRINT-ONLY: AUTORIZACIÓN
          =========================== */}
      <section className="print-only print-authorization hidden">
        <div style={{ padding: 28, fontFamily: "Arial, Helvetica, sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Autorización • Plinius</div>
            <div style={{ fontSize: 12, color: "#444" }}>{new Date().toISOString().slice(0, 10)}</div>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ fontSize: 13, color: "#222", lineHeight: 1.55 }}>
            Yo, <b>{auth.directorName || "__________"}</b>, como <b>DIRECTOR GENERAL</b> de la Empresa:{" "}
            <b>{capturedName || "__________"}</b>, con RFC <b>{capturedRFC || "__________"}</b>, autorizo a <b>Plinius</b>{" "}
            para recabar, procesar y utilizar la información necesaria para evaluación crediticia, verificación (SAT/Buró) y
            estructuración de crédito conforme a los términos aplicables.
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: "#222" }}>
            <div><b>Nombre del Director General:</b> {auth.directorName || "—"}</div>
            <div><b>Correo para firma electrónica:</b> {auth.directorEmail || "—"}</div>
            <div><b>Acepta Términos y Condiciones:</b> {auth.acceptedTerms ? "Sí" : "No"}</div>
            <div><b>Fecha de aceptación:</b> {auth.acceptedAt ? formatUTC(auth.acceptedAt) : "—"}</div>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ fontSize: 11, color: "#666" }}>
            Este documento es un borrador. En producción se integrará firma electrónica avanzada y acuse.
          </div>
        </div>
      </section>
    </main>
  );
}

/* =========================
   PRINT COMPONENTS
   ========================= */

function RevenueChartPrint({ data, maxVal }: { data: RevenuePoint[]; maxVal: number }) {
  const W = 760;
  const H = 220;
  const padL = 18;
  const padR = 10;
  const padT = 10;
  const padB = 26;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const bars = data.slice(0, 24);
  const n = bars.length;
  const gap = 6;
  const barW = Math.max(6, Math.floor((innerW - gap * (n - 1)) / n));

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue chart">
      <rect x="0" y="0" width={W} height={H} fill="#fff" />
      <line x1={padL} y1={padT + innerH} x2={padL + innerW} y2={padT + innerH} stroke="#ddd" strokeWidth="1" />
      {bars.map((p, idx) => {
        const v = Math.max(0, p.value || 0);
        const h = Math.round((v / Math.max(1, maxVal)) * innerH);
        const x = padL + idx * (barW + gap);
        const y = padT + (innerH - h);
        return (
          <g key={`${p.month}-${idx}`}>
            <rect x={x} y={y} width={barW} height={Math.max(2, h)} rx="6" fill="#0084FF" />
            {idx % 2 === 1 && (
              <text x={x + barW / 2} y={padT + innerH + 16} textAnchor="middle" fontSize="10" fill="#666">
                {p.month}
              </text>
            )}
          </g>
        );
      })}
      <text x={padL} y={H - 6} fontSize="10" fill="#999">
        24 meses (placeholder)
      </text>
    </svg>
  );
}

function GaugePrint({ score }: { score: number }) {
  const min = 100;
  const max = 900;
  const clamped = Math.max(min, Math.min(max, score));
  const t = (clamped - min) / (max - min);
  const angle = -90 + t * 180;

  return (
    <svg width="300" height="180" viewBox="0 0 320 190" role="img" aria-label="Gauge score">
      <defs>
        <linearGradient id="rgp" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,80,80,0.95)" />
          <stop offset="50%" stopColor="rgba(255,212,0,0.95)" />
          <stop offset="100%" stopColor="rgba(65,232,151,0.95)" />
        </linearGradient>
      </defs>

      <path d="M 40 160 A 120 120 0 0 1 280 160" fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="18" strokeLinecap="round" />
      <path d="M 40 160 A 120 120 0 0 1 280 160" fill="none" stroke="url(#rgp)" strokeWidth="14" strokeLinecap="round" />

      {Array.from({ length: 9 }).map((_, idx) => {
        const a = (-90 + idx * 22.5) * (Math.PI / 180);
        const r1 = 105;
        const r2 = 118;
        const cx = 160;
        const cy = 160;
        const x1 = cx + r1 * Math.cos(a);
        const y1 = cy + r1 * Math.sin(a);
        const x2 = cx + r2 * Math.cos(a);
        const y2 = cy + r2 * Math.sin(a);
        return <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,0,0,0.18)" strokeWidth="2" strokeLinecap="round" />;
      })}

      <g transform={`translate(160 160) rotate(${angle})`}>
        <line x1="0" y1="0" x2="92" y2="0" stroke="rgba(0,0,0,0.82)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="0" cy="0" r="8" fill="rgba(0,0,0,0.82)" />
        <circle cx="0" cy="0" r="14" fill="rgba(0,0,0,0.08)" />
      </g>

      <text x="160" y="182" textAnchor="middle" fill="rgba(0,0,0,0.60)" fontSize="12">
        Score 100–900
      </text>
    </svg>
  );
}

/* =========================
   UI COMPONENTS
   ========================= */

function SideBtn({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl border px-4 py-3 transition",
        active ? "border-black/15 bg-white" : "border-black/10 bg-white/60 hover:bg-white",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-sm text-black">{title}</div>
        {active && <span className="h-2 w-2 rounded-full bg-[#0084FF]" />}
      </div>
      <div className="text-black/55 text-xs mt-0.5">{desc}</div>
    </button>
  );
}

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl shadow-sm p-5", className].join(" ")}>
      <div className="text-black font-semibold text-[16px] leading-tight">{title}</div>
      <div className="text-black/60 text-sm mt-1">{subtitle}</div>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl shadow-sm p-4">
      <div className="text-black/60 text-xs">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-black leading-tight">{value}</div>
      <div className="mt-1 text-black/45 text-xs">{sub}</div>
    </div>
  );
}

function InfoCard({ label, rows }: { label: string; rows: { k: string; v: string }[] }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl p-4">
      <div className="text-black/60 text-xs">{label}</div>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between gap-4">
            <div className="text-black/60 text-sm">{r.k}</div>
            <div className="font-semibold text-black text-sm truncate max-w-[62%] text-right">{r.v || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifyCard({ title, ok, detail }: { title: string; ok: boolean | null; detail: string }) {
  const pill =
    ok === null
      ? "bg-black/5 border-black/10 text-black/70"
      : ok
      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"
      : "bg-red-500/10 border-red-500/20 text-red-700";

  const badge = ok === null ? "Pendiente" : ok ? "OK" : "Revisar";

  return (
    <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-black">{title}</div>
        <span className={`rounded-full border px-3 py-1 text-[11px] ${pill}`}>{badge}</span>
      </div>
      <div className="mt-2 text-black/60 text-sm">{detail}</div>
    </div>
  );
}

function MiniCard({
  title,
  subtitle,
  value,
  hint,
}: {
  title: string;
  subtitle: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl shadow-sm p-4">
      <div className="text-black/60 text-xs">{subtitle}</div>
      <div className="mt-1 font-semibold text-black">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-black leading-tight">{value}</div>
      <div className="mt-1 text-[11px] text-black/45">{hint}</div>
    </div>
  );
}

/* =========================
   Helpers
   ========================= */

function normalize(s: string) {
  const x = (s || "").trim();
  if (!x) return "—";
  return x.toUpperCase().replace(/\s+/g, " ");
}

function formatUTC(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const x = d.toISOString();
    return `${x.slice(0, 10)} ${x.slice(11, 16)} UTC`;
  } catch {
    return "—";
  }
}

function avg(xs: number[]) {
  if (!xs.length) return 0;
  const s = xs.reduce((a, b) => a + b, 0);
  return s / xs.length;
}

function scoreToBand(score: number) {
  const s = Number.isFinite(score) ? score : 100;

  if (s < 580) {
    return {
      label: "Riesgo alto",
      note: "Sugiere mayor probabilidad de impago. Considera garantías o menor línea.",
      reco: "Precalificación conservadora: monto menor, plazo corto, mayor tasa, y/o garantías.",
    };
  }
  if (s < 680) {
    return {
      label: "Riesgo medio",
      note: "Calidad intermedia. Requiere verificación SAT y consistencia de ingresos.",
      reco: "Validar SAT/CFDI, estabilidad de ingresos y comportamiento de pagos antes de aprobar.",
    };
  }
  if (s < 760) {
    return {
      label: "Riesgo bajo-medio",
      note: "Buena calidad. Aún conviene validar ingresos y estabilidad.",
      reco: "Aprobación probable con verificación SAT y reglas estándar de línea/plazo.",
    };
  }
  return {
    label: "Riesgo bajo",
    note: "Calidad alta. Buen perfil para mejores condiciones.",
    reco: "Aprobación probable con mejores condiciones, sujeto a validación de ingresos (SAT).",
  };
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/* =========================
   Gauge (APP)
   ========================= */

function Gauge({ score, compact = false }: { score: number; compact?: boolean }) {
  const min = 100;
  const max = 900;
  const clamped = Math.max(min, Math.min(max, score));
  const t = (clamped - min) / (max - min);
  const angle = -90 + t * 180;

  const w = compact ? 280 : 320;
  const h = compact ? 160 : 182;

  return (
    <div className="w-full flex items-center justify-center">
      <svg width={w} height={h} viewBox="0 0 320 190" role="img" aria-label="Gauge score">
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,80,80,0.95)" />
            <stop offset="50%" stopColor="rgba(255,212,0,0.95)" />
            <stop offset="100%" stopColor="rgba(65,232,151,0.95)" />
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        <path
          d="M 40 160 A 120 120 0 0 1 280 160"
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M 40 160 A 120 120 0 0 1 280 160"
          fill="none"
          stroke="url(#rg)"
          strokeWidth="14"
          strokeLinecap="round"
          filter="url(#soft)"
        />

        {Array.from({ length: 9 }).map((_, idx) => {
          const a = (-90 + idx * 22.5) * (Math.PI / 180);
          const r1 = 105;
          const r2 = 118;
          const cx = 160;
          const cy = 160;
          const x1 = cx + r1 * Math.cos(a);
          const y1 = cy + r1 * Math.sin(a);
          const x2 = cx + r2 * Math.cos(a);
          const y2 = cy + r2 * Math.sin(a);
          return (
            <line
              key={idx}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(0,0,0,0.14)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}

        <g transform={`translate(160 160) rotate(${angle})`}>
          <line x1="0" y1="0" x2="92" y2="0" stroke="rgba(0,0,0,0.82)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="0" cy="0" r="8" fill="rgba(0,0,0,0.82)" />
          <circle cx="0" cy="0" r="14" fill="rgba(0,0,0,0.08)" />
        </g>

        <text x="160" y="182" textAnchor="middle" fill="rgba(0,0,0,0.55)" fontSize="12">
          Score 100–900
        </text>
      </svg>
    </div>
  );
}
