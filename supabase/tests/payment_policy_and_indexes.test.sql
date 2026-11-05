-- Run after 20261105110000_harden_scheduled_and_payment_policies_indexes.sql.
begin;
do $$
declare n integer; r record;
begin
  -- All four policies still enforce the same owner condition, evaluated as an initplan.
  select count(*) into n from pg_policies
  where schemaname='public' and roles='{authenticated}'
    and (
      (tablename='scheduled_transactions' and policyname='Users manage their scheduled transactions'
        and qual='(user_id = ( SELECT auth.uid() AS uid))' and with_check=qual)
      or (tablename='payment_reminder_preferences' and policyname='Users manage their payment reminder preferences'
        and qual='(user_id = ( SELECT auth.uid() AS uid))' and with_check=qual)
      or (tablename='payment_reminder_events' and policyname='Users manage their payment reminder events'
        and qual='(user_id = ( SELECT auth.uid() AS uid))' and with_check=qual)
      or (tablename='payment_attempts' and policyname='Users manage their payment attempts'
        and qual='(user_id = ( SELECT auth.uid() AS uid))' and with_check=qual)
    );
  if n <> 4 then raise exception 'expected 4 hardened owner policies, found %', n; end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='payment_reminder_events'
    and policyname='Users read their payment reminder events') then
    raise exception 'redundant payment reminder SELECT policy still exists';
  end if;

  -- Each advisor-reported foreign key now has a covering index in its declared column order.
  for r in select * from (values
    ('payment_attempts','payment_attempts_account_id_idx'),
    ('payment_attempts','payment_attempts_account_owner_idx'),
    ('scheduled_transactions','scheduled_transactions_account_id_idx'),
    ('scheduled_transactions','scheduled_transactions_destination_account_owner_idx'),
    ('scheduled_transactions','scheduled_transactions_last_transaction_id_idx'),
    ('scheduled_transactions','scheduled_transactions_source_account_owner_idx'),
    ('scheduled_transactions','scheduled_transactions_transfer_to_account_id_idx'),
    ('transactions','transactions_schedule_id_idx')
  ) as expected(tbl, idx)
  loop
    if not exists (select 1 from pg_indexes where schemaname='public' and tablename=r.tbl and indexname=r.idx) then
      raise exception 'missing expected index %.%', r.tbl, r.idx;
    end if;
  end loop;
end $$;
rollback;
