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

  const hint = useMemo(
    () =>
      "Tip: si aún no tienes cuenta, regístrate. Admin entra en /admin/login.",
    []
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail.length < 5 || !cleanEmail.includes("@")) {
      setLoading(false);
      setError("Escribe un correo válido.");
      return;
    }
    if (password.length < 6) {
      setLoading(false);
      setError("La contraseña debe tener al menos 6 caracteres.");
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

    // Mantén tu sesión local para tu app (role client)
    setSession({
      role: "client",
      email: cleanEmail,
      customerId: data.user.id,
      createdAt: new Date().toISOString(),
    });

    router.push("/onboarding");
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* LEFT */}
      <section className="relative overflow-hidden burocrowd-loginLeft flex items-center justify-center px-8 py-14">
        <div className="pointer-events-none absolute inset-0">
          <span className="blob b1" />
          <span className="blob b2" />
          <span className="blob b3" />
          <span className="gridNoise" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="flex items-center gap-3">
            <img src="/plinius.png" alt="Plinius" className="h-14 w-auto" />
            <div className="text-white">
              <div className="text-xl font-semibold leading-tight">Plinius</div>
              <div className="text-sm text-white/70">Private Credit API</div>
            </div>
          </div>

          <h1 className="mt-12 text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Acceder
          </h1>

          <div className="mt-8 grid gap-3">
            <FeatureRow title="SAT/CFDI" desc="24m facturación" />
            <FeatureRow title="Risk signals" desc="Alertas" />
            <FeatureRow title="PDF" desc="Reporte ejecutivo" />
            <FeatureRow title="API" desc="Integración rápida" />
          </div>

          <div className="mt-10 text-xs text-white/55">
            © {new Date().getFullYear()} Plinius · Marca registrada.
          </div>
        </div>
      </section>

      {/* RIGHT */}
      <section className="burocrowd-loginRight flex items-center justify-center px-8 py-14">
        <div className="w-full max-w-md">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-black hover:bg-white transition"
            >
              <span className="opacity-80">←</span>
              Regresar a inicio
            </Link>

            <Link
              href="/admin/login"
              className="text-xs font-semibold text-black/70 hover:text-black transition"
              title="Acceso Admin"
            >
              Acceso Admin
            </Link>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/85 backdrop-blur-xl shadow-2xl p-8">
            <div className="text-black">
              <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
              <p className="mt-1 text-black/70 text-sm">
                Ingresa tus credenciales para continuar
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div>
                <label className="block text-sm text-black/70 mb-2">Correo</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="w-full rounded-2xl bg-white border border-black/10 text-black px-4 py-3 outline-none focus:border-black/30"
                  placeholder="correo@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm text-black/70 mb-2">Contraseña</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  className="w-full rounded-2xl bg-white border border-black/10 text-black px-4 py-3 outline-none focus:border-black/30"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 text-red-700 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-black text-white font-semibold py-3 px-4 hover:opacity-95 transition disabled:opacity-60"
              >
                {loading ? "Validando..." : "Entrar"}
              </button>

              {/* ✅ Registro */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-black/55">{hint}</div>
                <Link
                  href="/register"
                  className="text-xs font-semibold text-black hover:underline"
                >
                  ¿No tienes cuenta? Regístrate
                </Link>
              </div>
            </form>

            <div className="mt-6 text-xs text-black/50">
              © {new Date().getFullYear()} Plinius
            </div>
          </div>
        </div>
      </section>

      {/* CSS EXTRA */}
      <style jsx global>{`
        .plxFeat {
          display: grid;
          grid-template-columns: 20px 1fr;
          gap: 10px;
          padding: 12px 12px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(14px);
          box-shadow: 0 16px 60px rgba(0, 0, 0, 0.16);
        }
        .plxIcon {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.18);
          border: 1px solid rgba(34, 197, 94, 0.35);
          display: grid;
          place-items: center;
          margin-top: 1px;
          box-shadow: 0 0 18px rgba(34, 197, 94, 0.12);
        }
        .plxIcon svg {
          width: 13px;
          height: 13px;
          fill: none;
          stroke: rgba(187, 247, 208, 0.96);
          stroke-width: 2.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .plxFeatT {
          color: rgba(255, 255, 255, 0.92);
          font-weight: 900;
          font-size: 14px;
          line-height: 1.15;
          letter-spacing: 0.1px;
        }
        .plxFeatD {
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 12px;
          line-height: 1.35;
        }
      `}</style>
    </main>
  );
}

function FeatureRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="plxFeat">
      <div className="plxIcon" aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <div>
        <div className="plxFeatT">{title}</div>
        <div className="plxFeatD">{desc}</div>
      </div>
    </div>
  );
}
