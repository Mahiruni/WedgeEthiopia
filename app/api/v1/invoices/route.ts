import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { jsonError } from "@/src/lib/api/http";
import { calculateInvoice, calculateLine, type InvoiceLineInput } from "@/src/domain/invoice";
import { createInvoice, listInvoices } from "@/src/lib/invoices/repository";
import { appendAudit } from "@/src/lib/audit";

type ParsedLine = InvoiceLineInput & { sku?: string; taxCode?: string };

function boundedString(value: unknown, field: string, max: number, required = false) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`INVALID_${field.toUpperCase()}`);
  if (result.length > max) throw new Error(`INVALID_${field.toUpperCase()}`);
  return result;
}

function parseBody(body: unknown) {
  if (!body || typeof body !== "object") throw new Error("INVALID_BODY");
  const b = body as Record<string, unknown>;
  const legalEntityId = boundedString(b.legal_entity_id, "legal_entity_id", 64, true);
  const sourceRef = boundedString(b.source_ref, "source_ref", 160, true);
  if (!Array.isArray(b.lines) || b.lines.length === 0 || b.lines.length > 500) throw new Error("INVALID_LINES");
  const currency = boundedString(b.currency ?? "ETB", "currency", 3, true).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("INVALID_CURRENCY");

  const lines: ParsedLine[] = b.lines.map((row) => {
    if (!row || typeof row !== "object") throw new Error("INVALID_LINE");
    const r = row as Record<string, unknown>;
    const description = boundedString(r.description, "description", 500, true);
    const sku = boundedString(r.sku, "sku", 120);
    const taxCode = boundedString(r.tax_code, "tax_code", 80);
    return {
      description,
      quantityMilli: Number(r.quantity_milli),
      unitPriceMinor: Number(r.unit_price_minor),
      taxRateBps: Number(r.tax_rate_bps),
      ...(sku ? { sku } : {}),
      ...(taxCode ? { taxCode } : {}),
    };
  });
  const totals = calculateInvoice(lines);
  const persistedLines = lines.map((line) => {
    const calc = calculateLine(line);
    return {
      description: line.description,
      quantity_milli: line.quantityMilli,
      unit_price_minor: line.unitPriceMinor,
      tax_rate_bps: line.taxRateBps,
      net_minor: calc.netMinor,
      tax_minor: calc.taxMinor,
      total_minor: calc.totalMinor,
      ...(line.sku ? { sku: line.sku } : {}),
      ...(line.taxCode ? { tax_code: line.taxCode } : {}),
    };
  });
  return {
    legalEntityId,
    branchId: typeof b.branch_id === "string" ? boundedString(b.branch_id, "branch_id", 64) || undefined : undefined,
    counterpartyId: typeof b.counterparty_id === "string" ? boundedString(b.counterparty_id, "counterparty_id", 64) || undefined : undefined,
    sourceRef,
    currency,
    persistedLines,
    totals,
    canonicalPayload: b,
  };
}

export async function POST(request: Request) {
  try {
    const principal = await authenticateApiRequest(request, "invoices:write");
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 200) return jsonError(400, "IDEMPOTENCY_REQUIRED", "A valid Idempotency-Key header is required");
    const parsed = parseBody(await request.json());
    const invoice = await createInvoice({
      tenantId: principal.tenantId,
      legalEntityId: parsed.legalEntityId,
      branchId: parsed.branchId,
      counterpartyId: parsed.counterpartyId,
      sourceRef: parsed.sourceRef,
      currency: parsed.currency,
      subtotalMinor: parsed.totals.subtotalMinor,
      taxMinor: parsed.totals.taxMinor,
      totalMinor: parsed.totals.totalMinor,
      canonicalPayload: parsed.canonicalPayload,
      idempotencyKey,
      lines: parsed.persistedLines,
    });
    await appendAudit({ tenantId: principal.tenantId, actorType: "api_key", actorId: principal.apiKeyId, action: "invoice.created", objectType: "invoice", objectId: String(invoice.id) });
    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Invalid API key");
    if (message === "FORBIDDEN") return jsonError(403, "FORBIDDEN", "API key lacks required scope");
    if (message.startsWith("INVALID")) return jsonError(400, message, "Invalid invoice payload");
    if (message.includes("IDEMPOTENCY_KEY_REUSED")) return jsonError(409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used for a different payload");
    if (message.includes("duplicate key") || message.includes("unique constraint")) return jsonError(409, "DUPLICATE_INVOICE", "The invoice source reference already exists for this tenant");
    return jsonError(500, "INTERNAL_ERROR", "Invoice could not be created");
  }
}

export async function GET(request: Request) {
  try {
    const principal = await authenticateApiRequest(request, "invoices:read");
    const url = new URL(request.url);
    const requested = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 100) : 50;
    const updatedSinceRaw = url.searchParams.get("updated_since")?.trim();
    let updatedSince: string | undefined;
    if (updatedSinceRaw) {
      const parsedDate = new Date(updatedSinceRaw);
      if (Number.isNaN(parsedDate.getTime())) return jsonError(400, "INVALID_UPDATED_SINCE", "updated_since must be an ISO-8601 timestamp");
      updatedSince = parsedDate.toISOString();
    }
    const rows = await listInvoices(principal.tenantId, limit, updatedSince);
    return NextResponse.json({ data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Invalid API key");
    if (message === "FORBIDDEN") return jsonError(403, "FORBIDDEN", "API key lacks required scope");
    return jsonError(500, "INTERNAL_ERROR", "Invoices could not be loaded");
  }
}
