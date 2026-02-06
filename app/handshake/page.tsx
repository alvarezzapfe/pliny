import { Suspense } from "react";
import HandshakeClient from "./HandshakeClient";

export default function HandshakePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen burocrowd-bg flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-2xl p-8">
            <div className="flex items-center justify-center mb-6">
              <img src="/crowdlink-logo.png" alt="Crowdlink" className="h-12 w-auto" />
            </div>
            <h1 className="text-xl font-semibold text-white text-center">Cargando…</h1>
            <p className="mt-2 text-center text-white/70 text-sm">Preparando validación.</p>
          </div>
        </main>
      }
    >
      <HandshakeClient />
    </Suspense>
  );
}
