#!/usr/bin/env bash
# Run one experiment in an approved existing isolated checkout, never on production.
set -euo pipefail
if [[ ${MOVO_EXPERIMENT_ISOLATED:-} != 1 ]]; then
  exec env -i PATH="$PATH" LANG=C.UTF-8 MOVO_EXPERIMENT_ISOLATED=1 /bin/bash "$0" "$@"
fi
[[ $# == 3 ]] || { echo 'usage: run-modernization-experiment.sh nth|svg|webpack clean-checkout new-evidence-dir'; exit 2; }
MODE=$1; ROOT=$(realpath "$2"); OUT=$(realpath -m "$3"); HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
[[ "$MODE" == nth || "$MODE" == svg || "$MODE" == webpack ]]
[[ "$OUT" != "$ROOT" && "$OUT" != "$ROOT/"* && ! -e "$OUT" ]]
[[ -z $(git -C "$ROOT" status --porcelain) ]]
HEAD_EXPECTED=$(git -C "$ROOT" rev-parse HEAD)
[[ $(git -C "$ROOT" rev-parse HEAD:package-lock.json) == f927898143d02498c439139f701bc2413c2672f1 ]]
[[ $(git -C "$ROOT" rev-parse HEAD:package.json) == 085daebe465abe238547a57afc419b71ce57c13f ]]
node -e 'if(Number(process.versions.node.split(".")[0])!==26)process.exit(1)'
[[ $(npm --version) == 11.19.1 ]]
mkdir -m 700 "$OUT"
SCRATCH=$(mktemp -d); SERVER_PID=''
cleanup(){ rc=$?; if [[ -n "$SERVER_PID" ]]; then kill -- "-$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true; fi; printf '%s\n' "$rc" > "$OUT/status.txt"; rm -rf -- "$SCRATCH"; }
trap cleanup EXIT
export HOME="$SCRATCH/home" NPM_CONFIG_CACHE="$SCRATCH/cache" NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ NPM_CONFIG_IGNORE_SCRIPTS=true NPM_CONFIG_FETCH_RETRIES=1 NPM_CONFIG_FETCH_TIMEOUT=30000
mkdir -m 700 "$HOME" "$NPM_CONFIG_CACHE" "$SCRATCH/source"
export NPM_CONFIG_USERCONFIG="$HOME/user.npmrc" NPM_CONFIG_GLOBALCONFIG="$HOME/global.npmrc"
(umask 077; : > "$NPM_CONFIG_USERCONFIG"; : > "$NPM_CONFIG_GLOBALCONFIG")
printf '%s\n' "$HEAD_EXPECTED" > "$OUT/head.txt"; printf '%s\n' "$MODE" > "$OUT/mode.txt"
git -C "$ROOT" archive "$HEAD_EXPECTED" | tar -x -C "$SCRATCH/source"
cd "$SCRATCH/source"; [[ ! -e .npmrc ]]
cp package.json "$OUT/original-package.json"; cp package-lock.json "$OUT/original-lock.json"
run_audit(){ local dest=$1; shift; local rc=0; npm audit --json --package-lock-only "$@" > "$dest" || rc=$?; printf '%s\n' "$rc" > "$dest.exit"; [[ "$rc" == 0 || "$rc" == 1 ]]; }
run_audit "$OUT/original-audit.json"
node "$HERE/modernization-experiment.cjs" prepare "$MODE" package.json package-lock.json > candidate.tmp
mv candidate.tmp package.json
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
cp package.json package-lock.json "$OUT/"
node "$HERE/modernization-experiment.cjs" lock "$MODE" "$OUT/original-lock.json" package-lock.json
run_audit "$OUT/audit.json"; run_audit "$OUT/audit-production.json" --omit=dev
[[ $(cat "$OUT/audit-production.json.exit") == 0 ]]
node "$HERE/modernization-experiment.cjs" audit "$MODE" "$OUT/original-audit.json" "$OUT/audit.json" "$OUT/audit-production.json" package-lock.json
npm ci --ignore-scripts --no-audit --no-fund
if [[ "$MODE" == nth || "$MODE" == svg ]]; then
  node --test "$HERE/svg-compatibility.test.cjs" 2>&1 | tee "$OUT/compatibility.txt"
else
  # Loopback only; no proxy credentials, no browser, no production connection.
  # Choose a free ephemeral port and fail rather than retry if it is claimed.
  PORT=$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close();})')
  BROWSER=none HOST=127.0.0.1 PORT="$PORT" CI=true setsid node node_modules/react-scripts/scripts/start.js > "$OUT/dev-server.txt" 2>&1 & SERVER_PID=$!
  READY=0
  for _ in $(seq 1 60); do
    kill -0 "$SERVER_PID" 2>/dev/null || break
    if curl --noproxy '*' --max-time 2 --fail --silent "http://127.0.0.1:$PORT/" > "$OUT/loopback.html" && grep -qi '<html' "$OUT/loopback.html"; then READY=1; break; fi
    sleep 1
  done
  [[ "$READY" == 1 ]]
  kill -- "-$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true; SERVER_PID=''
fi
npm run i18n; npm run typecheck
CI=true npm test -- --runInBand 2>&1 | tee "$OUT/regression.txt"
CI=true ./node_modules/.bin/react-scripts build 2>&1 | tee "$OUT/build.txt"
node scripts/build-offline-worker.cjs
cmp package-lock.json "$OUT/package-lock.json"
[[ $(git -C "$ROOT" rev-parse HEAD) == "$HEAD_EXPECTED" && -z $(git -C "$ROOT" status --porcelain) ]]
(cd "$OUT" && sha256sum ./*.json ./*.exit ./head.txt ./mode.txt ./regression.txt ./build.txt > SHA256SUMS.txt; if [[ -f compatibility.txt ]]; then sha256sum compatibility.txt >> SHA256SUMS.txt; else sha256sum dev-server.txt loopback.html >> SHA256SUMS.txt; fi)
