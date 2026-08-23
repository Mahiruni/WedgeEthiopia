import type { FiscalAdapter, FiscalSubmission, FiscalResult } from "./adapter";

export class MockFiscalAdapter implements FiscalAdapter {
  readonly name = "mock";

  async submit(input: FiscalSubmission): Promise<FiscalResult> {
    const reject = input.canonicalPayload["force_reject"] === true;
    if (reject) {
      return { outcome: "rejected", code: "MOCK_VALIDATION", message: "Mock authority rejected invoice", raw: { mock: true } };
    }
    const suffix = input.invoiceId.replace(/[^a-zA-Z0-9]/g, "").slice(-10).toUpperCase();
    return {
      outcome: "accepted",
      authorityReference: `MOCK-${suffix}`,
      irn: `IRN-MOCK-${suffix}`,
      rrn: `RRN-MOCK-${suffix}`,
      qrPayload: `https://example.invalid/fiscal/${suffix}`,
      raw: { mock: true, accepted_at: new Date().toISOString() },
    };
  }
}
