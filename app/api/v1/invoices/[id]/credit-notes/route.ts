import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { jsonError } from "@/src/lib/api/http";
import { getInvoice } from "@/src/lib/invoices/repository";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const principal = await authenticateApiRequest(request, "invoices:write");
    const { id } = await context.params;
    const invoice = await getInvoice(principal.tenantId, id);
    if (!invoice) return jsonError(404, "NOT_FOUND", "Original invoice not found");
    if (!["accepted", "delivered"].includes(String(invoice.status))) return jsonError(409, "INVALID_STATE", "Credit notes require a fiscally accepted invoice");
    return NextResponse.json({
      error: {
        code: "REGULATOR_MAPPING_REQUIRED",
        message: "Credit-note lifecycle is scaffolded but intentionally not fiscalized until the official MoR credit-note schema is available.",
      },
    }, { status: 501 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Invalid API key");
    if (message === "FORBIDDEN") return jsonError(403, "FORBIDDEN", "API key lacks required scope");
    return jsonError(500, "INTERNAL_ERROR", "Credit note request failed");
  }
}
