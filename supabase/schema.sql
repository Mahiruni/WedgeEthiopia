-- Wedge Ethiopia V1 canonical fiscal-rail schema.
-- Intentionally kept as schema.sql rather than inventing a migration filename.
-- When Supabase CLI is available: `supabase migration new initial_fiscal_rail`, then copy/review this SQL.

create extension if not exists pgcrypto;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create type public.tenant_member_role as enum ('owner','admin','invoice_writer','viewer','accountant','developer');
create type public.invoice_status as enum ('draft','validated','ready_for_clearance','offline_queued','submitted','reconciliation_required','rejected','accepted','delivered');
create type public.payment_status as enum ('unpaid','partial','paid');
create type public.api_key_status as enum ('active','revoked');
create type public.webhook_status as enum ('active','disabled');
create type public.journal_status as enum ('draft','posted');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.tenant_member_role not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (tenant_id,user_id)
);

create table public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tin text not null,
  vat_number text,
  registration_number text,
  legal_name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (tenant_id,tin)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_entity_id uuid not null references public.legal_entities(id) on delete cascade,
  sub_tin text,
  authority_registration_id text,
  name text not null,
  address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.counterparties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tin text,
  vat_number text,
  legal_name text not null,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  unique nulls not distinct (tenant_id,tin)
);

create table public.fayda_bindings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  issuer text not null,
  subject_ref_hash text not null,
  assurance_level text,
  auth_time timestamptz,
  verified_at timestamptz not null default now(),
  consent_ref text,
  unique (tenant_id,issuer,subject_ref_hash)
);

create table public.authorized_signatories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_entity_id uuid not null references public.legal_entities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  authority_basis_ref text not null,
  valid_from timestamptz not null,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table public.identity_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null unique,
  nonce text not null,
  pkce_verifier_ciphertext text not null,
  redirect_uri text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  status public.api_key_status not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  legal_entity_id uuid not null references public.legal_entities(id),
  branch_id uuid references public.branches(id),
  counterparty_id uuid references public.counterparties(id),
  invoice_type text not null default 'standard',
  status public.invoice_status not null default 'draft',
  payment_status public.payment_status not null default 'unpaid',
  currency text not null default 'ETB',
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  vat_minor bigint not null check (vat_minor >= 0),
  total_minor bigint not null check (total_minor >= 0 and total_minor = subtotal_minor + vat_minor),
  source_ref text not null,
  idempotency_key text not null,
  canonical_payload jsonb not null default '{}'::jsonb,
  canonical_payload_hash text,
  authority_reference text,
  authority_irn text,
  authority_rrn text,
  qr_payload text,
  last_rejection_code text,
  last_rejection_message text,
  issued_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,source_ref),
  unique (tenant_id,idempotency_key)
);

create index invoices_tenant_created_idx on public.invoices(tenant_id,created_at desc);
create index invoices_tenant_status_idx on public.invoices(tenant_id,status,created_at desc);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  position integer not null,
  sku text,
  description text not null,
  quantity_milli bigint not null check (quantity_milli > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  tax_code text,
  tax_rate_bps integer not null check (tax_rate_bps >= 0),
  net_minor bigint not null check (net_minor >= 0),
  tax_minor bigint not null check (tax_minor >= 0),
  total_minor bigint not null check (total_minor = net_minor + tax_minor),
  unique (invoice_id,position)
);

create table public.invoice_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  seq bigint not null,
  from_state public.invoice_status,
  to_state public.invoice_status not null,
  event_type text not null,
  payload_hash text,
  occurred_at timestamptz not null default now(),
  unique (invoice_id,seq)
);

create table public.fiscal_submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  attempt_no integer not null check (attempt_no > 0),
  upstream_provider text not null,
  request_hash text,
  authority_reference text,
  response_code text,
  status text not null,
  response_payload jsonb,
  submitted_at timestamptz not null default now(),
  unique (invoice_id,attempt_no)
);

create table public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null,
  unique (tenant_id,code)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  description text not null,
  status public.journal_status not null default 'draft',
  posted_at timestamptz,
  reversal_of uuid references public.journal_entries(id),
  created_at timestamptz not null default now()
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.ledger_accounts(id),
  debit_minor bigint not null default 0 check (debit_minor >= 0),
  credit_minor bigint not null default 0 check (credit_minor >= 0),
  memo text,
  check ((debit_minor = 0) <> (credit_minor = 0))
);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  url text not null check (url ~ '^https://'),
  events text[] not null,
  status public.webhook_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null,
  object_id text not null,
  payload jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_id uuid not null,
  event_type text not null,
  attempt_no integer not null,
  response_status integer,
  response_body_hash text,
  delivered_at timestamptz,
  next_attempt_at timestamptz,
  terminal_failure boolean not null default false,
  error_code text,
  created_at timestamptz not null default now(),
  unique(endpoint_id,event_id,attempt_no)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  seq bigint not null,
  actor_type text not null,
  actor_id text,
  action text not null,
  object_type text not null,
  object_id text not null,
  payload_hash text,
  metadata jsonb not null default '{}'::jsonb,
  previous_hash text,
  event_hash text not null,
  occurred_at timestamptz not null default now(),
  unique (tenant_id,seq),
  unique (tenant_id,event_hash)
);

create table public.audit_checkpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  checkpoint_date date not null,
  last_seq bigint not null,
  root_hash text not null,
  signature text,
  storage_reference text,
  created_at timestamptz not null default now(),
  unique (tenant_id, checkpoint_date)
);

-- Tenant membership helper. SECURITY INVOKER is the default.
create or replace function app_private.is_tenant_member(p_tenant_id uuid)
returns boolean language sql stable
set search_path = pg_catalog, public
as $$
  select exists(
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function app_private.has_tenant_role(p_tenant_id uuid, p_roles public.tenant_member_role[])
returns boolean language sql stable
set search_path = pg_catalog, public
as $$
  select exists(
    select 1 from public.tenant_members m
    where m.tenant_id = p_tenant_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any(p_roles)
  );
$$;

-- Enforce tenant consistency for invoice child records.
create or replace function app_private.assert_invoice_tenant_match()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (select 1 from public.invoices i where i.id = new.invoice_id and i.tenant_id = new.tenant_id) then
    raise exception 'invoice tenant mismatch';
  end if;
  return new;
end;
$$;

create trigger invoice_lines_tenant_guard before insert or update on public.invoice_lines for each row execute function app_private.assert_invoice_tenant_match();
create trigger invoice_events_tenant_guard before insert or update on public.invoice_events for each row execute function app_private.assert_invoice_tenant_match();
create trigger fiscal_submissions_tenant_guard before insert or update on public.fiscal_submissions for each row execute function app_private.assert_invoice_tenant_match();

-- Cross-table tenant consistency and append/finalization guards.
create or replace function app_private.assert_branch_tenant_match()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (select 1 from public.legal_entities e where e.id=new.legal_entity_id and e.tenant_id=new.tenant_id) then
    raise exception 'branch legal entity tenant mismatch';
  end if;
  return new;
end;
$$;
create trigger branches_tenant_guard before insert or update on public.branches for each row execute function app_private.assert_branch_tenant_match();


create or replace function app_private.assert_identity_user_tenant_match()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.tenant_members tm
    where tm.tenant_id = new.tenant_id
      and tm.user_id = new.user_id
      and tm.status = 'active'
  ) then
    raise exception 'identity user tenant mismatch or inactive membership';
  end if;
  return new;
end;
$$;

create trigger identity_session_tenant_guard
before insert or update of tenant_id,user_id on public.identity_sessions
for each row execute function app_private.assert_identity_user_tenant_match();

create trigger fayda_binding_tenant_guard
before insert or update of tenant_id,user_id on public.fayda_bindings
for each row execute function app_private.assert_identity_user_tenant_match();

create or replace function app_private.assert_signatory_tenant_match()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists (select 1 from public.legal_entities e where e.id=new.legal_entity_id and e.tenant_id=new.tenant_id) then
    raise exception 'signatory legal entity tenant mismatch';
  end if;
  if not exists (select 1 from public.tenant_members m where m.tenant_id=new.tenant_id and m.user_id=new.user_id and m.status='active') then
    raise exception 'signatory must be an active tenant member';
  end if;
  return new;
end;
$$;
create trigger signatories_tenant_guard before insert or update on public.authorized_signatories for each row execute function app_private.assert_signatory_tenant_match();

create or replace function app_private.guard_invoice_line_mutation()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare v_invoice uuid; v_status public.invoice_status;
begin
  v_invoice := case when tg_op='DELETE' then old.invoice_id else new.invoice_id end;
  select status into v_status from public.invoices where id=v_invoice;
  if v_status in ('accepted','delivered') then raise exception 'accepted invoice lines are immutable; issue a credit/debit note'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
create trigger invoice_lines_final_guard before update or delete on public.invoice_lines for each row execute function app_private.guard_invoice_line_mutation();

create or replace function app_private.assert_journal_line_tenant_match()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists(select 1 from public.journal_entries j where j.id=new.journal_entry_id and j.tenant_id=new.tenant_id) then
    raise exception 'journal entry tenant mismatch';
  end if;
  if not exists(select 1 from public.ledger_accounts a where a.id=new.account_id and a.tenant_id=new.tenant_id) then
    raise exception 'ledger account tenant mismatch';
  end if;
  return new;
end;
$$;
create trigger journal_lines_tenant_guard before insert or update on public.journal_lines for each row execute function app_private.assert_journal_line_tenant_match();

create or replace function app_private.guard_posted_journal_line()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare v_entry uuid; v_status public.journal_status;
begin
  v_entry := case when tg_op='DELETE' then old.journal_entry_id else new.journal_entry_id end;
  select status into v_status from public.journal_entries where id=v_entry;
  if v_status='posted' then raise exception 'posted journal lines are immutable; reverse the entry instead'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
create trigger posted_journal_lines_guard before update or delete on public.journal_lines for each row execute function app_private.guard_posted_journal_line();

create or replace function app_private.assert_webhook_delivery_tenant_match()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if not exists(select 1 from public.webhook_endpoints e where e.id=new.endpoint_id and e.tenant_id=new.tenant_id) then
    raise exception 'webhook endpoint tenant mismatch';
  end if;
  if not exists(select 1 from public.webhook_events w where w.id=new.event_id and w.tenant_id=new.tenant_id) then
    raise exception 'webhook event tenant mismatch';
  end if;
  return new;
end;
$$;
create trigger webhook_deliveries_tenant_guard before insert or update on public.webhook_deliveries for each row execute function app_private.assert_webhook_delivery_tenant_match();

-- Fiscal state transition enforcement.
create or replace function app_private.valid_invoice_transition(old_state public.invoice_status, new_state public.invoice_status)
returns boolean language sql immutable
as $$
  select case old_state
    when 'draft' then new_state in ('draft','validated')
    when 'validated' then new_state in ('validated','draft','ready_for_clearance')
    when 'ready_for_clearance' then new_state in ('ready_for_clearance','submitted','offline_queued')
    when 'offline_queued' then new_state in ('offline_queued','submitted')
    when 'submitted' then new_state in ('submitted','accepted','rejected','ready_for_clearance','reconciliation_required')
    when 'reconciliation_required' then new_state in ('reconciliation_required','accepted','rejected','ready_for_clearance')
    when 'rejected' then new_state in ('rejected','ready_for_clearance')
    when 'accepted' then new_state in ('accepted','delivered')
    when 'delivered' then new_state = 'delivered'
    else false
  end;
$$;

create or replace function app_private.guard_invoice_update()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id <> old.tenant_id then raise exception 'tenant_id is immutable'; end if;
  if not app_private.valid_invoice_transition(old.status,new.status) then
    raise exception 'invalid invoice state transition: % -> %', old.status,new.status;
  end if;
  if old.status in ('accepted','delivered') then
    if new.canonical_payload is distinct from old.canonical_payload
       or new.subtotal_minor is distinct from old.subtotal_minor
       or new.vat_minor is distinct from old.vat_minor
       or new.total_minor is distinct from old.total_minor
       or new.source_ref is distinct from old.source_ref
       or new.idempotency_key is distinct from old.idempotency_key
       or new.legal_entity_id is distinct from old.legal_entity_id
       or new.branch_id is distinct from old.branch_id
       or new.counterparty_id is distinct from old.counterparty_id
       or new.currency is distinct from old.currency
       or new.invoice_type is distinct from old.invoice_type
       or new.issued_at is distinct from old.issued_at
       or new.authority_reference is distinct from old.authority_reference
       or new.authority_irn is distinct from old.authority_irn
       or new.authority_rrn is distinct from old.authority_rrn
       or new.qr_payload is distinct from old.qr_payload
       or new.accepted_at is distinct from old.accepted_at then
      raise exception 'fiscally accepted invoice payload is immutable; issue a credit/debit note';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
create trigger invoices_update_guard before update on public.invoices for each row execute function app_private.guard_invoice_update();

create or replace function app_private.record_invoice_state_event()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare next_seq bigint;
begin
  if tg_op='UPDATE' and old.status is not distinct from new.status then return new; end if;
  select coalesce(max(seq),0)+1 into next_seq from public.invoice_events where invoice_id=new.id;
  insert into public.invoice_events(tenant_id,invoice_id,seq,from_state,to_state,event_type,occurred_at)
  values(new.tenant_id,new.id,next_seq,case when tg_op='INSERT' then null else old.status end,new.status,'invoice.state_changed',now());
  return new;
end;
$$;
create trigger invoice_initial_state_event after insert on public.invoices for each row execute function app_private.record_invoice_state_event();
create trigger invoice_state_event after update of status on public.invoices for each row execute function app_private.record_invoice_state_event();

-- Audit hash chain serialized per tenant with an advisory transaction lock.
create or replace function app_private.audit_hash_before_insert()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
declare
  prev public.audit_events%rowtype;
  canonical text;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.tenant_id::text,0));
  select * into prev from public.audit_events where tenant_id = new.tenant_id order by seq desc limit 1;
  new.seq := coalesce(prev.seq,0) + 1;
  new.previous_hash := prev.event_hash;
  canonical := concat_ws('|',new.tenant_id::text,new.seq::text,new.occurred_at::text,new.actor_type,coalesce(new.actor_id,''),new.action,new.object_type,new.object_id,coalesce(new.payload_hash,''),coalesce(new.metadata::text,'{}'),coalesce(new.previous_hash,''));
  new.event_hash := encode(digest(canonical,'sha256'),'hex');
  return new;
end;
$$;
create trigger audit_hash before insert on public.audit_events for each row execute function app_private.audit_hash_before_insert();

create or replace function app_private.prevent_mutation()
returns trigger language plpgsql as $$ begin raise exception 'append-only record cannot be mutated'; end; $$;
create trigger audit_no_update before update or delete on public.audit_events for each row execute function app_private.prevent_mutation();
create trigger audit_checkpoint_no_update before update or delete on public.audit_checkpoints for each row execute function app_private.prevent_mutation();
create trigger invoice_events_no_update before update or delete on public.invoice_events for each row execute function app_private.prevent_mutation();

-- Ledger validation. Posted entries must balance and cannot be mutated.
create or replace function app_private.assert_journal_balanced(p_entry uuid)
returns void language plpgsql
set search_path = pg_catalog, public
as $$
declare d bigint; c bigint; s public.journal_status;
begin
  select status into s from public.journal_entries where id=p_entry;
  if s='posted' then
    select coalesce(sum(debit_minor),0),coalesce(sum(credit_minor),0) into d,c from public.journal_lines where journal_entry_id=p_entry;
    if d=0 or d<>c then raise exception 'posted journal entry must balance: debit %, credit %',d,c; end if;
  end if;
end;
$$;

create or replace function app_private.check_journal_lines()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    perform app_private.assert_journal_balanced(old.journal_entry_id);
    return old;
  end if;
  perform app_private.assert_journal_balanced(new.journal_entry_id);
  return new;
end;
$$;
create constraint trigger journal_lines_balance after insert or update or delete on public.journal_lines deferrable initially deferred for each row execute function app_private.check_journal_lines();

create or replace function app_private.guard_posted_journal()
returns trigger language plpgsql as $$
begin
  if old.status='posted' then raise exception 'posted journal entry is immutable; reverse it instead'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger posted_journal_guard before update or delete on public.journal_entries for each row execute function app_private.guard_posted_journal();

create or replace function app_private.check_journal_status()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status='posted' and old.status is distinct from new.status then
    perform app_private.assert_journal_balanced(new.id);
  end if;
  return new;
end;
$$;
create constraint trigger journal_status_balance after update of status on public.journal_entries deferrable initially deferred for each row execute function app_private.check_journal_status();

-- RLS on every public table. API server uses secret/service credentials and must always add tenant_id filters.
do $$ declare r record; begin
  for r in select tablename from pg_tables where schemaname='public' and tablename in (
    'tenants','tenant_members','legal_entities','branches','counterparties','fayda_bindings','authorized_signatories','identity_sessions','api_keys','invoices','invoice_lines','invoice_events','fiscal_submissions','ledger_accounts','journal_entries','journal_lines','webhook_endpoints','webhook_events','webhook_deliveries','audit_events','audit_checkpoints'
  ) loop execute format('alter table public.%I enable row level security',r.tablename); execute format('alter table public.%I force row level security',r.tablename); end loop;
end $$;

create policy tenant_members_select on public.tenant_members for select to authenticated using (user_id = (select auth.uid()));
create policy tenant_select on public.tenants for select to authenticated using (app_private.is_tenant_member(id));

-- Authenticated clients need only the two safe membership helpers used by RLS policies.
revoke all on all functions in schema app_private from public,anon,authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_tenant_member(uuid) to authenticated;
grant execute on function app_private.has_tenant_role(uuid,public.tenant_member_role[]) to authenticated;

-- Representative tenant policies. The application API generally uses server-side secret credentials;
-- these policies protect future direct authenticated Data API use.
do $$ declare t text; begin
  foreach t in array array['legal_entities','branches','counterparties','fayda_bindings','authorized_signatories','invoices','invoice_lines','invoice_events','fiscal_submissions','ledger_accounts','journal_entries','journal_lines','webhook_endpoints','webhook_events','webhook_deliveries'] loop
    execute format('create policy %I on public.%I for select to authenticated using (app_private.is_tenant_member(tenant_id))',t||'_tenant_select',t);
  end loop;
end $$;

create policy audit_events_tenant_select on public.audit_events for select to authenticated using (app_private.has_tenant_role(tenant_id,array['owner','admin','accountant']::public.tenant_member_role[]));

-- Explicit Data API grants reflect Supabase's 2026 exposure change.
-- Sensitive infrastructure tables are deliberately NOT granted to authenticated clients.
grant usage on schema public to authenticated;
grant select on public.tenants,public.tenant_members,public.legal_entities,public.branches,public.counterparties,public.invoices,public.invoice_lines,public.invoice_events,public.audit_events to authenticated;
revoke all on public.api_keys,public.identity_sessions,public.fiscal_submissions,public.webhook_events,public.webhook_deliveries,public.audit_checkpoints from anon,authenticated;
revoke insert,update,delete on public.audit_events,public.invoice_events from anon,authenticated;



-- Atomic submission lifecycle: local state/audit/submission records remain consistent around the external authority call.
create or replace function public.begin_fiscal_submission_v1(
  p_tenant_id uuid, p_invoice_id uuid, p_provider text
) returns uuid
language plpgsql security invoker
set search_path = pg_catalog, public
as $$
declare v_status public.invoice_status; v_attempt integer; v_submission uuid;
begin
  select status into v_status from public.invoices where id=p_invoice_id and tenant_id=p_tenant_id for update;
  if v_status is null then raise exception 'INVOICE_NOT_FOUND'; end if;
  if v_status in ('validated','rejected') then
    update public.invoices set status='ready_for_clearance' where id=p_invoice_id and tenant_id=p_tenant_id;
    v_status := 'ready_for_clearance';
  end if;
  if v_status not in ('ready_for_clearance','offline_queued') then
    raise exception 'INVALID_SUBMISSION_STATE:%',v_status;
  end if;
  update public.invoices set status='submitted' where id=p_invoice_id and tenant_id=p_tenant_id;
  select coalesce(max(attempt_no),0)+1 into v_attempt from public.fiscal_submissions where invoice_id=p_invoice_id;
  insert into public.fiscal_submissions(tenant_id,invoice_id,attempt_no,upstream_provider,request_hash,status)
  select p_tenant_id,p_invoice_id,v_attempt,p_provider,canonical_payload_hash,'submitted'
  from public.invoices where id=p_invoice_id
  returning id into v_submission;
  insert into public.audit_events(tenant_id,actor_type,action,object_type,object_id,metadata)
  values(p_tenant_id,'fiscal_worker','invoice.submitted','invoice',p_invoice_id::text,jsonb_build_object('provider',p_provider,'attempt_no',v_attempt));
  return v_submission;
end;
$$;
revoke all on function public.begin_fiscal_submission_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.begin_fiscal_submission_v1(uuid,uuid,text) to service_role;

create or replace function public.mark_fiscal_submission_failure_v1(
  p_tenant_id uuid,
  p_invoice_id uuid,
  p_submission_id uuid,
  p_message text,
  p_outcome_unknown boolean
) returns uuid
language plpgsql security invoker
set search_path = pg_catalog, public
as $$
declare v_invoice_status public.invoice_status; v_submission_status text; v_target public.invoice_status; v_submission_target text;
begin
  select status into v_invoice_status from public.invoices where id=p_invoice_id and tenant_id=p_tenant_id for update;
  select status into v_submission_status from public.fiscal_submissions where id=p_submission_id and tenant_id=p_tenant_id and invoice_id=p_invoice_id for update;
  if v_invoice_status is null or v_submission_status is null then raise exception 'SUBMISSION_NOT_FOUND'; end if;
  if v_invoice_status<>'submitted' or v_submission_status<>'submitted' then return p_invoice_id; end if;
  if p_outcome_unknown then
    v_target := 'reconciliation_required';
    v_submission_target := 'unknown';
  else
    v_target := 'ready_for_clearance';
    v_submission_target := 'failed';
  end if;
  update public.invoices set status=v_target where id=p_invoice_id and tenant_id=p_tenant_id;
  update public.fiscal_submissions set status=v_submission_target,response_code=case when p_outcome_unknown then 'OUTCOME_UNKNOWN' else 'ADAPTER_ERROR' end,response_payload=jsonb_build_object('message',p_message)
  where id=p_submission_id and tenant_id=p_tenant_id;
  insert into public.audit_events(tenant_id,actor_type,action,object_type,object_id,metadata)
  values(p_tenant_id,'fiscal_worker',case when p_outcome_unknown then 'fiscal.reconciliation_required' else 'fiscal.submission_failed' end,'invoice',p_invoice_id::text,jsonb_build_object('submission_id',p_submission_id,'message',p_message));
  if p_outcome_unknown then
    insert into public.webhook_events(tenant_id,event_type,object_id,payload)
    values(p_tenant_id,'fiscal.reconciliation_required',p_invoice_id::text,jsonb_build_object('invoice_id',p_invoice_id,'submission_id',p_submission_id));
  end if;
  return p_invoice_id;
end;
$$;
revoke all on function public.mark_fiscal_submission_failure_v1(uuid,uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.mark_fiscal_submission_failure_v1(uuid,uuid,uuid,text,boolean) to service_role;

create or replace function public.finalize_fiscal_submission_v1(
  p_tenant_id uuid,
  p_invoice_id uuid,
  p_submission_id uuid,
  p_outcome text,
  p_authority_reference text,
  p_irn text,
  p_rrn text,
  p_qr_payload text,
  p_response_code text,
  p_rejection_message text,
  p_response_payload jsonb
) returns uuid
language plpgsql security invoker
set search_path = pg_catalog, public
as $$
declare v_invoice_status public.invoice_status; v_submission_status text;
begin
  select status into v_invoice_status from public.invoices where id=p_invoice_id and tenant_id=p_tenant_id for update;
  if v_invoice_status is null then raise exception 'INVOICE_NOT_FOUND'; end if;
  select status into v_submission_status from public.fiscal_submissions where id=p_submission_id and tenant_id=p_tenant_id and invoice_id=p_invoice_id for update;
  if v_submission_status is null then raise exception 'SUBMISSION_NOT_FOUND'; end if;

  if p_outcome='accepted' then
    if v_submission_status='accepted' and v_invoice_status in ('accepted','delivered') then return p_invoice_id; end if;
    if v_invoice_status not in ('submitted','reconciliation_required') or v_submission_status not in ('submitted','unknown') then raise exception 'INVALID_FINALIZATION_STATE'; end if;
    if p_irn is null or btrim(p_irn)='' then raise exception 'ACCEPTED_RESULT_REQUIRES_IRN'; end if;
    update public.invoices set
      status='accepted',authority_reference=p_authority_reference,authority_irn=p_irn,authority_rrn=p_rrn,qr_payload=p_qr_payload,
      accepted_at=now(),last_rejection_code=null,last_rejection_message=null
    where id=p_invoice_id and tenant_id=p_tenant_id;
    update public.fiscal_submissions set status='accepted',authority_reference=p_authority_reference,response_code=coalesce(p_response_code,'ACCEPTED'),response_payload=p_response_payload
    where id=p_submission_id and tenant_id=p_tenant_id;
    insert into public.audit_events(tenant_id,actor_type,action,object_type,object_id,metadata)
    values(p_tenant_id,'fiscal_worker','invoice.accepted','invoice',p_invoice_id::text,jsonb_build_object('submission_id',p_submission_id,'authority_reference',p_authority_reference));
    insert into public.webhook_events(tenant_id,event_type,object_id,payload)
    values(p_tenant_id,'invoice.accepted',p_invoice_id::text,jsonb_build_object('invoice_id',p_invoice_id,'status','accepted','authority_irn',p_irn,'authority_rrn',p_rrn));
  elsif p_outcome='rejected' then
    if v_submission_status='rejected' and v_invoice_status='rejected' then return p_invoice_id; end if;
    if v_invoice_status not in ('submitted','reconciliation_required') or v_submission_status not in ('submitted','unknown') then raise exception 'INVALID_FINALIZATION_STATE'; end if;
    update public.invoices set status='rejected',last_rejection_code=p_response_code,last_rejection_message=p_rejection_message
    where id=p_invoice_id and tenant_id=p_tenant_id;
    update public.fiscal_submissions set status='rejected',authority_reference=p_authority_reference,response_code=p_response_code,response_payload=p_response_payload
    where id=p_submission_id and tenant_id=p_tenant_id;
    insert into public.audit_events(tenant_id,actor_type,action,object_type,object_id,metadata)
    values(p_tenant_id,'fiscal_worker','invoice.rejected','invoice',p_invoice_id::text,jsonb_build_object('submission_id',p_submission_id,'code',p_response_code));
    insert into public.webhook_events(tenant_id,event_type,object_id,payload)
    values(p_tenant_id,'invoice.rejected',p_invoice_id::text,jsonb_build_object('invoice_id',p_invoice_id,'status','rejected','code',p_response_code,'message',p_rejection_message));
  else
    raise exception 'INVALID_OUTCOME';
  end if;
  return p_invoice_id;
end;
$$;
revoke all on function public.finalize_fiscal_submission_v1(uuid,uuid,uuid,text,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_fiscal_submission_v1(uuid,uuid,uuid,text,text,text,text,text,text,text,jsonb) to service_role;

-- Service-only tenant bootstrap for initial provisioning.
create or replace function public.bootstrap_tenant_v1(
  p_legal_name text, p_tin text, p_key_prefix text, p_key_hash text, p_scopes text[]
) returns jsonb
language plpgsql security invoker
set search_path = pg_catalog, public
as $$
declare v_tenant uuid; v_entity uuid; v_key uuid;
begin
  insert into public.tenants(legal_name) values(p_legal_name) returning id into v_tenant;
  insert into public.legal_entities(tenant_id,tin,legal_name) values(v_tenant,p_tin,p_legal_name) returning id into v_entity;
  insert into public.api_keys(tenant_id,name,key_prefix,key_hash,scopes) values(v_tenant,'Initial ERP key',p_key_prefix,p_key_hash,p_scopes) returning id into v_key;
  return jsonb_build_object('tenant_id',v_tenant,'legal_entity_id',v_entity,'api_key_id',v_key);
end;
$$;
revoke all on function public.bootstrap_tenant_v1(text,text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.bootstrap_tenant_v1(text,text,text,text,text[]) to service_role;

-- Atomic server-side invoice creation. SECURITY INVOKER; callable only by service_role.
create or replace function public.create_invoice_v1(
  p_tenant_id uuid,
  p_legal_entity_id uuid,
  p_branch_id uuid,
  p_counterparty_id uuid,
  p_source_ref text,
  p_idempotency_key text,
  p_currency text,
  p_subtotal_minor bigint,
  p_vat_minor bigint,
  p_total_minor bigint,
  p_canonical_payload jsonb,
  p_lines jsonb
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_hash text;
  v_existing_hash text;
  v_row jsonb;
  v_pos integer := 0;
  v_subtotal bigint;
  v_vat bigint;
  v_total bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || p_idempotency_key, 0));
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'invoice requires at least one line';
  end if;
  if p_total_minor <> p_subtotal_minor + p_vat_minor then
    raise exception 'invoice totals do not reconcile';
  end if;
  if not exists(select 1 from public.legal_entities e where e.id=p_legal_entity_id and e.tenant_id=p_tenant_id) then
    raise exception 'legal entity tenant mismatch';
  end if;
  if p_branch_id is not null and not exists(select 1 from public.branches b where b.id=p_branch_id and b.tenant_id=p_tenant_id and b.legal_entity_id=p_legal_entity_id) then
    raise exception 'branch tenant/entity mismatch';
  end if;
  if p_counterparty_id is not null and not exists(select 1 from public.counterparties c where c.id=p_counterparty_id and c.tenant_id=p_tenant_id) then
    raise exception 'counterparty tenant mismatch';
  end if;

  v_hash := encode(digest(p_canonical_payload::text,'sha256'),'hex');
  select id,canonical_payload_hash into v_id,v_existing_hash
  from public.invoices where tenant_id=p_tenant_id and idempotency_key=p_idempotency_key;
  if v_id is not null then
    if v_existing_hash is distinct from v_hash then
      raise exception 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return v_id;
  end if;

  insert into public.invoices(tenant_id,legal_entity_id,branch_id,counterparty_id,status,currency,subtotal_minor,vat_minor,total_minor,source_ref,idempotency_key,canonical_payload,canonical_payload_hash,issued_at)
  values(p_tenant_id,p_legal_entity_id,p_branch_id,p_counterparty_id,'validated',p_currency,p_subtotal_minor,p_vat_minor,p_total_minor,p_source_ref,p_idempotency_key,p_canonical_payload,v_hash,now())
  returning id into v_id;

  for v_row in select * from jsonb_array_elements(p_lines) loop
    v_pos := v_pos + 1;
    insert into public.invoice_lines(tenant_id,invoice_id,position,sku,description,quantity_milli,unit_price_minor,tax_code,tax_rate_bps,net_minor,tax_minor,total_minor)
    values(
      p_tenant_id,v_id,v_pos,nullif(v_row->>'sku',''),v_row->>'description',
      (v_row->>'quantity_milli')::bigint,(v_row->>'unit_price_minor')::bigint,nullif(v_row->>'tax_code',''),
      (v_row->>'tax_rate_bps')::integer,(v_row->>'net_minor')::bigint,(v_row->>'tax_minor')::bigint,(v_row->>'total_minor')::bigint
    );
  end loop;

  select coalesce(sum(net_minor),0),coalesce(sum(tax_minor),0),coalesce(sum(total_minor),0)
  into v_subtotal,v_vat,v_total from public.invoice_lines where invoice_id=v_id;
  if v_subtotal<>p_subtotal_minor or v_vat<>p_vat_minor or v_total<>p_total_minor then
    raise exception 'line totals do not reconcile with invoice header';
  end if;
  return v_id;
end;
$$;
revoke all on function public.create_invoice_v1(uuid,uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_invoice_v1(uuid,uuid,uuid,uuid,text,text,text,bigint,bigint,bigint,jsonb,jsonb) to service_role;

comment on table public.audit_events is 'Tamper-evident append-only chain; production requires independent WORM checkpoint storage.';
