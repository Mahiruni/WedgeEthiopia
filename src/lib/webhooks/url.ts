import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function normalizeHost(host: string) {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function isBlockedIpv4(host: string) {
  const p = host.split(".").map(Number);
  if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedIpv6(host: string) {
  const value = normalizeHost(host).toLowerCase();
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb")) return true;
  if (value.startsWith("ff")) return true;
  if (value.startsWith("2001:db8:")) return true;
  if (value.startsWith("::ffff:")) {
    const mapped = value.slice("::ffff:".length);
    return isIP(mapped) === 4 ? isBlockedIpv4(mapped) : true;
  }
  return false;
}

function assertPublicAddress(address: string) {
  const kind = isIP(address);
  if (kind === 4 && isBlockedIpv4(address)) throw new Error("INVALID_WEBHOOK_URL");
  if (kind === 6 && isBlockedIpv6(address)) throw new Error("INVALID_WEBHOOK_URL");
  if (kind === 0) throw new Error("INVALID_WEBHOOK_URL");
}

export async function assertSafeWebhookUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("INVALID_WEBHOOK_URL");
  if (url.username || url.password) throw new Error("INVALID_WEBHOOK_URL");
  if (url.port && url.port !== "443") throw new Error("INVALID_WEBHOOK_URL");

  const host = normalizeHost(url.hostname.toLowerCase());
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("INVALID_WEBHOOK_URL");
  }

  const literalKind = isIP(host);
  if (literalKind) {
    assertPublicAddress(host);
  } else {
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (!addresses.length) throw new Error("INVALID_WEBHOOK_URL");
    for (const result of addresses) assertPublicAddress(result.address);
  }

  return url.toString();
}
