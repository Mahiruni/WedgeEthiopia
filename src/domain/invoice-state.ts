export const invoiceStates = [
  "draft",
  "validated",
  "ready_for_clearance",
  "offline_queued",
  "submitted",
  "reconciliation_required",
  "rejected",
  "accepted",
  "delivered",
] as const;

export type InvoiceState = (typeof invoiceStates)[number];

const transitions: Record<InvoiceState, readonly InvoiceState[]> = {
  draft: ["validated"],
  validated: ["draft", "ready_for_clearance"],
  ready_for_clearance: ["submitted", "offline_queued"],
  offline_queued: ["submitted"],
  submitted: ["accepted", "rejected", "ready_for_clearance", "reconciliation_required"],
  reconciliation_required: ["accepted", "rejected", "ready_for_clearance"],
  rejected: ["ready_for_clearance"],
  accepted: ["delivered"],
  delivered: [],
};

export function canTransition(from: InvoiceState, to: InvoiceState): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: InvoiceState, to: InvoiceState): void {
  if (!canTransition(from, to)) throw new Error(`Invalid invoice transition: ${from} -> ${to}`);
}

export function isFiscalFinal(state: InvoiceState): boolean {
  return state === "accepted" || state === "delivered";
}
