export type Currency = "ETB" | "USD" | string;

export function assertMinorUnits(value: number): void {
  if (!Number.isSafeInteger(value)) throw new Error("Money must be a safe integer in minor units");
}

export function addMinor(...values: number[]): number {
  values.forEach(assertMinorUnits);
  const total = values.reduce((a, b) => a + b, 0);
  assertMinorUnits(total);
  return total;
}

export function formatMinor(value: number, currency: Currency = "ETB"): string {
  assertMinorUnits(value);
  const units = value / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(units);
}
