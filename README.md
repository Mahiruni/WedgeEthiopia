# Fiscal Rail V1

Runnable V1 scaffold for a multi-tenant Ethiopian fiscal-invoice compliance rail. The code deliberately separates the ERP-facing API from the Ministry of Revenues adapter so no unverified regulator fields are invented.

## Included

- Next.js 15 App Router + React 19 + TypeScript + Tailwind v4
- Mobile-responsive operations UI with synthetic demo data
- Tenant-scoped Supabase/Postgres schema
- RLS and explicit Data API grants
- Machine API keys stored as SHA-256 hashes
- Invoice state machine and accepted-invoice immutability guard
- Fiscal adapter interface + working mock adapter + blocked MoR production adapter
- Double-entry ledger schema and deferred balance checks
- Fayda/eSignet authorization-session scaffold with PKCE
- Ed25519 signed webhook primitives
- Append-only, hash-chained audit log with per-tenant serialization
- OpenAPI 3.1 ERP surface
- Regulatory-adapter completion checklist

## Important security/version note — 23 Aug 2026

This repository pins **Next.js 15.5.23**, the current published 15.5 backport release found during this build. Next.js has announced another security release for **26 Aug 2026**, including a critical fix for 15.5. Upgrade the `next` pin to that patched release before any production exposure.

Supabase's 2026 changes also matter: Node.js 20 support has ended, so this project requires Node 22+; newly created public tables may not be exposed to the Data API automatically, so `supabase/schema.sql` contains explicit grants where direct authenticated reads are intended.

## Run the UI

```bash
cp .env.example .env.local
npm install
npm run dev
```

Then open `http://localhost:3000`. The UI works in demo mode without Supabase. API writes require Supabase credentials.

## Verify domain rules without installing dependencies

If TypeScript is available globally:

```bash
npm run domain:check
```

This checks valid/invalid invoice transitions, double-entry balancing and invoice arithmetic.

## Initialize Supabase safely

The SQL is kept in `supabase/schema.sql` rather than an invented migration filename. With current Supabase CLI installed:

```bash
supabase migration new initial_fiscal_rail
# review/copy supabase/schema.sql into the generated migration
supabase db reset
supabase db advisors
supabase migration list --local
```

Review the schema in a disposable local/project environment before applying it to production.

### Generate a machine API key

```bash
node scripts/generate-api-key.mjs
```

Store the printed `raw_key` only in the ERP's secret store. Insert only the SHA-256 hash into `public.api_keys`, with scopes such as:

```text
invoices:read
invoices:write
invoices:submit
webhooks:read
webhooks:write
identity:write
```

## Fiscal adapter

Default:

```text
FISCAL_ADAPTER=mock
```

The mock adapter is useful for end-to-end development. `FISCAL_ADAPTER=mor` intentionally returns a configuration error because the official MoR EIRS/EIMS request/response contract has not been supplied. Complete `docs/REGULATORY_ADAPTER_CHECKLIST.md` first.

## API example

```bash
curl -X POST http://localhost:3000/api/v1/invoices \
  -H 'X-API-Key: fr_live_REPLACE' \
  -H 'Idempotency-Key: ERP-10453' \
  -H 'Content-Type: application/json' \
  -d '{
    "legal_entity_id": "00000000-0000-0000-0000-000000000101",
    "source_ref": "ERP-10453",
    "currency": "ETB",
    "lines": [{
      "description": "Professional service",
      "quantity_milli": 1000,
      "unit_price_minor": 100000,
      "tax_rate_bps": 1500
    }]
  }'
```

All monetary values in the API/database are integer minor units; quantity uses thousandths (`quantity_milli`) to avoid floating-point accounting errors.

## Production hardening still required

- Complete MoR adapter from primary regulator docs and pass its conformance suite.
- Persist PKCE state/nonce/verifier server-side and implement full eSignet callback/JWKS validation.
- Add a queue/worker for authority submission and webhook retries; do not perform long network calls inline at scale.
- Export daily audit checkpoint roots to independent Ethiopia-hosted WORM-capable storage and sign them with an isolated key/HSM.
- Add connection pooling, rate limiting, observability, encrypted backups and disaster-recovery tests.
- Add automated database tests against a real Postgres/Supabase instance, including RLS tests for cross-tenant denial.
- Confirm hosting/data-localization architecture with Ethiopian counsel/regulators before production taxpayer/identity data is processed.
- Add credit products only after compliance revenue is positive and NBE/data-use permissions are resolved.

## Structure

```text
app/                         Next.js UI + route handlers
src/domain/                  deterministic business rules
src/lib/api/                 auth / HTTP helpers
src/lib/fiscal/              country authority adapter boundary
src/lib/identity/            eSignet/Fayda scaffold
src/lib/webhooks/            Ed25519 signing/delivery
src/lib/supabase/            server-only client
supabase/schema.sql          canonical database schema/RLS
supabase/seed.sql            dev seed
scripts/                     API-key generator + smoke tests
docs/openapi.yaml            ERP API contract
docs/ARCHITECTURE.md         system boundaries
docs/REGULATORY_ADAPTER_CHECKLIST.md
```
