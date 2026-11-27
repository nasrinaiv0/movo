begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Hosted public-schema defaults grant ALL to service_role on new tables.
-- Server reads remain supported; writes must use the existing owner/token
-- checked SECURITY DEFINER RPCs, including automation and atomic imports.
-- No client grants, table data, accounting functions or defaults are changed.
revoke all on public.transactions from service_role;
grant select on public.transactions to service_role;

commit;
