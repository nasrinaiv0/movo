# MOVO TypeScript Migration

## Goals
- Make finance domain objects and UI contracts explicit.
- Enable strict type checking for TypeScript files.
- Keep the app deployable while existing JavaScript is migrated incrementally.
- Avoid an all-at-once rewrite of the current frontend.

## Current foundation
- `tsconfig.json` enables strict TypeScript checking while allowing existing JavaScript to coexist.
- `src/types/finance.ts` defines shared account, transaction, input, currency, and summary types.
- TypeScript must be a CI gate before the migration is considered complete.

## Migration order
1. Domain types and database schema types.
2. Supabase client and repository contracts.
3. Shared UI primitives and icon component.
4. Forms, validation, navigation, and settings.
5. Main dashboard and remaining screens.
6. Remove JavaScript allowance only after all application code has migrated.

## Security rules
- Never put Supabase service-role or secret keys in frontend code.
- Use only the publishable/anon key in browser clients.
- Database Row Level Security remains the authorization boundary; TypeScript types do not provide authorization.
- Validate untrusted form and API data at runtime. Types alone do not validate network responses.
- Never treat sample/local records as verified cloud records.
- Keep financial mutations explicit and handle errors without leaking secrets or internal provider details.

## Completion gates
- `tsc --noEmit` passes.
- Unit tests pass.
- Production build passes.
- Review account ownership and RLS isolation separately.
- Verify Vercel deployment reaches Ready before calling the migration release complete.
