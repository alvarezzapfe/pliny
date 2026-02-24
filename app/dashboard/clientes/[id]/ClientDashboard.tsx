"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import { supabase } from "@/lib/supabaseClient";

type ClientStatus = "Active" | "Onboarding" | "Paused" | "Risk Hold";
type BuroStatus = "not_connected" | "processing" | "ok" | "error";
type SatStatus = "not_connected" | "uploaded" | "processing" | "connected" | "error";

type ClientRow = {
  id: string;
  company_name: string;
  rfc: string;
  status: ClientStatus;
  created_at: string;
};

type ConnectorRow = {
  buro_status: BuroStatus;
  buro_score: number | null;
  buro_last_checked: string | null;
  sat_status: SatStatus;
  sat_last_checked: string | null;
};

function badgeClass(status: string) {
  switch (status) {
    case "ok":
    case "connected":
      return "bg-emerald-50 text-emerald-800 ring-emerald-100";
    case "processing":
      return "bg-blue-50 text-blue-800 ring-blue-100";
    case "uploaded":
      return "bg-indigo-50 text-indigo-800 ring-indigo-100";
    case "error":
      return "bg-rose-50 text-rose-800 ring-rose-100";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function StatusPill({ label, status }: { label: string; status: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold ring-1",
        badgeClass(status),
      ].join(" ")}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-60" />
      {label}
    </span>
  );
}

function scoreTone(score?: number) {
  if (score == null) return "text-slate-900";
  if (score >= 760) return "text-emerald-700";
  if (score >= 680) return "text-blue-700";
  if (score >= 600) return "text-amber-700";
  return "text-rose-700";
}

function buroMessageFor(status: BuroStatus) {
  if (status === "not_connected") return "Sin integración configurada.";
  if (status === "processing") return "Consultando fuentes…";
  if (status === "ok") return "Score disponible.";
  return "Error al consultar.";
}

export default function ClientDashboard({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // persisted connector state (client_connectors)
  const [buroStatus, setBuroStatus] = useState<BuroStatus>("not_connected");
  const [buroScore, setBuroScore] = useState<number | undefined>(undefined);
  const [buroLast, setBuroLast] = useState<string | undefined>(undefined);
  const [buroMsg, setBuroMsg] = useState<string>(buroMessageFor("not_connected"));

  const [satStatus, setSatStatus] = useState<SatStatus>("not_connected");
  const [satLast, setSatLast] = useState<string | undefined>(undefined);

  async function loadClient() {
    setErr(null);
    setLoading(true);

    if (!clientId || clientId === "undefined") {
      setClient(null);
      setErr("Ruta inválida: falta el id del cliente.");
      setLoading(false);
      return;
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setClient(null);
        setErr("No hay sesión. Inicia sesión.");
        return;
      }

      // 1) client
      const { data: c, error: cErr } = await supabase
        .from("clients")
        .select("id, company_name, rfc, status, created_at")
        .eq("id", clientId)
        .single();

      if (cErr) throw cErr;
      setClient(c as ClientRow);

      // 2) connectors
      const { data: cc, error: ccErr } = await supabase
        .from("client_connectors")
        .select("buro_status, buro_score, buro_last_checked, sat_status, sat_last_checked")
        .eq("client_id", clientId)
        .single();

      if (ccErr) throw ccErr;

      const row = cc as ConnectorRow;

      setBuroStatus(row.buro_status ?? "not_connected");
      setBuroScore(row.buro_score ?? undefined);
      setBuroLast(row.buro_last_checked ? String(row.buro_last_checked).slice(0, 10) : undefined);
      setBuroMsg(buroMessageFor(row.buro_status ?? "not_connected"));

      setSatStatus(row.sat_status ?? "not_connected");
      setSatLast(row.sat_last_checked ? String(row.sat_last_checked).slice(0, 10) : undefined);
    } catch (e: any) {
      setClient(null);
      setErr(String(e?.message ?? "No autorizado o no existe"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function handleBuroCheck() {
    // optimistic UI + persist processing
    setBuroStatus("processing");
    setBuroMsg(buroMessageFor("processing"));

    await supabase
      .from("client_connectors")
      .update({
        buro_status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", clientId);

    try {
      const res = await fetch("/api/buro/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.status !== "ok" || typeof data?.score !== "number") {
        setBuroStatus("error");
        setBuroMsg(buroMessageFor("error"));

        await supabase
          .from("client_connectors")
          .update({
            buro_status: "error",
            updated_at: new Date().toISOString(),
          })
          .eq("client_id", clientId);

        return;
      }

      const lastCheckedISO = new Date().toISOString();

      setBuroStatus("ok");
      setBuroScore(data.score);
      setBuroLast(String(data.lastChecked ?? lastCheckedISO).slice(0, 10) || undefined);
      setBuroMsg(buroMessageFor("ok"));

      await supabase
        .from("client_connectors")
        .update({
          buro_status: "ok",
          buro_score: data.score,
          buro_last_checked: lastCheckedISO,
          updated_at: lastCheckedISO,
        })
        .eq("client_id", clientId);
    } catch {
      setBuroStatus("error");
      setBuroMsg(buroMessageFor("error"));

      await supabase
        .from("client_connectors")
        .update({
          buro_status: "error",
          updated_at: new Date().toISOString(),
        })
        .eq("client_id", clientId);
    }
  }

  async function handleBuroReset() {
    setBuroStatus("not_connected");
    setBuroScore(undefined);
    setBuroLast(undefined);
    setBuroMsg(buroMessageFor("not_connected"));

    await supabase
      .from("client_connectors")
      .update({
        buro_status: "not_connected",
        buro_score: null,
        buro_last_checked: null,
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", clientId);
  }

  const right = (
    <div className="flex items-center gap-2">
      <StatusPill label={`Buro: ${buroStatus}`} status={buroStatus} />
      <StatusPill label={`SAT: ${satStatus}`} status={satStatus} />
    </div>
  );

  if (loading) {
    return (
      <PageShell title="Cargando…" subtitle="Cliente" right={right}>
        <div className="grid gap-4">
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="h-72 rounded-2xl bg-slate-100" />
        </div>
      </PageShell>
    );
  }

  if (!client) {
    return (
      <PageShell title="Cliente" subtitle="No disponible" right={right}>
        <div className="rounded-2xl bg-rose-50 p-4 text-[13px] font-semibold text-rose-800 ring-1 ring-rose-100">
          {err ?? "No autorizado o no existe."}
        </div>
        <div className="mt-3 text-[12px] text-slate-500">
          <Link href="/dashboard/clientes" className="font-semibold hover:underline">
            Volver a clientes
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={client.company_name} subtitle={`${client.id} · RFC ${client.rfc}`} right={right}>
      <div className="mb-4 text-[12px] text-slate-500">
        <Link href="/dashboard/clientes" className="font-semibold hover:underline">
          Clientes
        </Link>{" "}
        <span className="mx-2">/</span>
        <span className="text-slate-700 font-semibold">{client.company_name}</span>
      </div>

      {/* ✅ Tabla de información (contacto & profile) - placeholders por ahora */}
      <SectionCard title="Información del cliente" subtle="perfil & contacto">
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
          <table className="w-full text-left text-[12px]">
            <tbody>
              <tr className="border-t border-slate-200/70">
                <td className="w-[220px] bg-slate-50 px-4 py-3 font-semibold text-slate-600">
                  Razón social
                </td>
                <td className="px-4 py-3 text-slate-900">{client.company_name}</td>
              </tr>
              <tr className="border-t border-slate-200/70">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-600">RFC</td>
                <td className="px-4 py-3 font-mono text-[11px] text-slate-800">{client.rfc}</td>
              </tr>
              <tr className="border-t border-slate-200/70">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-600">Contacto principal</td>
                <td className="px-4 py-3 text-slate-500">— (pendiente)</td>
              </tr>
              <tr className="border-t border-slate-200/70">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-600">Correo</td>
                <td className="px-4 py-3 text-slate-500">— (pendiente)</td>
              </tr>
              <tr className="border-t border-slate-200/70">
                <td className="bg-slate-50 px-4 py-3 font-semibold text-slate-600">Teléfono</td>
                <td className="px-4 py-3 text-slate-500">— (pendiente)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-[12px] text-slate-500">
          Siguiente: guardar estos campos en DB (tabla <span className="font-mono">client_profiles</span>) y permitir editar.
        </div>
      </SectionCard>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <SectionCard title="Estatus" subtle="cliente">
          <div className="text-[18px] font-semibold text-slate-900">{client.status}</div>
          <div className="mt-1 text-[12px] text-slate-500">
            Creado: {String(client.created_at).slice(0, 10)}
          </div>
        </SectionCard>

        <SectionCard title="Solicitudes" subtle="placeholder">
          <div className="text-[24px] font-semibold tracking-tight text-slate-900">—</div>
          <div className="mt-1 text-[12px] text-slate-500">En proceso</div>
        </SectionCard>

        <SectionCard title="KYC" subtle="placeholder">
          <div className="text-[13px] font-semibold text-slate-900">Pendiente</div>
          <div className="mt-1 text-[12px] text-slate-500">Aún no iniciado</div>
        </SectionCard>

        <SectionCard title="Última actividad" subtle="conectores">
          <div className="text-[13px] font-semibold text-slate-900">
            {satLast || buroLast || String(client.created_at).slice(0, 10)}
          </div>
          <div className="mt-1 text-[12px] text-slate-500">Último evento</div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Buro de crédito"
          subtle="score & report"
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={handleBuroCheck}
                className="rounded-xl bg-[#071A3A] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-95 disabled:opacity-60"
                disabled={buroStatus === "processing"}
              >
                {buroStatus === "processing" ? "Consultando…" : "Consultar"}
              </button>
              <button
                onClick={handleBuroReset}
                className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-200"
              >
                Reset
              </button>
            </div>
          }
        >
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[12px] font-semibold text-slate-500">Estatus</div>
                <div className="mt-0.5 text-[13px] font-semibold text-slate-900">{buroStatus}</div>
                <div className="mt-1 text-[12px] text-slate-500">{buroMsg}</div>
              </div>

              <div className="text-right">
                <div className="text-[12px] font-semibold text-slate-500">Score</div>
                <div className={`mt-0.5 text-[28px] font-semibold ${scoreTone(buroScore)}`}>
                  {buroStatus === "ok" ? buroScore ?? "—" : "—"}
                </div>
                <div className="text-[12px] text-slate-500">
                  Última consulta: {buroLast ?? "—"}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>300</span>
                <span>600</span>
                <span>900</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white ring-1 ring-slate-200/70">
                <div
                  className="h-full bg-[#071A3A]"
                  style={{
                    width:
                      buroStatus === "ok" && typeof buroScore === "number"
                        ? `${Math.max(0, Math.min(100, ((buroScore - 300) / 600) * 100))}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="SAT" subtle="CFDI & compliance">
          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
            <div className="text-[12px] font-semibold text-slate-500">Estatus</div>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-900">{satStatus}</div>
            <div className="mt-1 text-[12px] text-slate-500">Última consulta: {satLast ?? "—"}</div>

            <div className="mt-2 text-[12px] text-slate-500">
              Siguiente paso: conectar endpoint mock de SAT y persistir métricas.
            </div>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}