"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/auth";

type RevenuePoint = { month: string; value: number };
type UserRow = {
  id: string;
  company?: string;
  rfc?: string;
  updatedAt: string;
  buroScore?: number;
  avgMonthlyRevenue?: number;
  // opcional: podrías guardar revenueMonthlyMXN por usuario si luego lo manejas
};

const USERS_KEY = "bcl_users";

function readUser(id: string): UserRow | null {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return null;
  try {
    const users = JSON.parse(raw) as UserRow[];
    return users.find((u) => u.id === id) || null;
  } catch {
    return null;
  }
}

function isoDate(d: string) {
  try {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return "—";
    return x.toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserRow | null>(null);

  // Por ahora: como no guardas revenue por usuario, mostramos placeholder.
  // Después lo conectamos al resultado real del job SAT por usuario.
  const revenue: RevenuePoint[] = useMemo(
    () => [
      { month: "Ago", value: 420000 },
      { month: "Sep", value: 510000 },
      { month: "Oct", value: 480000 },
      { month: "Nov", value: 610000 },
      { month: "Dic", value: 740000 },
      { month: "Ene", value: 690000 },
    ],
    []
  );

  const maxVal = useMemo(() => Math.max(1, ...revenue.map((r) => r.value || 0)), [revenue]);

  useEffect(() => {
    setMounted(true);

    const s = getSession();
    if (!s || s.role !== "admin") {
      router.replace("/admin/login");
      return;
    }

    setUser(readUser(id));
  }, [router, id]);

  const logout = () => {
    clearSession();
    router.push("/admin/login");
  };

  if (!mounted) return null;

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b1220] text-white">
        <header className="border-b border-white/10 bg-black/25 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-5 md:px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/plinius.png" alt="Crowdlink" className="h-8 w-auto" />
              <div className="font-semibold">Detalle de usuario</div>
            </div>
            <button
              onClick={logout}
              className="rounded-2xl border border-white/15 bg-white/5 text-white px-4 py-2.5 hover:bg-white/10 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-5 md:px-8 py-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="font-semibold">Usuario no encontrado</div>
            <div className="text-white/60 text-sm mt-1">Regresa y selecciona otro usuario.</div>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="mt-5 rounded-2xl bg-white text-black font-semibold px-4 py-2.5 hover:opacity-90 transition"
            >
              Volver
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1220] text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/25 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/plinius.png" alt="Crowdlink" className="h-8 w-auto" />
            <div className="min-w-0">
              <div className="font-semibold truncate">{user.company || "Empresa"}</div>
              <div className="text-white/60 text-xs truncate">
                {user.rfc || "—"} • actualizado {isoDate(user.updatedAt)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="rounded-2xl border border-white/15 bg-white/5 text-white px-4 py-2.5 hover:bg-white/10 transition"
            >
              Volver
            </button>

            <button
              onClick={logout}
              className="rounded-2xl bg-white text-black font-semibold px-4 py-2.5 hover:opacity-90 transition"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 md:px-8 py-7">
        {/* Summary */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Score buró" value={user.buroScore?.toString() ?? "—"} />
          <KPI label="Band" value={bandFromScore(user.buroScore)} />
          <KPI label="Facturación prom." value={user.avgMonthlyRevenue ? mxn(user.avgMonthlyRevenue) : "—"} />
          <KPI label="ID" value={user.id} mono />
        </div>

        <div className="mt-6 grid lg:grid-cols-2 gap-5">
          <Card title="Facturación (placeholder)" subtitle="Cuando conectemos SAT real, esto es por usuario">
            <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-end gap-3 h-44">
                {revenue.map((p) => {
                  const h = Math.round((p.value / maxVal) * 100);
                  return (
                    <div key={p.month} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full rounded-2xl bg-white/80"
                        style={{ height: `${Math.max(6, h)}%`, transition: "height .4s ease" }}
                        title={`${p.month}: ${mxn(p.value)}`}
                      />
                      <div className="text-white/70 text-xs">{p.month}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card title="Score buró (gauge)" subtitle="100 (malo) → 900 (bueno)">
            <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-5">
              <Gauge score={user.buroScore ?? 100} />
            </div>
          </Card>
        </div>

        <div className="mt-10 text-center text-xs text-white/45">© {new Date().getFullYear()} Crowdlink</div>
      </div>
    </main>
  );
}

/* --------- UI ---------- */

function KPI({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
      <div className="text-white/60 text-xs">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${mono ? "font-mono text-lg" : ""}`}>{value}</div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="font-semibold text-lg">{title}</div>
      <div className="text-white/60 text-sm mt-1">{subtitle}</div>
      {children}
    </div>
  );
}

function bandFromScore(score?: number) {
  if (score == null) return "—";
  if (score < 500) return "Bajo";
  if (score < 700) return "Medio";
  return "Alto";
}

function mxn(n: number) {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

/* Gauge simple (semi circle) */
function Gauge({ score }: { score: number }) {
  const min = 100;
  const max = 900;
  const clamped = Math.max(min, Math.min(max, score));
  const t = (clamped - min) / (max - min);
  const angle = -90 + t * 180;

  return (
    <div className="w-full flex items-center justify-center">
      <svg width="320" height="190" viewBox="0 0 320 190" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="rg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,80,80,0.95)" />
            <stop offset="50%" stopColor="rgba(255,212,0,0.95)" />
            <stop offset="100%" stopColor="rgba(65,232,151,0.95)" />
          </linearGradient>
        </defs>

        <path
          d="M 40 160 A 120 120 0 0 1 280 160"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M 40 160 A 120 120 0 0 1 280 160"
          stroke="url(#rg2)"
          strokeWidth="14"
          strokeLinecap="round"
        />

        <g transform={`translate(160 160) rotate(${angle})`}>
          <line x1="0" y1="0" x2="92" y2="0" stroke="rgba(255,255,255,0.92)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="0" cy="0" r="8" fill="rgba(255,255,255,0.92)" />
        </g>

        <text x="160" y="182" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="12">
          Score 100–900
        </text>
      </svg>
    </div>
  );
}
