// POST /api/onb-lenders/me/regenerate-key — regenerate API key (JWT auth)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase-server";
import { generateApiKey } from "@/lib/middleware/tenant";

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const sb = createServiceClient();

    // Find my lender
    const { data: existing } = await sb
      .from("onb_lenders")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "No tienes un portal configurado" }, { status: 404 });
    }

    // Generate new key
    const { rawKey, hash } = await generateApiKey();
    const last4 = rawKey.slice(-4);

    // Update — filter by user_id from JWT, never from body
    const { error: errUpd } = await sb
      .from("onb_lenders")
      .update({ api_key_hash: hash, api_key_last4: last4 })
      .eq("id", existing.id);

    if (errUpd) {
      console.error("[POST regenerate-key]", errUpd);
      return NextResponse.json({ error: "Error al regenerar key" }, { status: 500 });
    }

    // Return raw key ONE TIME ONLY
    return NextResponse.json({
      apiKey: rawKey,
      last4,
      warning: "Guarda esta API key. No podrás verla de nuevo.",
    });
  } catch (e: any) {
    console.error("[POST regenerate-key] unexpected", e);
    return NextResponse.json({ error: e?.message ?? "Error" }, { status: 500 });
  }
}
