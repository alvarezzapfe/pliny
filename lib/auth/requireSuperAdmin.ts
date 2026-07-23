import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AuthResult =
  | { user: { id: string; email?: string }; error: null }
  | { user: null; error: string; status: number };

/**
 * Verifica que el request viene de un usuario autenticado
 * que pertenece a la tabla super_admins.
 *
 * Uso:
 *   const auth = await requireSuperAdmin(req);
 *   if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
 *   // auth.user está disponible
 */
export async function requireSuperAdmin(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { user: null, error: "No autorizado — falta token", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: "Token inválido o expirado", status: 401 };
  }

  const { data: sa } = await supabaseAdmin
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sa) {
    return { user: null, error: "Requiere super_admin", status: 403 };
  }

  return { user: { id: user.id, email: user.email }, error: null };
}

/** Helper para responder rápido si auth falla */
export function authError(result: { error: string; status: number }) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
