import assert from "node:assert/strict";
import { canTransition, assertTransition, isFiscalFinal } from "../.domain-build/invoice-state.js";
import { assertBalanced } from "../.domain-build/ledger.js";
import { calculateInvoice } from "../.domain-build/invoice.js";

assert.equal(canTransition("draft", "validated"), true);
assert.equal(canTransition("accepted", "draft"), false);
assert.throws(() => assertTransition("accepted", "submitted"));
assert.equal(isFiscalFinal("accepted"), true);
assert.doesNotThrow(() => assertBalanced([
  { accountCode: "1100", debitMinor: 11500, creditMinor: 0 },
  { accountCode: "4000", debitMinor: 0, creditMinor: 10000 },
  { accountCode: "2100", debitMinor: 0, creditMinor: 1500 },
]));
assert.throws(() => assertBalanced([
  { accountCode: "1100", debitMinor: 100, creditMinor: 0 },
  { accountCode: "4000", debitMinor: 0, creditMinor: 99 },
]));
const totals = calculateInvoice([{ description: "Service", quantityMilli: 1000, unitPriceMinor: 10000, taxRateBps: 1500 }]);
assert.deepEqual(totals, { subtotalMinor: 10000, taxMinor: 1500, totalMinor: 11500 });
assert.throws(() => calculateInvoice([{ description: "Overflow", quantityMilli: Number.MAX_SAFE_INTEGER, unitPriceMinor: Number.MAX_SAFE_INTEGER, taxRateBps: 0 }]));
assert.throws(() => assertBalanced([{ accountCode: "1", debitMinor: 0, creditMinor: 0 }, { accountCode: "2", debitMinor: 0, creditMinor: 0 }]));
console.log("Domain smoke tests passed");
