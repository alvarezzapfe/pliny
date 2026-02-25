"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import { supabase } from "@/lib/supabaseClient";

type LenderProfile = {
  id: string;
  owner_id: string;
  institution_type: string;
  institution_name: string | null;
  rfc: string | null;
  legal_rep_name: string | null;
  legal_rep_email: string | null;
  legal_rep_phone: string | null;
};

function Pill({ label, tone = "ok" }: { label: string; tone?: "ok" | "warn" | "info" }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 ring-amber-100"
        : "bg-slate-100 text-slate-800 ring-slate-200";
  return (
    <span className={["inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold ring-1", cls].join(" ")}>
      <span className="h-2 w-2 rounded-full bg-current opacity-60" />
      {label}
    </span>
  );
}

function fmtInstitutionType(v: string) {
  switch (v) {
    case "bank":
      return "Banco";
    case "private_fund":
      return "Fondo privado";
    case "sofom":
      return "SOFOM";
    case "credit_union":
      return "Caja de ahorro";
    case "sofipo":
      return "SOFIPO";
    case "ifc_crowd":
      return "IFC crowd";
    case "sapi":
      return "SAPI";
    default:
      return "Otro";
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<LenderProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setProfile(null);
        setErr("No hay sesión.");
        return;
      }

      const { data, error } = await supabase
        .from("lenders_profile")
        .select("id, owner_id, institution_type, institution_name, rfc, legal_rep_name, legal_rep_email, legal_rep_phone")
        .eq("owner_id", auth.user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile((data as any) ?? null);
    } catch (e: any) {
      setErr(String(e?.message ?? "Error cargando dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const onboardingComplete = useMemo(() => {
    if (!profile) return false;
    // mínimo viable
    return Boolean(profile.institution_type && (profile.legal_rep_name || profile.legal_rep_email));
  }, [profile]);

  const right = (
    <div className="flex items-center gap-2">
      <Pill label={onboardingComplete ? "Onboarding: OK" : "Onboarding: Pendiente"} tone={onboardingComplete ? "ok" : "warn"} />
      <Pill label="Sistema: OK" tone="info" />
    </div>
  );

  return (
    <PageShell
      title="Dashboard"
      subtitle="Panel del otorgante: pipeline, actividad y operación."
      right={right}
    >
      {err ? (
        <div className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-800 ring-1 ring-rose-100">
          {err}
        </div>
      ) : null}

      {/* Onboarding banner */}
      {!loading && !onboardingComplete ? (
        <div className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-[#071A3A] p-[1px]">
          <div className="rounded-3xl bg-white px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-500">PRIMER PASO</div>
                <div className="mt-1 text-[15px] font-semibold text-slate-900">
                  Completa tu perfil de otorgante para personalizar el sistema.
                </div>
                <div className="mt-1 text-[12px] text-slate-600">
                  Tipo de institución + representante legal (1 min).
                </div>
              </div>
              <Link
                href="/dashboard/datos"
                className="inline-flex items-center justify-center rounded-xl bg-[#071A3A] px-4 py-2 text-[12px] font-semibold text-white hover:opacity-95"
              >
                Completar datos
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* KPI row (otorgante) */}
      <div className="grid gap-4 lg:grid-cols-4">
        <SectionCard title="Pipeline" subtle="MXN">
          <div className="text-[26px] font-semibold tracking-tight text-slate-900">—</div>
          <div className="mt-1 text-[12px] text-slate-500">Monto total en evaluación</div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-[#071A3A]" style={{ width: "35%" }} />
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Distribución (placeholder)</div>
        </SectionCard>

        <SectionCard title="Solicitudes" subtle="30 días">
          <div className="text-[26px] font-semibold tracking-tight text-slate-900">—</div>
          <div className="mt-1 text-[12px] text-slate-500">Nuevas solicitudes creadas</div>
          <div className="mt-2 text-[11px] text-slate-500">
            Meta: automatizar intake + pre-score
          </div>
        </SectionCard>

        <SectionCard title="Clientes" subtle="empresas">
          <div className="text-[26px] font-semibold tracking-tight text-slate-900">—</div>
          <div className="mt-1 text-[12px] text-slate-500">Empresas registradas</div>
          <div className="mt-2 text-[11px] text-slate-500">
            Buró/SAT se ve dentro de cada cliente
          </div>
        </SectionCard>

        <SectionCard title="Perfil" subtle={onboardingComplete ? "configurado" : "pendiente"}>
          {loading ? (
            <div className="h-6 w-28 rounded bg-slate-100" />
          ) : onboardingComplete ? (
            <>
              <div className="text-[13px] font-semibold text-slate-900">
                {profile?.institution_name || fmtInstitutionType(profile?.institution_type || "other")}
              </div>
              <div className="mt-1 text-[12px] text-slate-500">
                {fmtInstitutionType(profile?.institution_type || "other")}
              </div>
              <div className="mt-3">
                <Link
                  href="/dashboard/datos"
                  className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-200"
                >
                  Editar
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px] font-semibold text-slate-900">Completa tu onboarding</div>
              <div className="mt-1 text-[12px] text-slate-500">Tipo de institución y rep legal</div>
              <div className="mt-3">
                <Link
                  href="/dashboard/datos"
                  className="inline-flex items-center rounded-xl bg-[#071A3A] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-95"
                >
                  Completar
                </Link>
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* Lower grid */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Activity / pipeline detail */}
        <div className="lg:col-span-2">
          <SectionCard title="Actividad" subtle="últimos eventos">
            <div className="space-y-2">
              <ActivityRow title="—" subtitle="Eventos del sistema (placeholder)" />
              <ActivityRow title="—" subtitle="Acciones recientes (placeholder)" />
              <div className="mt-3 text-[11px] text-slate-500">
                Próximo: registrar eventos al crear cliente, correr SAT/Buró y generar métricas.
              </div>
            </div>
          </SectionCard>

          <div className="mt-4">
            <SectionCard title="Pipeline (vista rápida)" subtle="estados">
              <div className="grid gap-3 lg:grid-cols-3">
                <MiniStatusCard label="Nuevas" value="—" hint="intake" />
                <MiniStatusCard label="En revisión" value="—" hint="análisis" />
                <MiniStatusCard label="Aprobadas" value="—" hint="lista" />
              </div>
              <div className="mt-3 text-[11px] text-slate-500">
                Próximo: conectar con tabla solicitudes y mostrar conteos reales.
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Quick actions */}
        <SectionCard title="Acciones" subtle="quick ops">
          <div className="grid gap-2">
            <Link
              href="/dashboard/solicitudes"
              className="rounded-xl bg-[#071A3A] px-3 py-2 text-center text-[12px] font-semibold text-white hover:opacity-95"
            >
              Ver solicitudes
            </Link>

            <Link
              href="/dashboard/clientes"
              className="rounded-xl bg-slate-100 px-3 py-2 text-center text-[12px] font-semibold text-slate-800 hover:bg-slate-200"
            >
              Ver empresas (clientes)
            </Link>

            <Link
              href="/dashboard/datos"
              className="rounded-xl bg-slate-100 px-3 py-2 text-center text-[12px] font-semibold text-slate-800 hover:bg-slate-200"
            >
              Datos / onboarding
            </Link>

            <button
              className="rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-slate-800 ring-1 ring-slate-200/70 hover:bg-slate-50"
              onClick={() => alert("Backlog: configuración avanzada / roles / API keys")}
            >
              Configuración (backlog)
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
            <div className="text-[11px] font-semibold tracking-wide text-slate-500">MVP</div>
            <div className="mt-1 text-[12px] text-slate-700">
              Objetivo: intake → pre-score (SAT/Buró) → decisión.
            </div>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}

function ActivityRow({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
      <div className="text-slate-900 font-semibold text-[12px]">{title}</div>
      <div className="text-[12px] text-slate-500">{subtitle}</div>
    </div>
  );
}

function MiniStatusCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
      <div className="text-[11px] font-semibold tracking-wide text-slate-500">{label.toUpperCase()}</div>
      <div className="mt-1 text-[22px] font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-[12px] text-slate-500">{hint}</div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#00E599]" style={{ width: "30%" }} />
      </div>
    </div>
  );
}