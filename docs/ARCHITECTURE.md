# Wedge Ethiopia V1 architecture

## Trust boundaries

1. **Human operations plane** — Supabase Auth sessions reach only RLS-permitted tenant rows. Authorization comes from `tenant_members`, not user-editable JWT metadata.
2. **ERP machine plane** — `X-API-Key` values are hashed at rest, scoped, tenant-bound, and never reused as browser credentials.
3. **Canonical fiscal domain** — validates integer money/quantity, tenant relationships, idempotency, invoice state, and immutable fiscal records before any country-specific protocol is applied.
4. **Fiscal adapter** — translates the canonical invoice into an authority protocol. `mock` is functional; `mor` fails closed until primary MoR technical specifications are supplied.
5. **Identity adapter** — Fayda/eSignet proves a human identity. A separate `authorized_signatories` relation records company authority; identity alone is insufficient.
6. **Accounting ledger** — independent from fiscal state. Posted entries must balance and can only be corrected by reversal/new entries.
7. **Audit evidence** — per-tenant append-only hash chain plus separately signed daily checkpoints. Independent WORM export is required for stronger evidence outside the primary database trust boundary.
8. **Webhook egress** — signed Ed25519 events leave through a retry outbox. Network egress controls must complement application URL validation in production.

## Invoice flow

```text
ERP / operator
  -> authenticate + resolve tenant
  -> canonical validation
  -> atomic invoice + lines (VALIDATED)
  -> submission RPC (READY_FOR_CLEARANCE -> SUBMITTED)
  -> fiscal adapter
       -> ACCEPTED -> immutable fiscal record -> audit -> webhook
       -> REJECTED -> correction/resubmit path -> audit -> webhook
       -> transport outcome unknown -> RECONCILIATION_REQUIRED -> no blind retry
```

## State and payment separation

Fiscal state and settlement state are independent. `invoice_status` expresses tax-authority lifecycle; `payment_status` expresses `unpaid | partial | paid`. V1 does not custody funds.

## Data model invariants

- Every tenant business row carries `tenant_id`.
- Cross-table tenant relationships are checked by triggers/RPCs, not only application code.
- Money is integer minor units; quantities are integer thousandths.
- Accepted invoice header/line fiscal content is frozen.
- Audit events/checkpoints are append-only.
- Posted journal entries/lines are immutable.
- Service-role code must still filter every query by tenant ID because service credentials bypass RLS.

## Deployment

The application uses Next.js standalone output and can be containerized. The public web surface may be deployable on Vercel, while regulated API/database/storage workloads remain movable to Ethiopia-hosted infrastructure until localization/cross-border processing is conclusively cleared.

## Explicit V1 non-goals

- Lending/credit decisions.
- Customer-money custody.
- Guessed MoR protocol fields or tax rates.
- Raw biometric storage.
- Claiming a database hash chain alone is immutable.
- Automatic accounting postings whose chart-of-accounts/tax mappings have not been configured by the customer.
