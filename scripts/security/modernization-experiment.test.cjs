'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {prepare,checkLock,audit,plans}=require('./modernization-experiment.cjs');
const base=JSON.parse(fs.readFileSync('package.json'));const lock=JSON.parse(fs.readFileSync('package-lock.json'));const targets=[...new Set(Object.values(plans).flatMap(p=>p.targets))];const before={auditReportVersion:2,vulnerabilities:{fixture:{via:targets.map(id=>({url:'https://github.com/advisories/'+id}))}},metadata:{vulnerabilities:{total:1}}};const prod={auditReportVersion:2,vulnerabilities:{},metadata:{vulnerabilities:{total:0}}};
for(const mode of Object.keys(plans))test(mode+' manifest changes overrides only',()=>{const p=prepare(mode,base,lock);assert.deepEqual({...p,overrides:base.overrides},base);assert.deepEqual(p.overrides['http-proxy-agent@4.0.1'],{'@tootallnate/once':'2.0.1'});});
test('reject unknown mode or override conflict',()=>{assert.throws(()=>prepare('bad',base,lock));assert.throws(()=>prepare('svg',{...base,overrides:{...base.overrides,'react-scripts@5.0.1':{}}},lock));});
test('reject production lock drift and no resolution',()=>{assert.throws(()=>checkLock(lock,lock));const c=structuredClone(lock);const p=Object.keys(c.packages).find(p=>p&&!c.packages[p].dev);c.packages[p].version='0.0.0';assert.throws(()=>checkLock(lock,c));});
test('allow dev-only graph change for experiment',()=>{const c=structuredClone(lock);c.packages['node_modules/svgo'].version='2.8.4';checkLock(lock,c);});
test('reject remaining targets even if audit format valid',()=>{for(const mode of Object.keys(plans))assert.throws(()=>audit(mode,before,before,prod,lock),/target remains/);});
