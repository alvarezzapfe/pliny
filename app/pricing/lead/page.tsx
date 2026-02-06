"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Lead = {
  plan: "basic" | "pro";
  company: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: string;
};

export default function LeadPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const plan = (sp.get("plan") || "basic") as "basic" | "pro";

  const meta = useMemo(() => {
    return plan === "pro"
      ? { title: "Pro", price: "$500", scans: "Ilimitados", accent: "text-indigo-700" }
      : { title: "Basic", price: "$70", scans: "Hasta 10", accent: "text-sky-700" };
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
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const raw = localStorage.getItem("bcl_leads");
    const arr: Lead[] = raw ? safeParse(raw, []) : [];
    arr.unshift(payload);
    localStorage.setItem("bcl_leads", JSON.stringify(arr));

    setDone(true);
  };

  return (
    <main className="min-h-screen burocrowd-bg px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        {/* CARD BLANCA */}
        <div className="rounded-3xl bg-white shadow-[0_24px_70px_rgba(0,0,0,.22)] overflow-hidden">
          {/* Header */}
          <header className="px-6 pt-6 pb-4 border-b border-black/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src="/crowdlink-logo.png" alt="Crowdlink" className="h-9 w-auto" />
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-black leading-tight truncate">
                    Solicitud de integración
                  </div>
                  <div className="mt-0.5 text-xs text-black/60 truncate">
                    Plan <span className={`font-semibold ${meta.accent}`}>{meta.title}</span> • {meta.price}/mes •{" "}
                    {meta.scans} scans
                  </div>
                </div>
              </div>

              <button
                onClick={() => router.push("/")}
                className="shrink-0 rounded-2xl border border-black/10 bg-white px-3.5 py-2 text-sm font-semibold text-black hover:bg-black/5 transition"
              >
                Volver
              </button>
            </div>
          </header>

          {/* Body */}
          <div className="px-6 py-6">
            {!done ? (
              <>
                <div className="text-sm text-black/70">
                  Déjanos tus datos y el equipo te contacta para integrar la API.
                </div>

                <div className="mt-5 grid gap-3">
                  <Field label="Empresa" value={company} onChange={setCompany} placeholder="Razón social" />
                  <Field label="Nombre" value={name} onChange={setName} placeholder="Nombre y apellidos" />
                  <Field label="Correo" value={email} onChange={setEmail} placeholder="correo@empresa.com" type="email" />
                  <Field label="Teléfono (opcional)" value={phone} onChange={setPhone} placeholder="+52 55 ..." />
                  <Field label="Notas (opcional)" value={notes} onChange={setNotes} placeholder="Caso de uso / volumen" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={submit}
                    className="rounded-2xl bg-black text-white font-semibold py-3 hover:opacity-95 transition"
                  >
                    Enviar
                  </button>

                  <button
                    onClick={() => router.push("/admin/login")}
                    className="rounded-2xl border border-black/10 bg-white text-black font-semibold py-3 hover:bg-black/5 transition"
                  >
                    Demo admin
                  </button>
                </div>

                <div className="mt-4 text-[11px] text-black/45">
                  Demo: se guarda en localStorage. Luego lo conectamos a DB + notificación.
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-5">
                <div className="text-black font-semibold">Listo ✅</div>
                <div className="mt-1 text-sm text-black/70">
                  Recibimos tu solicitud. Te contactaremos para integrar.
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push("/admin/login")}
                    className="rounded-2xl bg-black text-white font-semibold py-3 hover:opacity-95 transition"
                  >
                    Ver en admin
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="rounded-2xl border border-black/10 bg-white text-black font-semibold py-3 hover:bg-black/5 transition"
                  >
                    Volver
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className="px-6 py-4 border-t border-black/10 flex items-center justify-between text-[11px] text-black/50">
            <span>© {new Date().getFullYear()} burocrowdlink</span>
            <span className="text-black/35">Empresa hermana de Crowdlink</span>
          </footer>
        </div>
      </div>
    </main>
  );
}

/* ---------- UI ---------- */

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
      <label className="block text-[11px] font-medium text-black/70 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl bg-white border border-black/10 text-black px-3 py-2.5 text-sm outline-none focus:border-black/25 focus:ring-2 focus:ring-black/10"
      />
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
