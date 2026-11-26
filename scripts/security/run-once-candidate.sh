#!/usr/bin/env bash
# Local experiment only; no push, workflow dispatch, deployment or remote data.
set -euo pipefail
# Re-execute under an allowlisted environment, not a best-effort secret-name filter.
if [[ ${MOVO_ISOLATED_ENV:-} != 1 ]]; then
  exec env -i PATH="$PATH" LANG=C.UTF-8 MOVO_ISOLATED_ENV=1 /bin/bash "$0" "$@"
fi
# Shared configuration setup for both actual execution and a local preflight.
configure_npm() {
  local base=$1
  export HOME="$base/home" NPM_CONFIG_CACHE="$base/npm-cache"
  mkdir -m 700 "$HOME" "$NPM_CONFIG_CACHE"
  export NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ NPM_CONFIG_IGNORE_SCRIPTS=true
  # npm rejects loading the same path for both configuration scopes.
  export NPM_CONFIG_USERCONFIG="$HOME/user.npmrc" NPM_CONFIG_GLOBALCONFIG="$HOME/global.npmrc"
  (umask 077; : > "$NPM_CONFIG_USERCONFIG"; : > "$NPM_CONFIG_GLOBALCONFIG")
}
if [[ $# == 1 && $1 == --check-npm-config ]]; then
  CHECK=$(mktemp -d)
  trap 'rm -rf -- "$CHECK"' EXIT
  configure_npm "$CHECK"
  [[ $(npm config get registry) == https://registry.npmjs.org/ ]]
  [[ $(npm config get userconfig) == "$NPM_CONFIG_USERCONFIG" ]]
  [[ $(npm config get globalconfig) == "$NPM_CONFIG_GLOBALCONFIG" ]]
  [[ $(npm config get ignore-scripts) == true ]]
  [[ "$NPM_CONFIG_USERCONFIG" != "$NPM_CONFIG_GLOBALCONFIG" ]]
  printf '%s\n' 'Isolated npm configuration checks passed.'
  exit 0
fi
if [[ $# != 2 ]]; then echo 'Usage: run-once-candidate.sh <authorized-local-git-checkout> <new-evidence-directory>' >&2; exit 2; fi
ROOT=$(realpath "$1")
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
OUT=$(realpath -m "$2")
HEAD_EXPECTED=94d744e6acf9fef0be436c1b30e2ad084f0b34b7
[[ $(git -C "$ROOT" rev-parse HEAD) == "$HEAD_EXPECTED" ]]
[[ -z $(git -C "$ROOT" status --porcelain) ]]
[[ "$OUT" != "$ROOT" && "$OUT" != "$ROOT/"* && ! -e "$OUT" ]]
# Use only a disposable, approved environment; package scripts stay disabled.
mkdir -m 700 "$OUT"
SCRATCH=$(mktemp -d)
trap 'rc=$?; printf "%s\n" "$rc" > "$OUT/status.txt"; rm -rf -- "$SCRATCH"; exit "$rc"' EXIT
configure_npm "$SCRATCH"
node -e 'if(Number(process.versions.node.split(".")[0])!==26)process.exit(1)'
[[ $(npm --version) == 11.19.1 ]]
WORK="$SCRATCH/source"
mkdir -m 700 "$WORK"
printf 'incomplete\n' > "$OUT/status.txt"
printf '%s\n' "$HEAD_EXPECTED" > "$OUT/head.txt"
git -C "$ROOT" archive "$HEAD_EXPECTED" | tar -x -C "$WORK"
# Avoid local project npm configuration injecting alternative registries.
[[ ! -e "$WORK/.npmrc" ]] || { echo 'Review project .npmrc before running'; exit 1; }
cp "$WORK/package-lock.json" "$OUT/original-lock.json"
cp "$WORK/package.json" "$OUT/original-package.json"
cd "$WORK"
# Audit baseline from real registry; only npm's standard vulnerable exit=1 is accepted.
run_audit(){ local dest=$1; shift; local rc=0; npm audit --json --package-lock-only "$@" > "$dest" || rc=$?; [[ "$rc" == 0 || "$rc" == 1 ]]; printf '%s\n' "$rc" > "$dest.exit"; }
run_audit "$OUT/original-audit.json"
node "$HERE/once-candidate.cjs" prepare package.json package-lock.json > "$WORK/package.candidate.tmp"
mv "$WORK/package.candidate.tmp" package.json
npm install --package-lock-only --ignore-scripts --no-audit --no-fund --fetch-retries=1 --fetch-timeout=30000
cp package.json package-lock.json "$OUT/"
node "$HERE/once-candidate.cjs" lock "$OUT/original-lock.json" package-lock.json
run_audit "$OUT/audit.json"
run_audit "$OUT/audit-production.json" --omit=dev
[[ $(cat "$OUT/audit-production.json.exit") == 0 ]]
node "$HERE/once-candidate.cjs" audit "$OUT/original-audit.json" "$OUT/audit.json" "$OUT/audit-production.json" package-lock.json
npm ci --ignore-scripts --no-audit --no-fund
node --test "$HERE/proxy-compatibility.test.cjs" 2>&1 | tee "$OUT/proxy-tests.txt"
npm run i18n
npm run typecheck
CI=true npm test -- --runInBand 2>&1 | tee "$OUT/regression.txt"
CI=true ./node_modules/.bin/react-scripts build 2>&1 | tee "$OUT/build.txt"
node scripts/build-offline-worker.cjs
cmp package-lock.json "$OUT/package-lock.json"
[[ $(git -C "$ROOT" rev-parse HEAD) == "$HEAD_EXPECTED" && -z $(git -C "$ROOT" status --porcelain) ]]
(cd "$OUT" && sha256sum ./*.json ./head.txt ./proxy-tests.txt ./regression.txt ./build.txt ./*.exit > SHA256SUMS.txt)
