import { createClient } from "@supabase/supabase-js";
import { env } from "@/src/lib/env";

let client: ReturnType<typeof createClient> | null = null;

export function getAdminClient() {
  if (!env.supabaseUrl || !env.supabaseSecretKey) throw new Error("Supabase server credentials are not configured");
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
