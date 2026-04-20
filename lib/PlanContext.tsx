"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PlanInfo = { plan: string; since: string | null };
const PlanContext = createContext<PlanInfo>({ plan: "free", since: null });

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<PlanInfo>({ plan: "free", since: null });

  useEffect(() => {
    let mounted = true;
    async function fetchPlan() {
      // Leer token directamente del localStorage
      const storageKey = Object.keys(localStorage).find(k => k.includes("auth-token"));
      if (!storageKey) return;
      let token: string | null = null;
      try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : null;
        token = parsed?.access_token ?? null;
      } catch { return; }
      if (!token) return;

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const { data: userData } = await supabase.auth.getUser(token);
      if (!userData?.user || !mounted) return;

      const res = await fetch(
        `${url}/rest/v1/plinius_profiles?select=plan,plan_updated_at&user_id=eq.${userData.user.id}&limit=1`,
        { headers: { "apikey": key, "Authorization": `Bearer ${token}` } }
      );
      const rows = await res.json();
      console.log("[PlanContext]", rows);
      if (mounted && Array.isArray(rows) && rows[0]?.plan) {
        setInfo({ plan: rows[0].plan, since: rows[0].plan_updated_at ?? null });
      }
    }
    setTimeout(fetchPlan, 800);
    return () => { mounted = false; };
  }, []);

  return <PlanContext.Provider value={info}>{children}</PlanContext.Provider>;
}

export function usePlan() { return useContext(PlanContext); }
