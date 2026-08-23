import { createClient } from "@/src/lib/supabase/server";

export async function requireDashboardPrincipal(allowedRoles?: string[]) {
  const db=await createClient();
  const {data:claims,error:claimsError}=await db.auth.getClaims();
  const userId=typeof claims?.claims?.sub==="string"?claims.claims.sub:"";
  if(claimsError||!userId) throw new Error("UNAUTHORIZED");
  const {data:member,error}=await db.from("tenant_members").select("tenant_id,role").eq("user_id",userId).eq("status","active").limit(1).maybeSingle();
  if(error) throw error;
  if(!member) throw new Error("NO_TENANT_MEMBERSHIP");
  const role=String(member.role);
  if(allowedRoles&&!allowedRoles.includes(role)) throw new Error("FORBIDDEN");
  return {userId,tenantId:String(member.tenant_id),role};
}
