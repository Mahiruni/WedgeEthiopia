export const demoMetrics = {
  businesses: 128,
  acceptedToday: 1842,
  successRate: "99.6%",
  fiscalizedValueMinor: 48_370_000_00,
};

export const demoInvoices = [
  { id: "inv_7YH21", sourceRef: "ERP-10452", counterparty: "Aster Trading PLC", totalMinor: 1_245_000_00, status: "accepted", issuedAt: "2026-08-23 20:51" },
  { id: "inv_7YH20", sourceRef: "ERP-10451", counterparty: "Nile Office Supply", totalMinor: 84_900_00, status: "submitted", issuedAt: "2026-08-23 20:46" },
  { id: "inv_7YH19", sourceRef: "ERP-10450", counterparty: "Bole Construction", totalMinor: 412_600_00, status: "accepted", issuedAt: "2026-08-23 20:39" },
  { id: "inv_7YH18", sourceRef: "ERP-10449", counterparty: "Kora Manufacturing", totalMinor: 66_300_00, status: "rejected", issuedAt: "2026-08-23 20:33" },
  { id: "inv_7YH17", sourceRef: "ERP-10448", counterparty: "Megenagna Retail", totalMinor: 238_000_00, status: "delivered", issuedAt: "2026-08-23 20:28" },
];

export const demoAudit = [
  { seq: 9921, action: "invoice.accepted", object: "inv_7YH21", actor: "fiscal-worker", at: "20:51:14", hash: "f6f2…91a0" },
  { seq: 9920, action: "invoice.submitted", object: "inv_7YH21", actor: "erp-api", at: "20:51:12", hash: "a403…19cf" },
  { seq: 9919, action: "invoice.rejected", object: "inv_7YH18", actor: "fiscal-worker", at: "20:33:09", hash: "81d0…c5e1" },
];
