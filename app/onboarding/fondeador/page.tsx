"use client";

import { useRouter } from "next/navigation";

export default function OnboardingFondeadorPage() {
  const router = useRouter();

  return (
    <main style={{
      minHeight: "100svh",
      background: "radial-gradient(ellipse 120% 80% at 25% 10%, #1B3F8A 0%, #0C1E4A 55%, #091530 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Geist', -apple-system, sans-serif",
      padding: "32px 16px", position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
      `}</style>

      <div style={{
        background: "rgba(255,255,255,0.97)", borderRadius: 28,
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 32px 100px rgba(0,0,0,0.40)", padding: "48px 40px",
        width: "100%", maxWidth: 480, position: "relative", zIndex: 1,
        animation: "fadeUp 0.5s cubic-bezier(.16,1,.3,1) both", textAlign: "center",
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: "0 auto 20px",
          background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
          display: "grid", placeItems: "center",
        }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.04em", marginBottom: 8 }}>
          Onboarding Fondeador Institucional
        </h1>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 999,
          padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#92400E",
          fontFamily: "'Geist Mono', monospace", letterSpacing: ".06em", marginBottom: 20,
        }}>
          PRÓXIMAMENTE
        </div>

        <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, marginBottom: 28, maxWidth: "36ch", margin: "0 auto 28px" }}>
          Estamos preparando el proceso de onboarding para fondeadores. En los próximos días podrás registrar tu institución y conectar con otorgantes en México.
        </p>

        <a
          href="mailto:contacto@plinius.mx?subject=Onboarding%20Fondeador%20Institucional"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", height: 48, borderRadius: 14, border: "none",
            background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)", color: "#fff",
            fontSize: 14, fontWeight: 700, fontFamily: "'Geist', sans-serif",
            textDecoration: "none", letterSpacing: "-0.01em", marginBottom: 12,
            boxShadow: "0 4px 20px rgba(12,30,74,0.30)",
          }}
        >
          Contactar al equipo
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.4" strokeLinecap="round">
            <rect x="1" y="3" width="14" height="10" rx="2" /><path d="M1 5l7 5 7-5" />
          </svg>
        </a>

        <button
          onClick={() => router.push("/onboarding/role")}
          style={{
            width: "100%", height: 44, borderRadius: 12,
            border: "1.5px solid #E2E8F0", background: "#F8FAFC",
            color: "#475569", fontSize: 13, fontWeight: 600,
            fontFamily: "'Geist', sans-serif", cursor: "pointer",
          }}
        >
          Volver
        </button>
      </div>
    </main>
  );
}
