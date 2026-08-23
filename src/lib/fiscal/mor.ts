import { FiscalAdapterError, type FiscalAdapter, type FiscalResult, type FiscalSubmission } from "./adapter";

/**
 * Production placeholder. Do not implement field mappings from secondary sources.
 * Fill this only from MoR's official EIRS/EIMS technical specification and sandbox contract.
 */
export class MorFiscalAdapter implements FiscalAdapter {
  readonly name = "mor";
  async submit(_input: FiscalSubmission): Promise<FiscalResult> {
    throw new FiscalAdapterError("MOR_ADAPTER_NOT_CONFIGURED: official MoR API specification required", false);
  }
}
