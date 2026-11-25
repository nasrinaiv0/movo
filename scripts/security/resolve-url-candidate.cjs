'use strict';
// Diagnostic only: prepare and verify a scratch lockfile, never alter the checked-out app.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const LOADER = '5.0.0';
const POSTCSS = '8.5.32';
const TARGETS = new Set(['GHSA-7fh5-64p2-3v2j','GHSA-qx2v-qp2m-jg93','GHSA-6g55-p6wh-862q','GHSA-fxqj-rqcc-2cmp','GHSA-r28c-9q8g-f849']);
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
function propose(pkg) {
  assert.equal(pkg.devDependencies?.['react-scripts'], '5.0.1', 'candidate assumes CRA 5.0.1');
  assert(!Object.hasOwn(pkg.overrides || {}, 'resolve-url-loader'), 'refuse to overwrite existing override');
  return {...pkg, overrides: {...pkg.overrides, 'resolve-url-loader': {'.': LOADER, postcss: POSTCSS}}};
}
function production(lock) {
  assert.equal(lock.lockfileVersion, 3);
  assert(lock.packages?.[''], 'missing root lock package');
  return canonical({dependencies: lock.packages[''].dependencies || {}, optionalDependencies: lock.packages[''].optionalDependencies || {}, packages: Object.fromEntries(Object.entries(lock.packages).filter(([name, p]) => name && !p.dev))});
}
function verifyLock(before, after) {
  assert.deepEqual(production(after), production(before), 'production lock entries changed');
  const matching = name => Object.entries(after.packages).filter(([key]) => key.endsWith('/node_modules/' + name) || key === 'node_modules/' + name);
  for (const [name, version] of [['resolve-url-loader', LOADER], ['postcss', POSTCSS]]) {
    const entries = matching(name);
    assert(entries.length, 'missing ' + name);
    for (const [key, pkg] of entries) assert(pkg.dev && pkg.version === version, `unexpected ${key} version or production exposure`);
  }
}
function advisoryIds(report) {
  assert(!report.error && report.metadata?.vulnerabilities && report.vulnerabilities, 'invalid npm audit response');
  return new Set(Object.values(report.vulnerabilities).flatMap(entry => entry.via || []).filter(v => v && typeof v === 'object').map(v => (v.url || '').match(/GHSA-[a-z0-9-]+/i)?.[0]).filter(Boolean));
}
function verifyAudit(before, after, prod) {
  const original = advisoryIds(before);
  const candidate = advisoryIds(after);
  advisoryIds(prod);
  for (const id of TARGETS) assert(original.has(id) && !candidate.has(id), 'target not verified removed: ' + id);
  for (const id of candidate) assert(original.has(id), 'new advisory: ' + id);
  assert(!after.vulnerabilities.postcss && !after.vulnerabilities['resolve-url-loader'], 'loader chain still flagged');
  assert.equal(prod.metadata.vulnerabilities.total, 0, 'production audit not clean');
}
if (require.main === module) {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === 'prepare') {
    const root = fs.realpathSync(args[0]);
    assert.notEqual(root, fs.realpathSync(process.cwd()), 'prepare must target a separate scratch checkout');
    const dest = path.join(root, 'package.json');
    fs.writeFileSync(dest, JSON.stringify(propose(json(dest)), null, 2) + '\n');
  } else if (mode === 'verify-lock') verifyLock(json(args[0]), json(args[1]));
  else if (mode === 'verify-audit') verifyAudit(json(args[0]), json(args[1]), json(args[2]));
  else throw Error('Unknown candidate operation');
}
module.exports = {propose, verifyLock, verifyAudit, TARGETS};
