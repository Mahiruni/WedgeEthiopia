function b64url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

export async function signWebhook(params: { privateKeyDerBase64: string; timestamp: string; eventId: string; body: string }) {
  const bodyHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(params.body));
  const canonical = `${params.timestamp}\n${params.eventId}\n${Buffer.from(bodyHash).toString("hex")}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Buffer.from(params.privateKeyDerBase64, "base64"),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("Ed25519", key, new TextEncoder().encode(canonical));
  return b64url(signature);
}
