// GET    /api/cartera/[id]  → detalle de un crédito
// PATCH  /api/cartera/[id]  → editar crédito (parcial)
// DELETE /api/cartera/[id]  → eliminar crédito
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Credito } from "@/lib/cartera-gestion/types";
import { CreditoUpdateSchema } from "@/lib/cartera-gestion/zod-schema";

function getSupabaseClient(authHeader: string | null) {
  const token = authHeader?.replace("Bearer ", "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseClient(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("credits")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Crédito no encontrado" }, { status: 404 });
      }
      console.error("[/api/cartera/[id] GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ credito: data as Credito });
  } catch (e) {
    console.error("[/api/cartera/[id] GET] uncaught", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseClient(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = CreditoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("credits")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Crédito no encontrado" }, { status: 404 });
      }
      console.error("[/api/cartera/[id] PATCH]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ credito: data as Credito });
  } catch (e) {
    console.error("[/api/cartera/[id] PATCH] uncaught", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!isValidUUID(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseClient(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error, count } = await supabase
      .from("credits")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      console.error("[/api/cartera/[id] DELETE]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: "Crédito no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: count });
  } catch (e) {
    console.error("[/api/cartera/[id] DELETE] uncaught", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
