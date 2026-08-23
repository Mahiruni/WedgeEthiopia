import { NextResponse } from "next/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const company = typeof input.company === "string" ? input.company.trim() : "";
  const volume = typeof input.volume === "string" ? input.volume.trim() : "";
  if (name.length < 2 || name.length > 100) return NextResponse.json({ error: "INVALID_NAME" }, { status: 400 });
  if (!emailPattern.test(email) || email.length > 160) return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  if (company.length < 2 || company.length > 160) return NextResponse.json({ error: "INVALID_COMPANY" }, { status: 400 });
  if (!volume || volume.length > 80) return NextResponse.json({ error: "INVALID_VOLUME" }, { status: 400 });

  const payload = { name, email, company, volume, source: "wedge-marketing", received_at: new Date().toISOString() };
  const endpoint = process.env.MARKETING_LEAD_WEBHOOK_URL?.trim();
  if (!endpoint) return NextResponse.json({ ok: true, preview: true }, { status: 202 });
  try {
    const result = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) throw new Error(`lead webhook returned ${result.status}`);
    return NextResponse.json({ ok: true, preview: false }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "LEAD_DELIVERY_FAILED" }, { status: 502 });
  }
}
