import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function authed(req: NextRequest) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return createClient(url, anon, { global: { headers: { Authorization: h } } });
}

// GET /api/clients — lista con filtros
export async function GET(req: NextRequest) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const { searchParams: sp } = new URL(req.url);
  const status = sp.get("status");
  const sector = sp.get("sector");
  const tipo = sp.get("tipo_credito");
  const q = sp.get("q");

  let query = sb
    .from("clients")
    .select("*, client_connectors(buro_score, buro_status, sat_status)")
    .eq("owner_user_id", u.user.id)
    .order("created_at", { ascending: false });

  if (status && status !== "Todos") query = query.eq("status", status);
  if (sector) query = query.eq("sector", sector);
  if (tipo) query = query.eq("tipo_credito_solicitado", tipo);
  if (q) query = query.or(`company_name.ilike.%${q}%,rfc.ilike.%${q}%,rep_legal_nombre.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data });
}

// POST /api/clients — crear con campos expandidos
export async function POST(req: NextRequest) {
  const sb = authed(req);
  if (!sb) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: u } = await sb.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const body = await req.json();
  if (!body.company_name?.trim()) {
    return NextResponse.json({ error: "company_name es requerido" }, { status: 422 });
  }

  // Insert client
  const { data: client, error: e1 } = await sb
    .from("clients")
    .insert({
      owner_user_id: u.user.id,
      company_name: body.company_name.trim(),
      razon_social: body.razon_social?.trim() || body.company_name.trim(),
      rfc: body.rfc?.trim().toUpperCase() || null,
      status: "Onboarding",
      sector: body.sector || null,
      direccion_calle: body.direccion_calle || null,
      direccion_numero: body.direccion_numero || null,
      direccion_colonia: body.direccion_colonia || null,
      direccion_municipio: body.direccion_municipio || null,
      direccion_estado: body.direccion_estado || null,
      direccion_cp: body.direccion_cp || null,
      telefono_empresa: body.telefono_empresa || null,
      email_empresa: body.email_empresa || null,
      website: body.website || null,
      anios_operando: body.anios_operando || null,
      numero_empleados: body.numero_empleados || null,
      rep_legal_nombre: body.rep_legal_nombre || null,
      rep_legal_rfc: body.rep_legal_rfc || null,
      rep_legal_curp: body.rep_legal_curp || null,
      rep_legal_telefono: body.rep_legal_telefono || null,
      rep_legal_email: body.rep_legal_email || null,
      rep_legal_cargo: body.rep_legal_cargo || null,
      ingresos_anuales_mxn: body.ingresos_anuales_mxn || null,
      tipo_credito_solicitado: body.tipo_credito_solicitado || null,
      monto_solicitado_mxn: body.monto_solicitado_mxn || null,
      plazo_solicitado_meses: body.plazo_solicitado_meses || null,
      uso_fondos: body.uso_fondos || null,
      tags: body.tags || [],
    })
    .select("id")
    .single();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  // Insert connector row
  await sb.from("client_connectors").insert({
    client_id: client.id,
    owner_user_id: u.user.id,
    buro_status: "not_connected",
    sat_status: "not_connected",
    buro_score: null,
  });

  return NextResponse.json({ client }, { status: 201 });
}
