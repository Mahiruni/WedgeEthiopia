export type EsignetConfig = {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  clientId: string;
  redirectUri: string;
  privateKeyJwk: JsonWebKey & { alg?: string; kid?: string };
};

export function createAuthorizationUrl(config: EsignetConfig, state: string, nonce: string, codeChallenge: string) {
  const url = new URL(config.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function requireEsignetConfig(): EsignetConfig {
  const issuer=process.env.ESIGNET_ISSUER?.trim()??"";
  const authorizationEndpoint=process.env.ESIGNET_AUTHORIZATION_ENDPOINT?.trim()??"";
  const tokenEndpoint=process.env.ESIGNET_TOKEN_ENDPOINT?.trim()??"";
  const jwksUri=process.env.ESIGNET_JWKS_URI?.trim()??"";
  const clientId=process.env.ESIGNET_CLIENT_ID?.trim()??"";
  const redirectUri=process.env.ESIGNET_REDIRECT_URI?.trim()??"";
  const rawJwk=process.env.ESIGNET_PRIVATE_KEY_JWK?.trim()??"";
  if (![issuer,authorizationEndpoint,tokenEndpoint,jwksUri,clientId,redirectUri,rawJwk].every(Boolean)) throw new Error("ESIGNET_NOT_CONFIGURED");
  let privateKeyJwk: EsignetConfig["privateKeyJwk"];
  try { privateKeyJwk=JSON.parse(rawJwk); } catch { throw new Error("ESIGNET_PRIVATE_KEY_INVALID"); }
  return {issuer,authorizationEndpoint,tokenEndpoint,jwksUri,clientId,redirectUri,privateKeyJwk};
}
