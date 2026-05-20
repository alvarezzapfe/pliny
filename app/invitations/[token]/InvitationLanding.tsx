"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const DEAL_TYPE_LABELS: Record<string, string> = {
  debt: "Deuda", equity: "Equity", ma: "M&A", advisory: "Advisory", other: "Otro",
};

interface InvitationInfo {
  invitation: { email: string; role: string; expiresAt: string };
  deal: { name: string; clientName: string | null; type: string };
  workspace: { name: string } | null;
  inviter: { name: string };
}

interface Props { token: string; }

export default function InvitationLanding({ token }: Props) {
  const router = useRouter();
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const fetchInvitation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invitations/${token}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Invitación no válida"); setLoading(false); return; }
      setInfo(data);

      const { data: { session } } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email || null);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Error inesperado");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchInvitation(); }, [fetchInvitation]);

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Necesitas iniciar sesión primero"); setAccepting(false); return; }

      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al aceptar"); setAccepting(false); return; }

      if (data.workspaceSlug && data.dealId) {
        router.push(`/dashboard/deals/${data.workspaceSlug}/${data.dealId}`);
      } else {
        router.push("/dashboard/deals");
      }
    } catch (e: any) {
      setError(e?.message || "Error inesperado");
      setAccepting(false);
    }
  }

  function goToLogin() {
    router.push(`/login`);
  }

  function goToRegister() {
    router.push(`/register`);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6FB", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontFamily: "'Geist', sans-serif" }}>
        Cargando invitación...
      </div>
    );
  }

  if (error && !info) {
    return (
      <div style={{ minHeight: "100vh", background: "#F4F6FB", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Geist', sans-serif" }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #FECACA", borderRadius: 12, padding: 32, maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ color: "#0F172A", fontSize: 22, margin: "0 0 12px 0" }}>Invitación no válida</h1>
          <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const emailMatch = userEmail && userEmail.toLowerCase() === info.invitation.email.toLowerCase();

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FB", padding: 24, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geist', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ color: "#0C1E4A", fontSize: 14, fontWeight: 700 }}>Plinius</span>
          <span style={{ color: "#94A3B8", fontSize: 13, marginLeft: 6 }}>Deal Rooms</span>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 32 }}>
          <h1 style={{ color: "#0F172A", fontSize: 22, fontWeight: 700, margin: "0 0 8px 0", lineHeight: 1.3 }}>
            {info.inviter.name} te invitó a colaborar
          </h1>
          <p style={{ color: "#64748B", fontSize: 14, margin: "0 0 24px 0", lineHeight: 1.5 }}>
            Has sido invitado como <strong style={{ color: "#0C1E4A" }}>{info.invitation.role}</strong> al siguiente deal:
          </p>

          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <div style={{ color: "#94A3B8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Deal</div>
            <div style={{ color: "#0F172A", fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{info.deal.name}</div>
            {info.deal.clientName && (
              <div style={{ color: "#64748B", fontSize: 13, marginBottom: 8 }}>Cliente: {info.deal.clientName}</div>
            )}
            <div style={{ color: "#64748B", fontSize: 13 }}>Tipo: {DEAL_TYPE_LABELS[info.deal.type] || info.deal.type}</div>
            {info.workspace && (
              <div style={{ color: "#64748B", fontSize: 13, marginTop: 8 }}>Workspace: {info.workspace.name}</div>
            )}
          </div>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {userEmail && emailMatch ? (
            <>
              <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 16px 0" }}>
                Logueado como <strong style={{ color: "#0F172A" }}>{userEmail}</strong>
              </p>
              <button onClick={handleAccept} disabled={accepting} style={{
                width: "100%", background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)", color: "#fff",
                border: "none", padding: 14, borderRadius: 8,
                cursor: accepting ? "wait" : "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              }}>{accepting ? "Aceptando..." : "Aceptar invitación"}</button>
            </>
          ) : userEmail && !emailMatch ? (
            <>
              <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", color: "#92400E", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                Esta invitación es para <strong>{info.invitation.email}</strong>, pero estás logueado como <strong>{userEmail}</strong>.
              </div>
              <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} style={{
                width: "100%", background: "#FFFFFF", color: "#92400E", border: "1px solid #FCD34D",
                padding: 12, borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              }}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <p style={{ color: "#64748B", fontSize: 13, margin: "0 0 16px 0" }}>
                Invitación para <strong style={{ color: "#0F172A" }}>{info.invitation.email}</strong>
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={goToRegister} style={{
                  background: "linear-gradient(135deg, #0C1E4A, #1B3F8A)", color: "#fff",
                  border: "none", padding: 14, borderRadius: 8,
                  cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                }}>Crear cuenta</button>
                <button onClick={goToLogin} style={{
                  background: "#FFFFFF", color: "#0F172A", border: "1px solid #E2E8F0",
                  padding: 14, borderRadius: 8,
                  cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
                }}>Ya tengo cuenta</button>
              </div>
            </>
          )}

          <p style={{ color: "#94A3B8", fontSize: 11, margin: "16px 0 0 0", textAlign: "center" }}>
            Expira el {new Date(info.invitation.expiresAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}
