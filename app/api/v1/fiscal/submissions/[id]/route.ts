import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { jsonError } from "@/src/lib/api/http";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const p = await authenticateApiRequest(request, "invoices:read");
    const { id } = await context.params;
    const db = getAdminClient();
    const { data, error } = await db.from("fiscal_submissions").select("id,invoice_id,attempt_no,upstream_provider,authority_reference,response_code,status,submitted_at").eq("tenant_id",p.tenantId).eq("id",id).maybeSingle();
    if (error) throw error;
    if (!data) return jsonError(404,"NOT_FOUND","Fiscal submission not found");
    return NextResponse.json({ data });
  } catch (error) {
    const m = error instanceof Error ? error.message : "UNKNOWN";
    if (m === "UNAUTHORIZED") return jsonError(401,"UNAUTHORIZED","Invalid API key");
    if (m === "FORBIDDEN") return jsonError(403,"FORBIDDEN","API key lacks required scope");
    return jsonError(500,"INTERNAL_ERROR","Submission could not be loaded");
  }
}
