/* app/dashboard/page.tsx */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* =========================
   Types
   ========================= */

type RevenuePoint = { month: string; value: number };

type Authorization = {
  directorName?: string;
  directorEmail?: string;
  acceptedTerms?: boolean;
  acceptedAt?: string;
};

type SatIdentity = {
  companyName?: string;
  rfc?: string;
  verifiedAt?: string;
  status?: "pending" | "uploaded" | "processing" | "connected" | "error";
  lastMessage?: string;
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
  satIdentity?: SatIdentity;
  authorization?: Authorization;
};

type CreditRequest = {
  id: string;
  createdAt: string;
  amountMXN: number;
  termMonths: number;
  purpose: string;
  status: "draft" | "submitted" | "authorized" | "funded" | "rejected";
};

type Tab = "panel" | "datos" | "solicitudes" | "pdf";

/* =========================
   Fallbacks
   ========================= */

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
  satIdentity: { companyName: "—", rfc: "—", status: "pending" },
  authorization: {},
};

const DEMO_REQUESTS: CreditRequest[] = [
  {
    id: "REQ-0001",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    amountMXN: 800000,
    termMonths: 12,
    purpose: "Capital de trabajo",
    status: "submitted",
  },
  {
    id: "REQ-0002",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    amountMXN: 1500000,
    termMonths: 24,
    purpose: "Inventario",
    status: "authorized",
  },
];

/* =========================
   Page
   ========================= */

export default function DashboardPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  const [profile, setProfile] = useState<Profile>(FALLBACK);
  const [tab, setTab] = useState<Tab>("panel");

  const [printMode, setPrintMode] = useState<"none" | "report" | "authorization">("none");

  // Buró UX
  const [buroStatus, setBuroStatus] = useState<"idle" | "searching" | "ready" | "error">("idle");
  const [buroMsg, setBuroMsg] = useState<string>("");

  // SAT modal / upload placeholder
  const [satModalOpen, setSatModalOpen] = useState(false);
  const [satFiles, setSatFiles] = useState<{ cer?: File | null; key?: File | null; ciec?: string }>({
    cer: null,
    key: null,
    ciec: "",
  });

  // Solicitudes (por ahora demo)
  const [requests, setRequests] = useState<CreditRequest[]>(DEMO_REQUESTS);

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

  const satStatus = profile.satIdentity?.status || "pending";

  const satConnected =
    normalize(satRFC) !== "—" &&
    normalize(satName) !== "—" &&
    (satStatus === "connected" || !!profile.satIdentity?.verifiedAt);

  const rfcMatch =
    normalize(capturedRFC) !== "—" && normalize(satRFC) !== "—"
      ? normalize(capturedRFC) === normalize(satRFC)
      : null;

  const nameMatch =
    normalize(capturedName) !== "—" && normalize(satName) !== "—"
      ? normalize(capturedName) === normalize(satName)
      : null;

  // Autorización (AHORA SOLO EN DATOS)
  const auth: Authorization = profile.authorization || {};
  const hasAuthorization = !!(
    auth.acceptedTerms &&
    (auth.directorEmail || "").trim() &&
    isValidEmail((auth.directorEmail || "").trim())
  );
  const authDate = auth.acceptedAt ? formatUTC(auth.acceptedAt) : "—";

  const hasRealBuro = useMemo(() => {
    return Number.isFinite(profile.buroScore) && (profile.buroScore ?? 0) > 100;
  }, [profile.buroScore]);

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

  /* =========================
     Load session + profile
     ========================= */

  const upsertProfile = async (nextProfile: Profile) => {
    if (!userId) return;
    const payload = {
      user_id: userId,
      onboarding_completed: true,
      profile: nextProfile,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("plinius_profiles").upsert(payload, { onConflict: "user_id" });
    if (error) console.warn("upsert plinius_profiles error:", error.message);
  };

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;
    if (!uid) {
      router.replace("/login");
      return;
    }
    setUserId(uid);

    const { data, error } = await supabase
      .from("plinius_profiles")
      .select("onboarding_completed, profile")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) console.warn("load plinius_profiles error:", error.message);

    if (data && data.onboarding_completed === false) {
      router.replace("/onboarding");
      return;
    }

    let base: Profile | null = (data?.profile as Profile) ?? null;
    if (!base) {
      const fromLs = safeJson(localStorage.getItem(`plinius_profile_${uid}`));
      base = fromLs ? ({ ...FALLBACK, ...fromLs } as Profile) : null;
    }

    const merged: Profile = {
      ...FALLBACK,
      ...(base || {}),
      revenueMonthlyMXN: normalizeRevenue24(base?.revenueMonthlyMXN),
      companyCaptured: { ...(FALLBACK.companyCaptured || {}), ...(base?.companyCaptured || {}) },
      satIdentity: { ...(FALLBACK.satIdentity || {}), ...(base?.satIdentity || {}) },
      authorization: { ...(FALLBACK.authorization || {}), ...(base?.authorization || {}) },
    };

    setProfile(merged);
    localStorage.setItem(`plinius_profile_${uid}`, JSON.stringify(merged));

    setBooting(false);
  };

  useEffect(() => {
    setMounted(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buró auto-UX
  useEffect(() => {
    if (!mounted) return;
    if (tab !== "panel") return;

    if (!hasRealBuro) {
      setBuroStatus("searching");
      setBuroMsg("Buscando en bases de riesgo…");
      const t1 = setTimeout(() => setBuroMsg("Consultando fuentes (Buró / listas internas)…"), 900);
      const t2 = setTimeout(() => setBuroMsg("Normalizando identidad y score…"), 1800);
      const t3 = setTimeout(() => {
        setBuroStatus("idle");
        setBuroMsg("");
      }, 3200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setBuroStatus("ready");
      setBuroMsg("");
    }
  }, [mounted, tab, hasRealBuro]);

  /* =========================
     Actions
     ========================= */

  const logout = async () => {
    await supabase.auth.signOut();
    if (userId) localStorage.removeItem(`plinius_profile_${userId}`);
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

  const openSatModal = () => {
    setSatFiles({ cer: null, key: null, ciec: "" });
    setSatModalOpen(true);
  };

  const setSatStatusLocal = async (nextSat: SatIdentity) => {
    const next: Profile = {
      ...profile,
      satIdentity: nextSat,
      updatedAt: new Date().toISOString(),
    };
    setProfile(next);
    if (userId) localStorage.setItem(`plinius_profile_${userId}`, JSON.stringify(next));
    await upsertProfile(next);
  };

  const submitSatFilesPlaceholder = async () => {
    const msg =
      satFiles.cer && satFiles.key
        ? "Archivos e.firma cargados (placeholder)."
        : satFiles.ciec
        ? "CIEC capturada (placeholder)."
        : "Sin archivos.";

    await setSatStatusLocal({
      companyName: "—",
      rfc: "—",
      verifiedAt: "",
      status: "uploaded",
      lastMessage: msg,
    });

    setSatModalOpen(false);
  };

  const processSatMock = async () => {
    await setSatStatusLocal({
      companyName: capturedName === "—" ? "EMPRESA DEMO SA DE CV" : capturedName,
      rfc: capturedRFC === "—" ? "AAAA010101AAA" : capturedRFC,
      verifiedAt: new Date().toISOString(),
      status: "connected",
      lastMessage: "SAT conectado (mock).",
    });
  };

  const clearSat = async () => {
    await setSatStatusLocal({ companyName: "—", rfc: "—", status: "pending", verifiedAt: "", lastMessage: "" });
  };

  const fetchBuroScore = async () => {
    try {
      setBuroStatus("searching");
      setBuroMsg("Consultando Buró…");

      const res = await fetch("/api/buro/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfc: capturedRFC,
          companyName: capturedName,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error consultando Buró");

      const next: Profile = {
        ...profile,
        buroScore: Number(json?.score ?? profile.buroScore),
        updatedAt: new Date().toISOString(),
      };

      setProfile(next);
      if (userId) localStorage.setItem(`plinius_profile_${userId}`, JSON.stringify(next));
      await upsertProfile(next);

      setBuroStatus("ready");
      setBuroMsg("");
    } catch (e: any) {
      setBuroStatus("error");
      setBuroMsg(e?.message || "Falló consulta");
    }
  };

  const goNewRequest = () => {
    router.push("/solicitudes/nueva");
  };

  if (!mounted) return null;

  if (booting) {
    return (
      <main className="min-h-screen bg-white grid place-items-center">
        <div className="rounded-3xl border border-black/10 bg-white/80 backdrop-blur-xl px-6 py-4 text-black/70 shadow-sm">
          Cargando dashboard…
        </div>
      </main>
    );
  }

  const satPill = satConnected
    ? { label: "Conectado", cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700" }
    : satStatus === "processing"
    ? { label: "Procesando", cls: "border-blue-500/20 bg-blue-500/10 text-blue-700" }
    : satStatus === "uploaded"
    ? { label: "Archivos cargados", cls: "border-black/10 bg-black/5 text-black/70" }
    : satStatus === "error"
    ? { label: "Error", cls: "border-red-500/20 bg-red-500/10 text-red-700" }
    : { label: "Pendiente", cls: "border-black/10 bg-black/5 text-black/60" };

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
          .page-break{ page-break-before: always; }
        }
      `}</style>

      {/* Topbar */}
      <header className="bg-[#2B1B55] text-white no-print">
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
              <div className="text-white/80 text-xs truncate">Actualizado: {updatedDate}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block text-xs text-white/70">
              UID: <span className="text-white/90">{userId?.slice(0, 8)}…</span>
            </div>
            <button
              onClick={logout}
              className="rounded-2xl bg-white text-black font-semibold px-4 py-2.5 hover:opacity-90 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-5 no-print">
        <div className="grid lg:grid-cols-[270px_1fr] gap-4 items-stretch h-[calc(100vh-92px-40px)]">

          {/* Sidebar (sin autorización ya) */}
          <aside className="rounded-3xl border border-black/10 bg-white/60 backdrop-blur-xl h-full overflow-hidden">
            <div className="h-full grid grid-rows-[auto_auto_auto_1fr]">
              <div className="p-4">
                <div className="text-black/55 text-[11px] uppercase tracking-wider">Secciones</div>

                <nav className="mt-3 space-y-2">
                  <SideBtn active={tab === "panel"} onClick={() => setTab("panel")} title="Panel" desc="Score + Ingresos + SAT" />
                  <SideBtn active={tab === "datos"} onClick={() => setTab("datos")} title="Datos" desc="Capturado + SAT + Autorización" />
                  <SideBtn active={tab === "solicitudes"} onClick={() => setTab("solicitudes")} title="Solicitudes" desc="Lista + iniciar" />
                  <SideBtn
                    active={tab === "pdf"}
                    onClick={() => {
                      setTab("pdf");
                      printReport();
                    }}
                    title="Imprimir Reporte (PDF)"
                    desc="2 hojas • ejecutivo + detalle"
                  />
                </nav>
              </div>

              <div className="px-4">
                <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
                  <div className="text-black/60 text-[11px]">Empresa</div>
                  <div className="mt-1 font-semibold text-black truncate text-sm">{capturedName}</div>
                  <div className="text-black/55 text-xs truncate">{capturedRFC}</div>
                </div>
              </div>

              {/* SAT compact */}
              <div className="px-4 mt-3">
                <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-black/60 text-[11px]">SAT</div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${satPill.cls}`}>{satPill.label}</span>
                  </div>

                  <div className="mt-2 text-[11px] text-black/55 leading-snug">
                    {satConnected
                      ? `Verificado: ${formatUTC(profile.satIdentity?.verifiedAt || "")}`
                      : profile.satIdentity?.lastMessage
                      ? profile.satIdentity.lastMessage
                      : "Cargar CIEC/e.firma para extracción CFDI y validación RFC."}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openSatModal}
                      className="rounded-2xl bg-black text-white font-semibold px-3.5 py-2 text-xs hover:opacity-95 transition"
                    >
                      Cargar archivos
                    </button>
                    <button
                      type="button"
                      onClick={processSatMock}
                      className="rounded-2xl border border-black/10 bg-white/70 px-3.5 py-2 hover:bg-white transition text-xs"
                    >
                      Procesar (mock)
                    </button>
                    <button
                      type="button"
                      onClick={clearSat}
                      className="rounded-2xl border border-black/10 bg-white/70 px-3.5 py-2 hover:bg-white transition text-xs"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 mt-3 flex items-end">
                <div className="text-[11px] text-black/35">© {new Date().getFullYear()} Plinius</div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <section className="min-w-0 h-full flex flex-col overflow-hidden">
            {/* Top metrics */}
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

            <div className="flex-1 mt-3 min-h-0 overflow-hidden">
              {/* PANEL */}
              {tab === "panel" && (
                <div className="h-full flex flex-col min-h-0">
                  <div className="grid md:grid-cols-3 gap-3">
                    <StatCard label="Score Buró" value={String(profile.buroScore ?? "—")} sub="100–900" />
                    <StatCard label="Prom. mensual" value={`$${avgVal.toLocaleString("es-MX")}`} sub="MXN" />
                    <StatCard label="Máx. mensual" value={`$${maxVal.toLocaleString("es-MX")}`} sub="MXN" />
                  </div>

                  <div className="mt-3 grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
                    <Card title="Facturación (24 meses)" subtitle="MXN • placeholder / SAT" className="h-full">
                      <div className="mt-3 rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl p-3 h-[calc(100%-52px)]">
                        <div className="h-[180px] overflow-hidden">
                          <div className="h-full flex items-end gap-2">
                            {revenue.slice(0, 24).map((p, idx) => {
                              const h = Math.round(((p.value || 0) / maxVal) * 100);
                              return (
                                <div key={`${p.month}-${idx}`} className="flex-1 flex flex-col items-center gap-1">
                                  <div
                                    className="w-full rounded-xl bg-[#6D28D9]"
                                    style={{ height: `${Math.max(6, h)}%`, transition: "height .35s ease" }}
                                    title={`${p.month}: $${(p.value || 0).toLocaleString("es-MX")}`}
                                  />
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
                          Se llena al procesar CFDI desde SAT.
                        </div>
                      </div>
                    </Card>

                    <Card title="Buró / Score" subtitle="Backend API + estado" className="h-full">
                      <div className="mt-3 rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl p-3 h-[calc(100%-52px)] flex flex-col relative overflow-hidden">

                        {buroStatus === "searching" && (
                          <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-sm">
                            <div className="w-full max-w-xs rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
                              <div className="flex items-center gap-3">
                                <span className="h-3 w-3 rounded-full bg-black/70 animate-pulse" />
                                <div className="font-semibold text-black text-sm">Buscando en bases…</div>
                              </div>
                              <div className="mt-2 text-sm text-black/60">{buroMsg || "Consultando fuentes…"}</div>
                              <div className="mt-3 h-2 rounded-full bg-black/5 overflow-hidden">
                                <div className="h-full w-[60%] bg-black/60 animate-pulse" />
                              </div>
                              <div className="mt-3 text-[11px] text-black/45">
                                Placeholder hasta conectar proveedor real.
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex-1 flex items-center justify-center">
                          <Gauge score={profile.buroScore} compact />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-black/60 text-xs">
                          <span>100</span>
                          <span className="text-black font-semibold">{profile.buroScore}</span>
                          <span>900</span>
                        </div>

                        <div className="mt-1 text-[10.5px] text-black/45">
                          {buroStatus === "error"
                            ? `Error: ${buroMsg || "falló consulta"}`
                            : hasRealBuro
                            ? "Score cargado desde backend."
                            : "Sin lectura: consulta para traer score."}
                        </div>

                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={fetchBuroScore}
                            className="rounded-2xl bg-black text-white font-semibold px-3.5 py-2 text-xs hover:opacity-95 transition"
                          >
                            Consultar Buró
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBuroStatus("idle");
                              setBuroMsg("");
                            }}
                            className="rounded-2xl border border-black/10 bg-white/70 px-3.5 py-2 hover:bg-white transition text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* DATOS (incluye AUTORIZACIÓN aquí) */}
              {tab === "datos" && (
                <div className="h-full min-h-0">
                  <Card title="Datos (capturado + SAT + autorización)" subtitle="Vista pro • sin scroll de página" className="h-full">
                    <div className="mt-3 grid lg:grid-cols-3 gap-3">
                      <InfoCard
                        label="Capturado (Onboarding)"
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
                          { k: "Serie e.firma", v: mask(profile.companyCaptured?.efirmaSerial || "—") },
                        ]}
                      />

                      <InfoCard
                        label="SAT (Conector)"
                        rows={[
                          { k: "Razón social", v: satName },
                          { k: "RFC", v: satRFC },
                          { k: "Estado", v: satPill.label },
                          { k: "Verificado", v: profile.satIdentity?.verifiedAt ? formatUTC(profile.satIdentity.verifiedAt) : "—" },
                        ]}
                      />
                    </div>

                    <div className="mt-3 grid md:grid-cols-3 gap-3">
                      <VerifyCard
                        title="Match RFC"
                        ok={rfcMatch}
                        detail={rfcMatch === null ? "Pendiente: procesa SAT." : rfcMatch ? "RFC coincide." : "RFC NO coincide."}
                      />
                      <VerifyCard
                        title="Match Razón social"
                        ok={nameMatch}
                        detail={nameMatch === null ? "Pendiente: procesa SAT." : nameMatch ? "Razón social coincide." : "Razón social NO coincide."}
                      />
                      <VerifyCard
                        title="Autorización"
                        ok={hasAuthorization ? true : null}
                        detail={
                          hasAuthorization
                            ? `Firmada • ${authDate}`
                            : "Pendiente: completa autorización en onboarding."
                        }
                      />
                    </div>

                    <div className="mt-3 grid lg:grid-cols-2 gap-3">
                      {/* SAT actions */}
                      <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl p-4">
                        <div className="font-semibold text-black">Acciones SAT</div>
                        <div className="text-black/60 text-sm mt-1">
                          Carga CIEC/e.firma y procesa CFDI para facturación y validación.
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={openSatModal}
                            className="rounded-2xl bg-black text-white font-semibold px-4 py-2.5 hover:opacity-95 transition text-sm"
                          >
                            Cargar archivos SAT
                          </button>
                          <button
                            onClick={processSatMock}
                            className="rounded-2xl border border-black/10 bg-white/70 px-4 py-2.5 hover:bg-white transition text-sm"
                          >
                            Procesar (mock)
                          </button>
                          <button
                            onClick={clearSat}
                            className="rounded-2xl border border-black/10 bg-white/70 px-4 py-2.5 hover:bg-white transition text-sm"
                          >
                            Limpiar SAT
                          </button>
                        </div>

                        <div className="mt-2 text-[11px] text-black/45">
                          En prod: storage + job + polling + evidencias.
                        </div>
                      </div>

                      {/* Autorización detail */}
                      <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-black">Autorización firmada</div>
                          <span
                            className={[
                              "rounded-full border px-3 py-1 text-[11px]",
                              hasAuthorization
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                                : "border-black/10 bg-black/5 text-black/60",
                            ].join(" ")}
                          >
                            {hasAuthorization ? "Firmada" : "Pendiente"}
                          </span>
                        </div>

                        <div className="mt-3 text-sm">
                          <div className="text-black/60 text-xs">DG</div>
                          <div className="font-semibold truncate">{auth.directorName || "—"}</div>
                          <div className="text-black/55 text-xs truncate">{auth.directorEmail || "—"}</div>
                          <div className="text-black/45 text-[11px] mt-1">Fecha: {authDate}</div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!hasAuthorization}
                            onClick={printAuthorization}
                            className="rounded-2xl bg-black text-white font-semibold px-3.5 py-2 text-xs hover:opacity-95 transition disabled:opacity-50"
                          >
                            Descargar PDF
                          </button>
                          <div className="text-[11px] text-black/45">Print → PDF</div>
                        </div>

                        <div className="mt-2 text-[11px] text-black/45">
                          En prod: firma electrónica avanzada + acuse.
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* SOLICITUDES */}
              {tab === "solicitudes" && (
                <div className="h-full min-h-0">
                  <Card title="Solicitudes de crédito" subtitle="Tabla + iniciar solicitud" className="h-full">
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-sm text-black/60">
                        Regla: <span className="font-semibold text-black">1 solicitud activa</span> hasta autorizado/fondeado.
                      </div>

                      <button
                        onClick={goNewRequest}
                        disabled={!hasAuthorization}
                        className="rounded-2xl bg-black text-white font-semibold px-4 py-2.5 hover:opacity-95 transition disabled:opacity-50 text-sm"
                        title={!hasAuthorization ? "Requiere autorización firmada para iniciar" : undefined}
                      >
                        Iniciar solicitud
                      </button>
                    </div>

                    {!hasAuthorization && (
                      <div className="mt-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-800 px-4 py-3 text-sm">
                        Falta autorización firmada. Completa onboarding/Autorización para habilitar solicitudes.
                      </div>
                    )}

                    <div className="mt-3 rounded-3xl border border-black/10 bg-white/70 backdrop-blur-xl overflow-hidden">
                      <div className="grid grid-cols-[140px_1fr_140px_120px_120px] gap-3 px-4 py-3 border-b border-black/10 text-[11px] uppercase tracking-wider text-black/55">
                        <div>ID</div>
                        <div>Propósito</div>
                        <div>Monto</div>
                        <div>Plazo</div>
                        <div>Estatus</div>
                      </div>

                      <div className="max-h-[260px] overflow-y-auto">
                        {requests.length === 0 ? (
                          <div className="px-4 py-6 text-sm text-black/60">Aún no hay solicitudes.</div>
                        ) : (
                          requests.map((r) => (
                            <div
                              key={r.id}
                              className="grid grid-cols-[140px_1fr_140px_120px_120px] gap-3 px-4 py-3 border-b border-black/5 text-sm"
                            >
                              <div className="font-semibold">{r.id}</div>
                              <div className="text-black/70 truncate">{r.purpose}</div>
                              <div className="font-semibold">${r.amountMXN.toLocaleString("es-MX")} MXN</div>
                              <div className="text-black/70">{r.termMonths}m</div>
                              <div>
                                <StatusPill status={r.status} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] text-black/45">
                      Siguiente: pantalla <b>/solicitudes/nueva</b> + tabla Supabase <b>credit_requests</b>.
                    </div>
                  </Card>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-black/40">
              <span>© {new Date().getFullYear()} Plinius</span>
              <span className="text-black/30">plinius</span>
            </div>
          </section>
        </div>
      </div>

      {/* ===========================
          SAT MODAL (placeholder)
          =========================== */}
      {satModalOpen && (
        <Modal
          title="Cargar SAT (CIEC / e.firma)"
          subtitle="Placeholder estilo Syntage: sube .cer y .key o captura CIEC. Backend lo hacemos con /api/sat/upload."
          onClose={() => setSatModalOpen(false)}
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
              <div className="font-semibold text-black">Opción 1: e.firma</div>
              <div className="text-black/60 text-sm mt-1">Sube tu archivo .cer y .key.</div>

              <div className="mt-3 grid md:grid-cols-2 gap-3">
                <FilePick
                  label=".cer"
                  accept=".cer"
                  onPick={(f) => setSatFiles((s) => ({ ...s, cer: f }))}
                  picked={satFiles.cer?.name || ""}
                />
                <FilePick
                  label=".key"
                  accept=".key"
                  onPick={(f) => setSatFiles((s) => ({ ...s, key: f }))}
                  picked={satFiles.key?.name || ""}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/70 p-4">
              <div className="font-semibold text-black">Opción 2: CIEC</div>
              <div className="text-black/60 text-sm mt-1">Captura tu contraseña CIEC (demo).</div>
              <input
                type="password"
                value={satFiles.ciec || ""}
                onChange={(e) => setSatFiles((s) => ({ ...s, ciec: e.target.value }))}
                className="mt-3 w-full rounded-2xl bg-white border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/25"
                placeholder="CIEC (demo)"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSatModalOpen(false)}
                className="rounded-2xl border border-black/10 bg-white/70 px-4 py-2.5 hover:bg-white transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={submitSatFilesPlaceholder}
                className="rounded-2xl bg-black text-white font-semibold px-4 py-2.5 hover:opacity-95 transition text-sm"
              >
                Guardar (placeholder)
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===========================
          PRINT-ONLY: REPORTE (2 hojas)
          =========================== */}
      <section className="print-only print-report hidden">
        <div style={{ padding: 28, fontFamily: "Arial, Helvetica, sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#2B1B55" }}>Reporte Ejecutivo • Plinius</div>
            <div style={{ fontSize: 12, color: "#444" }}>{updatedDate}</div>
          </div>

          <div style={{ marginTop: 8, fontSize: 11, color: "#666" }}>
            Documento placeholder. En producción: SAT/CFDI + Buró + evidencias + firma.
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <InfoBlockPrint label="Razón social" value={capturedName} />
            <InfoBlockPrint label="RFC" value={capturedRFC} />
            <InfoBlockPrint label="SAT Razón social" value={satName} />
            <InfoBlockPrint label="SAT RFC" value={satRFC} />
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Score Buró</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 42, color: "#111" }}>{profile.buroScore}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{scoreBand.label}</div>
              </div>
              <div style={{ fontSize: 12, color: "#222", lineHeight: 1.55 }}>
                • <b>Recomendación:</b> {scoreBand.reco}
                <br />• <b>Nota:</b> {scoreBand.note}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <GaugePrint score={profile.buroScore} />
            </div>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ fontSize: 12, color: "#222", lineHeight: 1.55 }}>
            <div>• <b>Facturación promedio mensual:</b> ${avgVal.toLocaleString("es-MX")} MXN</div>
            <div>• <b>YoY:</b> {yoy === null ? "N/D" : `${yoy >= 0 ? "+" : ""}${yoy}%`}</div>
            <div>• <b>Estabilidad:</b> {stability.pct}% ({stability.label})</div>
            <div>• <b>SAT:</b> {satConnected ? "Conectado" : satPill.label}</div>
            <div>• <b>Autorización:</b> {hasAuthorization ? "Firmada" : "Pendiente"}</div>
          </div>

          <div className="page-break" />

          <div style={{ fontWeight: 900, fontSize: 16, color: "#2B1B55" }}>Detalle • Ingresos + Verificación</div>
          <div style={{ marginTop: 6, fontSize: 11, color: "#666" }}>
            Hoja 2: facturación 24 meses + verificación SAT + autorización.
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>Facturación (24 meses)</div>
          <RevenueChartPrint data={revenue} maxVal={maxVal} />
          <div style={{ marginTop: 6, fontSize: 11, color: "#666" }}>
            Máx: ${maxVal.toLocaleString("es-MX")} • Prom: ${avgVal.toLocaleString("es-MX")}
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <InfoBlockPrint label="Autorización" value={hasAuthorization ? `Firmada (${authDate})` : "Pendiente"} />
            <InfoBlockPrint label="DG (correo)" value={auth.directorEmail || "—"} />
          </div>

          <div style={{ marginTop: 12, fontSize: 10.5, color: "#666", lineHeight: 1.5 }}>
            Nota: reporte placeholder. En prod: evidencia SAT (constancia), logs, hash, acuse y auditoría.
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
            <div><b>Correo:</b> {auth.directorEmail || "—"}</div>
            <div><b>Acepta T&amp;C:</b> {auth.acceptedTerms ? "Sí" : "No"}</div>
            <div><b>Fecha:</b> {auth.acceptedAt ? formatUTC(auth.acceptedAt) : "—"}</div>
          </div>

          <hr style={{ margin: "14px 0" }} />

          <div style={{ fontSize: 11, color: "#666" }}>
            Documento borrador. En producción se integrará firma y acuse.
          </div>
        </div>
      </section>
    </main>
  );
}

/* =========================
   UI Components
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
        {active && <span className="h-2 w-2 rounded-full bg-[#6D28D9]" />}
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

function StatusPill({ status }: { status: CreditRequest["status"] }) {
  const map: Record<CreditRequest["status"], { label: string; cls: string }> = {
    draft: { label: "Borrador", cls: "border-black/10 bg-black/5 text-black/70" },
    submitted: { label: "Enviado", cls: "border-blue-500/20 bg-blue-500/10 text-blue-700" },
    authorized: { label: "Autorizado", cls: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" },
    funded: { label: "Fondeado", cls: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" },
    rejected: { label: "Rechazado", cls: "border-red-500/20 bg-red-500/10 text-red-700" },
  };
  const x = map[status];
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] ${x.cls}`}>{x.label}</span>;
}

/* =========================
   Modal + File input
   ========================= */

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-black/10 bg-white shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-black/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-black text-lg truncate">{title}</div>
              <div className="text-black/60 text-sm mt-1">{subtitle}</div>
            </div>
            <button
              onClick={onClose}
              className="rounded-2xl border border-black/10 bg-white px-3 py-2 hover:bg-black/5 transition text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function FilePick({
  label,
  accept,
  picked,
  onPick,
}: {
  label: string;
  accept: string;
  picked: string;
  onPick: (f: File | null) => void;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="text-black/60 text-xs">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="text-sm text-black truncate">{picked || "Sin archivo"}</div>
        <label className="cursor-pointer rounded-2xl bg-black text-white font-semibold px-3 py-2 text-xs hover:opacity-95 transition">
          Seleccionar
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] || null)}
          />
        </label>
      </div>
      <div className="mt-2 text-[11px] text-black/45">*En prod: se sube a Storage y se procesa server-side.</div>
    </div>
  );
}

/* =========================
   Print Components
   ========================= */

function InfoBlockPrint({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#666" }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 13, color: "#111" }}>{value}</div>
    </div>
  );
}

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
            <rect x={x} y={y} width={barW} height={Math.max(2, h)} rx="6" fill="#6D28D9" />
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

      <g transform={`translate(160 160) rotate(${angle})`}>
        <line x1="0" y1="0" x2="92" y2="0" stroke="rgba(0,0,0,0.82)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="0" cy="0" r="8" fill="rgba(0,0,0,0.82)" />
      </g>

      <text x="160" y="182" textAnchor="middle" fill="rgba(0,0,0,0.60)" fontSize="12">
        Score 100–900
      </text>
    </svg>
  );
}

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
        </defs>

        <path d="M 40 160 A 120 120 0 0 1 280 160" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="18" strokeLinecap="round" />
        <path d="M 40 160 A 120 120 0 0 1 280 160" fill="none" stroke="url(#rg)" strokeWidth="14" strokeLinecap="round" />

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

/* =========================
   Helpers
   ========================= */

function safeJson(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeRevenue24(rev?: RevenuePoint[]) {
  const revRaw = Array.isArray(rev) ? rev : [];
  const rev24: RevenuePoint[] =
    revRaw.length >= 24 ? revRaw.slice(0, 24) : [...revRaw, ...FALLBACK_24.slice(0, 24 - revRaw.length)];
  return rev24;
}

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

function mask(s: string) {
  const x = (s || "").trim();
  if (!x || x === "—") return "—";
  if (x.length <= 6) return "••••";
  return `${x.slice(0, 3)}••••${x.slice(-3)}`;
}
