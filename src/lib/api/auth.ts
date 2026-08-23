import { getAdminClient } from "@/src/lib/supabase/admin";

export type ApiPrincipal = { tenantId: string; apiKeyId: string; scopes: string[] };

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function authenticateApiRequest(request: Request, requiredScope?: string): Promise<ApiPrincipal> {
  const raw = request.headers.get("x-api-key")?.trim();
  if (!raw || raw.length < 24) throw new Error("UNAUTHORIZED");
  const keyHash = await sha256Hex(raw);
  const db = getAdminClient();
  const { data, error } = await db
    .from("api_keys")
    .select("id,tenant_id,scopes,status,expires_at")
    .eq("key_hash", keyHash)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) throw new Error("UNAUTHORIZED");
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) throw new Error("UNAUTHORIZED");
  const scopes = Array.isArray(data.scopes) ? data.scopes.map(String) : [];
  // Best-effort telemetry; authentication must not fail if this timestamp cannot be updated.
  await db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).eq("tenant_id", data.tenant_id);
  if (requiredScope && !scopes.includes(requiredScope) && !scopes.includes("*")) throw new Error("FORBIDDEN");
  return { tenantId: String(data.tenant_id), apiKeyId: String(data.id), scopes };
}
