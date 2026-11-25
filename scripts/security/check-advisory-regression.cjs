'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const baseline = require('./advisory-baseline.json');
const severity = ['info', 'low', 'moderate', 'high', 'critical'];
const forbidden = new Set(['GHSA-7fh5-64p2-3v2j','GHSA-qx2v-qp2m-jg93','GHSA-6g55-p6wh-862q','GHSA-fxqj-rqcc-2cmp','GHSA-r28c-9q8g-f849']);
function verify(report, lock) {
  assert(report && report.auditReportVersion === 2 && !report.error, 'invalid registry audit');
  assert(report.vulnerabilities && typeof report.vulnerabilities === 'object' && !Array.isArray(report.vulnerabilities), 'missing vulnerabilities');
  const counts = report.metadata?.vulnerabilities;
  assert(counts && severity.every(s => Number.isSafeInteger(counts[s]) && counts[s] >= 0), 'missing severity totals');
  assert(lock && lock.lockfileVersion === 3 && lock.packages?.[''], 'invalid lockfile');
  const actual = Object.fromEntries(severity.map(s => [s,0]));
  for (const [name, entry] of Object.entries(report.vulnerabilities)) {
    assert(Object.hasOwn(baseline,name), `new affected dependency: ${name}`);
    assert(entry && entry.name === name && severity.includes(entry.severity) && Array.isArray(entry.via) && entry.via.length, `malformed advisory: ${name}`);
    const prior = baseline[name];
    assert(severity.indexOf(entry.severity) <= severity.indexOf(prior.severity), `severity increased: ${name}`);
    assert(Array.isArray(entry.nodes) && entry.nodes.length && new Set(entry.nodes).size === entry.nodes.length, `invalid affected paths: ${name}`);
    for (const node of entry.nodes) {
      assert(typeof node === 'string' && prior.nodes.includes(node), `new affected path: ${name}/${node}`);
      assert(Object.hasOwn(lock.packages,node) && lock.packages[node].dev === true, `affected path is missing or not dev-only: ${node}`);
    }
    actual[entry.severity]++;
    for (const via of entry.via) {
      if (typeof via === 'string') {
        assert(prior.via.includes(via) && Object.hasOwn(report.vulnerabilities,via), `new or missing advisory dependency: ${name}/${via}`);
      } else {
        assert(via && typeof via.url === 'string', `unidentified advisory: ${name}`);
        const id = /^https:\/\/github\.com\/advisories\/(GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})$/i.exec(via.url)?.[1];
        assert(id && !forbidden.has(id) && prior.advisories.includes(id), `new or regressed advisory: ${name}/${via.url}`);
        assert(severity.includes(via.severity) && severity.indexOf(via.severity) <= severity.indexOf(prior.advisorySeverity[id]), `advisory severity increased: ${id}`);
      }
    }
  }
  for (const s of severity) assert.equal(counts[s],actual[s], `inconsistent ${s} count`);
  assert.equal(counts.total,Object.keys(report.vulnerabilities).length,'inconsistent audit total');
  for (const [name,version] of [['resolve-url-loader','5.0.0'],['postcss','8.5.32']]) {
    const entries=Object.entries(lock.packages).filter(([key])=>key.endsWith('/node_modules/'+name)||key==='node_modules/'+name);
    assert(entries.length,`missing ${name}`);
    for (const [key,entry] of entries) assert(entry.dev===true && entry.version===version,`unexpected ${key} version or production exposure`);
  }
  return counts;
}
if (require.main === module) {
  const [audit,lock] = process.argv.slice(2);
  assert(audit && lock, 'usage: check-advisory-regression.cjs audit.json package-lock.json');
  console.log(JSON.stringify(verify(JSON.parse(fs.readFileSync(audit,'utf8')),JSON.parse(fs.readFileSync(lock,'utf8')))));
}
module.exports={verify};
