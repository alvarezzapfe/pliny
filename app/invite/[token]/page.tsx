"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type InviteInfo = {
  status: string;
  email: string;
  role: string;
  empresa_name: string;
  expires_at: string;
};

type Step = "loading" | "invalid" | "expired" | "accepted" | "ready" | "need_login" | "wrong_email" | "accepting" | "done" | "error";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    checkInvite();
  }, []);

  async function checkInvite() {
    // 1. Fetch invitation info
    const res = await fetch(`/api/empresa/invitations/${token}`);
    if (!res.ok) {
      setStep("invalid");
      return;
    }

    const data: InviteInfo = await res.json();
    setInvite(data);

    if (data.status === "accepted") { setStep("accepted"); return; }
    if (data.status === "expired" || data.status === "revoked") { setStep("expired"); return; }

    // 2. Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setStep("need_login");
      return;
    }

    setUserEmail(session.user.email ?? null);

    // 3. Check email match
    if (session.user.email?.toLowerCase() !== data.email.toLowerCase()) {
      setStep("wrong_email");
      return;
    }

    setStep("ready");
  }

  async function handleAccept() {
    setStep("accepting");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setStep("need_login");
      return;
    }

    const res = await fetch("/api/empresa/invitations/accept", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setErrorMsg(err.error ?? "Error aceptando invitación");
      setStep("error");
      return;
    }

    setStep("done");
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  function goLogin() {
    // Redirect to login with return URL
    const returnUrl = `/invite/${token}`;
    router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
  }

  function goRegister() {
    const returnUrl = `/invite/${token}`;
    router.push(`/register?redirect=${encodeURIComponent(returnUrl)}`);
  }

  const roleLabel = invite?.role === "admin" ? "Administrador" : "Miembro";

  return (
    <div style={{
      minHeight: "100vh", background: "#F7F8FA",
      display: "grid", placeItems: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460,
        border: "1px solid #E2E8F0", boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "#071A3A", padding: "32px 36px 28px",
        }}>
          <p style={{
            margin: "0 0 4px", fontSize: 12, fontWeight: 600,
            color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em", textTransform: "uppercase",
          }}>
            Invitacion de equipo
          </p>
          <p style={{
            margin: 0, fontSize: 22, fontWeight: 800, color: "#fff",
            letterSpacing: "-0.02em",
          }}>
            {invite?.empresa_name ?? "Plinius"}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "32px 36px" }}>

          {step === "loading" && (
            <p style={{ color: "#64748B", fontSize: 14, margin: 0, textAlign: "center" }}>
              Verificando invitacion...
            </p>
          )}

          {step === "invalid" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FEF2F2", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>&#10005;</span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0F172A" }}>
                Invitacion no valida
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
                Este enlace no corresponde a ninguna invitacion. Verifica que sea correcto o pide una nueva.
              </p>
            </div>
          )}

          {step === "expired" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FFFBEB", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>&#9203;</span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0F172A" }}>
                Invitacion expirada
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
                Esta invitacion ya no es valida. Pide al administrador que te envie una nueva.
              </p>
            </div>
          )}

          {step === "accepted" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#F0FDF9", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>&#10003;</span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0F172A" }}>
                Invitacion ya aceptada
              </h3>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748B" }}>
                Ya eres parte de {invite?.empresa_name}.
              </p>
              <button onClick={() => router.push("/dashboard")} style={btnPrimary}>
                Ir al dashboard
              </button>
            </div>
          )}

          {step === "need_login" && (
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0F172A" }}>
                Te invitaron como {roleLabel}
              </h3>
              <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748B" }}>
                Inicia sesion o crea una cuenta con <strong>{invite?.email}</strong> para aceptar.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={goLogin} style={btnPrimary}>
                  Iniciar sesion
                </button>
                <button onClick={goRegister} style={btnSecondary}>
                  Crear cuenta
                </button>
              </div>
            </div>
          )}

          {step === "wrong_email" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FEF2F2", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>&#9888;</span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0F172A" }}>
                Email no coincide
              </h3>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748B" }}>
                Esta invitacion es para <strong>{invite?.email}</strong>, pero estas logueado como <strong>{userEmail}</strong>.
              </p>
              <p style={{ margin: "0 0 20px", fontSize: 13, color: "#64748B" }}>
                Cierra sesion e inicia con la cuenta correcta.
              </p>
              <button onClick={async () => { await supabase.auth.signOut(); goLogin(); }} style={btnPrimary}>
                Cerrar sesion e iniciar con otra cuenta
              </button>
            </div>
          )}

          {step === "ready" && (
            <div style={{ textAlign: "center" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0F172A" }}>
                Te invitaron como {roleLabel}
              </h3>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748B" }}>
                Tendras acceso a la cartera de <strong>{invite?.empresa_name}</strong>.
              </p>
              {invite?.role === "admin" && (
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#1E40AF", background: "#EFF6FF", borderRadius: 8, padding: "6px 12px", display: "inline-block" }}>
                  Como admin podras gestionar usuarios y editar el perfil de empresa.
                </p>
              )}
              <div style={{ marginTop: 20 }}>
                <button onClick={handleAccept} style={btnPrimary}>
                  Aceptar invitacion
                </button>
              </div>
            </div>
          )}

          {step === "accepting" && (
            <p style={{ color: "#64748B", fontSize: 14, margin: 0, textAlign: "center" }}>
              Aceptando invitacion...
            </p>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#F0FDF9", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>&#10003;</span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#065F46" }}>
                Bienvenido a {invite?.empresa_name}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
                Redirigiendo al dashboard...
              </p>
            </div>
          )}

          {step === "error" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FEF2F2", display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>&#10005;</span>
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#0F172A" }}>
                Error
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#EF4444" }}>
                {errorMsg}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "11px 24px", borderRadius: 10, border: "none",
  background: "#071A3A", color: "#fff", fontSize: 14, fontWeight: 600,
  cursor: "pointer", transition: "background .14s",
};

const btnSecondary: React.CSSProperties = {
  padding: "11px 24px", borderRadius: 10,
  border: "1px solid #E2E8F0", background: "#fff",
  color: "#475569", fontSize: 14, fontWeight: 500,
  cursor: "pointer", transition: "background .14s",
};
