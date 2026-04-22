import { SupabaseClient } from "@supabase/supabase-js";

export type CuotaInfo = {
  usados_mes: number;
  limite_mes: number;
  restantes: number;
  ilimitado: boolean;
  periodo: string;
  plan: string;
};

function periodoActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getCuotaMensual(
  sb: SupabaseClient,
  userId: string,
): Promise<CuotaInfo> {
  const periodo = periodoActual();

  // Get user's plan
  const { data: profile } = await sb
    .from("plinius_profiles")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  const plan = profile?.plan ?? "free";

  // Get plan limit
  const { data: planConfig } = await sb
    .from("plans_config")
    .select("reportes_crediticios_limite_mes")
    .eq("id", plan)
    .single();

  const limite = planConfig?.reportes_crediticios_limite_mes ?? 0;
  const ilimitado = limite === -1;

  // Count used this month
  const { count } = await sb
    .from("reportes_crediticios")
    .select("id", { count: "exact", head: true })
    .eq("lender_user_id", userId)
    .eq("periodo_mes", periodo)
    .neq("estado", "cancelado");

  const usados = count ?? 0;

  return {
    usados_mes: usados,
    limite_mes: limite,
    restantes: ilimitado ? 999 : Math.max(0, limite - usados),
    ilimitado,
    periodo,
    plan,
  };
}

export async function canSolicitarReporte(
  sb: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const cuota = await getCuotaMensual(sb, userId);
  return cuota.ilimitado || cuota.restantes > 0;
}
