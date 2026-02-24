import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// OJO: service role key NUNCA se usa en el browser.
// Este archivo solo debe importarse desde route handlers / server.
if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});