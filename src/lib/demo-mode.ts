export function demoModeEnabled(): boolean {
  // TEMPORARY: demo mode is ON unless explicitly disabled.
  // Set ALLOW_DEMO_MODE=false when Supabase authentication is ready to be enforced again.
  return process.env.ALLOW_DEMO_MODE !== "false";
}

export const DEMO_PRINCIPAL = {
  userId: "demo-user",
  tenantId: "00000000-0000-0000-0000-000000000001",
  role: "owner",
} as const;
