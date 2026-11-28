#!/usr/bin/env bash
set -euo pipefail
[[ "${GITHUB_ACTIONS:-}" = true && -n "${MOVO_TEST_PG_CONTAINER:-}" && "${MOVO_TEST_PGHOST:-}" = 127.0.0.1 ]] || { echo "Requires existing disposable CI PG service"; exit 1; }
root="$(cd "$(dirname "$0")/.." && pwd)"
out="${RUNNER_TEMP:?}/movo-ai-migration"
mkdir -p "$out/bin" "$out/home" "$out/work"
archive="$out/supabase.tar.gz"
curl --fail --silent --show-error --location --retry 2 --max-time 90 \
  https://github.com/supabase/cli/releases/download/v2.122.1/supabase_2.122.1_linux_amd64.tar.gz -o "$archive"
printf '%s  %s\n' '3e54b98e5ead7be0a3b0753526833d4cc9a55304e4d57da0d72f1efc342738ea' "$archive" | sha256sum -c -
tar -xzf "$archive" -C "$out/bin" supabase
(
  cd "$out/work"
  # Clear all inherited tokens, project configuration, and PG credentials.
  run_cli(){ env -i HOME="$out/home" PATH="$PATH" CI=true "$out/bin/supabase" "$@"; }
  run_cli --version
  run_cli init --help
  run_cli init
  run_cli migration new --help
  run_cli migration new movo_ai_reporting_moderation_candidate
)
mapfile -t generated < <(find "$out/work/supabase/migrations" -maxdepth 1 -type f -name '*_movo_ai_reporting_moderation_candidate.sql')
[[ "${#generated[@]}" = 1 ]]
candidate="${generated[0]}"
# Identical accepted candidate bytes inside an explicit atomic DDL transaction.
{ printf 'begin;\n'; cat "$root/docs/store-compliance/AI_REPORT_DATABASE_DRAFT.sql"; printf '\ncommit;\n'; } > "$candidate"
mkdir -p "$out/evidence"
cp "$candidate" "$out/evidence/"
(
  cd "$out/evidence"
  sha256sum -- *.sql > SHA256SUMS
  printf 'head=%s\ncli=2.122.1\nstatus=isolated_candidate_only\n' "$(git -C "$root" rev-parse HEAD)" > provenance.txt
)
printf 'MOVO_AI_REPORT_MIGRATION_CANDIDATE=%s\n' "$candidate" >> "${GITHUB_ENV:?}"
