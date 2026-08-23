import { getAdminClient } from "@/src/lib/supabase/admin";
import type { InvoiceState } from "@/src/domain/invoice-state";

export type PersistedInvoiceLine = {
  description: string;
  quantity_milli: number;
  unit_price_minor: number;
  tax_rate_bps: number;
  net_minor: number;
  tax_minor: number;
  total_minor: number;
  sku?: string;
  tax_code?: string;
};

export type CreateInvoiceRecord = {
  tenantId: string;
  legalEntityId: string;
  branchId?: string;
  counterpartyId?: string;
  sourceRef: string;
  currency: string;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  canonicalPayload: Record<string, unknown>;
  idempotencyKey: string;
  lines: PersistedInvoiceLine[];
};

export async function createInvoice(input: CreateInvoiceRecord) {
  const db = getAdminClient();
  const { data: invoiceId, error: rpcError } = await db.rpc("create_invoice_v1", {
    p_tenant_id: input.tenantId,
    p_legal_entity_id: input.legalEntityId,
    p_branch_id: input.branchId ?? null,
    p_counterparty_id: input.counterpartyId ?? null,
    p_source_ref: input.sourceRef,
    p_idempotency_key: input.idempotencyKey,
    p_currency: input.currency,
    p_subtotal_minor: input.subtotalMinor,
    p_vat_minor: input.taxMinor,
    p_total_minor: input.totalMinor,
    p_canonical_payload: input.canonicalPayload,
    p_lines: input.lines,
  });
  if (rpcError) throw rpcError;
  const { data, error } = await db.from("invoices").select("*").eq("tenant_id", input.tenantId).eq("id", invoiceId).single();
  if (error) throw error;
  return data;
}

export async function getInvoice(tenantId: string, id: string) {
  const db = getAdminClient();
  const { data, error } = await db.from("invoices").select("*,invoice_lines(*)").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listInvoices(tenantId: string, limit = 50, updatedSince?: string) {
  const db = getAdminClient();
  let query = db.from("invoices").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }).limit(Math.min(limit, 100));
  if (updatedSince) query = query.gte("updated_at", updatedSince);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateInvoiceState(tenantId: string, id: string, state: InvoiceState, patch: Record<string, unknown> = {}) {
  const db = getAdminClient();
  const { data, error } = await db.from("invoices").update({ ...patch, status: state }).eq("tenant_id", tenantId).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
