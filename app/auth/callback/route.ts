import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const user = data.user;

  // ── Verifica si el usuario ya tiene rol asignado ──────────────────────────
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  // ── Usuario nuevo (sin rol) → selección de rol ───────────────────────────
  if (!roleRow?.role) {
    return NextResponse.redirect(`${origin}/onboarding/role`);
  }

  // ── Usuario existente → ruta por rol ─────────────────────────────────────
  if (roleRow.role === "solicitante") {
    const { data: borrower } = await supabase
      .from("borrowers_profile")
      .select("onboarding_done")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (borrower?.onboarding_done) {
      return NextResponse.redirect(`${origin}/solicitante`);
    }
    return NextResponse.redirect(`${origin}/onboarding/solicitante`);
  }

  // otorgante o cualquier otro rol → dashboard
  return NextResponse.redirect(`${origin}/dashboard`);
}
