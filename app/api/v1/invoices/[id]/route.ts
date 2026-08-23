import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { jsonError } from "@/src/lib/api/http";
import { getInvoice } from "@/src/lib/invoices/repository";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const principal = await authenticateApiRequest(request, "invoices:read");
    const { id } = await context.params;
    const invoice = await getInvoice(principal.tenantId, id);
    if (!invoice) return jsonError(404, "NOT_FOUND", "Invoice not found");
    return NextResponse.json({ data: invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Invalid API key");
    if (message === "FORBIDDEN") return jsonError(403, "FORBIDDEN", "API key lacks required scope");
    return jsonError(500, "INTERNAL_ERROR", "Invoice could not be loaded");
  }
}
