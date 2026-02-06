import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen burocrowd-bg px-4 py-6 md:py-10">
      {/* Glow overlays (más bright) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-80 w-80 rounded-full bg-lime-400/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-white/15 bg-white/6 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Top */}
          <header className="px-5 md:px-8 py-4 border-b border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img src="/crowdlink-logo.png" alt="Crowdlink" className="h-9 w-auto" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-white font-semibold leading-tight truncate">burocrowdlink</div>
                    <span className="hidden sm:inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-white/75">
                      Somos un API de Crowdlink
                    </span>
                  </div>
                  <div className="text-white/70 text-xs md:text-sm truncate">
                    API de salud financiera • facturación • score crediticio
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

            {/* Mobile badge */}
            <div className="mt-3 sm:hidden">
              <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-white/75">
                
              </span>
            </div>
          </header>

          {/* Body */}
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            {/* Left: intro ultra compacto */}
            <section className="px-5 md:px-8 py-5 md:py-7 border-b lg:border-b-0 lg:border-r border-white/10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-3 py-1 text-[11px] text-white/85">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
                Conectividad
              </div>

              <h1 className="mt-3 text-2xl md:text-3xl font-semibold text-white leading-tight">
                API de salud financiera para Empresas{" "}
                <span className="text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">en minutos</span>.
              </h1>

              <p className="mt-2 text-white/75 text-sm leading-relaxed">
                Facturación (SAT/CFDI) + score buró + reporte PDF ejecutivo.
              </p>

              {/* Feature chips bright */}
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip text="24 meses facturación" tone="cyan" />
                <Chip text="Score 100–900" tone="lime" />
                <Chip text="Reporte PDF" tone="violet" />
                <Chip text="Integración API" tone="pink" />
              </div>

              {/* CTA */}
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
                Click en un plan → contacto → integración con tu equipo.
              </div>
            </section>

            {/* Right: pricing cards (bright tech) */}
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

              <div className="mt-4 text-center text-[11px] text-white/55">
                © {new Date().getFullYear()} burocrowdlink
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
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
    glow === "cyan"
      ? "before:bg-cyan-400/30"
      : "before:bg-violet-400/28";

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
          <div className="text-white font-semibold text-2xl leading-none">{price}</div>
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
