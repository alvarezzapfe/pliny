/* app/admin/login/page.tsx
   Admin login (DEMO): deja entrar a cualquier correo válido.
   - Mantiene tu UI actual (left/right), solo quita isAdminEmail.
*/
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { setSession } from "@/lib/auth";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // demo: cualquier cosa
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hint = useMemo(
    () => "Demo: cualquier correo válido entra como Admin.",
    []
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const ok = email.trim().length > 3 && email.includes("@");

    await new Promise((r) => setTimeout(r, 250));
    setLoading(false);

    if (!ok) {
      setError("Escribe un correo válido.");
      return;
    }

    // DEMO: cualquier contraseña o vacío
    setSession({
      role: "admin",
      email: email.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      demo: true,
    });

    router.push("/admin/dashboard");
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
          <img src="/plinius.png" alt="Plinius" className="h-12 w-auto" />

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/80">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.7)]" />
            DEMO MODE
          </div>

          <h1 className="mt-6 text-4xl font-semibold text-white">Admin Console</h1>
          <p className="mt-3 text-white/75">
            Acceso para revisar usuarios, facturación y score.
          </p>

          <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-5">
            <div className="text-white/80 text-sm">
              • Vista global de usuarios
              <br />• Export y auditoría
              <br />• Trazabilidad SAT / Buró
            </div>
          </div>

          <div className="mt-8 text-xs text-white/60">
            © {new Date().getFullYear()} Plinius · Marca registrada.
          </div>
        </div>
      </section>

      {/* RIGHT */}
      <section className="burocrowd-loginRight flex items-center justify-center px-8 py-14">
        <div className="w-full max-w-md">
          {/* Top row */}
          <div className="mb-3 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-black hover:bg-white transition"
            >
              <span className="opacity-80">←</span>
              Regresar a inicio
            </Link>

            <Link
              href="/login"
              className="text-xs font-semibold text-black/70 hover:text-black transition"
              title="Login Cliente"
            >
              Login Cliente
            </Link>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/85 backdrop-blur-xl shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-black">Login Admin</h2>
            <p className="mt-1 text-sm text-black/70">
              Demo: cualquier correo válido entra.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-black/70 mb-2">Correo</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  className="w-full rounded-2xl bg-white border border-black/10 text-black px-4 py-3 outline-none focus:border-black/30"
                  placeholder="admin@demo.com"
                />
              </div>

              <div>
                <label className="block text-sm text-black/70 mb-2">
                  Contraseña (demo)
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="w-full rounded-2xl bg-white border border-black/10 text-black px-4 py-3 outline-none focus:border-black/30"
                  placeholder="cualquiera"
                />
                <div className="mt-2 text-[11px] text-black/55">
                  Temporal: cualquier contraseña funciona. En prod se amarra a SSO/IdP.
                </div>
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
                {loading ? "Entrando..." : "Entrar"}
              </button>

              <div className="pt-2 text-xs text-black/55">{hint}</div>
            </form>

            <div className="mt-6 text-xs text-black/50">
              © {new Date().getFullYear()} Plinius
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
