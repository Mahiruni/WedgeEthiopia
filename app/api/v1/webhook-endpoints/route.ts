import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { jsonError } from "@/src/lib/api/http";
import { assertSafeWebhookUrl } from "@/src/lib/webhooks/url";

const allowedEvents=new Set(["invoice.accepted","invoice.rejected","invoice.delivered","fiscal.reconciliation_required"]);
export async function POST(request: Request) {
  try {
    const principal=await authenticateApiRequest(request,"webhooks:write");
    const body=await request.json() as {url?:string;events?:string[]};
    const url=await assertSafeWebhookUrl(String(body.url??""));
    const events=Array.isArray(body.events)&&body.events.length?Array.from(new Set(body.events.map(String))):["invoice.accepted","invoice.rejected"];
    if(events.length>20||events.some(e=>!allowedEvents.has(e))) return jsonError(400,"INVALID_EVENTS","Webhook event list contains unsupported values");
    const db=getAdminClient();
    const {data,error}=await db.from("webhook_endpoints").insert({tenant_id:principal.tenantId,url,events,status:"active"}).select("id,url,events,status,created_at").single();
    if(error) throw error;
    return NextResponse.json({data},{status:201});
  }catch(error){
    const message=error instanceof Error?error.message:"UNKNOWN";
    if(message==="UNAUTHORIZED") return jsonError(401,"UNAUTHORIZED","Invalid API key");
    if(message==="FORBIDDEN") return jsonError(403,"FORBIDDEN","API key lacks required scope");
    if(message==="INVALID_WEBHOOK_URL") return jsonError(400,"INVALID_URL","Webhook URL must be a public HTTPS endpoint");
    return jsonError(500,"INTERNAL_ERROR","Webhook endpoint could not be created");
  }
}
export async function GET(request: Request){try{const p=await authenticateApiRequest(request,"webhooks:read");const db=getAdminClient();const {data,error}=await db.from("webhook_endpoints").select("id,url,events,status,created_at").eq("tenant_id",p.tenantId).order("created_at",{ascending:false});if(error)throw error;return NextResponse.json({data:data??[]});}catch(error){const m=error instanceof Error?error.message:"UNKNOWN";if(m==="UNAUTHORIZED")return jsonError(401,"UNAUTHORIZED","Invalid API key");if(m==="FORBIDDEN")return jsonError(403,"FORBIDDEN","API key lacks required scope");return jsonError(500,"INTERNAL_ERROR","Webhook endpoints could not be loaded");}}
