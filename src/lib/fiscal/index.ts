import { env } from "@/src/lib/env";
import { MockFiscalAdapter } from "./mock";
import { MorFiscalAdapter } from "./mor";

export function getFiscalAdapter() {
  if (env.fiscalAdapter === "mor") return new MorFiscalAdapter();
  return new MockFiscalAdapter();
}
