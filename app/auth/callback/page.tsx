"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = session.user;

        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!roleRow?.role) {
          router.replace("/onboarding/role");
          return;
        }

        if (roleRow.role === "solicitante") {
          const { data: borrower } = await supabase
            .from("borrowers_profile")
            .select("onboarding_done")
            .eq("owner_id", user.id)
            .maybeSingle();

          if (borrower?.onboarding_done) {
            router.replace("/solicitante");
          } else {
            router.replace("/onboarding/solicitante");
          }
          return;
        }

        router.replace("/dashboard");
      }
    });
  }, [router]);

  return (
    <div style={{
      minHeight: "100svh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0C1E4A",
      fontFamily: "'Geist', sans-serif",
    }}>
      <div style={{ textAlign: "center", color: "#EEF2FF" }}>
        <div style={{
          width: 40, height: 40, border: "3px solid rgba(255,255,255,0.15)",
          borderTopColor: "#00E5A0", borderRadius: "50%",
          animation: "spin 0.75s linear infinite", margin: "0 auto 16px",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 14, color: "rgba(238,242,255,0.6)" }}>Iniciando sesión...</p>
      </div>
    </div>
  );
}
