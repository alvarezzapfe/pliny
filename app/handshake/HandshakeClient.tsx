"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setSession } from "@/lib/auth";

type ValidateOk = { ok: true; customerId: string; email: string };
type ValidateFail = { ok: false; error: string };

function validateTokenMock(token: string): Promise<ValidateOk | ValidateFail> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (token && token.startsWith("cl_") && token.length > 10) {
        resolve({
          ok: true,
          customerId: "cust_" + token.slice(3, 11),
          email: "cliente@empresa.com",
        });
      } else {
        resolve({ ok: false, error: "Token inválido o expirado." });
      }
    }, 650);
  });
}

export default function HandshakeClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = useMemo(() => (sp.get("token") || "").trim(), [sp]);

  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!token) {
        setStatus("error");
        setMsg("Falta el token. Abre esta página desde Crowdlink.");
        return;
      }

      setStatus("checking");
      setMsg("Validando acceso con Crowdlink…");

      const res = await validateTokenMock(token);
      if (!alive) return;

      if (!res.ok) {
        setStatus("error");
        setMsg(res.error);
        return;
      }

      setSession({
        role: "client",
        email: res.email,
        customerId: res.customerId,
        createdAt: new Date().toISOString(),
      });

      setStatus("ok");
      setMsg("Listo. Redirigiendo a onboarding…");

      setTimeout(() => router.replace("/onboarding"), 450);
    }

    run();
    return () => {
      alive = false;
    };
  }, [token, router]);

  return (
    <main className="min-h-screen burocrowd-bg flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-2xl p-8">
        <div className="flex items-center justify-center mb-6">
          <img src="/plinius.png" alt="Crowdlink" className="h-12 w-auto" />
        </div>

        <h1 className="text-xl font-semibold text-white text-center">Conectando con Crowdlink</h1>
        <p className="mt-2 text-center text-white/70 text-sm">
          Autenticación segura para continuar con SAT / Buró.
        </p>

        <div className="mt-6 rounded-2xl border border-white/12 bg-black/20 p-4">
          <div className="text-white/75 text-sm">
            {status === "checking" && "⏳ "}
            {status === "ok" && "✅ "}
            {status === "error" && "⚠️ "}
            {msg || "…"}
          </div>

          {status === "error" && (
            <div className="mt-4 space-y-2">
              <button
                onClick={() => router.push("/")}
                className="w-full rounded-2xl bg-white text-black font-semibold px-4 py-2.5 hover:opacity-90 transition"
              >
                Ir al inicio
              </button>
              <p className="text-xs text-white/55 text-center">
                Si este enlace expiró, vuelve a Crowdlink y genera uno nuevo.
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 text-center text-xs text-white/50">
          Seguridad: tokens de un solo uso con expiración corta (en prod).
        </div>
      </div>
    </main>
  );
}
