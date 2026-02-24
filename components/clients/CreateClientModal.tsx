"use client";

import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ClientStatus = "Active" | "Onboarding" | "Paused" | "Risk Hold";

function normalizeRFC(v: string) {
  return v.trim().toUpperCase().replace(/\s+/g, "");
}

function isUniqueOrDuplicate(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("duplicate") || m.includes("unique") || m.includes("23505");
}

export default function CreateClientModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [companyName, setCompanyName] = useState("");
  const [rfc, setRfc] = useState("");
  const [status, setStatus] = useState<ClientStatus>("Onboarding");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rfcNorm = useMemo(() => normalizeRFC(rfc), [rfc]);
  const canSubmit =
    companyName.trim().length >= 2 && (rfcNorm.length === 12 || rfcNorm.length === 13);

  async function handleCreate() {
    setErr(null);
    setLoading(true);

    let createdClientId: string | null = null;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) throw new Error("No session (haz login)");

      // 1) Insert client (y trae id uuid)
      const payload = {
        owner_user_id: user.id,
        company_name: companyName.trim(),
        rfc: rfcNorm,
        status,
      };

      const { data: client, error: clientErr } = await supabase
        .from("clients")
        .insert([payload])
        .select("id")
        .single();

      if (clientErr) throw clientErr;

      createdClientId = client?.id ?? null;
      if (!createdClientId) throw new Error("No se recibió id del cliente");

      // 2) Insert connector row (default)
      const { error: ccErr } = await supabase.from("client_connectors").insert([
        {
          client_id: createdClientId,
          owner_user_id: user.id,
          buro_status: "not_connected",
          sat_status: "not_connected",
          buro_score: null,
        },
      ]);
      if (ccErr) throw ccErr;

      // 3) Insert profile row (ficha vacía)
      const { error: profErr } = await supabase.from("client_profiles").insert([
        {
          client_id: createdClientId,
          owner_user_id: user.id,
          contact_name: null,
          contact_email: null,
          contact_phone: null,
          billing_email: null,
          website: null,
          address: null,
          notes: null,
        },
      ]);
      if (profErr) throw profErr;

      // reset
      setCompanyName("");
      setRfc("");
      setStatus("Onboarding");

      onCreated();
      onClose();
    } catch (e: any) {
      const msg = String(e?.message ?? "Error creando cliente");

      // rollback (si se creó el client pero falló algo después)
      if (createdClientId) {
        // intenta limpiar en orden (hijo -> padre)
        await supabase.from("client_profiles").delete().eq("client_id", createdClientId);
        await supabase.from("client_connectors").delete().eq("client_id", createdClientId);
        await supabase.from("clients").delete().eq("id", createdClientId);
      }

      if (isUniqueOrDuplicate(msg)) {
        setErr("Ese RFC ya existe (en tus clientes).");
      } else if (msg.toLowerCase().includes("row level security")) {
        setErr("RLS bloqueó la operación. Revisa policies (clients / client_connectors / client_profiles).");
      } else if (msg.toLowerCase().includes("client_profiles")) {
        setErr("No se pudo crear la ficha (client_profiles). ¿Ya creaste la tabla y sus policies?");
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/70">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-5 py-4">
          <div>
            <div className="text-[14px] font-semibold text-slate-900">Nuevo cliente</div>
            <div className="text-[12px] text-slate-500">
              Registra una empresa para iniciar KYC / SAT / Buró.
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-[12px] font-semibold text-slate-700">Razón social</span>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej. ACME S.A. de C.V."
                className="h-10 rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-slate-400"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-[12px] font-semibold text-slate-700">RFC</span>
              <input
                value={rfc}
                onChange={(e) => setRfc(e.target.value)}
                placeholder="Ej. XAXX010101000"
                className="h-10 rounded-xl border border-slate-200 px-3 font-mono text-[13px] outline-none focus:border-slate-400"
              />
              <div className="text-[11px] text-slate-500">
                Normalizado: <span className="font-mono">{rfcNorm || "—"}</span>
              </div>
            </label>

            <label className="grid gap-1">
              <span className="text-[12px] font-semibold text-slate-700">Estatus</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
                className="h-10 rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-slate-400"
              >
                <option value="Onboarding">Onboarding</option>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Risk Hold">Risk Hold</option>
              </select>
            </label>

            {err ? (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-800 ring-1 ring-rose-100">
                {err}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200/70 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-800 hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!canSubmit || loading}
            className="rounded-xl bg-[#071A3A] px-4 py-2 text-[12px] font-semibold text-white hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Creando…" : "Crear cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}