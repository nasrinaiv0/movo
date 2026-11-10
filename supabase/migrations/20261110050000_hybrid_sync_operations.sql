-- Durable idempotency and locked compare-and-swap for the hybrid financial outbox.
-- No client may insert acknowledgements or choose an authenticated owner.
begin;
create table public.movo_sync_operations (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 request jsonb not null,
 acknowledgement jsonb not null,
 created_at timestamptz not null default now(),
 primary key (user_id,operation_id)
);
alter table public.movo_sync_operations enable row level security;
revoke all on public.movo_sync_operations from public,anon,authenticated;
grant select on public.movo_sync_operations to authenticated;
create policy sync_ack_owner on public.movo_sync_operations for select to authenticated
 using ((select auth.uid())=user_id);
grant all on public.movo_sync_operations to service_role;

-- now() is transaction-stable; two writes in one transaction otherwise share
-- a CAS token. This trigger sorts after the existing updated_at trigger.
create function public.movo_monotonic_sync_timestamp() returns trigger
language plpgsql set search_path='' as $$
begin
 new.updated_at := greatest(clock_timestamp(),old.updated_at + interval '1 microsecond');
 return new;
end $$;
revoke all on function public.movo_monotonic_sync_timestamp() from public,anon,authenticated;
create trigger zz_movo_sync_timestamp before update on public.financial_accounts
 for each row execute function public.movo_monotonic_sync_timestamp();
create trigger zz_movo_sync_timestamp before update on public.transactions
 for each row execute function public.movo_monotonic_sync_timestamp();

create function public.apply_movo_sync_operation(
 p_operation_id uuid, p_group text, p_kind text, p_record_id uuid,
 p_payload jsonb, p_expected_updated_at timestamptz, p_revision bigint default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid := auth.uid(); previous public.movo_sync_operations;
 account_row public.financial_accounts; tx_row public.transactions;
 request_value jsonb; result_value jsonb; current_value jsonb;
 allowed text[]; k text; row_found boolean; ack jsonb;
begin
 if uid is null then raise exception 'sign_in_required' using errcode='42501'; end if;
 if p_operation_id is null or p_record_id is null or p_group is null or p_kind is null
  or p_group not in ('financial_accounts','transactions') or p_kind not in ('create','update','delete')
  or p_revision is null or p_revision < 0 or p_revision >= 9007199254740991
  then raise exception 'invalid_sync_operation' using errcode='22023'; end if;
 if (p_kind='delete' and p_payload is not null and p_payload <> 'null'::jsonb)
  or (p_kind <> 'delete' and (p_payload is null or jsonb_typeof(p_payload)<>'object'))
  then raise exception 'invalid_sync_payload' using errcode='22023'; end if;
 if octet_length(coalesce(p_payload::text,''))>65536 then raise exception 'sync_payload_too_large'; end if;
 request_value := jsonb_build_object('group',p_group,'kind',p_kind,'recordId',p_record_id,
  'payload',p_payload,'expectedUpdatedAt',p_expected_updated_at,'revision',p_revision);
 -- Serialize duplicate operation IDs before any row mutation. A lost response
 -- returns the original durable result even after later row edits/deletion.
 perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_operation_id::text,0));
 select * into previous from public.movo_sync_operations where user_id=uid and operation_id=p_operation_id;
 if found then
  if previous.request is distinct from request_value then raise exception 'sync_operation_collision' using errcode='22023'; end if;
  return previous.acknowledgement;
 end if;
 if coalesce(public.movo_plan_status(uid)->>'tier','free') not in ('pro','pro_plus')
  then raise exception 'cloud_read_only_upgrade_required' using errcode='42501'; end if;
 if p_kind<>'create' and p_expected_updated_at is null then
  raise exception 'sync_revision_required' using errcode='22023'; end if;
 if p_kind='create' and p_expected_updated_at is not null then
  raise exception 'invalid_create_revision' using errcode='22023'; end if;
 if p_payload ? 'user_id' and p_payload->>'user_id' is distinct from uid::text then
  raise exception 'sync_owner_mismatch' using errcode='42501'; end if;
 if p_payload ? 'id' and p_payload->>'id' is distinct from p_record_id::text then
  raise exception 'sync_record_mismatch' using errcode='22023'; end if;
 if p_group='transactions' and p_kind<>'delete' then
  if p_payload ? 'amount' and ((p_payload->>'amount')::numeric <= 0
    or (p_payload->>'amount')::numeric >= 90071992547409.91
    or (p_payload->>'amount')::numeric <> round((p_payload->>'amount')::numeric,2)) then
   raise exception 'exact_positive_cents_required' using errcode='22023'; end if;
  if p_payload ? 'account_id' and not exists(select 1 from public.financial_accounts
   where id=(p_payload->>'account_id')::uuid and user_id=uid) then
   raise exception 'sync_account_owner_mismatch' using errcode='42501'; end if;
  if p_payload->>'transfer_to_account_id' is not null and not exists(select 1 from public.financial_accounts
   where id=(p_payload->>'transfer_to_account_id')::uuid and user_id=uid) then
   raise exception 'sync_destination_owner_mismatch' using errcode='42501'; end if;
  if p_payload->>'schedule_id' is not null and not exists(select 1 from public.scheduled_transactions
   where id=(p_payload->>'schedule_id')::uuid and user_id=uid) then
   raise exception 'sync_schedule_owner_mismatch' using errcode='42501'; end if;
  if p_payload->>'receipt_path' is not null and p_payload->>'receipt_path' not like uid::text || '/%' then
   raise exception 'sync_receipt_owner_mismatch' using errcode='42501'; end if;
 end if;
 if p_group='financial_accounts' and p_payload ? 'opening_balance' and
  (abs((p_payload->>'opening_balance')::numeric)>=90071992547409.91 or
   (p_payload->>'opening_balance')::numeric<>round((p_payload->>'opening_balance')::numeric,2)) then
  raise exception 'exact_cents_required' using errcode='22023'; end if;
 if p_group='financial_accounts' then
  allowed := array['name','account_type','institution_name','currency','opening_balance','is_archived','display_order','id','user_id'];
  if p_kind<>'delete' then
   for k in select jsonb_object_keys(p_payload) loop
    if not k=any(allowed) then raise exception 'unsupported_sync_field: %',k using errcode='22023'; end if;
   end loop;
  end if;
  select * into account_row from public.financial_accounts where id=p_record_id and user_id=uid for update;
  row_found := found;
  if p_kind='create' then
   if row_found then raise exception 'sync_record_exists' using errcode='40001'; end if;
   account_row := jsonb_populate_record(null::public.financial_accounts, '{"currency": "PHP", "opening_balance": 0, "is_archived": false, "display_order": 0}'::jsonb || p_payload);
   insert into public.financial_accounts(id,user_id,name,account_type,institution_name,currency,opening_balance,is_archived,display_order)
    values(p_record_id,uid,account_row.name,account_row.account_type,account_row.institution_name,account_row.currency,account_row.opening_balance,account_row.is_archived,account_row.display_order) returning * into account_row;
  else
   if not row_found or account_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'sync_revision_conflict' using errcode='40001'; end if;
   if p_kind='delete' then raise exception 'archive_account_instead' using errcode='22023'; end if;
   account_row := jsonb_populate_record(account_row,p_payload);
   update public.financial_accounts set name=account_row.name,account_type=account_row.account_type,institution_name=account_row.institution_name,currency=account_row.currency,opening_balance=account_row.opening_balance,is_archived=account_row.is_archived,display_order=account_row.display_order,updated_at=clock_timestamp()
    where id=p_record_id and user_id=uid returning * into account_row;
  end if;
  if p_kind<>'delete' then result_value := to_jsonb(account_row); end if;
 end if;
 if p_group='transactions' then
  allowed := array['account_id','transfer_to_account_id','transaction_type','amount','currency','merchant','category','note','occurred_at','source','external_reference','payment_reference','receipt_note','receipt_path','schedule_id','is_pending','id','user_id'];
  if p_kind<>'delete' then
   for k in select jsonb_object_keys(p_payload) loop
    if not k=any(allowed) then raise exception 'unsupported_sync_field: %',k using errcode='22023'; end if;
   end loop;
  end if;
  select * into tx_row from public.transactions where id=p_record_id and user_id=uid for update;
  row_found := found;
  if p_kind='create' then
   if row_found then raise exception 'sync_record_exists' using errcode='40001'; end if;
   tx_row := jsonb_populate_record(null::public.transactions, '{"currency": "PHP", "category": "Other", "source": "manual", "is_pending": false}'::jsonb || p_payload);
   insert into public.transactions(id,user_id,account_id,transfer_to_account_id,transaction_type,amount,currency,merchant,category,note,occurred_at,source,external_reference,payment_reference,receipt_note,receipt_path,schedule_id,is_pending)
    values(p_record_id,uid,tx_row.account_id,tx_row.transfer_to_account_id,tx_row.transaction_type,tx_row.amount,tx_row.currency,tx_row.merchant,tx_row.category,tx_row.note,tx_row.occurred_at,tx_row.source,tx_row.external_reference,tx_row.payment_reference,tx_row.receipt_note,tx_row.receipt_path,tx_row.schedule_id,tx_row.is_pending) returning * into tx_row;
  else
   if not row_found or tx_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'sync_revision_conflict' using errcode='40001'; end if;
   if p_kind='delete' then
    perform public.delete_transaction_with_reversals(p_record_id);
    result_value := 'null'::jsonb;
   else
    if exists(select 1 from public.bill_payments where user_id=uid and transaction_id=p_record_id and status='active')
     or exists(select 1 from public.loan_events where user_id=uid and transaction_id=p_record_id and reversed_at is null)
     or exists(select 1 from public.receivable_events where user_id=uid and transaction_id=p_record_id and reversed_at is null)
     or exists(select 1 from public.payment_attempts where user_id=uid and transaction_id=p_record_id and status='paid') then
     if (to_jsonb(tx_row) || p_payload)->'amount' is distinct from to_jsonb(tx_row)->'amount'
      or (to_jsonb(tx_row) || p_payload)->'account_id' is distinct from to_jsonb(tx_row)->'account_id'
      or (to_jsonb(tx_row) || p_payload)->'currency' is distinct from to_jsonb(tx_row)->'currency'
      or (to_jsonb(tx_row) || p_payload)->'transaction_type' is distinct from to_jsonb(tx_row)->'transaction_type'
      or (to_jsonb(tx_row) || p_payload)->'transfer_to_account_id' is distinct from to_jsonb(tx_row)->'transfer_to_account_id'
      then raise exception 'reverse_linked_payment_before_editing' using errcode='22023'; end if;
    end if;
   tx_row := jsonb_populate_record(tx_row,p_payload);
   if p_payload ?| array['source','external_reference','schedule_id'] then raise exception 'immutable_transaction_metadata' using errcode='22023'; end if;
   update public.transactions set account_id=tx_row.account_id,transfer_to_account_id=tx_row.transfer_to_account_id,transaction_type=tx_row.transaction_type,amount=tx_row.amount,currency=tx_row.currency,merchant=tx_row.merchant,category=tx_row.category,note=tx_row.note,occurred_at=tx_row.occurred_at,payment_reference=tx_row.payment_reference,receipt_note=tx_row.receipt_note,receipt_path=tx_row.receipt_path,is_pending=tx_row.is_pending,updated_at=clock_timestamp()
    where id=p_record_id and user_id=uid returning * into tx_row;
   end if;
  end if;
  if p_kind<>'delete' then result_value := to_jsonb(tx_row); end if;
 end if;
 ack := jsonb_build_object('ownerId',uid,'operationId',p_operation_id,'recordId',p_record_id,
  'revision',p_revision+1,'record',result_value);
 insert into public.movo_sync_operations(user_id,operation_id,request,acknowledgement)
  values(uid,p_operation_id,request_value,ack);
 return ack;
end $$;
revoke all on function public.apply_movo_sync_operation(uuid,text,text,uuid,jsonb,timestamptz,bigint) from public,anon;
grant execute on function public.apply_movo_sync_operation(uuid,text,text,uuid,jsonb,timestamptz,bigint) to authenticated;
commit;
