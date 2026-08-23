import { env } from "@/src/lib/env";
import { signWebhook } from "./sign";

export async function deliverWebhook(input: { url: string; eventId: string; eventType: string; data: unknown }) {
  if (!env.webhookPrivateKeyDerBase64) throw new Error("Webhook signing key not configured");
  const body = JSON.stringify({ id: input.eventId, type: input.eventType, created_at: new Date().toISOString(), data: input.data });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await signWebhook({ privateKeyDerBase64: env.webhookPrivateKeyDerBase64, timestamp, eventId: input.eventId, body });
  return fetch(input.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-rail-event-id": input.eventId,
      "x-rail-timestamp": timestamp,
      "x-rail-key-id": env.webhookKeyId,
      "x-rail-signature": `v1=${signature}`,
    },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
}
