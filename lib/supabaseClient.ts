import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Check .env.local at project root.");
  }
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Check .env.local at project root.");
  }

  _client = createClient(url, key, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  // Side-effect: register auth state change listener (browser only)
  if (typeof window !== "undefined") {
    _client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        window.location.href = "/login";
      }
    });
  }

  return _client;
}

const handler: ProxyHandler<SupabaseClient> = {
  get(_, prop, receiver) { return Reflect.get(getClient(), prop, receiver); },
  has(_, prop) { return Reflect.has(getClient(), prop); },
  set(_, prop, value) { return Reflect.set(getClient(), prop, value); },
  deleteProperty(_, prop) { return Reflect.deleteProperty(getClient(), prop); },
  ownKeys() { return Reflect.ownKeys(getClient()); },
  getOwnPropertyDescriptor(_, prop) {
    return Reflect.getOwnPropertyDescriptor(getClient(), prop);
  },
};

export const supabase = new Proxy({} as SupabaseClient, handler);
