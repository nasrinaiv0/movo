-- Isolated candidate only. Called after draft installation on the disposable CI database.
begin;
set local request.jwt.claims = '{"role":"service_role"}';
insert into auth.users(id,email_confirmed_at) values
('a3480000-0000-4000-8000-000000000001',now()),('a3480000-0000-4000-8000-000000000002',now());
insert into public.movo_ai_conversations(id,user_id,title) values
('b3480000-0000-4000-8000-000000000001','a3480000-0000-4000-8000-000000000001','Synthetic'),
('b3480000-0000-4000-8000-000000000002','a3480000-0000-4000-8000-000000000002','Synthetic');
set local role service_role;
insert into public.movo_ai_messages(id,conversation_id,user_id,role,content,server_generated) values
('c3480000-0000-4000-8000-000000000001','b3480000-0000-4000-8000-000000000001','a3480000-0000-4000-8000-000000000001','assistant','Fictional',true),
('c3480000-0000-4000-8000-000000000002','b3480000-0000-4000-8000-000000000002','a3480000-0000-4000-8000-000000000002','assistant','Fictional',true),
('c3480000-0000-4000-8000-000000000003','b3480000-0000-4000-8000-000000000001','a3480000-0000-4000-8000-000000000001','user','Fictional',false);
reset role;
insert into public.movo_manual_plan_grants(user_id,tier,expires_at,reason) values ('a3480000-0000-4000-8000-000000000001','pro',now()+interval '1 day','isolated report provenance');
do $$ begin
 if has_function_privilege('authenticated','public.movo_report_ai_message(uuid,uuid,text)','EXECUTE') or has_function_privilege('anon','public.movo_report_ai_message(uuid,uuid,text)','EXECUTE') or has_table_privilege('authenticated','public.movo_ai_reports','SELECT') or has_table_privilege('anon','public.movo_ai_report_rate','SELECT') then raise exception 'client report privileges'; end if;
end $$;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated"}';
set local request.jwt.claim.sub = 'a3480000-0000-4000-8000-000000000001';
do $$ begin
  begin
    insert into public.movo_ai_messages(conversation_id,user_id,role,content,server_generated)
      values('b3480000-0000-4000-8000-000000000001','a3480000-0000-4000-8000-000000000001','assistant','Forged',true);
    raise exception 'forged provenance accepted';
  exception when insufficient_privilege then null; end;
end $$;
insert into public.movo_ai_messages(id,conversation_id,user_id,role,content)
values('c3480000-0000-4000-8000-000000000004','b3480000-0000-4000-8000-000000000001','a3480000-0000-4000-8000-000000000001','assistant','Legacy');
reset role;
set local request.jwt.claims = '{"role":"service_role"}';
set local role service_role;
do $$ declare t jsonb; begin
  t:=public.movo_save_reportable_ai_turn('a3480000-0000-4000-8000-000000000001','b3480000-0000-4000-8000-000000000001','Fictional question','Fictional answer');
  if t->'messages'->1->>'server_generated' is distinct from 'true' then raise exception 'verified turn failed %',t; end if;
end $$;
do $$ declare r jsonb; r2 jsonb; begin
 r:=public.movo_report_ai_message('a3480000-0000-4000-8000-000000000001','c3480000-0000-4000-8000-000000000001','privacy');
 r2:=public.movo_report_ai_message('a3480000-0000-4000-8000-000000000001','c3480000-0000-4000-8000-000000000001','harmful');
 if r->>'ok' is distinct from 'true' or r is distinct from r2 then raise exception 'report idempotency %',r; end if;
 if public.movo_report_ai_message('a3480000-0000-4000-8000-000000000001','c3480000-0000-4000-8000-000000000002','privacy')->>'error' is distinct from 'message_unavailable' then raise exception 'cross owner report'; end if;
 if public.movo_report_ai_message('a3480000-0000-4000-8000-000000000001','c3480000-0000-4000-8000-000000000003','privacy')->>'error' is distinct from 'message_unavailable' then raise exception 'user message report'; end if;
 if public.movo_report_ai_message('a3480000-0000-4000-8000-000000000001','c3480000-0000-4000-8000-000000000004','privacy')->>'error' is distinct from 'message_unavailable' then raise exception 'legacy provenance report'; end if;
 if public.movo_ai_moderation_action('a3480000-0000-4000-8000-000000000001','inspect',(r->>'reportId')::uuid,null)->>'error' is distinct from 'report_unavailable' then raise exception 'self review allowed'; end if;
 if public.movo_ai_moderation_action('a3480000-0000-4000-8000-000000000002','inspect',(r->>'reportId')::uuid,null)->>'response' is distinct from 'Fictional' then raise exception 'moderation inspect failed'; end if;
 if public.movo_ai_moderation_action('a3480000-0000-4000-8000-000000000002','reviewed',(r->>'reportId')::uuid,'pending')->>'ok' is distinct from 'true' then raise exception 'moderation review failed'; end if;
 if public.movo_ai_moderation_action('a3480000-0000-4000-8000-000000000002','dismissed',(r->>'reportId')::uuid,'pending')->>'error' is distinct from 'report_changed' then raise exception 'stale review accepted'; end if;
end $$;
reset role;
-- Bounded retention rehearsal: an old reviewed report and its old audit events
-- can be removed; a pending report and a current rate window must survive.
update public.movo_ai_reports set reviewed_at=now()-interval '91 days' where user_id='a3480000-0000-4000-8000-000000000001';
update public.movo_ai_moderation_access set created_at=now()-interval '31 days';
set local role service_role;
do $$ declare r jsonb; begin
 r:=public.movo_report_ai_message('a3480000-0000-4000-8000-000000000002','c3480000-0000-4000-8000-000000000002','harmful');
 if r->>'ok' is distinct from 'true' then raise exception 'pending report setup'; end if;
 r:=public.movo_prune_ai_moderation(1);
 if r->>'reports' is distinct from '1' or r->>'events' is distinct from '1' or r->>'rates' is distinct from '0' then raise exception 'bounded cleanup %',r; end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.movo_ai_reports where user_id='a3480000-0000-4000-8000-000000000002' and status='pending') then raise exception 'pending report removed'; end if;
end $$;
-- Re-report after retention: rate debit persists independently of report deletion.
set local role service_role;
do $$ begin
 if public.movo_report_ai_message('a3480000-0000-4000-8000-000000000001','c3480000-0000-4000-8000-000000000001','privacy')->>'ok' is distinct from 'true' then raise exception 'new report failed'; end if;
end $$;
reset role;
delete from public.movo_ai_messages where id='c3480000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.movo_ai_reports where user_id='a3480000-0000-4000-8000-000000000001') or (select hits from public.movo_ai_report_rate where user_id='a3480000-0000-4000-8000-000000000001') is distinct from 2 then raise exception 'message deletion/rate durability'; end if;
end $$;
delete from auth.users where id='a3480000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.movo_ai_report_rate where user_id='a3480000-0000-4000-8000-000000000001') or not exists(select 1 from public.movo_ai_messages where id='c3480000-0000-4000-8000-000000000002') then raise exception 'account cascade/owner isolation'; end if;
end $$;
rollback;
