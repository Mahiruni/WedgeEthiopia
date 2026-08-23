import { addMinor, assertMinorUnits } from "./money";

export type InvoiceLineInput = {
  description: string;
  quantityMilli: number;
  unitPriceMinor: number;
  taxRateBps: number;
};

function roundedPositiveRatio(numerator: bigint, denominator: bigint, label: string) {
  const rounded = (numerator + denominator / 2n) / denominator;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${label} exceeds safe integer range`);
  return Number(rounded);
}

export function calculateLine(line: InvoiceLineInput) {
  if (!Number.isSafeInteger(line.quantityMilli) || line.quantityMilli <= 0) throw new Error("quantityMilli must be a positive integer");
  assertMinorUnits(line.unitPriceMinor);
  if (line.unitPriceMinor < 0) throw new Error("unitPriceMinor must be non-negative");
  if (!line.description.trim()) throw new Error("description is required");
  if (!Number.isSafeInteger(line.taxRateBps) || line.taxRateBps < 0) throw new Error("taxRateBps must be a non-negative integer");
  const netMinor = roundedPositiveRatio(BigInt(line.quantityMilli) * BigInt(line.unitPriceMinor), 1000n, "netMinor");
  const taxMinor = roundedPositiveRatio(BigInt(netMinor) * BigInt(line.taxRateBps), 10000n, "taxMinor");
  return { netMinor, taxMinor, totalMinor: addMinor(netMinor, taxMinor) };
}

export function calculateInvoice(lines: InvoiceLineInput[]) {
  if (!lines.length) throw new Error("At least one invoice line is required");
  const computed = lines.map(calculateLine);
  return computed.reduce((acc, row) => ({
    subtotalMinor: addMinor(acc.subtotalMinor, row.netMinor),
    taxMinor: addMinor(acc.taxMinor, row.taxMinor),
    totalMinor: addMinor(acc.totalMinor, row.totalMinor),
  }), { subtotalMinor: 0, taxMinor: 0, totalMinor: 0 });
}
