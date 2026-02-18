/* app/onboarding/page.tsx */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type StepId = "empresa" | "documentos" | "buro_sat" | "autorizacion";
type Step = { id: StepId; title: string; subtitle: string };

type RevenuePoint = { month: string; value: number };

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
    phone?: string; // ejemplo: +52 5512345678
    efirmaSerial?: string;
  };

  authorization?: {
    directorName?: string;
    directorEmail?: string;
    acceptedTerms?: boolean;
    acceptedAt?: string;
  };
};

const EMPTY_PROFILE: Profile = {
  updatedAt: new Date(0).toISOString(),
  revenueMonthlyMXN: [],
  buroScore: 100,
  companyCaptured: {},
  authorization: {},
};

type CountryOpt = { iso: string; label: string; dial: string; flag: string };

const COUNTRIES: CountryOpt[] = [
  { iso: "MX", label: "México", dial: "+52", flag: "🇲🇽" },
  { iso: "US", label: "EE.UU.", dial: "+1", flag: "🇺🇸" },
  { iso: "CA", label: "Canadá", dial: "+1", flag: "🇨🇦" },
  { iso: "ES", label: "España", dial: "+34", flag: "🇪🇸" },
  { iso: "CO", label: "Colombia", dial: "+57", flag: "🇨🇴" },
  { iso: "AR", label: "Argentina", dial: "+54", flag: "🇦🇷" },
  { iso: "CL", label: "Chile", dial: "+56", flag: "🇨🇱" },
  { iso: "PE", label: "Perú", dial: "+51", flag: "🇵🇪" },
  { iso: "BR", label: "Brasil", dial: "+55", flag: "🇧🇷" },
];

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

function normalizeRFC(v: string) {
  return v
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9&Ñ]/g, "")
    .slice(0, 13);
}

function normalizeSerial(v: string) {
  return v
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 40);
}

function safeJson(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function make24MonthsMock(): RevenuePoint[] {
  const now = new Date();
  const points: RevenuePoint[] = [];
  for (let k = 23; k >= 0; k--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - k, 1));
    const m = d.toLocaleString("es-MX", { month: "short" }).replace(".", "");
    const yy = String(d.getUTCFullYear()).slice(2);

    const base = 420000;
    const wave = Math.round(140000 * Math.sin((k / 24) * Math.PI * 3));
    const noise = Math.round((Math.random() - 0.5) * 60000);
    const value = Math.max(0, base + wave + noise);

    points.push({ month: `${m} ${yy}`, value });
  }
  return points;
}

export default function OnboardingPage() {
  const router = useRouter();

  const steps: Step[] = useMemo(
    () => [
      { id: "empresa", title: "Empresa", subtitle: "Datos fiscales básicos" },
      { id: "documentos", title: "Documentos", subtitle: "Expediente" },
      { id: "buro_sat", title: "Buró / SAT", subtitle: "Conector + facturación" },
      { id: "autorizacion", title: "Autorización", subtitle: "Consentimiento y firma" },
    ],
    []
  );

  const [i, setI] = useState(0);
  const step = steps[i];
  const pct = Math.round(((i + 1) / steps.length) * 100);
  const go = (next: number) => setI(Math.max(0, Math.min(steps.length - 1, next)));

  // Auth/User
  const [userId, setUserId] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  // localStorage key per-user (evita contaminar sesiones)
  const storageKey = useMemo(() => (userId ? `plinius_profile_${userId}` : "plinius_profile"), [userId]);

  // ---- Empresa ----
  const [companyName, setCompanyName] = useState("");
  const [rfc, setRfc] = useState("");
  const [activity, setActivity] = useState("");
  const [incDate, setIncDate] = useState("");
  const [email, setEmail] = useState("");

  // Teléfono
  const [phoneCountry, setPhoneCountry] = useState<CountryOpt>(COUNTRIES[0]);
  const [phone10, setPhone10] = useState("");
  const fullPhone = `${phoneCountry.dial} ${phone10}`.trim();

  const [efirmaSerial, setEfirmaSerial] = useState("");

  // ---- Autorización ----
  const [directorName, setDirectorName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const hydratePhoneFromStored = (storedPhone?: string) => {
    if (!storedPhone) return;
    const m = storedPhone.trim().match(/^(\+\d{1,3})\s*([0-9]{10})$/);
    if (!m) return;
    const dial = m[1];
    const digits = m[2];
    const found = COUNTRIES.find((c) => c.dial === dial);
    if (found) setPhoneCountry(found);
    setPhone10(digits);
  };

  // ---- Supabase persistence ----
  const upsertProfile = async (profile: Profile, onboardingCompleted: boolean) => {
    if (!userId) return;

    const payload = {
      user_id: userId,
      onboarding_completed: onboardingCompleted,
      profile,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("plinius_profiles").upsert(payload, { onConflict: "user_id" });
    if (error) {
      // No bloqueamos UX por falla de red, pero sí logueamos
      console.warn("upsert plinius_profiles error:", error.message);
    }
  };

  const persist = async (patch?: Partial<Profile>) => {
    const raw = localStorage.getItem(storageKey);
    let current: Profile = EMPTY_PROFILE;

    const parsed = safeJson(raw);
    if (parsed) current = { ...EMPTY_PROFILE, ...parsed };

    // hidrata phone una vez si existía
    if (!phone10 && current.companyCaptured?.phone) {
      hydratePhoneFromStored(current.companyCaptured.phone);
    }

    const next: Profile = {
      ...current,
      updatedAt: new Date().toISOString(),
      companyCaptured: {
        ...(current.companyCaptured || {}),
        companyName: companyName || current.companyCaptured?.companyName || "",
        rfc: rfc || current.companyCaptured?.rfc || "",
        activity: activity || current.companyCaptured?.activity || "",
        incorporationDate: incDate || current.companyCaptured?.incorporationDate || "",
        email: email || current.companyCaptured?.email || "",
        phone: fullPhone || current.companyCaptured?.phone || "",
        efirmaSerial: efirmaSerial || current.companyCaptured?.efirmaSerial || "",
      },
      authorization: {
        ...(current.authorization || {}),
        ...(patch?.authorization || {}),
      },
      ...patch,
    };

    localStorage.setItem(storageKey, JSON.stringify(next));

    // guarda a Supabase (no completado todavía)
    await upsertProfile(next, false);

    return next;
  };

  const loadProfile = async () => {
    // 1) sesión
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id ?? null;

    if (!uid) {
      router.replace("/login");
      return;
    }
    setUserId(uid);

    // 2) DB: ver si ya completó onboarding
    const { data, error } = await supabase
      .from("plinius_profiles")
      .select("onboarding_completed, profile")
      .eq("user_id", uid)
      .maybeSingle();

    if (error) {
      console.warn("load plinius_profiles error:", error.message);
    }

    if (data?.onboarding_completed) {
      router.replace("/dashboard");
      return;
    }

    // 3) hidrata desde DB si existe, si no desde localStorage
    let base: Profile | null = (data?.profile as Profile) ?? null;
    if (!base) {
      const fromLs = safeJson(localStorage.getItem(`plinius_profile_${uid}`)) || safeJson(localStorage.getItem("plinius_profile"));
      base = fromLs ? ({ ...EMPTY_PROFILE, ...fromLs } as Profile) : null;
    }

    if (base?.companyCaptured) {
      setCompanyName(base.companyCaptured.companyName || "");
      setRfc(base.companyCaptured.rfc || "");
      setActivity(base.companyCaptured.activity || "");
      setIncDate(base.companyCaptured.incorporationDate || "");
      setEmail(base.companyCaptured.email || "");
      setEfirmaSerial(base.companyCaptured.efirmaSerial || "");
      hydratePhoneFromStored(base.companyCaptured.phone || "");
    }

    if (base?.authorization) {
      setDirectorName(base.authorization.directorName || "");
      setDirectorEmail(base.authorization.directorEmail || "");
      setAcceptTerms(!!base.authorization.acceptedTerms);
    }

    // asegúralo en LS por usuario
    if (base) localStorage.setItem(`plinius_profile_${uid}`, JSON.stringify(base));
    setBooting(false);
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exitOnboarding = () => {
    window.location.href = "/";
  };

  const downloadAuthorizationPDF = () => {
    window.print();
  };

  const onNext = async () => {
    // guarda en cada avance
    await persist();

    // pasos 1-3 NO bloquean
    if (step.id === "autorizacion") {
      if (!acceptTerms) return alert("Debes aceptar Términos y Condiciones.");
      if (!directorEmail.trim()) return alert("Ingresa el correo del Director General.");
      if (!isValidEmail(directorEmail.trim())) return alert("Correo del Director General inválido.");

      const finalProfile = await persist({
        authorization: {
          directorName: directorName.trim() || "",
          directorEmail: directorEmail.trim(),
          acceptedTerms: true,
          acceptedAt: new Date().toISOString(),
        },
      });

      // marca onboarding como completado
      await upsertProfile(finalProfile, true);

      router.push("/dashboard");
      return;
    }

    go(i + 1);
  };

  const onBack = () => go(i - 1);

  // Texto dinámico
  const rs = companyName.trim() || "__________";
  const rf = rfc.trim() || "__________";
  const dg = directorName.trim() || "__________";

  if (booting) {
    return (
      <main className="min-h-screen burocrowd-bg flex items-center justify-center">
        <div className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl px-6 py-4 text-white/80">
          Cargando onboarding…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen burocrowd-bg px-3 md:px-6 py-4 md:py-8">
      {/* Print CSS: imprime SOLO la autorización */}
      <style>{`
        @media print {
          .no-print { display:none !important; }
          .print-only { display:block !important; }
          body { background:#fff !important; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* TOP */}
          <header className="no-print px-4 md:px-8 py-4 md:py-5 border-b border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <img src="/plinius.png" alt="Plinius" className="h-9 w-auto" />
                <div className="min-w-0">
                  <div className="text-white font-semibold leading-tight truncate">Plinius</div>
                  <div className="text-white/65 text-sm truncate">Onboarding persona moral</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-white/75 text-[11px]">Progreso</div>
                  <div className="text-white font-semibold text-sm">{pct}%</div>
                </div>

                <button
                  type="button"
                  onClick={exitOnboarding}
                  className="rounded-2xl border border-white/15 bg-white/5 text-white px-4 py-2 text-sm hover:bg-white/10 transition"
                >
                  Salir
                </button>
              </div>
            </div>

            <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/80 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Tabs mobile compactos */}
            <div className="mt-3 lg:hidden flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
              {steps.map((s, idx) => {
                const active = idx === i;
                return (
                  <button
                    key={s.id}
                    onClick={() => go(idx)}
                    className={[
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs transition",
                      active
                        ? "border-white/30 bg-white/15 text-white"
                        : "border-white/15 bg-white/5 text-white/80",
                    ].join(" ")}
                  >
                    {s.title}
                  </button>
                );
              })}
            </div>
          </header>

          {/* BODY */}
          <div className="no-print grid lg:grid-cols-[280px_1fr]">
            {/* Rail desktop */}
            <aside className="hidden lg:block px-8 py-6 border-r border-white/10">
              <div className="text-white/70 text-[11px] uppercase tracking-wider">Secciones</div>

              <div className="mt-3 space-y-2">
                {steps.map((s, idx) => {
                  const active = idx === i;
                  const done = idx < i;
                  return (
                    <button
                      key={s.id}
                      onClick={() => go(idx)}
                      className={[
                        "w-full text-left rounded-2xl px-4 py-3 border transition",
                        active ? "border-white/25 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/8",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={[
                            "h-2.5 w-2.5 rounded-full",
                            done ? "bg-white/80" : active ? "bg-white/70" : "bg-white/30",
                          ].join(" ")}
                        />
                        <div className="min-w-0">
                          <div className="text-white font-semibold text-sm truncate">{s.title}</div>
                          <div className="text-white/60 text-xs truncate">{s.subtitle}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-white/65 text-xs">Empresa</div>
                <div className="mt-1 text-white font-semibold truncate">{rs}</div>
                <div className="text-white/60 text-xs truncate">{rf}</div>
              </div>

              <div className="mt-3 text-white/55 text-xs">
                Usuario: <span className="text-white/70">{userId?.slice(0, 8)}…</span>
              </div>
            </aside>

            {/* Content */}
            <section className="px-4 md:px-8 py-4 md:py-6">
              <div className="rounded-3xl border border-white/12 bg-black/20 p-4 md:p-5">
                {/* BOX FIJO */}
                <div className="rounded-3xl border border-white/10 bg-white/5 h-[380px] md:h-[420px] lg:h-[440px] overflow-hidden">
                  <div className="h-full overflow-y-auto px-4 md:px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h1 className="text-lg md:text-xl font-semibold text-white">{step.title}</h1>
                        <p className="mt-1 text-white/70 text-xs md:text-sm">{step.subtitle}</p>
                      </div>
                      <div className="text-white/60 text-xs pt-1">
                        {i + 1}/{steps.length}
                      </div>
                    </div>

                    <div className="mt-4">
                      {step.id === "empresa" && (
                        <div className="grid md:grid-cols-2 gap-2.5">
                          <Field
                            label="Razón social"
                            placeholder="Ej. Infraestructura en Finanzas AI, S.A.P.I. de C.V."
                            value={companyName}
                            onChange={setCompanyName}
                          />

                          <Field
                            label="RFC"
                            placeholder="AAAA010101AAA"
                            value={rfc}
                            onChange={(v) => setRfc(normalizeRFC(v))}
                            inputMode="text"
                            autoCapitalize="characters"
                          />

                          <Field
                            label="Giro / Actividad"
                            placeholder="Ej. Servicios financieros"
                            value={activity}
                            onChange={setActivity}
                          />

                          <Field
                            label="Fecha de constitución"
                            placeholder="YYYY-MM-DD"
                            type="date"
                            value={incDate}
                            onChange={setIncDate}
                          />

                          <Field
                            label="Correo"
                            placeholder="contacto@empresa.com"
                            type="email"
                            value={email}
                            onChange={(v) => setEmail(v.trim())}
                            inputMode="email"
                            autoCapitalize="none"
                          />

                          <PhoneField
                            label="Teléfono"
                            country={phoneCountry}
                            onCountryChange={setPhoneCountry}
                            digits={phone10}
                            onDigitsChange={setPhone10}
                          />

                          <div className="md:col-span-2">
                            <Field
                              label="No. de Serie de la e.firma"
                              placeholder="Ej. 3082010A02..."
                              value={efirmaSerial}
                              onChange={(v) => setEfirmaSerial(normalizeSerial(v))}
                              inputMode="text"
                              autoCapitalize="characters"
                            />
                          </div>
                        </div>
                      )}

                      {step.id === "documentos" && (
                        <div className="grid md:grid-cols-2 gap-2.5">
                          <DocMini title="Acta constitutiva" desc="PDF" />
                          <DocMini title="Constancia fiscal" desc="PDF" />
                          <DocMini title="Estados financieros" desc="PDF/Excel" />
                          <DocMini title="Identificación (apoderado)" desc="PDF/JPG" />
                        </div>
                      )}

                      {step.id === "buro_sat" && (
                        <BuroSatCompact
                          onSaved={async (payload) => {
                            // guardamos el mock en Profile y persistimos a Supabase
                            localStorage.setItem(storageKey, JSON.stringify(payload));
                            await upsertProfile(payload, false);
                            alert("Mock guardado ✅ Continúa a Autorización.");
                          }}
                        />
                      )}

                      {step.id === "autorizacion" && (
                        <div className="space-y-3">
                          <div className="rounded-3xl border border-white/12 bg-white/5 p-4">
                            <div className="text-white font-semibold text-sm">Texto de autorización</div>
                            <div className="mt-2 text-white/75 text-sm leading-relaxed">
                              Yo, <span className="text-white font-semibold">{dg}</span>, como{" "}
                              <span className="text-white font-semibold">DIRECTOR GENERAL</span> de la Empresa:{" "}
                              <span className="text-white font-semibold">{rs}</span>, con RFC{" "}
                              <span className="text-white font-semibold">{rf}</span>, autorizo a{" "}
                              <span className="text-white font-semibold">Plinius</span> para recabar, procesar y utilizar la
                              información necesaria para evaluar, estructurar y, en su caso, formalizar productos de financiamiento,
                              así como realizar verificaciones y conexiones a proveedores (por ejemplo, SAT/Buró) conforme a los
                              términos aplicables.
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-2.5">
                            <Field
                              label="Nombre del Director General (opcional)"
                              placeholder="Ej. Luis Armando Alvarez Zapfe"
                              value={directorName}
                              onChange={setDirectorName}
                            />
                            <Field
                              label="Correo del Director General (requerido)"
                              placeholder="director@empresa.com"
                              type="email"
                              value={directorEmail}
                              onChange={(v) => setDirectorEmail(v.trim())}
                              inputMode="email"
                              autoCapitalize="none"
                            />
                          </div>

                          <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={acceptTerms}
                              onChange={(e) => setAcceptTerms(e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10"
                            />
                            <span className="text-white/80 text-sm">Acepto los Términos y Condiciones</span>
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                // solo imprime, no finaliza
                                downloadAuthorizationPDF();
                              }}
                              className="rounded-2xl border border-white/15 bg-white/5 text-white px-4 py-2.5 hover:bg-white/10 transition"
                            >
                              Descargar autorización (PDF)
                            </button>
                            <div className="text-[11px] text-white/55 flex items-center">
                              *Se abre impresión → “Guardar como PDF”
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    onClick={onBack}
                    disabled={i === 0}
                    className="rounded-2xl border border-white/15 bg-white/5 text-white px-4 py-2.5 disabled:opacity-40"
                  >
                    Atrás
                  </button>

                  <button
                    onClick={onNext}
                    className="rounded-2xl bg-white text-black font-semibold px-5 py-2.5 hover:opacity-90 transition"
                  >
                    {step.id === "autorizacion" ? "Finalizar y ver dashboard" : "Continuar"}
                  </button>
                </div>
              </div>

              <div className="mt-3 text-[11px] text-white/50 text-center">
                © {new Date().getFullYear()} Plinius
              </div>
            </section>
          </div>

          {/* PRINT-ONLY AUTORIZACIÓN */}
          <section className="print-only hidden">
            <div style={{ padding: 32, fontFamily: "Arial, Helvetica, sans-serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Autorización • Plinius</div>
                <div style={{ fontSize: 12, color: "#444" }}>{new Date().toISOString().slice(0, 10)}</div>
              </div>

              <hr style={{ margin: "16px 0" }} />

              <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                Yo, <b>{dg}</b>, como <b>DIRECTOR GENERAL</b> de la Empresa: <b>{rs}</b>, con RFC <b>{rf}</b>, autorizo a{" "}
                <b>Plinius</b> para recabar, procesar y utilizar la información necesaria para evaluación crediticia y verificación.
              </div>

              <div style={{ marginTop: 18, fontSize: 13 }}>
                <div><b>Nombre del Director General:</b> {directorName || "—"}</div>
                <div><b>Correo:</b> {directorEmail || "—"}</div>
                <div><b>Acepta Términos:</b> {acceptTerms ? "Sí" : "No"}</div>
              </div>

              <hr style={{ margin: "16px 0" }} />

              <div style={{ fontSize: 11, color: "#666" }}>
                Documento generado por Plinius (borrador). En producción se integrará firma electrónica y acuse.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ---------- UI helpers ---------- */

function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  inputMode,
  autoCapitalize,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoCapitalize?: React.HTMLAttributes<HTMLInputElement>["autoCapitalize"];
}) {
  return (
    <div>
      <label className="block text-[11px] text-white/70 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        className="w-full rounded-2xl bg-black/35 border border-white/15 text-white px-3 py-2 outline-none focus:border-white/35 text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}

function DocMini({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-white/12 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white font-semibold text-sm truncate">{title}</div>
          <div className="text-white/60 text-xs mt-0.5">{desc}</div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-2xl bg-white text-black font-semibold px-3 py-2 text-xs hover:opacity-90 transition"
        >
          Subir
        </button>
      </div>
    </div>
  );
}

function PhoneField({
  label,
  country,
  onCountryChange,
  digits,
  onDigitsChange,
}: {
  label: string;
  country: CountryOpt;
  onCountryChange: (c: CountryOpt) => void;
  digits: string;
  onDigitsChange: (v: string) => void;
}) {
  const onDigits = (raw: string) => {
    const only = raw.replace(/\D/g, "").slice(0, 10);
    onDigitsChange(only);
  };

  return (
    <div>
      <label className="block text-[11px] text-white/70 mb-1">{label}</label>
      <div className="flex gap-2">
        <select
          value={country.iso}
          onChange={(e) => {
            const next = COUNTRIES.find((c) => c.iso === e.target.value) || COUNTRIES[0];
            onCountryChange(next);
          }}
          className="rounded-2xl bg-black/35 border border-white/15 text-white px-3 py-2 outline-none focus:border-white/35 text-sm"
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} {c.dial} {c.label}
            </option>
          ))}
        </select>

        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[0-9]{10}"
          maxLength={10}
          value={digits}
          onChange={(e) => onDigits(e.target.value)}
          placeholder="10 dígitos"
          className="w-full rounded-2xl bg-black/35 border border-white/15 text-white px-3 py-2 outline-none focus:border-white/35 text-sm"
        />
      </div>
    </div>
  );
}

function BuroSatCompact({ onSaved }: { onSaved: (p: Profile) => void }) {
  const saveMockResult = () => {
    const payload: Profile = {
      updatedAt: new Date().toISOString(),
      revenueMonthlyMXN: make24MonthsMock(),
      buroScore: 742,
      companyCaptured: {},
      authorization: {},
    };
    onSaved(payload);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-white/12 bg-white/5 p-4">
        <div className="text-white font-semibold text-sm">Conectar SAT / Buró (placeholder)</div>
        <div className="text-white/65 text-xs mt-1">
          Aquí va e.firma/CIEC + extracción CFDI para estimar facturación.
        </div>

        <div className="mt-3 grid md:grid-cols-2 gap-2.5">
          <Field label="RFC" placeholder="AAAA010101AAA" />
          <Field label="CIEC / e.firma" placeholder="••••••••" type="password" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={saveMockResult}
            className="rounded-2xl bg-white text-black font-semibold px-4 py-2.5 hover:opacity-90 transition text-sm"
          >
            Conectar y escanear (mock)
          </button>
        </div>
      </div>
    </div>
  );
}
