import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { code, password } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Código de recuperación requerido." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 12) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 12 caracteres." }, { status: 400 });
    }

    const sb = createServiceClient();

    // Exchange the PKCE code for a session (server-side, same process that could hold the verifier)
    const { data, error: exchangeErr } = await sb.auth.exchangeCodeForSession(code);

    if (exchangeErr || !data.session) {
      console.error("[reset-password API] exchange error:", exchangeErr?.message);
      return NextResponse.json(
        { error: "Enlace inválido o expirado. Solicita uno nuevo." },
        { status: 400 },
      );
    }

    // Update password using admin API (bypasses any session issues)
    const { error: updateErr } = await sb.auth.admin.updateUserById(
      data.session.user.id,
      { password },
    );

    if (updateErr) {
      console.error("[reset-password API] update error:", updateErr.message);
      return NextResponse.json(
        { error: "Error actualizando contraseña. Intenta de nuevo." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    console.error("[reset-password API] catch:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
