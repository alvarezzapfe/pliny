/* app/page.tsx */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  // 3-stage scroll: Intro -> Mid (compact compare) -> Main
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

  // Smooth stages (C2 smooth): Intro out -> Mid in/out -> Main in
  const introOut = smoother01((y - vh * 0.9) / (vh * 0.45));
  const midIn = smoother01((y - vh * 1.12) / (vh * 0.35));
  const midOut = smoother01((y - vh * 1.78) / (vh * 0.35));
  const mainIn = smoother01((y - vh * 2.1) / (vh * 0.55));

  const introStyle = useMemo(() => {
    const t = introOut;
    return {
      opacity: 1 - t,
      transform: `translateY(${t * -18}px) scale(${1 - t * 0.02})`,
      filter: `blur(${t * 4}px)`,
      pointerEvents: t > 0.98 ? ("none" as const) : ("auto" as const),
    };
  }, [introOut]);

  const midOpacity = midIn * (1 - midOut);
  const midStyle = useMemo(() => {
    const lift = (1 - midIn) * 10;
    const drop = midOut * 8;
    const blur = (1 - midIn) * 3 + midOut * 2.5;
    return {
      opacity: midOpacity,
      transform: `translateY(${lift + drop}px) scale(${0.994 + midIn * 0.006 - midOut * 0.004})`,
      filter: `blur(${blur}px)`,
      pointerEvents:
        midOpacity < 0.02 ? ("none" as const) : ("auto" as const),
    };
  }, [midIn, midOut, midOpacity]);

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
      {/* Glow overlays */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-fuchsia-500/18 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-lime-400/12 blur-3xl" />
      </div>

      {/* =========================
          VIEW 1 — WOW INTRO
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

                  <div className="pointer-events-none absolute inset-x-0 -bottom-10 mx-auto h-20 w-[340px] rounded-full bg-violet-300/18 blur-3xl" />
                </div>

                <h1 className="mt-7 text-3xl md:text-5xl font-semibold text-white leading-tight">
                  Plinius{" "}
                  <span className="text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
                    Private Credit
                  </span>
                </h1>

                <p className="mt-3 text-white/75 text-sm md:text-base leading-relaxed max-w-xl">
                  Busca y encuentra oportunidades de Credito. Gestiona tu portafolio de Credito.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Chip text="SAT/CFDI" tone="cyan" />
                  <Chip text="Risk Signals" tone="lime" />
                  <Chip text="Score & PDF" tone="violet" />
                  <Chip text="API First" tone="pink" />
                </div>

                <div className="mt-8 grid w-full max-w-md gap-3 sm:grid-cols-2">
                  <Link
  href="/market"
  className="inline-flex items-center justify-center rounded-2xl bg-white text-black font-semibold py-3 px-4 hover:opacity-90 transition"
>
  Acceder Demo Market
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
              <span className="hidden sm:inline">
                Private Credit Infrastructure
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* spacer */}
      <div className="h-[70vh]" />

      {/* =========================
          VIEW 1.5 — SINGLE COMPACT VIEW (ALL IN ONE)
         ========================= */}
      <section
        className="sticky top-0 h-[100svh] flex items-center justify-center"
        style={midStyle}
      >
        <div className="w-full max-w-7xl px-3 sm:px-4">
          <div className="rounded-[28px] border border-white/15 bg-white/6 backdrop-blur-xl shadow-2xl overflow-hidden">
            <header className="px-5 md:px-8 py-5 border-b border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-1 text-[11px] text-white/85">
                  <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_18px_rgba(163,230,53,0.85)]" />
                  Asset classes · México
                </div>
                <div className="text-[11px] text-white/55">
                  
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-[20px] sm:text-[24px] md:text-[32px] font-semibold text-white leading-tight">
                  ¿Por qué{" "}
                  <span className="text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.55)]">
                    Crédito Privado
                  </span>{" "}
                  en México?
                </h2>

                <div className="flex items-center gap-2">
                  <Link
                    href="/pricing/lead?plan=pro"
                    className="hidden sm:inline-flex items-center justify-center rounded-2xl border border-lime-300/30 bg-lime-300/10 text-lime-50 font-semibold py-2.5 px-4 hover:bg-lime-300/15 transition shadow-[0_0_0_1px_rgba(163,230,53,0.10),0_10px_30px_rgba(163,230,53,0.10)]"
                  >
                    Solicitar integración
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
                Para muchos portafolios, el crédito privado puede ocupar el “espacio medio”: mayor carry que deuda pública, menor volatilidad que acciones, y un perfil de riesgos más controlable que activos altamente cíclicos — con la advertencia clave de ilíquidez y riesgo de crédito.
              </p>
            </header>

            {/* CONTENT: 5 boxes in one horizontal line */}
            <div className="px-4 md:px-8 py-5">
              <div className="compareRow">
                <MiniAssetBox
                  title="Public Equities"
                  tag="MX"
                  color="cyan"
                  cons={["Volatilidad", "Concentración", "Drawdowns"]}
                />
                <MiniAssetBox
                  title="Deuda Pública"
                  tag="Cetes"
                  color="violet"
                  cons={["Retorno real", "Reinversión", "Duración/curva"]}
                />
                <MiniAssetBox
                  title="Private Equity"
                  tag="PE"
                  color="pink"
                  cons={["J-curve", "Fees altos", "Dispersión"]}
                />
                <MiniAssetBox
                  title="Inmobiliario"
                  tag="RE"
                  color="amber"
                  cons={["Vacancia", "CapEx", "Ilíquido"]}
                />
                <MiniAssetBox
                  title="Deuda Privada"
                  tag="Plinius"
                  color="lime"
                  pros={["Carry", "Covenants", "Monitoreo SAT/CFDI"]}
                  highlight
                />
              </div>

              <div className="mt-4 grid lg:grid-cols-[1fr_420px] gap-4 items-stretch">
                <div className="rounded-3xl border border-white/15 bg-white/6 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-white font-semibold text-sm">
                        Performance (5Y) · normalizado
                      </div>
                      <div className="text-white/55 text-[11px] mt-0.5">
                        Ilustrativo. Cambia por benchmarks reales cuando quieras.
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex rounded-full border border-white/15 bg-white/6 px-2.5 py-1 text-[10px] text-white/75">
                      5Y
                    </span>
                  </div>
                  <div className="mt-3">
                    <MiniChartCompact />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/15 bg-white/6 p-4">
                  <div className="text-white font-semibold text-sm">
                    ¿Qué gana tu stack?
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-white/80">
                    <li className="flex gap-2">
                      <PulseDot />
                      <span>Scoring + reporte PDF</span>
                    </li>
                    <li className="flex gap-2">
                      <PulseDot />
                      <span>Alertas / señales</span>
                    </li>
                    <li className="flex gap-2">
                      <PulseDot />
                      <span>Integración API-first</span>
                    </li>
                  </ul>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Link
                      href="/pricing/lead?plan=pro"
                      className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-50 font-semibold py-2.5 px-3 hover:bg-cyan-300/15 transition"
                    >
                      Integración
                    </Link>
                    <Link
                      href="/admin/login"
                      className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/6 text-white font-semibold py-2.5 px-3 hover:bg-white/10 transition"
                    >
                      Admin
                    </Link>
                  </div>

                  <div className="mt-3 text-[11px] text-white/55">
                    Riesgos: default + ilíquidez. Mitigación: underwriting, covenants,
                    monitoreo.
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[11px] text-white/55 flex flex-wrap items-center justify-between gap-2">
                <span>Rojo = desventajas · Verde pulsante = beneficios</span>
                <span className="hidden sm:inline">
                  © {new Date().getFullYear()} Plinius
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* spacer */}
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
                    <div className="flex items-center gap-2">
                      <div className="text-white font-semibold leading-tight truncate">
                        
                      </div>
                      <span className="hidden sm:inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-white/75">
                        API / SaaS para Private Credit
                      </span>
                    </div>
                    <div className="text-white/70 text-xs md:text-sm truncate">
                      
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
                  Integra y accede a oportunidades de Credito Privado.
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
                    bullets={[
                      "Dashboard",
                      "Soporte estándar",
                      "Integración guiada",
                    ]}
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

      {/* Global CSS local */}
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

        /* 5 boxes row: always one horizontal line; becomes scrollable on small screens */
        .compareRow {
          display: grid;
          grid-template-columns: repeat(5, minmax(180px, 1fr));
          gap: 12px;
          align-items: stretch;
        }
        @media (max-width: 1024px) {
          .compareRow {
            grid-template-columns: repeat(5, minmax(200px, 1fr));
            overflow-x: auto;
            padding-bottom: 6px;
            scroll-snap-type: x mandatory;
          }
          .compareRow > * {
            scroll-snap-align: start;
          }
        }

        /* intro ring system */
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
          mask-image: radial-gradient(circle at 50% 50%, #000 35%, transparent
                80%);
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

        /* Benefits pulse */
        @keyframes pulseGreen {
          0% {
            opacity: 0.65;
            transform: scale(0.95);
            filter: drop-shadow(0 0 0 rgba(163, 230, 53, 0));
          }
          55% {
            opacity: 1;
            transform: scale(1);
            filter: drop-shadow(0 0 10px rgba(163, 230, 53, 0.55));
          }
          100% {
            opacity: 0.65;
            transform: scale(0.95);
            filter: drop-shadow(0 0 0 rgba(163, 230, 53, 0));
          }
        }
      `}</style>
    </main>
  );
}

/* ---------- math / easing ---------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** clamp to [0,1] then smootherstep: 6t^5 - 15t^4 + 10t^3 (C2 smooth) */
function smoother01(t: number) {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/* ---------- UI bits ---------- */

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

function MiniAssetBox({
  title,
  tag,
  cons,
  pros,
  color,
  highlight,
}: {
  title: string;
  tag: string;
  cons?: string[];
  pros?: string[];
  color: "cyan" | "violet" | "pink" | "amber" | "lime";
  highlight?: boolean;
}) {
  const colorMap: Record<
    string,
    { border: string; glow: string; pill: string; bg: string }
  > = {
    cyan: {
      border: "border-cyan-300/25",
      glow: "before:bg-cyan-400/18",
      pill: "border-cyan-300/25 bg-cyan-300/10 text-cyan-50",
      bg: "from-cyan-500/10",
    },
    violet: {
      border: "border-violet-300/25",
      glow: "before:bg-violet-400/18",
      pill: "border-violet-300/25 bg-violet-300/10 text-violet-50",
      bg: "from-violet-500/10",
    },
    pink: {
      border: "border-fuchsia-300/25",
      glow: "before:bg-fuchsia-400/18",
      pill: "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-50",
      bg: "from-fuchsia-500/10",
    },
    amber: {
      border: "border-amber-300/25",
      glow: "before:bg-amber-400/16",
      pill: "border-amber-300/25 bg-amber-300/10 text-amber-50",
      bg: "from-amber-500/10",
    },
    lime: {
      border: "border-lime-300/28",
      glow: "before:bg-lime-400/22",
      pill: "border-lime-300/28 bg-lime-300/12 text-lime-50",
      bg: "from-lime-500/12",
    },
  };

  const c = colorMap[color];

  return (
    <div
      className={[
        "relative rounded-3xl border bg-white/6 p-4 overflow-hidden",
        c.border,
        "before:content-[''] before:absolute before:-top-10 before:-right-10 before:h-40 before:w-40 before:rounded-full before:blur-3xl",
        c.glow,
        highlight
          ? "shadow-[0_0_0_1px_rgba(163,230,53,0.10),0_22px_70px_rgba(0,0,0,0.28)]"
          : "hover:border-white/25 transition",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-0 opacity-70 pointer-events-none",
          "bg-gradient-to-br",
          c.bg,
          "to-transparent",
        ].join(" ")}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <div className="text-white font-semibold text-sm leading-tight">
            {title}
          </div>
          <span
            className={[
              "shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px]",
              c.pill,
            ].join(" ")}
          >
            {tag}
          </span>
        </div>

        {cons?.length ? (
          <ul className="mt-3 space-y-1.5 text-[12px] text-white/80">
            {cons.slice(0, 3).map((x) => (
              <li key={x} className="flex gap-2 items-start">
                <span className="mt-[6px] h-2 w-2 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.35)]" />
                <span className="leading-snug">{x}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {pros?.length ? (
          <ul className="mt-3 space-y-1.5 text-[12px] text-white/80">
            {pros.slice(0, 3).map((x) => (
              <li key={x} className="flex gap-2 items-start">
                <span className="mt-[5px] inline-flex items-center justify-center">
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-lime-300"
                    style={{ animation: "pulseGreen 1.35s ease-in-out infinite" }}
                  />
                </span>
                <span className="leading-snug">{x}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function PulseDot() {
  return (
    <span className="mt-[6px] inline-flex items-center justify-center">
      <span
        className="h-2.5 w-2.5 rounded-full bg-lime-300"
        style={{ animation: "pulseGreen 1.25s ease-in-out infinite" }}
      />
    </span>
  );
}

/** Compact inline SVG chart */
function MiniChartCompact() {
  const labels = ["Y-5", "Y-4", "Y-3", "Y-2", "Y-1", "Hoy"];
  const series = [
    { name: "Eq", data: [100, 108, 95, 112, 109, 118], strong: false },
    { name: "Gov", data: [100, 103, 108, 112, 116, 120], strong: false },
    { name: "PE", data: [100, 96, 101, 114, 122, 130], strong: false },
    { name: "RE", data: [100, 104, 110, 107, 111, 116], strong: false },
    { name: "PD", data: [100, 106, 113, 121, 130, 140], strong: true },
  ];

  const W = 760;
  const H = 210;
  const pad = 16;

  const all = series.flatMap((s) => s.data);
  const min = Math.min(...all);
  const max = Math.max(...all);

  const sx = (i: number) =>
    pad + (i * (W - pad * 2)) / (labels.length - 1);
  const sy = (v: number) =>
    pad + ((max - v) * (H - pad * 2)) / Math.max(1, max - min);

  const path = (arr: number[]) =>
    arr
      .map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(2)} ${sy(v).toFixed(2)}`)
      .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* grid */}
      {[0, 1, 2, 3].map((k) => {
        const yy = pad + (k * (H - pad * 2)) / 3;
        return (
          <line
            key={k}
            x1={pad}
            y1={yy}
            x2={W - pad}
            y2={yy}
            stroke="white"
            strokeWidth="1"
            strokeDasharray="4 6"
            opacity="0.20"
          />
        );
      })}

      {/* lines */}
      {series.map((s) => (
        <path
          key={s.name}
          d={path(s.data)}
          fill="none"
          stroke={s.strong ? "rgba(163,230,53,0.95)" : "rgba(255,255,255,0.50)"}
          strokeWidth={s.strong ? 2.5 : 1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={s.strong ? 0.95 : 0.55}
        />
      ))}

      {/* end dots */}
      {series.map((s) => {
        const last = s.data[s.data.length - 1];
        return (
          <circle
            key={s.name + "-dot"}
            cx={sx(labels.length - 1)}
            cy={sy(last)}
            r={s.strong ? 3.2 : 2.5}
            fill={s.strong ? "rgba(163,230,53,1)" : "rgba(255,255,255,0.70)"}
            opacity={s.strong ? 1 : 0.7}
          />
        );
      })}

      {/* x labels */}
      <g fontSize="10" fill="rgba(255,255,255,0.55)">
        {labels.map((l, i) => (
          <text key={l} x={sx(i)} y={H - 6} textAnchor="middle">
            {l}
          </text>
        ))}
      </g>
    </svg>
  );
}
