import { NextResponse } from "next/server";
import { createPrivateKey, sign } from "node:crypto";
import { assertInternalWorker } from "@/src/lib/internal-auth";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { jsonError } from "@/src/lib/api/http";

function asDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("INVALID_CHECKPOINT_DATE");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_CHECKPOINT_DATE");
  return { value, endExclusive: new Date(date.getTime() + 86_400_000).toISOString() };
}

function signRoot(message: string) {
  const raw = process.env.AUDIT_CHECKPOINT_ED25519_PRIVATE_KEY_DER_BASE64?.trim();
  const keyId = process.env.AUDIT_CHECKPOINT_SIGNING_KEY_ID?.trim() || "audit-key-1";
  if (!raw) throw new Error("AUDIT_SIGNING_KEY_NOT_CONFIGURED");
  const key = createPrivateKey({ key: Buffer.from(raw, "base64"), format: "der", type: "pkcs8" });
  return `v1:${keyId}:${sign(null, Buffer.from(message), key).toString("base64url")}`;
}

export async function POST(request: Request) {
  try {
    assertInternalWorker(request);
    const body = await request.json().catch(() => ({})) as { checkpoint_date?: string };
    const fallback = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const checkpoint = asDate(body.checkpoint_date ?? fallback);
    const db = getAdminClient();
    const { data: tenants, error: tenantError } = await db.from("tenants").select("id").eq("status", "active");
    if (tenantError) throw tenantError;
    let created = 0, skipped = 0;
    for (const tenant of tenants ?? []) {
      const { data: existing, error: existingError } = await db.from("audit_checkpoints").select("id").eq("tenant_id", tenant.id).eq("checkpoint_date", checkpoint.value).maybeSingle();
      if (existingError) throw existingError;
      if (existing) { skipped++; continue; }
      const { data: last, error: lastError } = await db.from("audit_events").select("seq,event_hash").eq("tenant_id", tenant.id).lt("occurred_at", checkpoint.endExclusive).order("seq", { ascending: false }).limit(1).maybeSingle();
      if (lastError) throw lastError;
      if (!last) { skipped++; continue; }
      const canonical = `${tenant.id}\n${checkpoint.value}\n${last.seq}\n${last.event_hash}`;
      const signature = signRoot(canonical);
      const { error: insertError } = await db.from("audit_checkpoints").insert({ tenant_id: tenant.id, checkpoint_date: checkpoint.value, last_seq: last.seq, root_hash: last.event_hash, signature });
      if (insertError) throw insertError;
      created++;
    }
    return NextResponse.json({ data: { checkpoint_date: checkpoint.value, created, skipped, export_required: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Invalid internal worker secret");
    if (message === "INVALID_CHECKPOINT_DATE") return jsonError(400, "INVALID_CHECKPOINT_DATE", "checkpoint_date must be YYYY-MM-DD");
    if (message === "AUDIT_SIGNING_KEY_NOT_CONFIGURED") return jsonError(503, "AUDIT_SIGNING_KEY_NOT_CONFIGURED", "Audit checkpoint signing key is not configured");
    return jsonError(500, "INTERNAL_ERROR", "Audit checkpoint creation failed");
  }
}
