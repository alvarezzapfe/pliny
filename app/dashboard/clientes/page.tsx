"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import CreateClientModal from "@/components/clients/CreateClientModal";
import EditClientModal from "@/components/clients/EditClientModal"; // ✅ NEW
import { supabase } from "@/lib/supabaseClient";

type ClientStatus = "Active" | "Onboarding" | "Paused" | "Risk Hold";
type BuroStatus = "not_connected" | "processing" | "ok" | "error";
type SatStatus = "not_connected" | "uploaded" | "processing" | "connected" | "error";

type ClientConnectors = {
  buro_status: BuroStatus | null;
  buro_score: number | null;
  sat_status: SatStatus | null;
};

type ClientRow = {
  id: string; // uuid
  company_name: string;
  rfc: string;
  status: ClientStatus;
  created_at: string;
  client_connectors?: ClientConnectors | ClientConnectors[] | null;
};

function statusBadge(status: ClientStatus) {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-emerald-800 ring-emerald-100";
    case "Onboarding":
      return "bg-sky-50 text-sky-800 ring-sky-100";
    case "Paused":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "Risk Hold":
      return "bg-amber-50 text-amber-900 ring-amber-100";
  }
}

function statusDot(status: ClientStatus) {
  switch (status) {
    case "Active":
      return "bg-emerald-500";
    case "Onboarding":
      return "bg-sky-500";
    case "Paused":
      return "bg-slate-400";
    case "Risk Hold":
      return "bg-amber-500";
  }
}

function shortDate(iso: string) {
  const s = String(iso || "");
  return s ? s.slice(0, 10) : "—";
}

function pillTone(kind: "buro" | "sat", status: string) {
  if (status === "ok" || status === "connected") return "bg-emerald-50 text-emerald-900 ring-emerald-100";
  if (status === "processing") return "bg-sky-50 text-sky-900 ring-sky-100";
  if (status === "uploaded") return "bg-indigo-50 text-indigo-900 ring-indigo-100";
  if (status === "error") return "bg-rose-50 text-rose-900 ring-rose-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function normalizeJoin(cc: ClientRow["client_connectors"]): ClientConnectors | null {
  if (!cc) return null;
  if (Array.isArray(cc)) return (cc[0] as any) ?? null;
  return cc as any;
}

export default function ClientesPage() {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  // ✅ NEW: edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<ClientRow | null>(null);

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<ClientStatus | "All">("All");

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setRows([]);
        setErr("No hay sesión. Inicia sesión para ver tus clientes.");
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select(
          `
          id, company_name, rfc, status, created_at,
          client_connectors ( buro_status, sat_status, buro_score )
        `
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setRows((data ?? []) as ClientRow[]);
    } catch (e: any) {
      setErr(String(e?.message ?? "Error cargando clientes"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === "Active").length;
    const onboarding = rows.filter((r) => r.status === "Onboarding").length;
    return { total, active, onboarding };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchFilter = filter === "All" ? true : r.status === filter;
      const matchQ =
        !query ||
        r.company_name.toLowerCase().includes(query) ||
        r.rfc.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query);
      return matchFilter && matchQ;
    });
  }, [rows, q, filter]);

  return (
    <PageShell
      title="Clientes"
      subtitle="Empresas registradas por usuario (Supabase + RLS)."
      right={
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-[#071A3A] px-3 py-2 text-[12px] font-semibold text-white hover:opacity-95"
        >
          Nuevo cliente
        </button>
      }
    >
      <CreateClientModal open={open} onClose={() => setOpen(false)} onCreated={load} />

      {/* ✅ NEW: Edit modal */}
      <EditClientModal
        open={editOpen}
        onOpenChange={setEditOpen}
        client={
          selected
            ? {
                id: selected.id,
                name: selected.company_name,
                email: null, // si tu tabla clients no tiene email/phone, lo dejamos null
                phone: null,
              }
            : null
        }
        onUpdated={async () => {
          // refresca tabla (source of truth)
          await load();
        }}
      />

      {/* Top controls */}
      <div className="mb-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
          <div className="text-[11px] font-semibold tracking-wide text-slate-500">TOTAL</div>
          <div className="mt-1 text-[22px] font-semibold text-slate-900">{stats.total}</div>
          <div className="mt-1 text-[12px] text-slate-500">Clientes registrados</div>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
          <div className="text-[11px] font-semibold tracking-wide text-slate-500">ACTIVOS</div>
          <div className="mt-1 text-[22px] font-semibold text-slate-900">{stats.active}</div>
          <div className="mt-1 text-[12px] text-slate-500">Con estatus Active</div>
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70">
          <div className="text-[11px] font-semibold tracking-wide text-slate-500">ONBOARDING</div>
          <div className="mt-1 text-[22px] font-semibold text-slate-900">{stats.onboarding}</div>
          <div className="mt-1 text-[12px] text-slate-500">Pendientes de KYC</div>
        </div>
      </div>

      <SectionCard title="Listado" subtle={String(filtered.length)} right={null}>
        {/* Search & filter row */}
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full items-center gap-2">
            <div className="flex w-full items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200/70">
              <span className="h-2 w-2 rounded-full bg-[#071A3A]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por empresa, RFC o id…"
                className="w-full bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              {q ? (
                <button
                  onClick={() => setQ("")}
                  className="rounded-xl bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Limpiar
                </button>
              ) : null}
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="h-[40px] rounded-2xl bg-white px-3 text-[13px] text-slate-900 ring-1 ring-slate-200/70 outline-none"
            >
              <option value="All">Todos</option>
              <option value="Active">Active</option>
              <option value="Onboarding">Onboarding</option>
              <option value="Paused">Paused</option>
              <option value="Risk Hold">Risk Hold</option>
            </select>
          </div>

          <div className="text-[12px] text-slate-500">
            Tip: click en la fila o en <span className="font-semibold">Ver</span>.
          </div>
        </div>

        {err ? (
          <div className="mb-3 rounded-2xl bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-800 ring-1 ring-rose-100">
            {err}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">RFC</th>
                  <th className="px-4 py-3 font-semibold">Estatus</th>
                  <th className="px-4 py-3 font-semibold">Buró</th>
                  <th className="px-4 py-3 font-semibold">SAT</th>
                  <th className="px-4 py-3 font-semibold">Creado</th>
                  <th className="px-4 py-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>

              <tbody className="text-slate-900">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-t border-slate-200/70">
                      <td className="px-4 py-3">
                        <div className="h-4 w-52 rounded bg-slate-100" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-32 rounded bg-slate-100" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-28 rounded-full bg-slate-100" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-24 rounded-full bg-slate-100" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-24 rounded-full bg-slate-100" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-20 rounded bg-slate-100" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="ml-auto h-8 w-24 rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr className="border-t border-slate-200/70">
                    <td className="px-4 py-8 text-slate-500" colSpan={7}>
                      No hay resultados. Prueba otro filtro o crea un cliente.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, idx) => {
                    const cc = normalizeJoin(c.client_connectors);
                    const buro = cc?.buro_status ?? "not_connected";
                    const sat = cc?.sat_status ?? "not_connected";
                    const buroScore = cc?.buro_score ?? null;

                    return (
                      <tr
                        key={c.id}
                        className={[
                          "border-t border-slate-200/70",
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/30",
                          "hover:bg-slate-50",
                          "cursor-pointer",
                          "transition-colors",
                        ].join(" ")}
                        onClick={() => router.push(`/dashboard/clientes/${encodeURIComponent(c.id)}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className={["h-2.5 w-2.5 rounded-full", statusDot(c.status)].join(" ")} />
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-slate-900">
                                {c.company_name}
                              </div>
                              <div className="truncate text-[11px] text-slate-500">{c.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-[11px] text-slate-700">{c.rfc}</td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                              statusBadge(c.status),
                            ].join(" ")}
                          >
                            <span className={["h-1.5 w-1.5 rounded-full", statusDot(c.status)].join(" ")} />
                            {c.status}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                                pillTone("buro", buro),
                              ].join(" ")}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                              {buro}
                            </span>

                            {buro === "ok" && typeof buroScore === "number" ? (
                              <span className="inline-flex items-center rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-900 ring-1 ring-slate-200/70">
                                {buroScore}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                              pillTone("sat", sat),
                            ].join(" ")}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            {sat}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-700">{shortDate(c.created_at)}</td>

                        {/* ✅ ACTIONS: Ver + Editar */}
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(c);
                                setEditOpen(true);
                              }}
                              className={[
                                "inline-flex items-center rounded-xl px-3 py-2 text-[11px] font-semibold",
                                "bg-white text-slate-900 ring-1 ring-slate-200/70",
                                "transition-all hover:bg-slate-50 active:scale-[0.98]",
                              ].join(" ")}
                            >
                              Editar
                            </button>

                            <Link
                              href={`/dashboard/clientes/${encodeURIComponent(c.id)}`}
                              className={[
                                "inline-flex items-center rounded-xl px-3 py-2 text-[11px] font-semibold",
                                "bg-slate-100 text-slate-900 ring-1 ring-slate-200/70",
                                "transition-all",
                                "hover:bg-[#00E599] hover:text-[#001B12]",
                                "hover:ring-[#00E599]/40 hover:shadow-[0_0_0_4px_rgba(0,229,153,0.18)]",
                                "active:scale-[0.98]",
                              ].join(" ")}
                            >
                              Ver
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 text-[12px] text-slate-500">
          Ahora el listado trae Buró/SAT desde <span className="font-mono">client_connectors</span>. Siguiente: Quick Actions por fila (Consultar/Reset) y tabla editable de contacto.
        </div>
      </SectionCard>
    </PageShell>
  );
}