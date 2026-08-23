\set ON_ERROR_STOP on

insert into auth.users(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002');

insert into public.tenants(id,legal_name) values
 ('20000000-0000-0000-0000-000000000001','Tenant One'),
 ('20000000-0000-0000-0000-000000000002','Tenant Two');
insert into public.tenant_members(tenant_id,user_id,role) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','owner'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','owner');
insert into public.legal_entities(id,tenant_id,tin,legal_name) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','TIN-1','Tenant One'),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','TIN-2','Tenant Two');

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$ declare c int; begin
  select count(*) into c from public.tenants;
  if c <> 1 then raise exception 'RLS tenant isolation failed: saw % tenants',c; end if;
  select count(*) into c from public.legal_entities;
  if c <> 1 then raise exception 'RLS legal entity isolation failed: saw % entities',c; end if;
end $$;
rollback;

do $$
begin
  begin
    insert into public.branches(tenant_id,legal_entity_id,name) values
      ('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','Invalid');
    raise exception 'branch tenant guard failed to reject mismatch';
  exception when others then
    if sqlerrm not like '%tenant mismatch%' then raise; end if;
  end;
end $$;

do $$
declare inv uuid; submission uuid;
begin
  inv := public.create_invoice_v1(
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',null,null,
    'ERP-1','IDEMP-1','ETB',10000,1500,11500,
    '{"source_ref":"ERP-1","lines":[{"description":"Service"}]}'::jsonb,
    '[{"description":"Service","quantity_milli":1000,"unit_price_minor":10000,"tax_rate_bps":1500,"net_minor":10000,"tax_minor":1500,"total_minor":11500}]'::jsonb
  );
  submission := public.begin_fiscal_submission_v1('20000000-0000-0000-0000-000000000001',inv,'mock');
  perform public.finalize_fiscal_submission_v1('20000000-0000-0000-0000-000000000001',inv,submission,'accepted','AUTH-1','IRN-1','RRN-1','QR','ACCEPTED',null,'{}'::jsonb);
  begin
    update public.invoice_lines set description='tampered' where invoice_id=inv;
    raise exception 'accepted invoice line mutation was not rejected';
  exception when others then
    if sqlerrm not like '%accepted invoice lines are immutable%' then raise; end if;
  end;
  begin
    update public.invoices set subtotal_minor=9999,total_minor=11499 where id=inv;
    raise exception 'accepted invoice mutation was not rejected';
  exception when others then
    if sqlerrm not like '%fiscally accepted invoice payload is immutable%' then raise; end if;
  end;
end $$;

do $$
declare a1 uuid; a2 uuid; j uuid; l uuid;
begin
  insert into public.ledger_accounts(tenant_id,code,name,account_type) values
   ('20000000-0000-0000-0000-000000000001','1100','Receivable','asset') returning id into a1;
  insert into public.ledger_accounts(tenant_id,code,name,account_type) values
   ('20000000-0000-0000-0000-000000000001','4000','Revenue','income') returning id into a2;
  insert into public.journal_entries(tenant_id,source_type,description) values
   ('20000000-0000-0000-0000-000000000001','test','Balanced entry') returning id into j;
  insert into public.journal_lines(tenant_id,journal_entry_id,account_id,debit_minor,credit_minor) values
   ('20000000-0000-0000-0000-000000000001',j,a1,10000,0) returning id into l;
  insert into public.journal_lines(tenant_id,journal_entry_id,account_id,debit_minor,credit_minor) values
   ('20000000-0000-0000-0000-000000000001',j,a2,0,10000);
  update public.journal_entries set status='posted',posted_at=now() where id=j;
  begin
    update public.journal_lines set debit_minor=9000 where id=l;
    raise exception 'posted journal line mutation was not rejected';
  exception when others then
    if sqlerrm not like '%posted journal lines are immutable%' then raise; end if;
  end;
end $$;

select 'database security tests passed' as result;

do $$
begin
  begin
    insert into public.identity_sessions(tenant_id,user_id,state,nonce,pkce_verifier_ciphertext,redirect_uri,expires_at)
    values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','bad-state','nonce','cipher','https://example.test/callback',now()+interval '10 minutes');
    raise exception 'identity tenant guard failed to reject mismatch';
  exception when others then
    if sqlerrm not like '%identity user tenant mismatch%' then raise; end if;
  end;
end $$;

do $$
declare checkpoint uuid;
begin
  insert into public.audit_events(tenant_id,actor_type,action,object_type,object_id)
  values('20000000-0000-0000-0000-000000000001','system','test.audit','test','1');
  insert into public.audit_checkpoints(tenant_id,checkpoint_date,last_seq,root_hash,signature)
  select tenant_id,current_date,seq,event_hash,'test-signature'
  from public.audit_events where tenant_id='20000000-0000-0000-0000-000000000001' order by seq desc limit 1
  returning id into checkpoint;
  begin
    update public.audit_checkpoints set signature='tampered' where id=checkpoint;
    raise exception 'audit checkpoint mutation was not rejected';
  exception when others then
    if sqlerrm not like '%append-only record cannot be mutated%' then raise; end if;
  end;
end $$;
