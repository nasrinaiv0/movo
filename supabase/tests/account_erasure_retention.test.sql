begin;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
insert into auth.users(id, email) values
  ('10000000-0000-4000-8000-000000000011', 'erase-a@example.test'),
  ('10000000-0000-4000-8000-000000000012', 'erase-b@example.test');
insert into public.financial_accounts(id, user_id, name, account_type, currency, opening_balance) values
  ('10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000011', 'A', 'bank', 'PHP', 0),
  ('10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000012', 'B', 'bank', 'PHP', 0);
insert into public.scheduled_transactions(id, user_id, title, transaction_type, amount, account_id, scheduled_for)
values ('10000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000011', 'Schedule', 'expense', 10,
  '10000000-0000-4000-8000-000000000021', current_date);

insert into public.transactions(id, user_id, account_id, transaction_type, amount, merchant, schedule_id, occurred_at) values
  ('10000000-0000-4000-8000-000000000041', '10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000021', 'expense', 10, 'A', '10000000-0000-4000-8000-000000000031', now()),
  ('10000000-0000-4000-8000-000000000042', '10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000022', 'expense', 10, 'B', null, now());

insert into public.movo_manual_plan_grants(user_id, tier, expires_at, reason) values
  ('10000000-0000-4000-8000-000000000011', 'pro_plus', now()+interval '1 day', 'synthetic test'),
  ('10000000-0000-4000-8000-000000000012', 'pro_plus', now()+interval '1 day', 'synthetic test');
alter table public.user_preferences disable trigger movo_expire_incoming_archive;
insert into public.user_preferences(user_id, prefs) values
  ('10000000-0000-4000-8000-000000000011', jsonb_build_object('archive', jsonb_build_array(
    jsonb_build_object('id', 'old', 'archivedAt', now()-interval '91 days'),
    jsonb_build_object('id', 'malformed', 'archivedAt', 'wrong'),
    jsonb_build_object('id', 'keep', 'archivedAt', now()-interval '1 day')
  ), 'theme', 'dark'));
alter table public.user_preferences enable trigger movo_expire_incoming_archive;
insert into public.movo_iap_ack_jobs(purchase_token_hash, product_id, encrypted_token, created_at, completed_at) values
  (repeat('a', 64), 'product', 'ciphertext-a', now()-interval '8 days', null),
  (repeat('b', 64), 'product', 'ciphertext-b', now()-interval '2 days', null),
  (repeat('c', 64), 'product', '', now()-interval '9 days', now()-interval '8 days'),
  (repeat('d', 64), 'product', '', now()-interval '9 days', now()-interval '2 days');

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
-- Hosted Supabase applies default client grants to this legacy table.
grant select, update on public.scheduled_transactions to authenticated;
set local role authenticated;
do $$
begin
  begin
    update public.transactions set amount=20 where merchant='A';
    raise exception 'Direct transaction UPDATE succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.transactions where merchant='A';
    raise exception 'Direct transaction DELETE succeeded';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',true);
  begin
    insert into public.transactions(user_id, account_id, transaction_type, amount, merchant, schedule_id, occurred_at)
    values ('10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000022',
      'expense', 5, 'Cross-owner schedule', '10000000-0000-4000-8000-000000000031', now());
    raise exception 'Cross-user schedule succeeded';
  exception when foreign_key_violation then null;
  end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
  begin
    update public.scheduled_transactions set last_transaction_id='10000000-0000-4000-8000-000000000042'
    where id='10000000-0000-4000-8000-000000000031';
    raise exception 'Cross-user last transaction succeeded';
  exception when foreign_key_violation then null;
  end;
  begin
    perform public.movo_finish_account_erasure('10000000-0000-4000-8000-000000000012');
    raise exception 'Authenticated role called privileged erasure';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
select public.movo_run_data_retention();
reset role;
do $$
begin
  if (select prefs->'archive'->0->>'id' from public.user_preferences) is distinct from 'keep'
    or (select jsonb_array_length(prefs->'archive') from public.user_preferences) <> 1 then
    raise exception 'Expired archive was retained or fresh item was removed';
  end if;
  if (select count(*) from public.movo_iap_ack_jobs) <> 3
    or not exists(select 1 from public.movo_iap_ack_jobs where purchase_token_hash=repeat('a',64) and completed_at is null)
    or not exists(select 1 from public.movo_iap_ack_jobs where purchase_token_hash=repeat('b',64))
    or not exists(select 1 from public.movo_iap_ack_jobs where purchase_token_hash=repeat('d',64))
    or exists(select 1 from public.movo_iap_ack_jobs where purchase_token_hash=repeat('c',64))
  then raise exception 'Retention deleted a pending acknowledgement or retained an expired completed job'; end if;
end $$;

update public.user_preferences
set prefs = jsonb_set(prefs, '{archive}', (prefs->'archive') || jsonb_build_array(
  jsonb_build_object('id', 'stale-upload', 'archivedAt', now()-interval '91 days')
));
do $$
begin
  if (select jsonb_array_length(prefs->'archive') from public.user_preferences) <> 1 then
    raise exception 'Stale device preferences restored expired cloud archive entries';
  end if;
end $$;

set local role service_role;
select public.movo_clear_cloud_records('10000000-0000-4000-8000-000000000011');
reset role;
do $$
begin
  if not exists(select 1 from auth.users where id='10000000-0000-4000-8000-000000000011')
    or not exists(select 1 from public.movo_manual_plan_grants where user_id='10000000-0000-4000-8000-000000000011')
    or exists(select 1 from public.financial_accounts where name='A')
    or not exists(select 1 from public.transactions where merchant='B') then
    raise exception 'Clear did not preserve identity, entitlement and other tenant';
  end if;
end $$;

insert into public.movo_account_erasure_requests(user_id) values ('10000000-0000-4000-8000-000000000012');
insert into storage.objects(bucket_id, name) values
  ('movo-receipts', '10000000-0000-4000-8000-000000000012/receipt.png');
set local role service_role;
do $$
begin
  begin
    perform public.movo_finish_account_erasure('10000000-0000-4000-8000-000000000012');
    raise exception 'Erasure ran with private files still present';
  exception when raise_exception then
    if sqlerrm <> 'account_storage_cleanup_incomplete' then raise; end if;
  end;
end $$;
reset role;
delete from storage.objects where name='10000000-0000-4000-8000-000000000012/receipt.png';
set local role service_role;
select public.movo_finish_account_erasure('10000000-0000-4000-8000-000000000012');
select public.movo_finish_account_erasure('10000000-0000-4000-8000-000000000012');
reset role;
do $$
begin
  if (select count(*) from auth.users where id in (
    '10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000012'
  )) <> 1 or exists(select 1 from public.transactions where merchant='B') then
    raise exception 'Erasure failed or changed the other tenant';
  end if;
end $$;

-- Erasing auth.users cascades the pending request, but a previously issued
-- JWT can still pass the gateway signature check until it expires. Block it.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',true);
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
set local role authenticated;
do $$
begin
  if not public.movo_account_erasure_pending() then
    raise exception 'Deleted account JWT regained upload eligibility';
  end if;
end $$;
reset role;
rollback;
