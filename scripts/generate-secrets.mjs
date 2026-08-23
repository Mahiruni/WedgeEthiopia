import { generateKeyPairSync, randomBytes } from "node:crypto";

function pkcs8() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    private_key_der_base64: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
    public_key_der_base64: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
  };
}
console.log(JSON.stringify({
  internal_worker_secret: randomBytes(32).toString("base64url"),
  identity_session_encryption_key_base64: randomBytes(32).toString("base64"),
  webhook_ed25519: pkcs8(),
  audit_checkpoint_ed25519: pkcs8(),
}, null, 2));
