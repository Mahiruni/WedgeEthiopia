import { NextResponse } from "next/server";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { deliverWebhook } from "@/src/lib/webhooks/deliver";
import { assertSafeWebhookUrl } from "@/src/lib/webhooks/url";
import { assertInternalWorker } from "@/src/lib/internal-auth";
import { jsonError } from "@/src/lib/api/http";

const retrySeconds = [60, 300, 1800, 7200];
const maxAttempts = 5;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("hex");
}

export async function POST(request: Request) {
  try {
    assertInternalWorker(request);
    const db = getAdminClient();
    const { data: events, error } = await db
      .from("webhook_events")
      .select("id,tenant_id,event_type,object_id,payload,created_at")
      .eq("status", "pending")
      .order("created_at")
      .limit(20);
    if (error) throw error;

    let processed = 0;
    let delivered = 0;
    let deferred = 0;
    let deadLettered = 0;

    for (const event of events ?? []) {
      const { data: endpoints, error: endpointError } = await db
        .from("webhook_endpoints")
        .select("id,url,events")
        .eq("tenant_id", event.tenant_id)
        .eq("status", "active")
        .contains("events", [event.event_type]);
      if (endpointError) throw endpointError;

      let allResolved = true;
      let hasTerminalFailure = false;

      for (const endpoint of endpoints ?? []) {
        const { data: last, error: lastError } = await db
          .from("webhook_deliveries")
          .select("attempt_no,delivered_at,next_attempt_at,terminal_failure")
          .eq("tenant_id", event.tenant_id)
          .eq("endpoint_id", endpoint.id)
          .eq("event_id", event.id)
          .order("attempt_no", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastError) throw lastError;

        if (last?.delivered_at) continue;
        if (last?.terminal_failure) {
          hasTerminalFailure = true;
          continue;
        }
        if (last?.next_attempt_at && new Date(last.next_attempt_at).getTime() > Date.now()) {
          allResolved = false;
          deferred++;
          continue;
        }

        const attempt = Number(last?.attempt_no ?? 0) + 1;
        const terminalOnFailure = attempt >= maxAttempts;

        try {
          const url = await assertSafeWebhookUrl(String(endpoint.url));
          const response = await deliverWebhook({
            url,
            eventId: String(event.id),
            eventType: String(event.event_type),
            data: event.payload,
          });
          const responseText = (await response.text()).slice(0, 8192);
          const ok = response.ok;
          const nextAttempt = ok || terminalOnFailure
            ? null
            : new Date(Date.now() + retrySeconds[Math.min(attempt - 1, retrySeconds.length - 1)] * 1000).toISOString();

          const { error: deliveryError } = await db.from("webhook_deliveries").insert({
            tenant_id: event.tenant_id,
            endpoint_id: endpoint.id,
            event_id: event.id,
            event_type: event.event_type,
            attempt_no: attempt,
            response_status: response.status,
            response_body_hash: await sha256(responseText),
            delivered_at: ok ? new Date().toISOString() : null,
            next_attempt_at: nextAttempt,
            terminal_failure: !ok && terminalOnFailure,
            error_code: ok ? null : `HTTP_${response.status}`,
          });
          if (deliveryError) throw deliveryError;

          if (ok) delivered++;
          else if (terminalOnFailure) hasTerminalFailure = true;
          else allResolved = false;
        } catch (err) {
          const message = err instanceof Error ? err.message : "delivery failure";
          const nextAttempt = terminalOnFailure
            ? null
            : new Date(Date.now() + retrySeconds[Math.min(attempt - 1, retrySeconds.length - 1)] * 1000).toISOString();
          const { error: deliveryError } = await db.from("webhook_deliveries").insert({
            tenant_id: event.tenant_id,
            endpoint_id: endpoint.id,
            event_id: event.id,
            event_type: event.event_type,
            attempt_no: attempt,
            response_status: null,
            response_body_hash: await sha256(message),
            next_attempt_at: nextAttempt,
            terminal_failure: terminalOnFailure,
            error_code: message === "INVALID_WEBHOOK_URL" ? "BLOCKED_DESTINATION" : "DELIVERY_ERROR",
          });
          if (deliveryError) throw deliveryError;
          if (terminalOnFailure) hasTerminalFailure = true;
          else allResolved = false;
        }
      }

      if (allResolved) {
        const status = hasTerminalFailure ? "dead_letter" : "processed";
        const { error: updateError } = await db
          .from("webhook_events")
          .update({ status, processed_at: new Date().toISOString() })
          .eq("tenant_id", event.tenant_id)
          .eq("id", event.id)
          .eq("status", "pending");
        if (updateError) throw updateError;
        if (hasTerminalFailure) deadLettered++;
        else processed++;
      }
    }

    return NextResponse.json({
      data: {
        events_processed: processed,
        events_dead_lettered: deadLettered,
        deliveries_succeeded: delivered,
        deferred,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Invalid internal worker secret");
    return jsonError(500, "INTERNAL_ERROR", "Webhook drain failed");
  }
}
