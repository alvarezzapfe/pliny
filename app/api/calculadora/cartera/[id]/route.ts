// GET /api/calculadora/cartera/[id] — Full valuation detail
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData } = await sb.auth.getUser(token);
    if (!userData?.user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    const { id } = await params;

    // Defense-in-depth: RLS + explicit user_id filter
    const { data, error } = await sb
      .from("cartera_valuaciones")
      .select("*")
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Valuación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ valuacion: data }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[cartera/[id]]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
