import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { code, password } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Código requerido." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 12) {
      return NextResponse.json({ error: "Contraseña debe tener 12+ caracteres." }, { status: 400 });
    }

    // 1. Anon client con flowType pkce para hacer el exchange
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: "pkce", persistSession: false, autoRefreshToken: false } }
    );

    const { data, error: exchangeErr } = await anonClient.auth.exchangeCodeForSession(code);

    if (exchangeErr || !data?.session) {
      console.error("[reset-password] exchange:", exchangeErr?.message);
      return NextResponse.json(
        { error: "Enlace inválido o expirado. Solicita uno nuevo." },
        { status: 400 }
      );
    }

    // 2. Service client para update admin (bypasses RLS)
    const sb = createServiceClient();
    const { error: updateErr } = await sb.auth.admin.updateUserById(
      data.session.user.id,
      { password }
    );

    if (updateErr) {
      console.error("[reset-password] update:", updateErr.message);
      return NextResponse.json({ error: "Error actualizando contraseña." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    console.error("[reset-password] catch:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
