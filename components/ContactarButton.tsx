"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  solicitanteId: string;
  solicitanteEmpresa?: string;
  isPro: boolean;
  currentUserId: string;
  currentUserEmail: string;
};

export default function ContactarButton({
  solicitanteId,
  solicitanteEmpresa,
  isPro,
  currentUserId,
  currentUserEmail,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleContactar() {
    if (!isPro) {
      router.push("/pricing?from=chat");
      return;
    }

    setLoading(true);

    // Upsert conversación (única por par otorgante+solicitante)
    const { data, error } = await supabase
      .from("conversaciones")
      .upsert(
        {
          otorgante_id: currentUserId,
          solicitante_id: solicitanteId,
          solicitante_empresa: solicitanteEmpresa || null,
          otorgante_email: currentUserEmail,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: "otorgante_id,solicitante_id", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    setLoading(false);

    if (error || !data) {
      // Si ya existe, buscarla
      const { data: existing } = await supabase
        .from("conversaciones")
        .select("id")
        .eq("otorgante_id", currentUserId)
        .eq("solicitante_id", solicitanteId)
        .maybeSingle();

      if (existing) {
        router.push(`/dashboard/chat?conv=${existing.id}`);
      }
      return;
    }

    router.push(`/dashboard/chat?conv=${data.id}`);
  }

  if (!isPro) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <button
          onClick={handleContactar}
          style={{
            height: 38, padding: "0 16px", borderRadius: 10,
            border: "1px solid rgba(99,102,241,.3)",
            background: "rgba(99,102,241,.08)",
            color: "#818CF8", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Geist',sans-serif",
            display: "flex", alignItems: "center", gap: 6,
            whiteSpace: "nowrap",
          }}>
          💬 Contactar <span style={{ fontSize: 9, background: "rgba(99,102,241,.2)", borderRadius: 999, padding: "1px 6px" }}>PRO</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleContactar}
      disabled={loading}
      style={{
        height: 38, padding: "0 16px", borderRadius: 10,
        border: "none",
        background: loading ? "#0A1628" : "linear-gradient(135deg,#0C1E4A,#1B3F8A)",
        color: "#fff", fontSize: 12, fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer",
        fontFamily: "'Geist',sans-serif",
        display: "flex", alignItems: "center", gap: 6,
        boxShadow: loading ? "none" : "0 2px 12px rgba(12,30,74,.35)",
        opacity: loading ? .7 : 1,
        whiteSpace: "nowrap",
        transition: "all .15s",
      }}>
      {loading ? (
        <>
          <svg style={{ animation: "spin .6s linear infinite" }} width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1a5 5 0 015 5" /></svg>
          Abriendo...
        </>
      ) : (
        <>💬 Contactar</>
      )}
    </button>
  );
}
