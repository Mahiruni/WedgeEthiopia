function keyBytes() {
  const raw = process.env.IDENTITY_SESSION_ENCRYPTION_KEY_BASE64?.trim();
  if (!raw) throw new Error("IDENTITY_ENCRYPTION_NOT_CONFIGURED");
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length !== 32) throw new Error("IDENTITY_ENCRYPTION_KEY_INVALID");
  return bytes;
}

async function key(usages: KeyUsage[]) {
  return crypto.subtle.importKey("raw", keyBytes(), "AES-GCM", false, usages);
}

export async function encryptIdentitySecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(["encrypt"]), new TextEncoder().encode(value));
  return `${Buffer.from(iv).toString("base64url")}.${Buffer.from(encrypted).toString("base64url")}`;
}

export async function decryptIdentitySecret(value: string) {
  const [ivPart, encryptedPart] = value.split(".");
  if (!ivPart || !encryptedPart) throw new Error("IDENTITY_SESSION_CIPHERTEXT_INVALID");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(ivPart, "base64url") }, await key(["decrypt"]), Buffer.from(encryptedPart, "base64url"));
  return new TextDecoder().decode(decrypted);
}
