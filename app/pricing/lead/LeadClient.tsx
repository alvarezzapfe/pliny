"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Lead = {
  plan: "basic" | "pro";
  company: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  createdAt: string;
};

export default function LeadClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const plan = (sp.get("plan") || "basic") as "basic" | "pro";

  const meta = useMemo(() => {
    if (plan === "pro") {
      return {
        title: "Pro",
        price: "$500",
        scans: "Scans ilimitados",
        badge: "Prioritario",
        accent: "from-fuchsia-500 to-indigo-500",
        dot: "bg-fuchsia-500",
      };
    }
    return {
      title: "Basic",
      price: "$70",
      scans: "Hasta 10 scans",
      badge: "Starter",
      accent: "from-cyan-500 to-blue-500",
      dot: "bg-cyan-500",
    };
  }, [plan]);

  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!company.trim()) return alert("Empresa requerida.");
    if (!name.trim()) return alert("Nombre requerido.");
    if (!email.trim()) return alert("Correo requerido.");

    const payload: Lead = {
      plan,
      company: company.trim(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const raw = localStorage.getItem("bcl_leads");
    const arr: Lead[] = raw ? safeParse(raw, []) : [];
    arr.unshift(payload);
    localStorage.setItem("bcl_leads", JSON.stringify(arr));

    setDone(true);
  };

  const backHome = () => router.push("/");
  const goAdmin = () => router.push("/admin/login");

  return (
    <main className="min-h-screen burocrowd-bg px-4 py-6 md:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-[28px] bg-white shadow-[0_32px_120px_rgba(0,0,0,.22)] overflow-hidden border border-black/10">
          {/* TOP BLUE (dashboard blue) */}
          <div className="bg-[#0084FF] text-white">
            <div className={`h-1.5 bg-gradient-to-r ${meta.accent}`} />

            <header className="px-5 md:px-8 pt-5 pb-4">
              {/* grid header = nunca se enciman */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:items-start">
                {/* Left */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* LOGO EXACTO COMO DASHBOARD (sin caja, sin deformar) */}
                  <img
                    src="/plinius.png"
                    alt="Crowdlink"
                    className="h-9 w-auto shrink-0"
                    style={{ filter: "brightness(0) invert(1)" }}
                    draggable={false}
                  />

                  <div className="min-w-0">
                    <span className="text-[15px] md:text-[16px] font-semibold truncate">
                      Integración — burocrowdlink
                    </span>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] text-white/90">
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        Plan <span className="font-semibold text-white">{meta.title}</span>
                      </span>

                      <span className="text-[12px] text-white/85">
                        <span className="font-semibold text-white">{meta.price}</span>/mes • {meta.scans}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right */}
                <div className="flex sm:justify-end">
                  <button
                    onClick={backHome}
                    className="w-full sm:w-auto rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition"
                  >
                    Volver
                  </button>
                </div>
              </div>
            </header>
          </div>

          {/* Body */}
          <div className="px-5 md:px-8 py-6">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-4">
              {/* FORM */}
              <section className="rounded-3xl border border-black/10 bg-white p-5 md:p-6">
                <h1 className="text-[18px] md:text-[20px] font-semibold text-black leading-tight">
                  Datos de contacto
                </h1>
                <p className="mt-1 text-[13px] text-black/60">Te contactamos para integrar el demo.</p>

                <div className="mt-5 grid md:grid-cols-2 gap-3">
                  <Field label="Empresa" value={company} onChange={setCompany} placeholder="Razón social" />
                  <Field label="Nombre" value={name} onChange={setName} placeholder="Nombre y apellidos" />
                  <Field label="Correo" value={email} onChange={setEmail} placeholder="correo@empresa.com" type="email" />
                  <Field label="Teléfono" value={phone} onChange={setPhone} placeholder="+52 55 ..." />
                  <div className="md:col-span-2">
                    <Field
                      label="Notas (opcional)"
                      value={notes}
                      onChange={setNotes}
                      placeholder="Caso de uso / volumen / integración"
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={submit}
                    className={`rounded-2xl bg-gradient-to-r ${meta.accent} text-white font-semibold py-3 hover:opacity-95 transition`}
                  >
                    Enviar
                  </button>

                  <button
                    onClick={goAdmin}
                    className="rounded-2xl border border-black/10 bg-white text-black font-semibold py-3 hover:bg-black/5 transition"
                  >
                    Ver demo admin
                  </button>
                </div>

                {done && (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="text-emerald-800 font-semibold text-sm">Listo ✅</div>
                    <div className="mt-1 text-emerald-900/80 text-sm">
                      Guardado como demo en <span className="font-semibold">localStorage</span>.
                    </div>
                  </div>
                )}

                <div className="mt-4 text-[11px] text-black/45">Demo local. Luego DB + notificación.</div>
              </section>

              {/* PREVIEW */}
              <aside className="rounded-3xl border border-black/10 bg-black/[0.03] p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[12px] text-black/60">Preview</div>
                    <div className="text-[14px] font-semibold text-black">Vista admin</div>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] text-black/70">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    {meta.badge}
                  </span>
                </div>

                <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px] text-black/60">Solicitud</div>
                      <div className="text-[14px] font-semibold text-black truncate">
                        {company || "Empresa (pendiente)"}
                      </div>
                      <div className="mt-1 text-[12px] text-black/55">
                        Plan <span className="font-semibold text-black">{meta.title}</span> • {meta.price}/mes
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-black/45">Estado</div>
                      <div className="text-[12px] font-semibold text-black">{done ? "Recibida" : "Borrador"}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <Row k="Contacto" v={name || "—"} />
                    <Row k="Email" v={email || "—"} />
                    <Row k="Teléfono" v={phone || "—"} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-2xl bg-black text-white font-semibold py-2.5 text-sm hover:opacity-95 transition"
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border border-black/10 bg-white text-black font-semibold py-2.5 text-sm hover:bg-black/5 transition"
                    >
                      Pedir info
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-[11px] text-black/45 flex items-center justify-between">
                  <span>© {new Date().getFullYear()} burocrowdlink</span>
                  <span className="text-black/35">Demo</span>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------- bits ---------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-black/65 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-white border border-black/10 text-black px-3 py-2.5 text-sm outline-none
                   focus:border-black/25 focus:ring-2 focus:ring-black/10"
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-black/55 text-xs">{k}</div>
      <div className="text-black font-semibold text-sm truncate max-w-[65%] text-right">{v}</div>
    </div>
  );
}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
