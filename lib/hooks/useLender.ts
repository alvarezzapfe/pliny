"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type LenderProfile = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  descripcion: string | null;
  tasa_min: number | null;
  tasa_max: number | null;
  monto_min: number | null;
  monto_max: number | null;
  sectores: string[] | null;
  tipo_credito: string | null;
  active: boolean;
};

export function useLender() {
  const [lender, setLender]   = useState<LenderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      setUserId(auth.user.id);

      const res = await fetch(`/api/onb-lenders/by-user?user_id=${auth.user.id}`);
      if (res.ok) {
        const json = await res.json();
        setLender(json.lender ?? null);
      }
      setLoading(false);
    })();
  }, []);

  async function refresh() {
    if (!userId) return;
    const res = await fetch(`/api/onb-lenders/by-user?user_id=${userId}`);
    if (res.ok) {
      const json = await res.json();
      setLender(json.lender ?? null);
    }
  }

  return { lender, loading, userId, refresh };
}
