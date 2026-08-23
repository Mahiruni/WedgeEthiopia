import { getAdminClient } from "@/src/lib/supabase/admin";

export async function appendAudit(input: {
  tenantId: string;
  actorType: "api_key" | "user" | "system" | "fiscal_worker";
  actorId?: string;
  action: string;
  objectType: string;
  objectId: string;
  payloadHash?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getAdminClient();
  const { error } = await db.from("audit_events").insert({
    tenant_id: input.tenantId,
    actor_type: input.actorType,
    actor_id: input.actorId ?? null,
    action: input.action,
    object_type: input.objectType,
    object_id: input.objectId,
    payload_hash: input.payloadHash ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}
