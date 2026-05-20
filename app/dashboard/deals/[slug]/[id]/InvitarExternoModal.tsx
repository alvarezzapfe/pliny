"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  dealId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const INPUT: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8,
  color: "#0F172A", fontSize: 14, fontFamily: "inherit",
  boxSizing: "border-box" as const, outline: "none",
};

const LABEL: React.CSSProperties = {
  display: "block", color: "#64748B", fontSize: 11, fontWeight: 600,
  textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6,
};

export default function InvitarExternoModal({ dealId, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"contributor" | "viewer">("viewer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ url: string; emailSent: boolean } | null>(null);

  async function handleSubmit() {
    if (!email.trim()) { setError("Email requerido"); return; }
    setError(null);
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("No autenticado"); setSaving(false); return; }

      const res = await fetch(`/api/deals/${dealId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || "Error al enviar invitación"); setSaving(false); return; }

      setSuccessInfo({ url: data.inviteUrl, emailSent: data.emailSent });
      setSaving(false);
    } catch (e: any) {
      setError(e?.message || "Error inesperado");
      setSaving(false);
    }
  }

  function copyUrl() {
    if (successInfo?.url) navigator.clipboard.writeText(successInfo.url);
  }

  const canSubmit = email.trim().length > 3 && email.includes("@") && !saving;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
      backdropFilter: "blur(4px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#FFFFFF", borderRadius: 12, padding: 28,
        width: 480, maxWidth: "90vw", border: "1px solid #E2E8F0",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>
        <h2 style={{ color: "#0F172A", fontSize: 20, fontWeight: 700, margin: "0 0 8px 0" }}>
          {successInfo ? "Invitación enviada" : "Invitar externo"}
        </h2>
        <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 24px 0", lineHeight: 1.5 }}>
          {successInfo
            ? `Email enviado a ${email}.${successInfo.emailSent ? "" : " Si no llega, copia el link abajo."}`
            : "Comparte este deal con un abogado, sponsor o contraparte. Solo verá este deal."}
        </p>

        {!successInfo && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL}>Email del externo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="lawyer@firma.com.mx" style={INPUT} autoFocus />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={LABEL}>Permisos</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(["viewer", "contributor"] as const).map(r => (
                  <button key={r} onClick={() => setRole(r)} style={{
                    padding: "12px 14px", textAlign: "left" as const, cursor: "pointer",
                    background: role === r ? "#EFF6FF" : "#FFFFFF",
                    border: `1px solid ${role === r ? "#3B82F6" : "#E2E8F0"}`,
                    borderRadius: 8,
                  }}>
                    <div style={{ color: "#0F172A", fontSize: 13, fontWeight: 600 }}>
                      {r === "viewer" ? "Viewer" : "Contributor"}
                    </div>
                    <div style={{ color: "#64748B", fontSize: 11, marginTop: 2 }}>
                      {r === "viewer" ? "Solo lectura" : "Edita notas + stage"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {successInfo && (
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ color: "#64748B", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
              Link de invitación
            </div>
            <div style={{
              fontFamily: "'Geist Mono', monospace", fontSize: 11, color: "#0F172A",
              wordBreak: "break-all" as const, padding: "8px 10px",
              background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 4, marginBottom: 8,
            }}>{successInfo.url}</div>
            <button onClick={copyUrl} style={{
              background: "transparent", border: "1px solid #3B82F6", color: "#3B82F6",
              padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>Copiar link</button>
          </div>
        )}

        {error && (
          <div style={{ padding: "10px 14px", marginBottom: 16, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {successInfo ? (
            <button onClick={() => onSuccess()} style={{
              background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)", color: "#fff",
              border: "none", padding: "10px 20px", borderRadius: 8,
              cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Geist', sans-serif",
            }}>Cerrar</button>
          ) : (
            <>
              <button onClick={onClose} disabled={saving} style={{
                padding: "10px 18px", borderRadius: 8, border: "1px solid #E2E8F0",
                background: "#FFFFFF", color: "#64748B", cursor: "pointer", fontSize: 13,
                fontFamily: "'Geist', sans-serif",
              }}>Cancelar</button>
              <button onClick={handleSubmit} disabled={!canSubmit} style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: canSubmit ? "linear-gradient(135deg, #0C1E4A, #1B3F8A)" : "#E2E8F0",
                color: canSubmit ? "#fff" : "#94A3B8",
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontSize: 13, fontWeight: 600, fontFamily: "'Geist', sans-serif",
              }}>{saving ? "Enviando..." : "Enviar invitación"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
