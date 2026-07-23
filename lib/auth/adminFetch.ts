import { supabase } from "@/lib/supabaseClient";

/**
 * Fetch wrapper para endpoints /api/admin/*.
 * Agrega automáticamente el token de sesión de Supabase en Authorization header.
 * Si no hay sesión, lanza error claro.
 */
export async function adminFetch(
  url: string,
  opts?: RequestInit
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No hay sesión activa — inicia sesión primero");
  }

  const headers = new Headers(opts?.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (!headers.has("Content-Type") && opts?.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...opts, headers });
}
