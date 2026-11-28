-- Isolated candidate only. Called after draft installation on the disposable CI database.
begin;
insert into auth.users(id,email_confirmed_at) values
('a3480000-0000-4000-8000-000000000001',now()),('a3480000-0000-4000-8000-000000000002',now());
insert into public.movo_ai_conversations(id,user_id,title) values
('b3480000-0000-4000-8000-000000000001','a3480000-0000-4000-8000-000000000001','Synthetic'),
('b3480000-0000-4000-8000-000000000002','a3480000-0000-4000-8000-000000000002','Synthetic');
insert into public.movo_ai_messages(id,conversation_id,user_id,role,content) values
('c3480000-0000-4000-8000-000000000001','b3480000-0000-4000-8000-000000000001','a3480000-0000-4000-8000-000000000001','assistant','Fictional'),
('c3480000-0000-4000-8000-000000000002','b3480000-0000-4000-8000-000000000002','a3480000-0000-4000-8000-000000000002','assistant','Fictional'),
('c3480000-0000-4000-8000-000000000003','b3480000-0000-4000-8000-000000000001','a3480000-0000-4000-8000-000000000001','user','Fictional');
do $$ begin
 if has_function_privilege('authenticated','public.movo_report_ai_message(uuid,uuid,text)','EXECUTE') or has_function_privilege('anon','public.movo_report_ai_message(uuid,uuid,text)','EXECUTE') or has_table_privilege('authenticated','public.movo_ai_reports','SELECT') or has_table_privilege('anon','public.movo_ai_report_rate','SELECT') then raise exception 'client report privileges'; end if;
end $$;
set local role service_role;
do $$ declare r jsonb; r2 jsonb; begin
 r:=public.movo_report_ai_message('a3480000-0000-4000-8000-000000000001','c3480000-0000-4000-8000-000000000001','privacy');
 r2:=public.movo_report_ai_message('a3480000-0000-4000-8000-000000000001','c3480000-0000-4000-8000-000000000001','harmful');
 if r->>'ok' is distinct from 'true' or r is distinct from r2 then raise exception 'report idempotency %',r; end if;
 if public.movo_report_ai_message('a3480000-0000-4000-8000-000000000001','c3480000-0000-4000-8000-000000000002','privacy')->>'error' is distinct from 'message_unavailable' then raise exception 'cross owner report'; end if;
 if public.movo_report_ai_message('a3480000-0000-4000-8000-000000000001','c3480000-0000-4000-8000-000000000003','privacy')->>'error' is distinct from 'message_unavailable' then raise exception 'user message report'; end if;
end $$;
reset role;
delete from public.movo_ai_messages where id='c3480000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.movo_ai_reports where user_id='a3480000-0000-4000-8000-000000000001') or (select hits from public.movo_ai_report_rate where user_id='a3480000-0000-4000-8000-000000000001') is distinct from 1 then raise exception 'message deletion/rate durability'; end if;
end $$;
delete from auth.users where id='a3480000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from public.movo_ai_report_rate where user_id='a3480000-0000-4000-8000-000000000001') or not exists(select 1 from public.movo_ai_messages where id='c3480000-0000-4000-8000-000000000002') then raise exception 'account cascade/owner isolation'; end if;
end $$;
rollback;
