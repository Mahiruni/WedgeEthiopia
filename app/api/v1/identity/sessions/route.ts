import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/src/lib/api/auth";
import { createAuthorizationUrl, requireEsignetConfig } from "@/src/lib/identity/esignet";
import { encryptIdentitySecret } from "@/src/lib/identity/session-crypto";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { jsonError } from "@/src/lib/api/http";

function base64Url(buffer: ArrayBuffer) { return Buffer.from(buffer).toString("base64url"); }
export async function POST(request: Request) {
  try {
    const principal=await authenticateApiRequest(request,"identity:write");
    const body=await request.json().catch(()=>({})) as {user_id?:string};
    if(!body.user_id) return jsonError(400,"USER_ID_REQUIRED","user_id must identify an existing active tenant member");
    const db=getAdminClient();
    const {data:member,error:memberError}=await db.from("tenant_members").select("user_id").eq("tenant_id",principal.tenantId).eq("user_id",body.user_id).eq("status","active").maybeSingle();
    if(memberError) throw memberError;
    if(!member) return jsonError(404,"TENANT_MEMBER_NOT_FOUND","The requested user is not an active tenant member");
    const config=requireEsignetConfig();
    const state=crypto.randomUUID(), nonce=crypto.randomUUID();
    const verifier=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
    const challenge=base64Url(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier)));
    const expiresAt=new Date(Date.now()+10*60_000).toISOString();
    const {error}=await db.from("identity_sessions").insert({tenant_id:principal.tenantId,user_id:body.user_id,state,nonce,pkce_verifier_ciphertext:await encryptIdentitySecret(verifier),redirect_uri:config.redirectUri,expires_at:expiresAt});
    if(error) throw error;
    return NextResponse.json({data:{authorization_url:createAuthorizationUrl(config,state,nonce,challenge),state,expires_at:expiresAt}});
  } catch(error) {
    const message=error instanceof Error?error.message:"UNKNOWN";
    if(message==="UNAUTHORIZED")return jsonError(401,"UNAUTHORIZED","Invalid API key");
    if(message==="FORBIDDEN")return jsonError(403,"FORBIDDEN","API key lacks required scope");
    if(message==="ESIGNET_NOT_CONFIGURED"||message==="ESIGNET_PRIVATE_KEY_INVALID")return jsonError(503,"IDENTITY_PROVIDER_NOT_CONFIGURED","eSignet relying-party configuration is missing or invalid");
    if(message.startsWith("IDENTITY_ENCRYPTION_"))return jsonError(503,"IDENTITY_SESSION_ENCRYPTION_NOT_CONFIGURED","Identity session encryption is not configured correctly");
    return jsonError(500,"INTERNAL_ERROR","Identity session could not be created");
  }
}
