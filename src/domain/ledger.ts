import { assertMinorUnits } from "./money.js";

export type JournalLine = {
  accountCode: string;
  debitMinor: number;
  creditMinor: number;
};

export function assertBalanced(lines: JournalLine[]): void {
  if (lines.length < 2) throw new Error("A journal entry requires at least two lines");
  let debit = 0n;
  let credit = 0n;
  for (const line of lines) {
    assertMinorUnits(line.debitMinor);
    assertMinorUnits(line.creditMinor);
    if (line.debitMinor < 0 || line.creditMinor < 0) throw new Error("Ledger amounts cannot be negative");
    if (line.debitMinor > 0 && line.creditMinor > 0) throw new Error("A journal line cannot be both debit and credit");
    if (line.debitMinor === 0 && line.creditMinor === 0) throw new Error("A journal line must contain a debit or credit amount");
    debit += BigInt(line.debitMinor);
    credit += BigInt(line.creditMinor);
  }
  if (debit !== credit) throw new Error(`Unbalanced journal entry: debit=${debit}, credit=${credit}`);
}
