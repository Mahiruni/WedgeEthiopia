import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { jsonError } from "@/src/lib/api/http";

export async function GET(request: Request) {
  try {
    const p = await authenticateApiRequest(request, "invoices:read");
    const tin = new URL(request.url).searchParams.get("tin")?.trim();
    if (!tin) return jsonError(400,"TIN_REQUIRED","tin query parameter is required");
    const db = getAdminClient();
    const { data, error } = await db.from("counterparties").select("id,tin,vat_number,legal_name,verification_status").eq("tenant_id",p.tenantId).eq("tin",tin).maybeSingle();
    if (error) throw error;
    if (!data) return jsonError(404,"NOT_FOUND","Counterparty not found");
    return NextResponse.json({ data });
  } catch (error) {
    const m = error instanceof Error ? error.message : "UNKNOWN";
    if (m === "UNAUTHORIZED") return jsonError(401,"UNAUTHORIZED","Invalid API key");
    if (m === "FORBIDDEN") return jsonError(403,"FORBIDDEN","API key lacks required scope");
    return jsonError(500,"INTERNAL_ERROR","Counterparty could not be resolved");
  }
}
