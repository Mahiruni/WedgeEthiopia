import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { jsonError } from "@/src/lib/api/http";
import { getInvoice } from "@/src/lib/invoices/repository";
import { getFiscalAdapter } from "@/src/lib/fiscal";
import { FiscalAdapterError } from "@/src/lib/fiscal/adapter";
import { beginFiscalSubmission, finalizeFiscalSubmission, markFiscalSubmissionFailed } from "@/src/lib/fiscal/submissions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const principal = await authenticateApiRequest(request, "invoices:submit");
    const { id } = await context.params;
    const invoice = await getInvoice(principal.tenantId, id);
    if (!invoice) return jsonError(404, "NOT_FOUND", "Invoice not found");

    const adapter = getFiscalAdapter();
    let submissionId: string;
    try {
      submissionId = await beginFiscalSubmission({ tenantId: principal.tenantId, invoiceId: id, provider: adapter.name });
    } catch (beginError) {
      const m = beginError instanceof Error ? beginError.message : "";
      if (m.includes("INVALID_SUBMISSION_STATE")) return jsonError(409, "INVALID_STATE", `Invoice cannot be submitted from ${invoice.status}`);
      throw beginError;
    }

    let result;
    try {
      result = await adapter.submit({ invoiceId: id, canonicalPayload: invoice.canonical_payload ?? {} });
    } catch (adapterError) {
      await markFiscalSubmissionFailed({
        tenantId: principal.tenantId,
        invoiceId: id,
        submissionId,
        message: adapterError instanceof Error ? adapterError.message : "unknown",
        outcomeUnknown: adapterError instanceof FiscalAdapterError ? adapterError.outcomeUnknown : true,
      });
      throw adapterError;
    }

    await finalizeFiscalSubmission({ tenantId: principal.tenantId, invoiceId: id, submissionId, result });
    const finalInvoice = await getInvoice(principal.tenantId, id);
    return NextResponse.json({ data: finalInvoice }, { status: result.outcome === "accepted" ? 200 : 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Invalid API key");
    if (message === "FORBIDDEN") return jsonError(403, "FORBIDDEN", "API key lacks required scope");
    if (message.startsWith("MOR_ADAPTER_NOT_CONFIGURED")) return jsonError(503, "FISCAL_ADAPTER_NOT_CONFIGURED", "Official MoR API specification/configuration is required");
    return jsonError(500, "INTERNAL_ERROR", "Invoice submission failed");
  }
}
