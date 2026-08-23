import { getAdminClient } from "@/src/lib/supabase/admin";

export async function enqueueWebhookEvent(input: { tenantId: string; eventType: string; objectId: string; data: unknown }) {
  const db = getAdminClient();
  const { data, error } = await db.from("webhook_events").insert({
    tenant_id: input.tenantId,
    event_type: input.eventType,
    object_id: input.objectId,
    payload: input.data,
    status: "pending",
  }).select("*").single();
  if (error) throw error;
  return data;
}
