import { NextResponse } from "next/server";
import { requireDashboardPrincipal } from "@/src/lib/dashboard-auth";
import { calculateInvoice, calculateLine } from "@/src/domain/invoice";
import { createInvoice } from "@/src/lib/invoices/repository";
import { appendAudit } from "@/src/lib/audit";
import { jsonError } from "@/src/lib/api/http";

export async function POST(request: Request){
  try{
    const p=await requireDashboardPrincipal(["owner","admin","invoice_writer","accountant"]);
    const b=await request.json() as Record<string,unknown>;
    const legalEntityId=typeof b.legal_entity_id==="string"?b.legal_entity_id.trim():"";
    const sourceRef=typeof b.source_ref==="string"?b.source_ref.trim():"";
    const description=typeof b.description==="string"?b.description.trim():"";
    const unitPriceMinor=Number(b.unit_price_minor), taxRateBps=Number(b.tax_rate_bps);
    if(!legalEntityId||!sourceRef||sourceRef.length>160||!description||description.length>500)return jsonError(400,"INVALID_BODY","legal_entity_id, source_ref, and description are required");
    const line={description,quantityMilli:1000,unitPriceMinor,taxRateBps};
    const calc=calculateLine(line), totals=calculateInvoice([line]);
    const idempotency=request.headers.get("idempotency-key")?.trim()||`ui:${p.userId}:${crypto.randomUUID()}`;
    const invoice=await createInvoice({tenantId:p.tenantId,legalEntityId,sourceRef,currency:"ETB",subtotalMinor:totals.subtotalMinor,taxMinor:totals.taxMinor,totalMinor:totals.totalMinor,canonicalPayload:{source:"dashboard",legal_entity_id:legalEntityId,source_ref:sourceRef,currency:"ETB",lines:[{description,quantity_milli:1000,unit_price_minor:unitPriceMinor,tax_rate_bps:taxRateBps}]},idempotencyKey:idempotency,lines:[{description,quantity_milli:1000,unit_price_minor:unitPriceMinor,tax_rate_bps:taxRateBps,net_minor:calc.netMinor,tax_minor:calc.taxMinor,total_minor:calc.totalMinor}]});
    await appendAudit({tenantId:p.tenantId,actorType:"user",actorId:p.userId,action:"invoice.created",objectType:"invoice",objectId:String(invoice.id),metadata:{source:"dashboard"}});
    return NextResponse.json({data:invoice},{status:201});
  }catch(error){
    const m=error instanceof Error?error.message:"UNKNOWN";
    if(m==="UNAUTHORIZED")return jsonError(401,"UNAUTHORIZED","Sign in required");
    if(m==="FORBIDDEN")return jsonError(403,"FORBIDDEN","Your tenant role cannot create invoices");
    if(m==="NO_TENANT_MEMBERSHIP")return jsonError(403,"NO_TENANT_MEMBERSHIP","No active tenant membership is assigned");
    if(m.startsWith("quantity")||m.startsWith("unitPrice")||m.startsWith("taxRate")||m.includes("description"))return jsonError(400,"INVALID_AMOUNT","Invoice line values are invalid");
    if(m.includes("IDEMPOTENCY_KEY_REUSED"))return jsonError(409,"IDEMPOTENCY_KEY_REUSED","Idempotency key was reused with different content");
    return jsonError(500,"INTERNAL_ERROR","Invoice could not be created");
  }
}
