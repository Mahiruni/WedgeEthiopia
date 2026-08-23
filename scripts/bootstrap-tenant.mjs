import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "node:crypto";

const [legalName,tin] = process.argv.slice(2);
if (!legalName || !tin) throw new Error('Usage: node scripts/bootstrap-tenant.mjs "Legal Name" "TIN"');
const url=process.env.SUPABASE_URL; const key=process.env.SUPABASE_SECRET_KEY;
if(!url||!key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
const raw=`fr_live_${randomBytes(24).toString("base64url")}`;
const hash=createHash("sha256").update(raw).digest("hex");
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await db.rpc("bootstrap_tenant_v1",{p_legal_name:legalName,p_tin:tin,p_key_prefix:raw.slice(0,12),p_key_hash:hash,p_scopes:["invoices:read","invoices:write","invoices:submit","webhooks:read","webhooks:write","identity:write"]});
if(error) throw error;
console.log(JSON.stringify({ ...data, api_key: raw },null,2));
console.error("Copy api_key now; only its hash is stored in the database.");
