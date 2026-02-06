"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
    phone?: string;
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

  // ---- Empresa ----
  const [companyName, setCompanyName] = useState("");
  const [rfc, setRfc] = useState("");
  const [activity, setActivity] = useState("");
  const [incDate, setIncDate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [efirmaSerial, setEfirmaSerial] = useState("");

  // ---- Autorización ----
  const [directorName, setDirectorName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const exitOnboarding = () => {
    // opcional: limpiar sesión o solo salir
    // localStorage.removeItem("bcl_session");
    window.location.href = "/";
  };

  const safeJson = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const persist = (patch?: Partial<Profile>) => {
    const raw = localStorage.getItem("burocrowdlink_profile");
    let current: Profile = EMPTY_PROFILE;

    const parsed = safeJson(raw);
    if (parsed) current = { ...EMPTY_PROFILE, ...parsed };

    const next: Profile = {
      ...current,
      updatedAt: new Date().toISOString(),
      companyCaptured: {
        ...(current.companyCaptured || {}),
        companyName: companyName || current.companyCaptured?.companyName || "—",
        rfc: rfc || current.companyCaptured?.rfc || "—",
        activity: activity || current.companyCaptured?.activity || "",
        incorporationDate: incDate || current.companyCaptured?.incorporationDate || "",
        email: email || current.companyCaptured?.email || "",
        phone: phone || current.companyCaptured?.phone || "",
        efirmaSerial: efirmaSerial || current.companyCaptured?.efirmaSerial || "",
      },
      authorization: {
        ...(current.authorization || {}),
        ...(patch?.authorization || {}),
      },
      ...patch,
    };

    localStorage.setItem("burocrowdlink_profile", JSON.stringify(next));
    return next;
  };

  const onNext = () => {
    // guarda en cada avance
    persist();

    if (step.id === "autorizacion") {
      if (!acceptTerms) return alert("Debes aceptar Términos y Condiciones.");
      if (!directorName.trim()) return alert("Ingresa nombre y apellidos del Director General.");
      if (!directorEmail.trim()) return alert("Ingresa el correo del Director General.");

      persist({
        authorization: {
          directorName: directorName.trim(),
          directorEmail: directorEmail.trim(),
          acceptedTerms: true,
          acceptedAt: new Date().toISOString(),
        },
      });

      router.push("/dashboard");
      return;
    }

    go(i + 1);
  };

  const onBack = () => go(i - 1);

  // ---- PDF (print-to-pdf) ----
  const downloadAuthorizationPDF = () => {
    // se imprime la sección "print-only"
    window.print();
  };

  // Texto dinámico
  const rs = companyName.trim() || "__________";
  const rf = rfc.trim() || "__________";
  const dg = directorName.trim() || "__________";

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
                <img src="/crowdlink-logo.png" alt="Crowdlink" className="h-9 w-auto" />
                <div className="min-w-0">
                  <div className="text-white font-semibold leading-tight truncate">burocrowdlink</div>
                  <div className="text-white/65 text-sm truncate">Onboarding persona moral</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-white/75 text-[11px]">Progreso</div>
                  <div className="text-white font-semibold text-sm">{pct}%</div>
                </div>

                {/* ✅ Botón Salir */}
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
                      active ? "border-white/30 bg-white/15 text-white" : "border-white/15 bg-white/5 text-white/80",
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

              <div className="mt-3 text-white/55 text-xs">Box fijo: sin scroll “de página”.</div>
            </aside>

            {/* Content */}
            <section className="px-4 md:px-8 py-4 md:py-6">
              <div className="rounded-3xl border border-white/12 bg-black/20 p-4 md:p-5">
                {/* BOX FIJO: compacto, sin scroll exterior */}
                <div className="rounded-3xl border border-white/10 bg-white/5 h-[380px] md:h-[420px] lg:h-[440px] overflow-hidden">
                  {/* scroll interno controlado */}
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
                          <Field label="Razón social" placeholder="Ej. PorCuanto S.A. de C.V." value={companyName} onChange={setCompanyName} />
                          <Field label="RFC" placeholder="AAAA010101AAA" value={rfc} onChange={setRfc} />
                          <Field label="Giro / Actividad" placeholder="Ej. Servicios financieros" value={activity} onChange={setActivity} />
                          <Field label="Fecha de constitución" placeholder="YYYY-MM-DD" type="date" value={incDate} onChange={setIncDate} />
                          <Field label="Correo" placeholder="contacto@empresa.com" type="email" value={email} onChange={setEmail} />
                          <Field label="Teléfono" placeholder="+52 55 ..." value={phone} onChange={setPhone} />

                          <div className="md:col-span-2">
                            <Field
                              label="No. de Serie de la e.firma"
                              placeholder="Ej. 3082010A02..."
                              value={efirmaSerial}
                              onChange={setEfirmaSerial}
                            />
                            <div className="mt-1 text-[11px] text-white/55">
                              Riesgo: bajo–medio. No revela la llave, pero es un identificador. En producción: enmascarar (últimos 4),
                              no loguearlo, y cifrar en reposo.
                            </div>
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
                          onSaved={(payload) => {
                            const merged: Profile = {
                              ...payload,
                              companyCaptured: {
                                companyName: companyName.trim() || "—",
                                rfc: rfc.trim() || "—",
                                activity: activity.trim(),
                                incorporationDate: incDate.trim(),
                                email: email.trim(),
                                phone: phone.trim(),
                                efirmaSerial: efirmaSerial.trim(),
                              },
                            };
                            localStorage.setItem("burocrowdlink_profile", JSON.stringify(merged));
                            persist(); // refuerza
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
                              <span className="text-white font-semibold">{rf}</span>, autorizo para celebrar las operaciones
                              de financiamiento colectivo con Crowdlink (PorCuanto S.A. de C.V., Institución de Financiamiento
                              Colectivo), que es una ITF regulada y supervisada por la Comisión Nacional Bancaria y de Valores en
                              México.
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-2.5">
                            <Field
                              label="Nombre y apellidos del Director General"
                              placeholder="Ej. Luis Armando Alvarez Zapfe"
                              value={directorName}
                              onChange={(v) => {
                                setDirectorName(v);
                                persist({
                                  authorization: {
                                    ...(safeJson(localStorage.getItem("burocrowdlink_profile"))?.authorization || {}),
                                    directorName: v,
                                  },
                                });
                              }}
                            />
                            <Field
                              label="Correo del Director General (firma electrónica)"
                              placeholder="director@empresa.com"
                              type="email"
                              value={directorEmail}
                              onChange={(v) => {
                                setDirectorEmail(v);
                                persist({
                                  authorization: {
                                    ...(safeJson(localStorage.getItem("burocrowdlink_profile"))?.authorization || {}),
                                    directorEmail: v,
                                  },
                                });
                              }}
                            />
                          </div>

                          <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={acceptTerms}
                              onChange={(e) => {
                                setAcceptTerms(e.target.checked);
                                persist({ authorization: { acceptedTerms: e.target.checked } });
                              }}
                              className="mt-1 h-4 w-4 rounded border-white/30 bg-white/10"
                            />
                            <span className="text-white/80 text-sm">Acepto los Términos y Condiciones</span>
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                persist({
                                  authorization: {
                                    directorName: directorName.trim(),
                                    directorEmail: directorEmail.trim(),
                                    acceptedTerms: acceptTerms,
                                    acceptedAt: acceptTerms ? new Date().toISOString() : undefined,
                                  },
                                });
                                downloadAuthorizationPDF();
                              }}
                              className="rounded-2xl bg-white text-black font-semibold px-4 py-2.5 hover:opacity-90 transition"
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
                © {new Date().getFullYear()} Crowdlink • burocrowdlink
              </div>
            </section>
          </div>

          {/* PRINT-ONLY AUTORIZACIÓN */}
          <section className="print-only hidden">
            <div style={{ padding: 32, fontFamily: "Arial, Helvetica, sans-serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Autorización • burocrowdlink</div>
                <div style={{ fontSize: 12, color: "#444" }}>{new Date().toISOString().slice(0, 10)}</div>
              </div>

              <hr style={{ margin: "16px 0" }} />

              <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                Yo, <b>{dg}</b>, como <b>DIRECTOR GENERAL</b> de la Empresa: <b>{rs}</b>, con RFC <b>{rf}</b>, autorizo para
                celebrar las operaciones de financiamiento colectivo con Crowdlink (PorCuanto S.A. de C.V., Institución de
                Financiamiento Colectivo), que es una ITF regulada y supervisada por la Comisión Nacional Bancaria y de Valores
                en México.
              </div>

              <div style={{ marginTop: 18, fontSize: 13 }}>
                <div><b>Nombre del Director General:</b> {directorName || "—"}</div>
                <div><b>Correo para firma electrónica:</b> {directorEmail || "—"}</div>
                <div><b>Acepta Términos y Condiciones:</b> {acceptTerms ? "Sí" : "No"}</div>
              </div>

              <hr style={{ margin: "16px 0" }} />

              <div style={{ fontSize: 11, color: "#666" }}>
                Este documento es un borrador generado por burocrowdlink. En producción se integrará firma electrónica y acuse.
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
}: {
  label: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] text-white/70 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
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

function BuroSatCompact({ onSaved }: { onSaved: (p: Profile) => void }) {
  const saveMockResult = () => {
    const payload: Profile = {
      updatedAt: new Date().toISOString(),
      revenueMonthlyMXN: make24MonthsMock(), // ✅ 24 meses
      buroScore: 742,
    };
    onSaved(payload);
    alert("Mock guardado ✅ Continúa a Autorización.");
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

          <button
            type="button"
            onClick={() => localStorage.removeItem("burocrowdlink_profile")}
            className="rounded-2xl border border-white/15 bg-white/5 text-white px-4 py-2.5 hover:bg-white/10 transition text-sm"
          >
            Limpiar mock
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/12 bg-black/20 p-4">
        <div className="text-white font-semibold text-sm">Resultado (placeholder)</div>
        <div className="mt-1 text-white/70 text-sm">
          Guarda el mock y luego ve a <span className="text-white font-semibold">Autorización</span>.
        </div>
      </div>
    </div>
  );
}
