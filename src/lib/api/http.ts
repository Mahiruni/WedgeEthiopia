import { NextResponse } from "next/server";

export function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function requestId(request: Request): string {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}
