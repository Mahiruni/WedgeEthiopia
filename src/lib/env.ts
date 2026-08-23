function get(name: string, required = false): string {
  const value = process.env[name]?.trim() ?? "";
  if (required && !value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  get supabaseUrl() { return get("SUPABASE_URL"); },
  get supabaseSecretKey() { return get("SUPABASE_SECRET_KEY"); },
  get fiscalAdapter() { return get("FISCAL_ADAPTER") || "mock"; },
  get allowDemoMode() { return (get("ALLOW_DEMO_MODE") || "false") === "true"; },
  get identitySessionEncryptionKeyBase64() { return get("IDENTITY_SESSION_ENCRYPTION_KEY_BASE64"); },
  get webhookKeyId() { return get("WEBHOOK_SIGNING_KEY_ID") || "dev-key-1"; },
  get webhookPrivateKeyDerBase64() { return get("WEBHOOK_ED25519_PRIVATE_KEY_DER_BASE64"); },
};

export function hasSupabaseConfig() {
  return Boolean(env.supabaseUrl && env.supabaseSecretKey);
}
