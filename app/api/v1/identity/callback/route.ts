import { NextResponse } from "next/server";
import { createRemoteJWKSet, importJWK, jwtVerify, SignJWT } from "jose";
import { getAdminClient } from "@/src/lib/supabase/admin";
import { requireEsignetConfig } from "@/src/lib/identity/esignet";
import { decryptIdentitySecret } from "@/src/lib/identity/session-crypto";
import { jsonError } from "@/src/lib/api/http";

async function subjectHash(issuer:string,sub:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${issuer}\u0000${sub}`));return Buffer.from(d).toString("hex");}

export async function GET(request: Request) {
  const url=new URL(request.url); const code=url.searchParams.get("code"), state=url.searchParams.get("state"), responseIssuer=url.searchParams.get("iss");
  if(!code||!state) return jsonError(400,"INVALID_CALLBACK","code and state are required");
  try{
    const config=requireEsignetConfig();
    if(responseIssuer&&responseIssuer!==config.issuer) return jsonError(400,"ISSUER_MISMATCH","Authorization response issuer does not match configured eSignet issuer");
    const db=getAdminClient();
    const {data:session,error}=await db.from("identity_sessions").select("id,tenant_id,user_id,nonce,pkce_verifier_ciphertext,redirect_uri,expires_at,consumed_at").eq("state",state).maybeSingle();
    if(error) throw error;
    if(!session||session.consumed_at||new Date(session.expires_at).getTime()<=Date.now()) return jsonError(400,"IDENTITY_SESSION_INVALID","Identity session is missing, expired, or already consumed");
    const {data:member,error:memberError}=await db.from("tenant_members").select("user_id").eq("tenant_id",session.tenant_id).eq("user_id",session.user_id).eq("status","active").maybeSingle();
    if(memberError) throw memberError;
    if(!member) return jsonError(403,"TENANT_MEMBERSHIP_INACTIVE","The user is no longer an active member of this tenant");
    const privateKey=await importJWK(config.privateKeyJwk,config.privateKeyJwk.alg||"RS256");
    const clientAssertion=await new SignJWT({}).setProtectedHeader({alg:config.privateKeyJwk.alg||"RS256",...(config.privateKeyJwk.kid?{kid:config.privateKeyJwk.kid}:{})}).setIssuer(config.clientId).setSubject(config.clientId).setAudience(config.tokenEndpoint).setJti(crypto.randomUUID()).setIssuedAt().setExpirationTime("5m").sign(privateKey);
    const form=new URLSearchParams({grant_type:"authorization_code",code,redirect_uri:session.redirect_uri,client_id:config.clientId,code_verifier:await decryptIdentitySecret(session.pkce_verifier_ciphertext),client_assertion_type:"urn:ietf:params:oauth:client-assertion-type:jwt-bearer",client_assertion:clientAssertion});
    const tokenResponse=await fetch(config.tokenEndpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form,signal:AbortSignal.timeout(15_000)});
    const tokenBody=await tokenResponse.json().catch(()=>null) as {id_token?:string;error?:string}|null;
    if(!tokenResponse.ok||!tokenBody?.id_token) return jsonError(502,"IDENTITY_TOKEN_EXCHANGE_FAILED","eSignet token exchange failed");
    const jwks=createRemoteJWKSet(new URL(config.jwksUri));
    const verified=await jwtVerify(tokenBody.id_token,jwks,{issuer:config.issuer,audience:config.clientId,clockTolerance:5});
    if(verified.payload.nonce!==session.nonce) return jsonError(400,"NONCE_MISMATCH","Identity token nonce mismatch");
    if(typeof verified.payload.sub!=="string"||!verified.payload.sub) return jsonError(400,"SUBJECT_MISSING","Identity token does not contain a subject");
    const hash=await subjectHash(config.issuer,verified.payload.sub);
    const authTime=typeof verified.payload.auth_time==="number"?new Date(verified.payload.auth_time*1000).toISOString():null;
    const {data:existing,error:existingError}=await db.from("fayda_bindings").select("id,user_id").eq("tenant_id",session.tenant_id).eq("issuer",config.issuer).eq("subject_ref_hash",hash).maybeSingle();
    if(existingError) throw existingError;
    if(existing&&String(existing.user_id)!==String(session.user_id)) return jsonError(409,"IDENTITY_ALREADY_BOUND","This identity is already bound to another tenant user");
    if(existing){const {error:updateError}=await db.from("fayda_bindings").update({assurance_level:typeof verified.payload.acr==="string"?verified.payload.acr:null,auth_time:authTime,verified_at:new Date().toISOString(),consent_ref:state}).eq("id",existing.id).eq("tenant_id",session.tenant_id);if(updateError)throw updateError;}
    else {const {error:insertError}=await db.from("fayda_bindings").insert({tenant_id:session.tenant_id,user_id:session.user_id,issuer:config.issuer,subject_ref_hash:hash,assurance_level:typeof verified.payload.acr==="string"?verified.payload.acr:null,auth_time:authTime,consent_ref:state});if(insertError)throw insertError;}
    const {error:consumeError}=await db.from("identity_sessions").update({consumed_at:new Date().toISOString()}).eq("id",session.id).eq("tenant_id",session.tenant_id).is("consumed_at",null);if(consumeError)throw consumeError;
    await db.from("audit_events").insert({tenant_id:session.tenant_id,actor_type:"system",actor_id:String(session.user_id),action:"identity.fayda_bound",object_type:"user",object_id:String(session.user_id),metadata:{issuer:config.issuer,acr:verified.payload.acr??null}});
    return NextResponse.redirect(new URL("/?identity=verified",request.url));
  }catch(error){
    const message=error instanceof Error?error.message:"UNKNOWN";
    if(message==="ESIGNET_NOT_CONFIGURED"||message==="ESIGNET_PRIVATE_KEY_INVALID")return jsonError(503,"IDENTITY_PROVIDER_NOT_CONFIGURED","eSignet relying-party configuration is missing or invalid");
    return jsonError(500,"IDENTITY_CALLBACK_FAILED","Identity verification could not be completed");
  }
}
