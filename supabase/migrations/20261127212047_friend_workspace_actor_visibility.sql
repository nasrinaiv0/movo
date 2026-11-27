begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- The service-only workspace RPC verifies the current Auth anonymity flag.
-- Existing hosted grants cover identity/verification timestamps, not this flag.
-- Keep the grant column-scoped and server-only; never grant client Auth reads.
grant select (is_anonymous) on auth.users to service_role;

commit;
