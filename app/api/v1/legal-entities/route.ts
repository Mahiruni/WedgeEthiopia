import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { jsonError } from "@/src/lib/api/http";

export async function GET(request: Request) {
  try {
    const p = await authenticateApiRequest(request, "invoices:read");
    const db = getAdminClient();
    const { data, error } = await db.from("legal_entities").select("id,tin,vat_number,registration_number,legal_name,status").eq("tenant_id", p.tenantId).order("legal_name");
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const m = error instanceof Error ? error.message : "UNKNOWN";
    if (m === "UNAUTHORIZED") return jsonError(401,"UNAUTHORIZED","Invalid API key");
    if (m === "FORBIDDEN") return jsonError(403,"FORBIDDEN","API key lacks required scope");
    return jsonError(500,"INTERNAL_ERROR","Legal entities could not be loaded");
  }
}
