"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { setSession } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hint = useMemo(() => "Admin: /admin/login", []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail.length < 5 || !cleanEmail.includes("@")) {
      setLoading(false);
      setError("Correo inválido.");
      return;
    }
    if (password.length < 6) {
      setLoading(false);
      setError("Contraseña muy corta.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setLoading(false);

    if (error || !data.user) {
      setError(error?.message ?? "No se pudo iniciar sesión.");
      return;
    }

    setSession({
      role: "client",
      email: cleanEmail,
      customerId: data.user.id,
      createdAt: new Date().toISOString(),
    });

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="h-screen overflow-hidden bg-[#05070D]">
      <style jsx global>{`
        html,
        body {
          height: 100%;
          overflow: hidden;
          overscroll-behavior: none;
        }
      `}</style>

      <div className="h-full grid lg:grid-cols-2">
        {/* LEFT */}
        <section className="relative min-h-0 overflow-hidden px-8 py-10 flex items-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_15%_20%,rgba(0,229,153,0.18),transparent_55%),radial-gradient(800px_520px_at_85%_30%,rgba(59,130,246,0.16),transparent_58%),radial-gradient(700px_520px_at_55%_92%,rgba(99,102,241,0.10),transparent_60%)]" />
            <div className="absolute inset-0 opacity-[0.10] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.18),transparent_40%)]" />
            <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-[#00E599]/10 blur-3xl" />
            <div className="absolute -right-20 top-40 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-xl min-h-0">
            {/* ✅ logo sin caja (no se deforma) */}
            <div className="flex items-center gap-3">
              <img
                src="/plinius.png"
                alt="Plinius"
                className="h-10 w-auto object-contain select-none"
                draggable={false}
              />
              <div className="leading-tight">
                <div className="text-white text-[16px] font-semibold tracking-tight">
                  Plinius
                </div>
                <div className="text-white/55 text-[12px]">Credit OS</div>
              </div>
            </div>

            <div className="mt-10">
              <div className="text-white/70 text-[12px] font-semibold tracking-wide">
                PRIVATE CREDIT INFRA
              </div>
              <h1 className="mt-3 text-white text-[34px] md:text-[42px] leading-[1.05] font-semibold tracking-tight">
                Underwrite.
                <span className="text-[#00E599]"> Monitor.</span>
                <span className="text-white/90"> Report.</span>
              </h1>
              <p className="mt-4 text-white/65 text-[13px] max-w-[52ch]">
                Consola para otorgantes: portafolio, señales de riesgo y reportes
                en minutos.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <MiniStep n="1" text="Regístrate" />
              <Dot />
              <MiniStep n="2" text="Activa plan" />
              <Dot />
              <MiniStep n="3" text="Opera créditos" />
            </div>

            <div className="mt-10 text-[11px] text-white/40">
              © {new Date().getFullYear()} Plinius · {hint}
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="relative min-h-0 overflow-hidden bg-[#F6F8FC] px-8 py-10 flex items-center justify-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_10%,rgba(0,229,153,0.10),transparent_60%)]" />
          </div>

          <div className="relative z-10 w-full max-w-md min-h-0">
            <div className="mb-3 flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-[12px] font-semibold text-black/70 hover:text-black hover:bg-white transition"
              >
                <span className="opacity-70">←</span> Inicio
              </Link>

              <Link
                href="/admin/login"
                className="text-[12px] font-semibold text-black/60 hover:text-black transition"
              >
                Admin
              </Link>
            </div>

            <div className="rounded-[28px] border border-black/10 bg-white shadow-[0_30px_90px_rgba(2,6,23,0.12)] p-7">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-semibold tracking-tight text-slate-900">
                    Iniciar sesión
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-600">
                    Accede a tu consola.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-800 ring-1 ring-slate-200/70">
                  <span className="h-2 w-2 rounded-full bg-[#00E599]" />
                  Live
                </span>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-[12px] font-semibold text-slate-700">
                    Correo
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="correo@empresa.com"
                    className="h-[46px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-[14px] text-slate-900 outline-none focus:ring-2 focus:ring-[#00E599]/25 focus:border-[#00E599]/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-semibold text-slate-700">
                    Contraseña
                  </label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-[46px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-[14px] text-slate-900 outline-none focus:ring-2 focus:ring-[#00E599]/25 focus:border-[#00E599]/40"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-800">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-[46px] w-full rounded-2xl bg-[#071A3A] text-white text-[14px] font-semibold hover:opacity-95 transition disabled:opacity-60 shadow-[0_14px_40px_rgba(7,26,58,0.18)]"
                >
                  {loading ? "Validando..." : "Entrar"}
                </button>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">Nuevo aquí?</span>
                  <Link
                    href="/register"
                    className="text-[12px] font-semibold text-slate-900 hover:underline"
                  >
                    Crear cuenta
                  </Link>
                </div>
              </form>

              <div className="mt-5 text-[11px] text-slate-400">
                Security-first · Supabase Auth
              </div>
            </div>

            <div className="mt-4 text-center text-[11px] text-slate-500">
              Plinius · private credit tooling
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MiniStep({ n, text }: { n: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-2 text-[12px] font-semibold text-white/85 ring-1 ring-white/12">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-[#00E599]/14 ring-1 ring-[#00E599]/25 text-[11px] font-black text-white">
        {n}
      </span>
      {text}
    </span>
  );
}

function Dot() {
  return <span className="h-1 w-1 rounded-full bg-white/30" />;
}