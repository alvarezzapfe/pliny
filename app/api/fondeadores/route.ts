import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  // Auth: validar sesión del usuario con el token del header
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData?.user) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  // Filtros opcionales
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const ticketMin = searchParams.get("ticket_min");
  const moneda = searchParams.get("moneda");

  let query = supabase
    .from("fondeadores_institucionales")
    .select("*")
    .eq("activo", true)
    .order("destacado", { ascending: false })
    .order("nombre", { ascending: true });

  if (tipo) query = query.eq("tipo", tipo);
  if (moneda) query = query.eq("moneda", moneda);
  if (ticketMin) query = query.gte("ticket_max_mxn", Number(ticketMin));

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ fondeadores: data });
}
