export type FiscalSubmission = {
  invoiceId: string;
  canonicalPayload: Record<string, unknown>;
};

export type FiscalAccepted = {
  outcome: "accepted";
  authorityReference: string;
  irn: string;
  rrn?: string;
  qrPayload?: string;
  raw: unknown;
};

export type FiscalRejected = {
  outcome: "rejected";
  authorityReference?: string;
  code: string;
  message: string;
  raw: unknown;
};

export type FiscalResult = FiscalAccepted | FiscalRejected;

export interface FiscalAdapter {
  readonly name: string;
  submit(input: FiscalSubmission): Promise<FiscalResult>;
}

export class FiscalAdapterError extends Error {
  constructor(message: string, public readonly outcomeUnknown: boolean) {
    super(message);
    this.name = "FiscalAdapterError";
  }
}
