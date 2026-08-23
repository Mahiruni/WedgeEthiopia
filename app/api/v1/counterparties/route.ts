import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { jsonError } from "@/src/lib/api/http";

export async function POST(request: Request) {
  try {
    const p = await authenticateApiRequest(request, "invoices:write");
    const b = await request.json() as { tin?: string; vat_number?: string; legal_name?: string };
    if (!b.legal_name?.trim()) return jsonError(400,"INVALID_BODY","legal_name is required");
    const db = getAdminClient();
    const { data, error } = await db.from("counterparties").insert({ tenant_id:p.tenantId, tin:b.tin?.trim() || null, vat_number:b.vat_number?.trim() || null, legal_name:b.legal_name.trim() }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ data }, { status:201 });
  } catch (error) {
    const m = error instanceof Error ? error.message : "UNKNOWN";
    if (m === "UNAUTHORIZED") return jsonError(401,"UNAUTHORIZED","Invalid API key");
    if (m === "FORBIDDEN") return jsonError(403,"FORBIDDEN","API key lacks required scope");
    return jsonError(500,"INTERNAL_ERROR","Counterparty could not be created");
  }
}
