import { getAdminClient } from "@/src/lib/supabase/admin";
import type { FiscalResult } from "./adapter";

export async function beginFiscalSubmission(input: { tenantId: string; invoiceId: string; provider: string }) {
  const db = getAdminClient();
  const { data, error } = await db.rpc("begin_fiscal_submission_v1", { p_tenant_id: input.tenantId, p_invoice_id: input.invoiceId, p_provider: input.provider });
  if (error) throw error;
  return String(data);
}

export async function finalizeFiscalSubmission(input: { tenantId: string; invoiceId: string; submissionId: string; result: FiscalResult }) {
  const db = getAdminClient();
  const common = {
    p_tenant_id: input.tenantId,
    p_invoice_id: input.invoiceId,
    p_submission_id: input.submissionId,
    p_authority_reference: input.result.authorityReference ?? null,
    p_response_payload: input.result.raw ?? null,
  };
  const args = input.result.outcome === "accepted"
    ? { ...common, p_outcome: "accepted", p_irn: input.result.irn, p_rrn: input.result.rrn ?? null, p_qr_payload: input.result.qrPayload ?? null, p_response_code: "ACCEPTED", p_rejection_message: null }
    : { ...common, p_outcome: "rejected", p_irn: null, p_rrn: null, p_qr_payload: null, p_response_code: input.result.code, p_rejection_message: input.result.message };
  const { error } = await db.rpc("finalize_fiscal_submission_v1", args);
  if (error) throw error;
}

export async function markFiscalSubmissionFailed(input: { tenantId: string; invoiceId: string; submissionId: string; message: string; outcomeUnknown: boolean }) {
  const db = getAdminClient();
  const { error } = await db.rpc("mark_fiscal_submission_failure_v1", {
    p_tenant_id: input.tenantId,
    p_invoice_id: input.invoiceId,
    p_submission_id: input.submissionId,
    p_message: input.message,
    p_outcome_unknown: input.outcomeUnknown,
  });
  if (error) throw error;
}
