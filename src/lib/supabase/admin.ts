import { createClient } from "@supabase/supabase-js";
import { env } from "@/src/lib/env";

// TODO: replace this untyped admin client with generated Supabase Database types
// once the production project schema is linked. Keeping the service client
// explicitly untyped avoids false `never` inference for tables/RPCs that are
// defined in supabase/schema.sql but have not yet had TypeScript types generated.
let client: any = null;

export function getAdminClient(): any {
  if (!env.supabaseUrl || !env.supabaseSecretKey) throw new Error("Supabase server credentials are not configured");
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
