-- Owner/audit foreign keys previously used NO ACTION, blocking lawful
-- account deletion for referenced users. Preserve non-personal event history,
-- but remove Auth identifiers through the database's authenticated FK action.
-- Do not weaken RLS, allow client mutation of audit events, or delete the audit.
begin;

alter table public.movo_owner_audit_log
  alter column actor_user_id drop not null;
alter table public.movo_owner_work_items
  alter column created_by drop not null,
  alter column updated_by drop not null;

alter table public.movo_owner_audit_log
  drop constraint if exists movo_owner_audit_log_actor_user_id_fkey,
  add constraint movo_owner_audit_log_actor_user_id_fkey
    foreign key (actor_user_id) references auth.users(id) on delete set null;
alter table public.movo_owner_audit_log
  drop constraint if exists movo_owner_audit_log_target_user_id_fkey,
  add constraint movo_owner_audit_log_target_user_id_fkey
    foreign key (target_user_id) references auth.users(id) on delete set null;
alter table public.movo_owner_work_items
  drop constraint if exists movo_owner_work_items_created_by_fkey,
  add constraint movo_owner_work_items_created_by_fkey
    foreign key (created_by) references auth.users(id) on delete set null;
alter table public.movo_owner_work_items
  drop constraint if exists movo_owner_work_items_updated_by_fkey,
  add constraint movo_owner_work_items_updated_by_fkey
    foreign key (updated_by) references auth.users(id) on delete set null;

-- Foreign-key SET NULL runs an internal UPDATE. The original immutable audit
-- trigger prohibited it, so merely replacing the FK would still block account
-- deletion. Permit *only* nulling a FK whose auth.users target has already
-- been deleted in the current transaction. All other UPDATEs/DELETEs remain
-- forbidden, including a service-role attempt to anonymize a live account.
create or replace function public.movo_owner_audit_immutable()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and new.id = old.id
    and new.action = old.action
    and new.details = old.details
    and new.created_at = old.created_at
    and (
      old.actor_user_id is distinct from new.actor_user_id
      or old.target_user_id is distinct from new.target_user_id
    )
    and (
      old.actor_user_id is not distinct from new.actor_user_id
      or (
        old.actor_user_id is not null
        and new.actor_user_id is null
        and not exists (
          select 1 from auth.users u where u.id = old.actor_user_id
        )
      )
    )
    and (
      old.target_user_id is not distinct from new.target_user_id
      or (
        old.target_user_id is not null
        and new.target_user_id is null
        and not exists (
          select 1 from auth.users u where u.id = old.target_user_id
        )
      )
    )
  then
    return new;
  end if;
  raise exception 'owner_audit_immutable' using errcode = '42501';
end $$;
revoke all on function public.movo_owner_audit_immutable() from public, anon, authenticated;
commit;
