-- Development-only seed. Replace UUIDs before use in a local database.
-- API key plaintext is not included; use scripts/generate-api-key.mjs and insert its SHA-256 hash.
insert into public.tenants(id,legal_name) values ('00000000-0000-0000-0000-000000000001','Demo Trading PLC') on conflict do nothing;
insert into public.legal_entities(id,tenant_id,tin,legal_name) values ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','DEMO-TIN-001','Demo Trading PLC') on conflict do nothing;
