-- Execute only after base plan fixture and manual grant migration.
select set_config('request.jwt.claim.role','service_role',false);
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason)
values('00000000-0000-0000-0000-000000000003','pro',now()+interval '30 days','Owner complimentary access');
do $$ begin
 if public.movo_plan_status('00000000-0000-0000-0000-000000000003')->>'tier' <> 'pro'
    or public.movo_plan_status('00000000-0000-0000-0000-000000000003')->>'source' <> 'manual'
    then raise exception 'Owner Pro grant not recognized'; end if;
end $$;
-- Users cannot forge their own grant even if their session is valid.
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
set role authenticated;
do $$ begin
  begin
    insert into public.movo_manual_plan_grants(user_id,tier,expires_at)
    values(auth.uid(),'pro_plus',now()+interval '2 years');
    raise exception 'Client forged a manual grant';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.movo_manual_plan_grants set tier='pro_plus';
    raise exception 'Client modified manual grant';
  exception when insufficient_privilege then null;
  end;
  if public.movo_plan_status()->>'tier' <> 'pro' then raise exception 'Owner Pro grant inaccessible'; end if;
  begin
    insert into public.scheduled_transactions(user_id) values(auth.uid());
    raise exception 'Pro bypassed Pro+ restriction';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.role','service_role',false);
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason)
values('00000000-0000-0000-0000-000000000003','pro_plus',now()+interval '3 days','Temporary automation access');
do $$ begin
 if public.movo_plan_status('00000000-0000-0000-0000-000000000003')->>'tier' <> 'pro_plus' then
 raise exception 'Pro+ manual grant not recognized'; end if;
end $$;
update public.movo_manual_plan_grants set revoked_at=now()
where user_id='00000000-0000-0000-0000-000000000003' and tier='pro_plus';
do $$ begin
 if public.movo_plan_status('00000000-0000-0000-0000-000000000003')->>'tier' <> 'pro'
 then raise exception 'Revoked Pro+ grant still active'; end if;
end $$;
update public.movo_manual_plan_grants set expires_at=now()-interval '1 second'
where user_id='00000000-0000-0000-0000-000000000003' and tier='pro';
do $$ begin
 if public.movo_plan_status('00000000-0000-0000-0000-000000000003')->>'tier' <> 'free'
 then raise exception 'Expired manual grant still active'; end if;
end $$;
select 'PASS: manual Pro and Pro+, privileges, revocation, expiry';
