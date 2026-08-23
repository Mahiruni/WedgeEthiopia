# V1 delivery status — 23 Aug 2026

## Implemented

- Next.js 15 / React 19 / TypeScript / Tailwind v4 application shell.
- Supabase/Postgres multi-tenant model with explicit tenant foreign-key guards and RLS.
- Explicit authenticated Data API grants compatible with Supabase's 2026 table-exposure change.
- ERP machine API keys stored as hashes with tenant and scope binding.
- Integer-minor-unit invoice arithmetic and deterministic validation.
- Database-enforced invoice state transitions and accepted-invoice immutability.
- Atomic idempotent invoice creation, including an advisory lock for concurrent reuse of the same idempotency key.
- Mock fiscal authority adapter and a production MoR adapter that fails closed until primary technical specifications are supplied.
- Fiscal submission persistence with explicit reconciliation-required state when an upstream outcome is unknown.
- Fayda/eSignet OIDC/PKCE scaffold with encrypted PKCE verifier storage and subject pseudonymization.
- Double-entry ledger tables with posting/balance invariants and immutable posted entries.
- Ed25519 webhook signatures, bounded retries, dead-lettering, redirect refusal and DNS/private-network destination checks.
- Per-tenant append-only audit hash chain and independently signed daily checkpoint endpoint.
- Responsive operations UI and demo mode.
- OpenAPI 3.1 contract and Docker standalone deployment configuration.

## Verification completed in the build environment

- Domain-rule compilation and smoke tests pass.
- All implementation `.ts` / `.tsx` files transpile without syntax diagnostics.
- All `@/` internal import targets resolve to files in the repository.
- Current Supabase breaking-change guidance was reviewed for explicit table grants, RLS, self-hosting and Node support.
- Current Tailwind v4 Next.js installation convention was used (`@tailwindcss/postcss` + `@import "tailwindcss"`).

## Verification blocked by this environment

The build container cannot resolve `registry.npmjs.org`, so dependencies cannot be installed here. Therefore a full `next build` and package-level TypeScript check must be run after download in an environment with npm network access.

Run:

```bash
npm install
npm run typecheck
npm run build
```

Then initialize a disposable Supabase environment and execute `supabase/schema.sql`, `supabase/seed.sql`, and `supabase/test.sql` before production use.

## Intentionally incomplete until regulator material is supplied

- MoR request/response mapping, certificates, QR/IRN/RRN semantics and official offline rules.
- Fiscal credit/debit-note authority mapping.
- Any production claim of MoR accreditation or legal compliance.
- Credit underwriting/lending logic.
