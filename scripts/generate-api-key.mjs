import { randomBytes, createHash } from "node:crypto";
const raw = `fr_live_${randomBytes(24).toString("base64url")}`;
const hash = createHash("sha256").update(raw).digest("hex");
console.log(JSON.stringify({ raw_key: raw, key_prefix: raw.slice(0,12), sha256_hash: hash }, null, 2));
console.error("Store raw_key once in the ERP secret store. Persist only sha256_hash in public.api_keys.");
