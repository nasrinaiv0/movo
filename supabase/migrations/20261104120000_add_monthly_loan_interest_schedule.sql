-- Store per-month variable interest rates without changing existing loan records.
alter table public.financial_loans
  add column if not exists interest_schedule jsonb not null default '[]'::jsonb;

comment on column public.financial_loans.interest_schedule is
  'Optional ordered monthly interest schedule. Each entry is {"month": integer, "rate": numeric percentage for that month}.';
