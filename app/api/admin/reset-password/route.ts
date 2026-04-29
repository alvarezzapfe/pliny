import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  console.log("[reset-password] === REQUEST START ===");

  try {
    const body = await req.json();
    const { tokenHash, password } = body;

    console.log("[reset-password] input:", {
      hasTokenHash: !!tokenHash,
      tokenLength: tokenHash?.length,
      tokenPrefix: tokenHash?.substring(0, 12),
      hasPassword: !!password,
      passwordLength: password?.length,
    });

    if (!tokenHash || typeof tokenHash !== "string") {
      console.log("[reset-password] FAIL: no tokenHash");
      return NextResponse.json({ error: "Token requerido." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 12) {
      console.log("[reset-password] FAIL: invalid password");
      return NextResponse.json({ error: "Contraseña debe tener 12+ caracteres." }, { status: 400 });
    }

    // Verify OTP token_hash with anon client
    console.log("[reset-password] verifyOtp with token_hash...");
    const otpClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const result = await otpClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    console.log("[reset-password] verifyOtp result:", {
      hasError: !!result.error,
      errorMessage: result.error?.message,
      hasSession: !!result.data?.session,
      hasUser: !!result.data?.user,
      userId: result.data?.user?.id,
    });

    if (result.error || !result.data?.user) {
      console.error("[reset-password] verifyOtp FAILED:", result.error?.message);
      return NextResponse.json(
        { error: "Enlace inválido o expirado. Solicita uno nuevo." },
        { status: 400 },
      );
    }

    // Update password via admin API
    console.log("[reset-password] updating password for user:", result.data.user.id);
    const sb = createServiceClient();
    const { error: updateErr } = await sb.auth.admin.updateUserById(
      result.data.user.id,
      { password },
    );

    if (updateErr) {
      console.error("[reset-password] updateUser FAILED:", updateErr.message);
      return NextResponse.json({ error: "Error actualizando contraseña." }, { status: 500 });
    }

    console.log("[reset-password] === SUCCESS ===");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    console.error("[reset-password] CATCH:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
