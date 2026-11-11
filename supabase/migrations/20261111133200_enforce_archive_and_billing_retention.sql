begin;

create function public.movo_prune_archive(p_entries jsonb, p_cutoff timestamptz)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(entry order by ordinal), '[]'::jsonb)
  from jsonb_array_elements(
    case when jsonb_typeof(p_entries) = 'array' then p_entries else '[]'::jsonb end
  ) with ordinality as entries(entry, ordinal)
  where case
    when pg_input_is_valid(entry->>'archivedAt', 'timestamp with time zone')
      then (entry->>'archivedAt')::timestamptz > p_cutoff
    else false
  end
$$;
revoke all on function public.movo_prune_archive(jsonb, timestamptz) from public, anon, authenticated;

-- An offline client can carry stale preferences back into a newly cleaned
-- account. Apply the same expiry to incoming snapshots before storing them.
create function public.movo_expire_incoming_archive()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(new.prefs) = 'object' and new.prefs ? 'archive' then
    new.prefs := jsonb_set(new.prefs, '{archive}', public.movo_prune_archive(new.prefs->'archive', now() - interval '2160 hours'));
  end if;
  return new;
end
$$;
revoke all on function public.movo_expire_incoming_archive() from public, anon, authenticated;
create trigger movo_expire_incoming_archive
  before insert or update of prefs on public.user_preferences
  for each row execute function public.movo_expire_incoming_archive();

-- Completed jobs have no further acknowledgement retries; never expire pending jobs by creation age.
create index movo_iap_ack_completed_at_idx on public.movo_iap_ack_jobs(completed_at)
  where completed_at is not null;

create function public.movo_run_data_retention()
returns void language plpgsql security definer set search_path = '' as $$
declare
  archive_cutoff timestamptz := now() - interval '2160 hours';
begin
  update public.user_preferences
  set prefs = jsonb_set(prefs, '{archive}', public.movo_prune_archive(prefs->'archive', archive_cutoff)),
      updated_at = clock_timestamp()
  where jsonb_typeof(prefs) = 'object' and prefs ? 'archive'
    and (prefs->'archive') is distinct from public.movo_prune_archive(prefs->'archive', archive_cutoff);

  delete from public.movo_automation_inbox
  where status = 'dismissed' and resolved_at <= archive_cutoff;

  delete from public.movo_iap_ack_jobs
  where completed_at is not null and completed_at <= now() - interval '168 hours';
end
$$;
revoke all on function public.movo_run_data_retention() from public, anon, authenticated;
grant execute on function public.movo_run_data_retention() to service_role;

commit;
