import { createClient } from "@supabase/supabase-js";

const [tenantId, userId, role = "admin"] = process.argv.slice(2);
if (!tenantId || !userId) {
  console.error("Usage: node scripts/add-tenant-member.mjs <tenant_uuid> <auth_user_uuid> [role]");
  process.exit(1);
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await db.from("tenant_members").insert({ tenant_id: tenantId, user_id: userId, role, status: "active" });
if (error) throw error;
console.log(JSON.stringify({ tenant_id: tenantId, user_id: userId, role, status: "active" }, null, 2));
