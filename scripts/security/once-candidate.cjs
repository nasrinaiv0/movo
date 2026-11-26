'use strict';
// Prepare in a disposable exact-head checkout; never writes the baseline lock.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {verify} = require('./check-advisory-regression.cjs');
const TARGET = 'GHSA-vpq2-c234-7xj6';
const read = f => JSON.parse(fs.readFileSync(f,'utf8'));
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v==='object' ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])) : v;
const isOnce = p => p==='node_modules/@tootallnate/once' || p.endsWith('/node_modules/@tootallnate/once');
function prepare(pkg, lock) {
  assert.equal(pkg.devDependencies?.['react-scripts'],'5.0.1');
  assert.equal(lock.packages?.['node_modules/http-proxy-agent']?.version,'4.0.1');
  assert.equal(lock.packages?.['node_modules/http-proxy-agent']?.dev,true);
  assert.equal(lock.packages?.['node_modules/@tootallnate/once']?.version,'1.1.2');
  assert.equal(lock.packages?.['node_modules/@tootallnate/once']?.dev,true);
  assert(!Object.keys(pkg.overrides||{}).some(k=>k==='http-proxy-agent'||k.startsWith('http-proxy-agent@')),'existing parent override requires review');
  assert(!Object.hasOwn(pkg.overrides||{},'@tootallnate/once'),'existing global override requires review');
  return {...pkg,overrides:{...pkg.overrides,'http-proxy-agent@4.0.1':{'@tootallnate/once':'2.0.1'}}};
}
function checkLock(before,after) {
  assert.equal(before.lockfileVersion,3);assert.equal(after.lockfileVersion,3);
  assert.deepEqual(canonical(before.packages['']),canonical(after.packages['']),'root lock changed');
  const paths = new Set([...Object.keys(before.packages),...Object.keys(after.packages)]);
  let changes=0, fixed=0;
  for (const p of paths) {
    const a=before.packages[p], b=after.packages[p];
    if (isOnce(p) && b) {
      assert(b.dev===true && b.version==='2.0.1', 'unexpected once version or exposure: '+p);
      assert.equal(b.resolved,'https://registry.npmjs.org/@tootallnate/once/-/once-2.0.1.tgz');
      assert(/^sha512-[A-Za-z0-9+/]{86}==$/.test(b.integrity||''),'missing candidate sha512 integrity');
      fixed++;
    }
    if (JSON.stringify(canonical(a))===JSON.stringify(canonical(b))) continue;
    changes++;
    assert(isOnce(p),'unrelated lock change: '+p);
    assert(!a || a.dev===true,'production dependency changed: '+p);
    assert(!b || b.dev===true,'production dependency introduced: '+p);
  }
  assert(changes>0 && fixed>0,'candidate not resolved');
  return {changes,fixed};
}
const ids = a => new Set(Object.values(a.vulnerabilities).flatMap(v=>v.via||[]).filter(v=>typeof v==='object').map(v=>v.url?.split('/').at(-1)));
function checkAudit(original,candidate,production,lock) {
  assert(ids(original).has(TARGET),'target absent from original audit');
  verify(candidate,lock);
  assert(!ids(candidate).has(TARGET) && !candidate.vulnerabilities['@tootallnate/once'],'target still vulnerable');
  const old=ids(original);for(const id of ids(candidate))assert(old.has(id),'new advisory: '+id);
  assert(production.auditReportVersion===2 && !production.error && production.vulnerabilities && Object.keys(production.vulnerabilities).length===0,'invalid or nonzero production audit');
  assert.equal(production.metadata?.vulnerabilities?.total,0);
  for(const s of ['info','low','moderate','high','critical'])assert.equal(production.metadata.vulnerabilities[s],0);
}
if(require.main===module) {
  const [mode,...args]=process.argv.slice(2);
  if(mode==='prepare')process.stdout.write(JSON.stringify(prepare(read(args[0]),read(args[1])),null,2)+'\n');
  else if(mode==='lock')console.log(checkLock(read(args[0]),read(args[1])));
  else if(mode==='audit')checkAudit(...args.map(read));
  else throw Error('unknown mode');
}
module.exports={prepare,checkLock,checkAudit};
