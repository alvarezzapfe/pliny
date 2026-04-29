import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  console.log("[reset-password] === REQUEST START ===");

  try {
    const body = await req.json();
    const { code, password } = body;

    console.log("[reset-password] code received:", {
      hasCode: !!code,
      codeLength: code?.length,
      codePrefix: code?.substring(0, 10),
      hasPassword: !!password,
      passwordLength: password?.length,
    });

    if (!code || typeof code !== "string") {
      console.log("[reset-password] FAIL: no code");
      return NextResponse.json({ error: "Código requerido." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 12) {
      console.log("[reset-password] FAIL: invalid password");
      return NextResponse.json({ error: "Contraseña debe tener 12+ caracteres." }, { status: 400 });
    }

    // INTENTO 1: anon client con flowType pkce
    console.log("[reset-password] === ATTEMPT 1: anon PKCE ===");
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: "pkce", persistSession: false, autoRefreshToken: false } }
    );

    const exchange1 = await anonClient.auth.exchangeCodeForSession(code);
    console.log("[reset-password] anon PKCE result:", {
      hasError: !!exchange1.error,
      errorMessage: exchange1.error?.message,
      errorCode: (exchange1.error as unknown as Record<string, unknown>)?.code,
      errorStatus: (exchange1.error as unknown as Record<string, unknown>)?.status,
      hasSession: !!exchange1.data?.session,
      hasUser: !!exchange1.data?.user,
    });

    if (!exchange1.error && exchange1.data?.session) {
      console.log("[reset-password] SUCCESS via anon PKCE, updating password...");
      const sb = createServiceClient();
      const { error: updateErr } = await sb.auth.admin.updateUserById(
        exchange1.data.session.user.id,
        { password }
      );

      if (updateErr) {
        console.log("[reset-password] update FAIL:", updateErr.message);
        return NextResponse.json({ error: "Error actualizando contraseña." }, { status: 500 });
      }

      console.log("[reset-password] === FULL SUCCESS ===");
      return NextResponse.json({ ok: true });
    }

    // INTENTO 2: verifyOtp con type recovery (fallback si PKCE falla)
    console.log("[reset-password] === ATTEMPT 2: verifyOtp recovery ===");
    const otpClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const verifyResult = await otpClient.auth.verifyOtp({
      token_hash: code,
      type: "recovery",
    });

    console.log("[reset-password] verifyOtp result:", {
      hasError: !!verifyResult.error,
      errorMessage: verifyResult.error?.message,
      errorStatus: (verifyResult.error as unknown as Record<string, unknown>)?.status,
      hasSession: !!verifyResult.data?.session,
      hasUser: !!verifyResult.data?.user,
    });

    if (!verifyResult.error && verifyResult.data?.user) {
      console.log("[reset-password] SUCCESS via verifyOtp, updating password...");
      const sb = createServiceClient();
      const { error: updateErr } = await sb.auth.admin.updateUserById(
        verifyResult.data.user.id,
        { password }
      );

      if (updateErr) {
        console.log("[reset-password] update FAIL:", updateErr.message);
        return NextResponse.json({ error: "Error actualizando contraseña." }, { status: 500 });
      }

      console.log("[reset-password] === FULL SUCCESS via OTP ===");
      return NextResponse.json({ ok: true });
    }

    // Ambos intentos fallaron
    console.log("[reset-password] === BOTH ATTEMPTS FAILED ===");
    console.log("[reset-password] anon error:", exchange1.error?.message);
    console.log("[reset-password] otp error:", verifyResult.error?.message);

    return NextResponse.json(
      { error: "Enlace inválido o expirado. Solicita uno nuevo." },
      { status: 400 }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[reset-password] CATCH:", message);
    console.error("[reset-password] STACK:", stack);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
