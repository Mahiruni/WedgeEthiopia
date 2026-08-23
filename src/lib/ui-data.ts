import { createClient } from "@/src/lib/supabase/server";
import { demoAudit, demoInvoices, demoMetrics } from "@/src/lib/demo";
import { demoModeEnabled } from "@/src/lib/demo-mode";

export type UiInvoice = { id: string; sourceRef: string; counterparty: string; totalMinor: number; status: string; issuedAt: string };

function configured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }

async function tenantContext() {
  // In temporary demo mode we intentionally avoid Supabase entirely.
  if (demoModeEnabled()) return null;
  if (!configured()) return null;
  const db = await createClient();
  const { data, error } = await db.from("tenant_members").select("tenant_id,role,tenants(legal_name)").eq("status", "active").limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("NO_TENANT_MEMBERSHIP");
  return { db, tenantId: String(data.tenant_id), role: String(data.role) };
}

export async function getInvoiceUiData() {
  const ctx = await tenantContext();
  if (!ctx) {
    if (!demoModeEnabled()) throw new Error("UI_SUPABASE_NOT_CONFIGURED");
    return { mode: "demo" as const, invoices: demoInvoices, metrics: demoMetrics };
  }
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await ctx.db.from("invoices")
    .select("id,source_ref,total_minor,status,issued_at,created_at,counterparties(legal_name)")
    .eq("tenant_id", ctx.tenantId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  const rows = data ?? [];
  const invoices: UiInvoice[] = rows.slice(0, 20).map((r: any) => ({
    id: String(r.id), sourceRef: String(r.source_ref), counterparty: r.counterparties?.legal_name ? String(r.counterparties.legal_name) : "—",
    totalMinor: Number(r.total_minor), status: String(r.status), issuedAt: String(r.issued_at ?? r.created_at ?? ""),
  }));
  const recent = rows.filter((r: any) => String(r.created_at ?? "") >= since);
  const accepted = recent.filter((r: any) => ["accepted","delivered"].includes(String(r.status)));
  const rejected = recent.filter((r: any) => String(r.status) === "rejected");
  const terminal = accepted.length + rejected.length;
  return { mode: "live" as const, invoices, metrics: {
    businesses: 1,
    acceptedToday: accepted.length,
    successRate: terminal ? `${((accepted.length / terminal) * 100).toFixed(1)}%` : "—",
    fiscalizedValueMinor: accepted.reduce((sum: number, r: any) => sum + Number(r.total_minor || 0), 0),
  }};
}

export async function getAuditUiData() {
  const ctx = await tenantContext();
  if (!ctx) return demoModeEnabled() ? { mode:"demo" as const, rows: demoAudit } : { mode:"demo" as const, rows: [] };
  const { data, error } = await ctx.db.from("audit_events").select("seq,action,object_id,actor_type,occurred_at,event_hash").eq("tenant_id",ctx.tenantId).order("seq",{ascending:false}).limit(100);
  if (error) throw error;
  return { mode:"live" as const, rows:(data??[]).map((r:any)=>({seq:Number(r.seq),action:String(r.action),object:String(r.object_id),actor:String(r.actor_type),at:String(r.occurred_at),hash:String(r.event_hash)})) };
}

export async function getLegalEntitiesUiData() {
  const ctx=await tenantContext();
  if(!ctx){
    if(!demoModeEnabled()) throw new Error("UI_SUPABASE_NOT_CONFIGURED");
    return {mode:"demo" as const, entities:[{id:"00000000-0000-0000-0000-000000000101",legalName:"Demo Trading PLC",tin:"DEMO-TIN-001"}]};
  }
  const {data,error}=await ctx.db.from("legal_entities").select("id,legal_name,tin").eq("tenant_id",ctx.tenantId).eq("status","active").order("legal_name");
  if(error) throw error;
  return {mode:"live" as const,entities:(data??[]).map((x:any)=>({id:String(x.id),legalName:String(x.legal_name),tin:String(x.tin)}))};
}
