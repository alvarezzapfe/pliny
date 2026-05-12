// GET  /api/cartera     → listar créditos del user (con filtros + paginación)
// POST /api/cartera     → crear nuevo crédito
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Credito } from "@/lib/cartera-gestion/types";
import { CreditoInputSchema } from "@/lib/cartera-gestion/zod-schema";

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

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseClient(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const estatus = url.searchParams.get("estatus");
    const search = url.searchParams.get("search");
    const limitRaw = parseInt(url.searchParams.get("limit") ?? "100", 10);
    const offsetRaw = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 500);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    let query = supabase
      .from("credits")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (estatus && estatus !== "todos") {
      if (estatus === "mora_all") {
        query = query.in("estatus", ["mora_30", "mora_60", "mora_90"]);
      } else {
        query = query.eq("estatus", estatus);
      }
    }

    if (search && search.trim().length > 0) {
      const s = search.trim();
      query = query.or(`folio.ilike.%${s}%,deudor.ilike.%${s}%,rfc.ilike.%${s}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error("[/api/cartera GET]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      creditos: (data ?? []) as Credito[],
      total: count ?? 0,
      limit,
      offset,
    }, {
      headers: { "Cache-Control": "private, no-store, must-revalidate" },
    });
  } catch (e) {
    console.error("[/api/cartera GET] uncaught", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseClient(authHeader);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = CreditoInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("credits")
      .insert({
        ...parsed.data,
        created_by: user.id,
        fuente: "manual",
      })
      .select()
      .single();

    if (error) {
      console.error("[/api/cartera POST]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ credito: data as Credito }, { status: 201 });
  } catch (e) {
    console.error("[/api/cartera POST] uncaught", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
