import { authenticateApiRequest } from "@/src/lib/api/auth";
import { jsonError } from "@/src/lib/api/http";

export async function POST(request: Request) {
  try {
    await authenticateApiRequest(request, "invoices:write");
    return jsonError(
      501,
      "REGULATOR_MAPPING_REQUIRED",
      "Debit-note fiscalization is intentionally blocked until the official MoR correction-document contract is supplied.",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "UNAUTHORIZED") return jsonError(401, "UNAUTHORIZED", "Invalid API key");
    if (message === "FORBIDDEN") return jsonError(403, "FORBIDDEN", "API key lacks required scope");
    return jsonError(500, "INTERNAL_ERROR", "Debit note could not be created");
  }
}
