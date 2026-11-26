'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {prepare,checkLock,checkAudit}=require('./once-candidate.cjs');
const fs=require('node:fs');
const [pkgPath,lockPath,auditPath]=process.argv.slice(2); // optional CLI args not needed in CI
const base={lockfileVersion:3,packages:{'':{dependencies:{react:'18'}},'node_modules/react':{version:'18.3.1'},'node_modules/http-proxy-agent':{version:'4.0.1',dev:true},'node_modules/@tootallnate/once':{version:'1.1.2',dev:true},'node_modules/resolve-url-loader':{version:'5.0.0',dev:true},'node_modules/postcss':{version:'8.5.32',dev:true}}};
const cand=structuredClone(base);cand.packages['node_modules/@tootallnate/once']={version:'2.0.1',dev:true,resolved:'https://registry.npmjs.org/@tootallnate/once/-/once-2.0.1.tgz',integrity:'sha512-'+Buffer.alloc(64).toString('base64')}; // synthetic fixture only, never applied to lock
const pkg={devDependencies:{'react-scripts':'5.0.1'},overrides:{underscore:'1.13.8'}};
const target={name:'@tootallnate/once',severity:'low',nodes:['node_modules/@tootallnate/once'],via:[{url:'https://github.com/advisories/GHSA-vpq2-c234-7xj6',severity:'low'}]};
const report=(v={})=>{const c={info:0,low:0,moderate:0,high:0,critical:0,total:Object.keys(v).length};for(const x of Object.values(v))c[x.severity]++;return {auditReportVersion:2,vulnerabilities:v,metadata:{vulnerabilities:c}}};
const original=report({'@tootallnate/once':target}),clean=report();
test('only scoped parent override; preserve existing overrides and input',()=>{const p=prepare(pkg,base);assert.equal(p.overrides['http-proxy-agent@4.0.1']['@tootallnate/once'],'2.0.1');assert.equal(p.overrides.underscore,'1.13.8');assert(!pkg.overrides['http-proxy-agent@4.0.1']);});
test('refuse baseline mismatch, production exposure and override collisions',()=>{assert.throws(()=>prepare({...pkg,devDependencies:{'react-scripts':'6'}},base));const b=structuredClone(base);delete b.packages['node_modules/@tootallnate/once'].dev;assert.throws(()=>prepare(pkg,b));assert.throws(()=>prepare({...pkg,overrides:{'http-proxy-agent':'5'}},base));});
test('accept only exact isolated replacement',()=>assert.deepEqual(checkLock(base,cand),{changes:1,fixed:1}));
test('reject unrelated production and development drift',()=>{for(const p of ['node_modules/react','node_modules/postcss']){const c=structuredClone(cand);c.packages[p].version='0.0.1';assert.throws(()=>checkLock(base,c));}});
test('reject incorrect registry, integrity or vulnerable version',()=>{for(const bad of [{resolved:'https://other.example/a.tgz'},{integrity:'bogus'},{version:'1.1.2'},{dev:false}]){const c=structuredClone(cand);Object.assign(c.packages['node_modules/@tootallnate/once'],bad);assert.throws(()=>checkLock(base,c));}});
test('reject unrelated or additional new package',()=>{const c=structuredClone(cand);c.packages['node_modules/unknown']={version:'1.0.0',dev:true};assert.throws(()=>checkLock(base,c));});
test('accept removed advisory, reject lingering target or invalid production audit',()=>{checkAudit(original,clean,clean,cand);assert.throws(()=>checkAudit(original,original,clean,cand));assert.throws(()=>checkAudit(original,clean,{...clean,error:{}},cand));});
test('reject missing target in baseline and newly affected entry',()=>{assert.throws(()=>checkAudit(clean,clean,clean,cand));assert.throws(()=>checkAudit(original,report({bad:{name:'bad',severity:'low'}}),clean,cand));});
