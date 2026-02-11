/* app/page.tsx */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [reveal, setReveal] = useState(0); // 0 = intro visible, 1 = main visible

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const vh = window.innerHeight || 1;

      // Reveal después de ~1.35 pantallas (ajusta a tu gusto)
      const t = clamp((y - vh * 0.9) / (vh * 0.45), 0, 1);
      setReveal(t);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const introStyle = useMemo(
    () => ({
      opacity: 1 - reveal,
      transform: `translateY(${reveal * -18}px) scale(${1 - reveal * 0.02})`,
      filter: `blur(${reveal * 4}px)`,
      pointerEvents: reveal > 0.98 ? ("none" as const) : ("auto" as const),
    }),
    [reveal]
  );

  const mainStyle = useMemo(
    () => ({
      opacity: reveal,
      transform: `translateY(${(1 - reveal) * 16}px)`,
      filter: `blur(${(1 - reveal) * 4}px)`,
      pointerEvents: reveal < 0.02 ? ("none" as const) : ("auto" as const),
    }),
    [reveal]
  );

  return (
    <main className="min-h-[230vh] pliny-bg px-4 py-0">
      {/* Glow overlays */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-fuchsia-500/18 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-lime-400/12 blur-3xl" />
      </div>

      {/* =========================
          VIEW 1 — WOW INTRO (más pequeño + geométrico + neon purple/blue atrás)
         ========================= */}
      <section
        className="sticky top-0 h-[100svh] flex items-center justify-center"
        style={introStyle}
      >
        <div className="relative w-full max-w-3xl px-4">
          <div className="mx-auto w-full rounded-[28px] border border-white/15 bg-white/6 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="px-6 md:px-10 py-10 md:py-12">
              <div className="flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-1 text-[11px] text-white/85">
                  <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
                  Private Credit API / SaaS · México
                </div>

                {/* LOGO WOW */}
                <div className="mt-8 relative">
                  <div className="ringWrap">
                    {/* Neon gradient behind logo */}
                    <div className="neonBackdrop" aria-hidden />
                    <div className="neonBackdrop neon2" aria-hidden />
                    <div className="neonBackdrop neon3" aria-hidden />

                    {/* Ring lights */}
                    <div className="ring" />
                    <div className="ring ring2" />
                    <div className="ring ring3" />

                    {/* More geometric plate */}
                    <div className="logoPlate">
                      <img
                        src="/plinius.png"
                        alt="Plinius"
                        className="logoImg"
                        draggable={false}
                      />
                      {/* subtle inner grid lines */}
                      <div className="gridLines" aria-hidden />
                    </div>
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 -bottom-10 mx-auto h-20 w-[340px] rounded-full bg-violet-300/18 blur-3xl" />
                </div>

                <h1 className="mt-7 text-3xl md:text-5xl font-semibold text-white leading-tight">
                  Plinius{" "}
                  <span className="text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
                    Private Credit
                  </span>
                </h1>

                <p className="mt-3 text-white/75 text-sm md:text-base leading-relaxed max-w-xl">
                  Conecta SAT/CFDI, señales de riesgo y scoring para originación y monitoreo — en minutos.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Chip text="SAT/CFDI" tone="cyan" />
                  <Chip text="Risk Signals" tone="lime" />
                  <Chip text="Score & PDF" tone="violet" />
                  <Chip text="API First" tone="pink" />
                </div>

                <div className="mt-8 grid w-full max-w-md gap-3 sm:grid-cols-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl bg-white text-black font-semibold py-3 px-4 hover:opacity-90 transition"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/pricing/lead?plan=pro"
                    className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-50 font-semibold py-3 px-4 hover:bg-cyan-300/15 transition shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_10px_30px_rgba(34,211,238,0.10)]"
                  >
                    Solicitar integración
                  </Link>
                </div>

                <div className="mt-10 flex flex-col items-center gap-2 text-white/55">
                  <div className="text-[11px]">Desliza para descubrir</div>
                  <div className="scrollPill">
                    <span className="dot" />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 md:px-10 py-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/55">
              <span>© {new Date().getFullYear()} Plinius</span>
              <span className="hidden sm:inline">Private Credit Infrastructure</span>
            </div>
          </div>
        </div>
      </section>

      {/* Spacer para “mucho scroll” */}
      <div className="h-[70vh]" />

      {/* =========================
          VIEW 2 — MAIN LANDING
         ========================= */}
      <section className="pb-10" style={mainStyle}>
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-white/15 bg-white/6 backdrop-blur-xl shadow-2xl overflow-hidden">
            {/* Top */}
            <header className="px-5 md:px-8 py-4 border-b border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src="/plinius.png"
                    alt="Plinius"
                    className="h-12 md:h-14 w-auto"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-white font-semibold leading-tight truncate">
                        Plinius
                      </div>
                      <span className="hidden sm:inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-white/75">
                        API / SaaS para Private Credit
                      </span>
                    </div>
                    <div className="text-white/70 text-xs md:text-sm truncate">
                      Salud financiera • SAT/CFDI • señales de riesgo • reporteo
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="hidden sm:inline-flex rounded-2xl bg-white text-black font-semibold px-4 py-2.5 hover:opacity-90 transition"
                  >
                    Iniciar
                  </Link>
                  <Link
                    href="/admin/login"
                    className="inline-flex rounded-2xl border border-white/20 bg-white/6 text-white font-semibold px-4 py-2.5 hover:bg-white/10 transition"
                  >
                    Admin
                  </Link>
                </div>
              </div>

              <div className="mt-3 sm:hidden">
                <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-white/75">
                  API / SaaS para Private Credit
                </span>
              </div>
            </header>

            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              {/* Left */}
              <section className="px-5 md:px-8 py-5 md:py-7 border-b lg:border-b-0 lg:border-r border-white/10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-1 text-[11px] text-white/85">
                  <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
                  Conectividad & underwriting
                </div>

                <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-white leading-tight">
                  Infraestructura de datos para originar y monitorear{" "}
                  <span className="text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
                    Private Credit
                  </span>
                  .
                </h2>

                <p className="mt-2 text-white/75 text-sm leading-relaxed">
                  Integra SAT/CFDI, señales de riesgo y reportes ejecutivos (PDF) para
                  decisiones rápidas con trazabilidad.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip text="24 meses de facturación" tone="cyan" />
                  <Chip text="Alertas & señales" tone="lime" />
                  <Chip text="Reporte PDF ejecutivo" tone="violet" />
                  <Chip text="Integración API" tone="pink" />
                </div>

                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl bg-white text-black font-semibold py-3 px-4 hover:opacity-90 transition"
                  >
                    Entrar (Empresa)
                  </Link>

                  <Link
                    href="/pricing/lead?plan=pro"
                    className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-50 font-semibold py-3 px-4 hover:bg-cyan-300/15 transition shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_10px_30px_rgba(34,211,238,0.10)]"
                  >
                    Solicitar integración
                  </Link>
                </div>

                <div className="mt-4 text-[11px] text-white/55">
                  Selecciona un plan → contacto → onboarding técnico con tu equipo.
                </div>
              </section>

              {/* Right */}
              <aside className="px-5 md:px-8 py-5 md:py-7">
                <div className="flex items-center justify-between">
                  <div className="text-white font-semibold">Planes</div>
                  <div className="text-white/60 text-xs">USD / mes</div>
                </div>

                <div className="mt-3 grid gap-3">
                  <PlanCard
                    plan="Basic"
                    price="$70"
                    desc="Hasta 10 scans"
                    bullets={["Dashboard + PDF", "Soporte estándar", "Integración guiada"]}
                    href="/pricing/lead?plan=basic"
                    glow="cyan"
                  />
                  <PlanCard
                    plan="Pro"
                    price="$500"
                    desc="Scans ilimitados"
                    bullets={["Todo Basic", "Soporte prioritario", "Roadmap API"]}
                    href="/pricing/lead?plan=pro"
                    glow="violet"
                    highlight
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniLink title="Demo admin" href="/admin/login" />
                  <MiniLink title="Entrar empresa" href="/login" />
                </div>

                <div className="mt-5 text-center text-[11px] text-white/55">
                  © {new Date().getFullYear()} Plinius ·{" "}
                  <span className="text-white/70">Marca registrada.</span>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* Global CSS local */}
      <style jsx global>{`
        .pliny-bg {
          background: radial-gradient(1200px 700px at 20% 10%, rgba(34, 211, 238, 0.08), transparent 55%),
            radial-gradient(900px 650px at 85% 35%, rgba(217, 70, 239, 0.08), transparent 55%),
            radial-gradient(900px 650px at 55% 95%, rgba(163, 230, 53, 0.07), transparent 60%),
            linear-gradient(180deg, rgba(3, 7, 18, 1), rgba(2, 6, 23, 1));
        }

        .ringWrap {
          position: relative;
          width: clamp(170px, 24vw, 250px); /* más pequeño */
          aspect-ratio: 1 / 1;
          display: grid;
          place-items: center;
          margin-inline: auto;
          isolation: isolate;
        }

        /* Neon purple/blue behind */
        .neonBackdrop {
          position: absolute;
          inset: -32px;
          border-radius: 44px;
          background: radial-gradient(
              40% 50% at 30% 25%,
              rgba(139, 92, 246, 0.35),
              transparent 60%
            ),
            radial-gradient(
              45% 55% at 70% 70%,
              rgba(34, 211, 238, 0.28),
              transparent 62%
            ),
            radial-gradient(
              35% 45% at 65% 25%,
              rgba(96, 165, 250, 0.28),
              transparent 60%
            );
          filter: blur(14px);
          opacity: 0.95;
          animation: drift 7.5s ease-in-out infinite;
          z-index: 0;
        }

        .neon2 {
          inset: -44px;
          opacity: 0.55;
          filter: blur(20px);
          animation-duration: 10.5s;
        }

        .neon3 {
          inset: -60px;
          opacity: 0.30;
          filter: blur(28px);
          animation-duration: 13.5s;
        }

        @keyframes drift {
          0% {
            transform: translate3d(-4px, 2px, 0) rotate(-2deg);
          }
          50% {
            transform: translate3d(6px, -4px, 0) rotate(2deg);
          }
          100% {
            transform: translate3d(-4px, 2px, 0) rotate(-2deg);
          }
        }

        /* Geometric plate */
        .logoPlate {
          position: relative;
          width: 80%;
          height: 80%;
          border-radius: 22px; /* más geométrico */
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.48);
          display: grid;
          place-items: center;
          overflow: hidden;
          z-index: 2;
        }

        .gridLines {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(
              to right,
              rgba(255, 255, 255, 0.06) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.05) 1px,
              transparent 1px
            );
          background-size: 22px 22px;
          opacity: 0.14;
          mask-image: radial-gradient(circle at 50% 50%, #000 35%, transparent 80%);
          pointer-events: none;
        }

        .logoImg {
          width: 76%;
          height: auto;
          filter: drop-shadow(0 0 26px rgba(34, 211, 238, 0.18))
            drop-shadow(0 0 22px rgba(139, 92, 246, 0.14));
          user-select: none;
          z-index: 3;
        }

        /* Ring lights with conic gradient */
        .ring {
          position: absolute;
          inset: -12px;
          border-radius: 36px; /* más “cuadrado redondeado” */
          padding: 2px;
          background: conic-gradient(
            from 0deg,
            rgba(34, 211, 238, 0) 0%,
            rgba(34, 211, 238, 0.9) 10%,
            rgba(96, 165, 250, 0.9) 18%,
            rgba(139, 92, 246, 0.9) 28%,
            rgba(34, 211, 238, 0) 45%,
            rgba(255, 255, 255, 0.14) 60%,
            rgba(34, 211, 238, 0) 75%,
            rgba(139, 92, 246, 0.9) 90%,
            rgba(34, 211, 238, 0) 100%
          );
          animation: spin 3.9s linear infinite;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          box-shadow: 0 0 44px rgba(34, 211, 238, 0.12),
            0 0 54px rgba(139, 92, 246, 0.10);
          z-index: 1;
        }

        .ring2 {
          inset: -22px;
          opacity: 0.55;
          animation-duration: 6.4s;
          filter: blur(0.6px);
          z-index: 1;
        }

        .ring3 {
          inset: -34px;
          opacity: 0.28;
          animation-duration: 9.6s;
          filter: blur(1.2px);
          z-index: 1;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Scroll hint */
        .scrollPill {
          width: 46px;
          height: 26px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
          display: grid;
          place-items: center;
          overflow: hidden;
          position: relative;
        }
        .scrollPill .dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 0 18px rgba(34, 211, 238, 0.32),
            0 0 18px rgba(139, 92, 246, 0.22);
          animation: dot 1.25s ease-in-out infinite;
        }
        @keyframes dot {
          0% {
            transform: translateY(-6px);
            opacity: 0.55;
          }
          55% {
            transform: translateY(6px);
            opacity: 1;
          }
          100% {
            transform: translateY(12px);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}

/* ---------- UI bits ---------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function Chip({
  text,
  tone,
}: {
  text: string;
  tone: "cyan" | "lime" | "violet" | "pink";
}) {
  const map: Record<string, string> = {
    cyan:
      "border-cyan-300/35 bg-cyan-300/12 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.10)]",
    lime:
      "border-lime-300/35 bg-lime-300/12 text-lime-50 shadow-[0_0_18px_rgba(163,230,53,0.08)]",
    violet:
      "border-violet-300/35 bg-violet-300/12 text-violet-50 shadow-[0_0_18px_rgba(167,139,250,0.10)]",
    pink:
      "border-fuchsia-300/35 bg-fuchsia-300/12 text-fuchsia-50 shadow-[0_0_18px_rgba(217,70,239,0.10)]",
  };
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] ${map[tone]}`}>
      {text}
    </span>
  );
}

function PlanCard({
  plan,
  price,
  desc,
  bullets,
  href,
  glow,
  highlight,
}: {
  plan: string;
  price: string;
  desc: string;
  bullets: string[];
  href: string;
  glow: "cyan" | "violet";
  highlight?: boolean;
}) {
  const glowClass =
    glow === "cyan" ? "before:bg-cyan-400/30" : "before:bg-violet-400/28";

  return (
    <Link
      href={href}
      className={[
        "relative block rounded-3xl border bg-white/6 p-5 transition overflow-hidden",
        highlight
          ? "border-white/25 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_22px_70px_rgba(0,0,0,0.35)]"
          : "border-white/15 hover:border-white/25",
        "before:content-[''] before:absolute before:-top-10 before:-right-10 before:h-44 before:w-44 before:rounded-full before:blur-3xl",
        glowClass,
      ].join(" ")}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-white font-semibold">{plan}</div>
          <div className="text-white/70 text-xs mt-1">{desc}</div>
        </div>
        <div className="text-right">
          <div className="text-white font-semibold text-2xl leading-none">
            {price}
          </div>
          <div className="text-white/55 text-[11px] mt-1">por mes</div>
        </div>
      </div>

      <ul className="relative mt-3 space-y-1.5 text-sm text-white/78">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/85" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-4 inline-flex items-center justify-center rounded-2xl bg-white text-black font-semibold px-4 py-2.5 text-sm hover:opacity-90 transition">
        Elegir {plan}
      </div>
    </Link>
  );
}

function MiniLink({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/15 bg-white/6 text-white/95 text-sm font-semibold py-3 px-4 text-center hover:bg-white/10 transition"
    >
      {title}
    </Link>
  );
}
