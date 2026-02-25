import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { clientId: string };

export async function GET(_req: NextRequest, { params }: { params: Promise<Params> }) {
  const supabase = getSupabaseAdmin();
  const { clientId } = await params;

  const { data, error } = await supabase
    .from("client_sat_metrics")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ metrics: data ?? null }, { status: 200 });
}