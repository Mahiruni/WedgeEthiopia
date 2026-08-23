import { timingSafeEqual } from "node:crypto";

export function assertInternalWorker(request: Request) {
  const expected = process.env.INTERNAL_WORKER_SECRET?.trim() ?? "";
  const actual = request.headers.get("x-internal-worker-secret")?.trim() ?? "";
  if (!expected || !actual) throw new Error("UNAUTHORIZED");
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a,b)) throw new Error("UNAUTHORIZED");
}
