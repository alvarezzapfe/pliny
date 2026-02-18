"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function isValidEmail(v: string) {
  const s = v.trim().toLowerCase();
  return s.length >= 6 && s.includes("@") && s.includes(".");
}

function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 8) s += 1;
  if (/[A-Z]/.test(pw)) s += 1;
  if (/[0-9]/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return s; // 0..4
}

function strengthLabel(score: number) {
  if (score <= 1) return { label: "Débil", cls: "bg-red-500/70" };
  if (score === 2) return { label: "Ok", cls: "bg-amber-500/70" };
  if (score === 3) return { label: "Fuerte", cls: "bg-emerald-500/70" };
  return { label: "Muy fuerte", cls: "bg-emerald-500" };
}

function friendlySupabaseError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) {
    return "Ese correo ya está registrado. Inicia sesión o recupera tu contraseña.";
  }
  if (m.includes("invalid email")) return "Correo inválido.";
  if (m.includes("password")) return "Contraseña inválida. Prueba una más larga.";
  return msg;
}

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");

  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cleanEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const cleanEmail2 = useMemo(() => email2.trim().toLowerCase(), [email2]);

  const pwScore = useMemo(() => scorePassword(password), [password]);
  const strength = useMemo(() => strengthLabel(pwScore), [pwScore]);

  const hint = useMemo(
    () =>
      "Si tienes confirmación por correo activada, revisa tu inbox/spam. El link te regresa a Plinius.",
    []
  );

  const canSubmit = useMemo(() => {
    return (
      !loading &&
      firstName.trim().length >= 2 &&
      lastName.trim().length >= 2 &&
      isValidEmail(cleanEmail) &&
      cleanEmail === cleanEmail2 &&
      password.length >= 6
    );
  }, [loading, firstName, lastName, cleanEmail, cleanEmail2, password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (firstName.trim().length < 2) return setError("Escribe tu nombre.");
    if (lastName.trim().length < 2) return setError("Escribe tu apellido.");
    if (!isValidEmail(cleanEmail)) return setError("Escribe un correo válido.");
    if (cleanEmail !== cleanEmail2) return setError("Los correos no coinciden.");
    if (password.length < 6)
      return setError("La contraseña debe tener al menos 6 caracteres.");

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(friendlySupabaseError(error.message));
      return;
    }

    // Confirmación por email ON => user existe pero sin sesión
    if (data.user && !data.session) {
      setSuccess(
        `Listo. Te mandamos un correo a ${cleanEmail} para confirmar tu cuenta. Luego inicia sesión.`
      );
      return;
    }

    setSuccess("Cuenta creada. Te llevamos al onboarding.");
    setTimeout(() => router.push("/onboarding"), 450);
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Fondo morado estilo Plinius */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[#070616]" />
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/15 via-transparent to-fuchsia-400/10" />
        <div className="absolute -top-48 -left-48 h-[620px] w-[620px] rounded-full bg-violet-500/20 blur-[110px]" />
        <div className="absolute -bottom-48 -right-48 h-[620px] w-[620px] rounded-full bg-fuchsia-500/20 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <div className="min-h-screen flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10 transition"
            >
              <span className="opacity-80">←</span>
              Volver a login
            </Link>

            <img src="/plinius.png" alt="Plinius" className="h-8 w-auto" />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_30px_120px_rgba(0,0,0,0.55)] p-8">
            <div className="text-white">
              <h1 className="text-2xl font-semibold">Crear cuenta</h1>
              <p className="mt-1 text-sm text-white/70">
                Registro rápido para acceder a Plinius.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Nombre
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    type="text"
                    autoComplete="given-name"
                    className="w-full rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/35 px-4 py-3 outline-none focus:border-white/25 focus:bg-white/12 transition"
                    placeholder="Luis"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Apellido
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    type="text"
                    autoComplete="family-name"
                    className="w-full rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/35 px-4 py-3 outline-none focus:border-white/25 focus:bg-white/12 transition"
                    placeholder="Alvarez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Correo</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/35 px-4 py-3 outline-none focus:border-white/25 focus:bg-white/12 transition"
                  placeholder="correo@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Confirmar correo
                </label>
                <input
                  value={email2}
                  onChange={(e) => setEmail2(e.target.value)}
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/35 px-4 py-3 outline-none focus:border-white/25 focus:bg-white/12 transition"
                  placeholder="repite tu correo"
                />
                {email2.length > 0 && cleanEmail !== cleanEmail2 && (
                  <div className="mt-2 text-[12px] text-red-200/90">
                    Los correos no coinciden.
                  </div>
                )}
              </div>

              {/* Password + Strength */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/35 px-4 py-3 pr-12 outline-none focus:border-white/25 focus:bg-white/12 transition"
                    placeholder="mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 transition"
                    aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPw ? "Ocultar" : "Ver"}
                  </button>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] text-white/55">
                    <span>Fortaleza</span>
                    <span className="text-white/70">{strength.label}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full ${strength.cls} transition-all`}
                      style={{ width: `${Math.max(10, (pwScore / 4) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-white/45">
                    Tip: usa 8+ caracteres, mayúsculas, números y un símbolo.
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-50 px-4 py-3 text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-2xl bg-white text-black font-semibold py-3 px-4 hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creando..." : "Crear cuenta"}
              </button>

              <div className="pt-2 text-xs text-white/50">
                {hint} ·{" "}
                <Link href="/login" className="text-white/80 hover:text-white underline">
                  Ya tengo cuenta
                </Link>
              </div>
            </form>
          </div>

          <div className="mt-6 text-center text-[11px] text-white/45">
            © {new Date().getFullYear()} Plinius
          </div>
        </div>
      </div>
    </main>
  );
}
