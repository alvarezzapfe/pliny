// CRUD de reglas de pre-aprobación para lender PRO
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function authed(req: NextRequest) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return createClient(url, anon, { global: { headers: { Authorization: h } } });
}

const ALLOWED_FIELDS: Record<string, { type: string; operators: string[] }> = {
  antiguedad_anos:      { type: "number", operators: [">=", "<=", ">", "<", "=="] },
  ventas_rango:         { type: "select", operators: ["in", "=="] },
  monto_solicitado_mxn: { type: "number", operators: [">=", "<=", ">", "<"] },
  plazo_meses:          { type: "number", operators: [">=", "<=", "==", "in"] },
  sector:               { type: "select", operators: ["in", "=="] },
  estado:               { type: "select", operators: ["in", "=="] },
  regimen_fiscal:       { type: "select", operators: ["=="] },
};

async function getLenderForUser(sb: { from: (t: string) => unknown }, userId: string) {
  const { data } = await (sb as ReturnType<typeof createClient>).from("onb_lenders").select("id, user_id, name, slug").eq("user_id", userId).eq("active", true).maybeSingle();
  return data as { id: string; user_id: string; name: string; slug: string } | null;
}

async function verifyPro(sb: { from: (t: string) => unknown }, userId: string) {
  const { data } = await (sb as ReturnType<typeof createClient>).from("plinius_profiles").select("plan").eq("user_id", userId).maybeSingle();
  const profile = data as { plan: string } | null;
  return profile?.plan === "pro" || profile?.plan === "enterprise";
}

// GET — List rules for the logged-in lender
export async function GET(req: NextRequest) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const lender = await getLenderForUser(sb, u.user.id);
  if (!lender) return NextResponse.json({ error: "no_lender" }, { status: 404 });

  const isPro = await verifyPro(sb, u.user.id);
  if (!isPro) return NextResponse.json({ error: "requires_pro" }, { status: 402 });

  const { data: rules, error } = await sb
    .from("onb_approval_rules")
    .select("*")
    .eq("lender_id", lender.id)
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lender, rules: rules ?? [] });
}

// POST — Create new rule
export async function POST(req: NextRequest) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const lender = await getLenderForUser(sb, u.user.id);
  if (!lender) return NextResponse.json({ error: "no_lender" }, { status: 404 });
  const isPro = await verifyPro(sb, u.user.id);
  if (!isPro) return NextResponse.json({ error: "requires_pro" }, { status: 402 });

  const body = await req.json();
  const { field, operator, value, message_if_fail } = body;

  if (!field || !ALLOWED_FIELDS[field]) return NextResponse.json({ error: "Campo no permitido" }, { status: 422 });
  if (!operator || !ALLOWED_FIELDS[field].operators.includes(operator)) return NextResponse.json({ error: "Operador no válido para este campo" }, { status: 422 });
  if (value === undefined || value === null) return NextResponse.json({ error: "Valor requerido" }, { status: 422 });

  // Get next order_index
  const { data: maxRow } = await sb.from("onb_approval_rules").select("order_index").eq("lender_id", lender.id).order("order_index", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = (maxRow?.order_index ?? 0) + 1;

  const { data: rule, error } = await sb
    .from("onb_approval_rules")
    .insert({
      lender_id: lender.id,
      field,
      operator,
      value,
      message_if_fail: message_if_fail || null,
      order_index: nextOrder,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule }, { status: 201 });
}
