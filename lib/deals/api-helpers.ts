import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type AuthResult =
  | { client: null; user: null; error: string }
  | { client: SupabaseClient; user: { id: string; email?: string }; error: null };

/**
 * Validates JWT and returns an authenticated client for READ operations.
 */
export async function getAuthedClient(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { client: null, user: null, error: "Sin autorización" };
  }
  const token = authHeader.slice(7);

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    return { client: null, user: null, error: "Usuario no autenticado" };
  }

  return { client, user: { id: user.id, email: user.email }, error: null };
}

/**
 * Returns service_role client for INSERT/UPDATE/DELETE.
 * BYPASSES RLS — caller must validate authorization manually.
 */
export function getAdminClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
