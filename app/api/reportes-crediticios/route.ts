import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCuotaMensual } from "@/lib/reportes-crediticios";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function authed(req: NextRequest) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return createClient(url, anon, { global: { headers: { Authorization: h } } });
}

// POST — Lender solicita reporte crediticio
export async function POST(req: NextRequest) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const body = await req.json();
  if (!body.client_id) {
    return NextResponse.json({ error: "client_id es requerido" }, { status: 422 });
  }

  // Validar que el cliente pertenezca al lender
  const { data: client } = await sb
    .from("clients")
    .select("id")
    .eq("id", body.client_id)
    .eq("owner_user_id", u.user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // Validar cuota
  const cuota = await getCuotaMensual(sb, u.user.id);

  if (!cuota.ilimitado && cuota.restantes <= 0) {
    return NextResponse.json({
      error: "Cuota agotada",
      message: `Has usado tus ${cuota.limite_mes} reportes del mes. Upgrade tu plan para más.`,
      cuota,
      upgrade_to: cuota.plan === "basic" ? "pro" : "enterprise",
    }, { status: 429 });
  }

  // Crear reporte
  const { data: reporte, error } = await sb
    .from("reportes_crediticios")
    .insert({
      client_id: body.client_id,
      lender_user_id: u.user.id,
      lender_notas: body.lender_notas || null,
      periodo_mes: cuota.periodo,
      estado: "pendiente",
    })
    .select("id, estado, solicitado_at, periodo_mes")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    reporte,
    cuota_usada: cuota.usados_mes + 1,
    cuota_limite: cuota.limite_mes,
    cuota_restante: cuota.ilimitado ? 999 : cuota.restantes - 1,
  }, { status: 201 });
}

// GET — Lista reportes por client_id
export async function GET(req: NextRequest) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const clientId = new URL(req.url).searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "client_id es requerido" }, { status: 422 });
  }

  const { data, error } = await sb
    .from("reportes_crediticios")
    .select("*")
    .eq("client_id", clientId)
    .eq("lender_user_id", u.user.id)
    .order("solicitado_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reportes: data });
}
