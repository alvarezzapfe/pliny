/* app/page.tsx */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [y, setY] = useState(0);
  const [vh, setVh] = useState(800);

  useEffect(() => {
    const on = () => {
      setY(window.scrollY || 0);
      setVh(window.innerHeight || 1);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  // 3-stage scroll
  const introOut = smoother01((y - vh * 0.9) / (vh * 0.45));
  const midIn = smoother01((y - vh * 1.12) / (vh * 0.35));
  const midOut = smoother01((y - vh * 2.02) / (vh * 0.52));
  const mainIn = smoother01((y - vh * 2.42) / (vh * 0.72));

  // VIEW 1 (INTRO)
  const introStyle = useMemo(() => {
    const t = introOut;
    return {
      opacity: 1 - t,
      transform: `translateY(${t * -14}px) scale(${1 - t * 0.015})`,
      filter: `blur(${t * 3.2}px)`,
      pointerEvents: t > 0.98 ? ("none" as const) : ("auto" as const),
    };
  }, [introOut]);

  // VIEW 1.5 (MID)
  const midOpacity = midIn * (1 - midOut);
  const midStyle = useMemo(() => {
    const lift = (1 - midIn) * 10;
    const drop = midOut * 8;
    const blur = (1 - midIn) * 3 + midOut * 2.5;
    return {
      opacity: midOpacity,
      transform: `translateY(${lift + drop}px) scale(${
        0.994 + midIn * 0.006 - midOut * 0.004
      })`,
      filter: `blur(${blur}px)`,
      pointerEvents: midOpacity < 0.02 ? ("none" as const) : ("auto" as const),
    };
  }, [midIn, midOut, midOpacity]);

  // VIEW 2 (MAIN)
  const mainStyle = useMemo(() => {
    const t = mainIn;
    return {
      opacity: t,
      transform: `translateY(${(1 - t) * 16}px)`,
      filter: `blur(${(1 - t) * 4}px)`,
      pointerEvents: t < 0.02 ? ("none" as const) : ("auto" as const),
    };
  }, [mainIn]);

  return (
    <main className="min-h-[340vh] pliny-bg px-4 py-0">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-fuchsia-500/18 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-lime-400/12 blur-3xl" />
      </div>

      {/* =========================
          VIEW 1 — INTRO
         ========================= */}
      <section
        className="sticky top-0 h-[100svh] flex items-center justify-center"
        style={introStyle}
      >
        <div className="relative w-full max-w-5xl px-4">
          <div className="flex flex-col items-center text-center">
            <div className="mt-9 relative">
              <div className="ringWrap">
                <div className="neonBackdrop" aria-hidden />
                <div className="neonBackdrop neon2" aria-hidden />
                <div className="neonBackdrop neon3" aria-hidden />

                <div className="ring" />
                <div className="ring ring2" />
                <div className="ring ring3" />

                <div className="logoPlate">
                  <img
                    src="/plinius.png"
                    alt="Plinius"
                    className="logoImg"
                    draggable={false}
                  />
                  <div className="gridLines" aria-hidden />
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 -bottom-10 mx-auto h-20 w-[360px] rounded-full bg-violet-300/16 blur-3xl" />
            </div>

            <h1 className="mt-7 text-3xl md:text-6xl font-semibold text-white leading-tight tracking-tight">
              Plinius{" "}
              <span className="text-cyan-200 drop-shadow-[0_0_14px_rgba(34,211,238,0.55)]">
                Private Credit OS
              </span>
            </h1>

            <p className="mt-3 text-white/75 text-sm md:text-base leading-relaxed max-w-2xl">
              Infraestructura para{" "}
              <span className="text-white font-semibold">originar</span> y{" "}
              <span className="text-white font-semibold">administrar</span>{" "}
              créditos: señales de riesgo, monitoreo y reportes ejecutivos.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Chip text="Underwriting" tone="cyan" />
              <Chip text="Portafolio" tone="lime" />
              <Chip text="Risk signals" tone="violet" />
              <Chip text="Reporte PDF" tone="pink" />
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
                className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/28 bg-cyan-300/10 text-cyan-50 font-semibold py-3 px-4 hover:bg-cyan-300/15 transition shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_10px_30px_rgba(34,211,238,0.10)]"
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
      </section>

      <div className="h-[70vh]" />

      {/* =========================
          VIEW 1.5 — MID (3-step system)
         ========================= */}
      <section
        className="sticky top-0 h-[100svh] flex items-center justify-center"
        style={midStyle}
      >
        <div className="w-full max-w-7xl px-3 sm:px-4">
          <div className="rounded-[28px] border border-white/15 bg-white/6 backdrop-blur-xl shadow-2xl overflow-hidden">
            <header className="px-5 md:px-8 py-6 border-b border-white/10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-1 text-[11px] text-white/85">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.85)]" />
                Workflow
              </div>

              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-[20px] sm:text-[26px] md:text-[34px] font-semibold text-white leading-tight">
                  Plinius convierte datos en{" "}
                  <span className="text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.55)]">
                    decisiones de crédito
                  </span>
                  .
                </h2>

                <div className="flex items-center gap-2">
                  <Link
                    href="/pricing/lead?plan=pro"
                    className="hidden sm:inline-flex items-center justify-center rounded-2xl border border-white/18 bg-white/6 text-white font-semibold py-2.5 px-4 hover:bg-white/10 transition"
                  >
                    Hablar con ventas
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl bg-white text-black font-semibold py-2.5 px-4 hover:opacity-90 transition"
                  >
                    Entrar
                  </Link>
                </div>
              </div>

              <p className="mt-2 text-white/70 text-sm max-w-4xl">
                Una herramienta para{" "}
                <span className="text-white font-semibold">originar</span> y{" "}
                <span className="text-white font-semibold">administrar</span>{" "}
                crédito: onboarding, analítica y automatización operativa.
              </p>
            </header>

            <div className="px-4 md:px-8 py-6">
              {/* 3 boxes + connector */}
              <div className="midFlow">
                <FlowCard
                  title="Registro"
                  desc="Crea tu institución, usuarios y permisos."
                  icon={<IconRegister />}
                  tone="cyan"
                />
                <FlowConnector />
                <FlowCard
                  title="Análisis"
                  desc="Señales de riesgo, monitoreo y score."
                  icon={<IconAnalyze />}
                  tone="violet"
                />
                <FlowConnector />
                <FlowCard
                  title="Decisiones & Tech"
                  desc="Reportes, reglas y operación del portafolio."
                  icon={<IconDecision />}
                  tone="lime"
                  highlight
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-white/55">
                  Menos fricción · más control · listo para integrarse.
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-1 text-[11px] text-white/75">
                    <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_16px_rgba(163,230,53,0.8)]" />
                    Risk-ready
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-1 text-[11px] text-white/75">
                    API-first
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="h-[70vh]" />

      {/* =========================
          VIEW 2 — MAIN LANDING
         ========================= */}
      <section className="pb-10" style={mainStyle}>
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-white/15 bg-white/6 backdrop-blur-xl shadow-2xl overflow-hidden">
            <header className="px-5 md:px-8 py-4 border-b border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src="/plinius.png"
                    alt="Plinius"
                    className="h-12 md:h-14 w-auto"
                  />
                  <div className="min-w-0">
                    <span className="hidden sm:inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-white/75">
                      Credit OS · API / SaaS
                    </span>
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
            </header>

            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <section className="px-5 md:px-8 py-5 md:py-7 border-b lg:border-b-0 lg:border-r border-white/10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-1 text-[11px] text-white/85">
                  <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
                  Infraestructura para otorgantes
                </div>

                <h2 className="mt-3 text-2xl md:text-3xl font-semibold text-white leading-tight">
                  Originación y administración de crédito{" "}
                  <span className="text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
                    en un solo sistema
                  </span>
                  .
                </h2>

                <p className="mt-2 text-white/75 text-sm leading-relaxed">
                  Portafolio, señales, reportes ejecutivos y conectividad.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip text="Portafolio" tone="cyan" />
                  <Chip text="Señales & alertas" tone="lime" />
                  <Chip text="PDF ejecutivo" tone="violet" />
                  <Chip text="Integración" tone="pink" />
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
                  Plan → onboarding técnico → producción.
                </div>
              </section>

              <aside className="px-5 md:px-8 py-5 md:py-7">
                <div className="flex items-center justify-between">
                  <div className="text-white font-semibold">Planes</div>
                  <div className="text-white/60 text-xs">USD / mes</div>
                </div>

                <div className="mt-3 grid gap-3">
                  <PlanCard
                    plan="Basic"
                    price="$70"
                    desc="Hasta 10 oportunidades"
                    bullets={["Dashboard", "Soporte estándar", "Integración guiada"]}
                    href="/pricing/lead?plan=basic"
                    glow="cyan"
                  />
                  <PlanCard
                    plan="Pro"
                    price="$500"
                    desc="Oportunidades ilimitadas"
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

      {/* =========================
          GLOBAL CSS
         ========================= */}
      <style jsx global>{`
        .pliny-bg {
          background: radial-gradient(
              1200px 700px at 20% 10%,
              rgba(34, 211, 238, 0.08),
              transparent 55%
            ),
            radial-gradient(
              900px 650px at 85% 35%,
              rgba(217, 70, 239, 0.08),
              transparent 55%
            ),
            radial-gradient(
              900px 650px at 55% 95%,
              rgba(163, 230, 53, 0.07),
              transparent 60%
            ),
            linear-gradient(180deg, rgba(3, 7, 18, 1), rgba(2, 6, 23, 1));
        }

        /* ===== MID FLOW (3 cards + connectors) ===== */
        .midFlow {
          display: grid;
          grid-template-columns: 1fr auto 1fr auto 1fr;
          gap: 12px;
          align-items: stretch;
        }
        @media (max-width: 1024px) {
          .midFlow {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .midConn {
            display: none;
          }
        }

        .midCard {
          position: relative;
          border-radius: 26px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(18px);
          box-shadow: 0 22px 70px rgba(0, 0, 0, 0.34);
          overflow: hidden;
          padding: 16px;
          min-height: 140px;
        }
        .midCard::before {
          content: "";
          position: absolute;
          inset: -40px;
          border-radius: 999px;
          filter: blur(22px);
          opacity: 0.85;
          pointer-events: none;
        }
        .tone-cyan::before {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(34, 211, 238, 0.28),
            transparent 60%
          );
        }
        .tone-violet::before {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(139, 92, 246, 0.26),
            transparent 60%
          );
        }
        .tone-lime::before {
          background: radial-gradient(
            circle at 30% 30%,
            rgba(163, 230, 53, 0.25),
            transparent 62%
          );
        }

        .midIcon {
          height: 42px;
          width: 42px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28);
        }
        .midTitle {
          margin-top: 10px;
          color: rgba(255, 255, 255, 0.92);
          font-weight: 900;
          font-size: 14px;
          letter-spacing: 0.1px;
        }
        .midDesc {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 12px;
          line-height: 1.45;
          max-width: 52ch;
        }
        .midTag {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 8px 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.78);
          font-size: 11px;
          font-weight: 700;
          width: fit-content;
        }
        .midTag .dot {
          height: 8px;
          width: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.7);
        }
        .midTag.good .dot {
          background: rgba(163, 230, 53, 0.95);
          box-shadow: 0 0 18px rgba(163, 230, 53, 0.45);
        }

        .midConn {
          display: grid;
          place-items: center;
          width: 54px;
        }
        .midConnLine {
          height: 2px;
          width: 54px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.08),
            rgba(34, 211, 238, 0.35),
            rgba(255, 255, 255, 0.08)
          );
          border-radius: 999px;
          position: relative;
          box-shadow: 0 0 28px rgba(34, 211, 238, 0.14);
        }
        .midConnLine::after {
          content: "";
          position: absolute;
          right: -2px;
          top: 50%;
          transform: translateY(-50%);
          height: 10px;
          width: 10px;
          border-radius: 999px;
          background: rgba(34, 211, 238, 0.92);
          box-shadow: 0 0 20px rgba(34, 211, 238, 0.42);
          opacity: 0.9;
        }

        /* ===== INTRO hero ring system (tu CSS original) ===== */
        .ringWrap {
          position: relative;
          width: clamp(170px, 24vw, 250px);
          aspect-ratio: 1 / 1;
          display: grid;
          place-items: center;
          margin-inline: auto;
          isolation: isolate;
        }
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
          opacity: 0.3;
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
        .logoPlate {
          position: relative;
          width: 80%;
          height: 80%;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
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
          mask-image: radial-gradient(
            circle at 50% 50%,
            #000 35%,
            transparent 80%
          );
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
        .ring {
          position: absolute;
          inset: -12px;
          border-radius: 36px;
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
          -webkit-mask: linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          box-shadow: 0 0 44px rgba(34, 211, 238, 0.12),
            0 0 54px rgba(139, 92, 246, 0.1);
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

/* =========================
   HELPERS
   ========================= */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function smoother01(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/* =========================
   UI REUSE
   ========================= */
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

/* ===== MID FLOW COMPONENTS ===== */
function FlowCard({
  title,
  desc,
  icon,
  tone,
  highlight,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  tone: "cyan" | "violet" | "lime";
  highlight?: boolean;
}) {
  return (
    <div className={`midCard tone-${tone} ${highlight ? "midHi" : ""}`}>
      <div className="relative">
        <div className="midIcon">{icon}</div>
        <div className="midTitle">{title}</div>
        <div className="midDesc">{desc}</div>

        <div className={`midTag ${tone === "lime" ? "good" : ""}`}>
          <span className="dot" />
          {tone === "cyan"
            ? "Onboarding"
            : tone === "violet"
            ? "Risk analytics"
            : "Execution"}
        </div>
      </div>

      <style jsx global>{`
        .midHi {
          box-shadow: 0 0 0 1px rgba(163, 230, 53, 0.12),
            0 26px 90px rgba(0, 0, 0, 0.42);
          border-color: rgba(163, 230, 53, 0.28);
        }
      `}</style>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="midConn" aria-hidden>
      <div className="midConnLine" />
    </div>
  );
}

/* ===== ICONS (inline SVG) ===== */
function IconRegister() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm7 10a7 7 0 0 0-14 0"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconAnalyze() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path
        d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-3"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDecision() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path
        d="M20 7 10 17l-5-5"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}