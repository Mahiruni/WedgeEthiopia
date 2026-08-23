import { NextResponse } from "next/server";
import { env, hasSupabaseConfig } from "@/src/lib/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "0.1.0",
    supabase_configured: hasSupabaseConfig(),
    fiscal_adapter: env.fiscalAdapter,
    time: new Date().toISOString(),
  });
}
