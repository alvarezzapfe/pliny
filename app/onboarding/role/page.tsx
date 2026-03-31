"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { setSession } from "@/lib/auth";

type Role = "otorgante" | "solicitante";

export default function RoleSelectPage() {
  const router = useRouter();
  const [selected, setSelected]   = useState<Role | null>(null);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState<string | null>(null);
  const [mounted,  setMounted]    = useState(false);
  const [userName, setUserName]   = useState("");

  useEffect(() => {
    setMounted(true);
    // Verifica que haya sesión activa; si no, manda al login
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      // Verifica que no tenga ya un rol (en caso de que llegue aquí de forma directa)
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle()
        .then(({ data: roleRow }) => {
          if (roleRow?.role) {
            // Ya tiene rol, manda a donde corresponde
            if (roleRow.role === "solicitante") router.replace("/solicitante");
            else router.replace("/dashboard");
          }
        });

      const name = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "";
      setUserName(name);
    });
  }, [router]);

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    // Guarda el rol en user_roles
    const { error: upsertErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: user.id, role: selected }, { onConflict: "user_id" });

    if (upsertErr) {
      setError("No se pudo guardar el rol. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    // Actualiza sesión local
    setSession({
      role: "client",
      email: user.email ?? "",
      customerId: user.id,
      createdAt: new Date().toISOString(),
      userRole: selected,
    });

    // Ruta por rol
    if (selected === "solicitante") {
      router.push("/onboarding/solicitante");
    } else {
      router.push("/dashboard");
    }
  };

  if (!mounted) return null;

  return (
    <main style={{
      minHeight: "100svh",
      background: "radial-gradient(ellipse 120% 80% at 25% 10%,#1B3F8A 0%,#0C1E4A 55%,#091530 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Geist', -apple-system, sans-serif",
      padding: "32px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
        @keyframes blink    { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        @keyframes gridPulse{ 0%,100%{opacity:0.4;} 50%{opacity:0.65;} }
        @keyframes spin     { to{transform:rotate(360deg);} }
        @keyframes orbDrift { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-24px);} }
        @keyframes cardIn   { from{opacity:0;transform:translateY(24px) scale(0.98);} to{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes shimmer  { from{background-position:-200% 0;} to{background-position:200% 0;} }

        .grid-bg {
          position: absolute; inset: 0; pointer-events: none;
          background-image: linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),
                            linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px);
          background-size: 48px 48px;
          animation: gridPulse 7s ease-in-out infinite;
        }
        .orb-a {
          position: absolute; top: -120px; left: -80px; width: 560px; height: 560px;
          border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle,rgba(27,63,138,0.70) 0%,transparent 70%);
          animation: orbDrift 9s ease-in-out infinite;
        }
        .orb-b {
          position: absolute; bottom: -100px; right: -80px; width: 480px; height: 480px;
          border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle,rgba(0,229,160,0.08) 0%,transparent 70%);
          animation: orbDrift 13s ease-in-out 3s infinite;
        }

        .card {
          background: rgba(255,255,255,0.97);
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.15);
          box-shadow: 0 32px 100px rgba(0,0,0,0.40), 0 8px 32px rgba(0,0,0,0.20);
          padding: 40px 36px;
          width: 100%; max-width: 500px;
          position: relative; z-index: 1;
          animation: cardIn 0.5s cubic-bezier(.16,1,.3,1) both;
        }

        .role-card {
          border: 2px solid #E2E8F0;
          border-radius: 18px;
          padding: 22px 20px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s;
          position: relative; overflow: hidden;
          background: #F8FAFC;
        }
        .role-card:hover { border-color: #5B8DEF; background: #F0F5FF; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(91,141,239,0.12); }
        .role-card.selected-otorgante { border-color: #1B3F8A; background: #EEF3FF; box-shadow: 0 0 0 4px rgba(27,63,138,0.10); }
        .role-card.selected-solicitante { border-color: #00C87A; background: #EDFDF5; box-shadow: 0 0 0 4px rgba(0,200,122,0.10); }

        .role-icon {
          width: 48px; height: 48px; border-radius: 14px;
          display: grid; place-items: center; margin-bottom: 14px;
          font-size: 22px;
        }
        .icon-otorgante { background: linear-gradient(135deg,#EEF3FF,#D8E6FF); }
        .icon-solicitante { background: linear-gradient(135deg,#EDFDF5,#C6F7E2); }

        .check-badge {
          position: absolute; top: 14px; right: 14px;
          width: 22px; height: 22px; border-radius: 50%;
          display: grid; place-items: center;
          opacity: 0; transform: scale(0.6);
          transition: opacity 0.2s, transform 0.2s;
        }
        .role-card.selected-otorgante .check-badge,
        .role-card.selected-solicitante .check-badge {
          opacity: 1; transform: scale(1);
        }
        .check-otorgante { background: #1B3F8A; }
        .check-solicitante { background: #00C87A; }

        .btn-confirm {
          height: 52px; width: 100%;
          border: none; border-radius: 14px;
          font-size: 15px; font-weight: 700;
          font-family: 'Geist', sans-serif;
          cursor: pointer; letter-spacing: -0.01em;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
          position: relative; overflow: hidden;
        }
        .btn-confirm.ready {
          background: linear-gradient(135deg,#0C1E4A 0%,#1B3F8A 100%);
          color: #fff;
          box-shadow: 0 4px 20px rgba(12,30,74,0.30), 0 1px 4px rgba(12,30,74,0.20);
        }
        .btn-confirm.ready:hover { opacity: 0.93; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(12,30,74,0.35); }
        .btn-confirm.disabled-btn {
          background: #E2E8F0; color: #94A3B8; cursor: not-allowed;
        }
        .btn-confirm:disabled { opacity: 0.6; transform: none; cursor: not-allowed; }
        .btn-confirm::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,0.08) 0%,transparent 60%); pointer-events:none; }

        .error-box {
          background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 10px;
          padding: 11px 14px; font-size: 13px; font-weight: 500; color: #9F1239;
          display: flex; align-items: center; gap: 8px;
        }
        .tag {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(0,229,160,0.10); border: 1px solid rgba(0,229,160,0.22);
          border-radius: 999px; padding: 4px 10px;
          font-size: 10px; font-weight: 600; color: #00A86B;
          font-family: 'Geist Mono', monospace; letter-spacing: 0.08em;
        }
      `}</style>

      <div className="grid-bg" />
      <div className="orb-a" />
      <div className="orb-b" />

      <div className="card">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <span className="tag">
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00E5A0", display: "inline-block", animation: "blink 2s ease-in-out infinite" }} />
              PRIMER ACCESO
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.04em", marginBottom: 8 }}>
            {userName ? `Hola, ${userName.split(" ")[0]} 👋` : "Bienvenido a Plinius"}
          </h1>
          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, maxWidth: "34ch", margin: "0 auto" }}>
            ¿Cómo vas a usar la plataforma? Esto define tu experiencia.
          </p>
        </div>

        {/* Role Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>

          {/* Otorgante */}
          <div
            className={`role-card${selected === "otorgante" ? " selected-otorgante" : ""}`}
            onClick={() => setSelected("otorgante")}
          >
            <div className={`check-badge check-otorgante`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="role-icon icon-otorgante">🏦</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 4, letterSpacing: "-0.02em" }}>
              Soy Otorgante
            </div>
            <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.55 }}>
              Ofrezco crédito. Quiero analizar expedientes, monitorear cartera y generar reportes de riesgo.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {["Análisis de riesgo","Cartera","Covenants","Reportes"].map(t => (
                <span key={t} style={{ fontSize: 10, fontWeight: 600, color: "#1B3F8A", background: "#EEF3FF", borderRadius: 999, padding: "3px 8px", fontFamily: "'Geist Mono',monospace" }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Solicitante */}
          <div
            className={`role-card${selected === "solicitante" ? " selected-solicitante" : ""}`}
            onClick={() => setSelected("solicitante")}
          >
            <div className={`check-badge check-solicitante`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="role-icon icon-solicitante">🏢</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 4, letterSpacing: "-0.02em" }}>
              Soy Solicitante
            </div>
            <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.55 }}>
              Busco crédito. Quiero cargar mi información, hacer seguimiento a mis solicitudes y recibir ofertas.
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {["Solicitudes","Documentos","Seguimiento","Ofertas"].map(t => (
                <span key={t} style={{ fontSize: 10, fontWeight: 600, color: "#065F46", background: "#EDFDF5", borderRadius: 999, padding: "3px 8px", fontFamily: "'Geist Mono',monospace" }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="error-box" style={{ marginBottom: 16 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#F43F5E" strokeWidth="1.3"/><path d="M7 4.5v3M7 10h.01" stroke="#F43F5E" strokeWidth="1.3" strokeLinecap="round"/></svg>
            {error}
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!selected || loading}
          className={`btn-confirm ${selected && !loading ? "ready" : "disabled-btn"}`}
        >
          {loading ? (
            <>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ animation: "spin 0.75s linear infinite" }}>
                <circle cx="7.5" cy="7.5" r="5.5" stroke="rgba(255,255,255,0.25)" strokeWidth="2"/>
                <path d="M13 7.5a5.5 5.5 0 00-5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Configurando tu cuenta...
            </>
          ) : selected ? (
            <>
              Continuar como {selected === "otorgante" ? "Otorgante" : "Solicitante"}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </>
          ) : (
            "Selecciona tu perfil para continuar"
          )}
        </button>

        <p style={{ textAlign: "center", fontSize: 11, color: "#CBD5E1", marginTop: 16, fontFamily: "'Geist Mono',monospace", letterSpacing: "0.04em" }}>
          Puedes cambiar esto más adelante desde tu perfil
        </p>
      </div>
    </main>
  );
}
