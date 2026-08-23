import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { jsonError } from "@/src/lib/api/http";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const principal = await authenticateApiRequest(request, "webhooks:write");
    const { id } = await context.params;
    const db = getAdminClient();
    const { error } = await db.from("webhook_endpoints").delete().eq("tenant_id", principal.tenantId).eq("id", id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Invalid API key");
    if (message === "FORBIDDEN") return jsonError(403, "FORBIDDEN", "API key lacks required scope");
    return jsonError(500, "INTERNAL_ERROR", "Webhook endpoint could not be deleted");
  }
}
