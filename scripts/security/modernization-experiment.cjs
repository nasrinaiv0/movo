'use strict';
// Diagnostic candidates only. Never install an override in the source checkout.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const plans={
  nth:{overrides:{'css-select@2.1.0':{'nth-check':'2.0.1'}},targets:['GHSA-rp65-9cf3-cjxr']},
  svg:{overrides:{'react-scripts@5.0.1':{'@svgr/webpack':'6.5.1'},'@svgr/plugin-svgo@6.5.1':{svgo:'2.8.4'}},targets:['GHSA-rp65-9cf3-cjxr','GHSA-2p49-hgcm-8545','GHSA-4vpr-x523-8j87','GHSA-w27v-7q3p-w38r']},
  webpack:{overrides:{'react-scripts@5.0.1':{'webpack-dev-server':'5.2.6'},'webpack-dev-server@5.2.6':{'webpack-dev-middleware':'7.4.5'}},targets:['GHSA-g84c-rxfj-3j2c','GHSA-9jgg-88mc-972h','GHSA-4v9v-hfq4-rm2v','GHSA-79cf-xcqc-c78w','GHSA-mx8g-39q3-5c79','GHSA-f5vj-f2hx-8m93','GHSA-m28w-2pqf-7qgj']}
};
const expectedLock='6dfb2438f5d7f5917ae8a2e98d4ade82e2aa76b7e5a0395cf6b20073c6e0b4f6';
function plan(mode){assert(Object.hasOwn(plans,mode),'invalid experiment');return plans[mode];}
function prepare(mode,pkg,lock){const p=plan(mode);assert.equal(pkg.devDependencies['react-scripts'],'5.0.1');assert.equal(lock.packages['node_modules/@tootallnate/once'].version,'2.0.1');assert.equal(lock.packages['node_modules/svgo'].version,'1.3.2');assert.equal(lock.packages['node_modules/webpack-dev-server'].version,'4.15.2');for(const k of Object.keys(p.overrides))assert(!Object.hasOwn(pkg.overrides,k),'existing override requires review');return {...pkg,overrides:{...pkg.overrides,...p.overrides}};}
function production(lock){assert.equal(lock.lockfileVersion,3);return canonical({root:lock.packages[''],packages:Object.fromEntries(Object.entries(lock.packages).filter(([p,v])=>p&&!v.dev))});}
function checkLock(before,after){assert.deepEqual(production(after),production(before),'production graph or root changed');assert.notDeepEqual(after,before,'no candidate resolution');}
function ids(a){assert(a.auditReportVersion===2&&!a.error&&a.vulnerabilities&&Number.isSafeInteger(a.metadata?.vulnerabilities?.total),'invalid audit');return new Set(Object.values(a.vulnerabilities).flatMap(x=>x.via).filter(x=>typeof x==='object').map(x=>{assert(/^https:\/\/github\.com\/advisories\/GHSA-[a-z0-9-]+$/.test(x.url),'unknown advisory URL');return x.url.split('/').pop();}));}
function audit(mode,before,after,prod,lock){const a=ids(before),b=ids(after);for(const id of plan(mode).targets){assert(a.has(id),'baseline target missing: '+id);assert(!b.has(id),'target remains: '+id);}for(const id of b)assert(a.has(id),'new advisory: '+id);assert(ids(prod).size===0&&Object.keys(prod.vulnerabilities).length===0&&prod.metadata.vulnerabilities.total===0,'production findings');require('./check-advisory-regression.cjs').verify(after,lock);}
if(require.main===module){const [action,mode,...args]=process.argv.slice(2);if(action==='prepare'){const lock=fs.readFileSync(args[1]);assert.equal(crypto.createHash('sha256').update(lock).digest('hex'),expectedLock,'not exact approved baseline');process.stdout.write(JSON.stringify(prepare(mode,read(args[0]),JSON.parse(lock)),null,2)+'\n');}else if(action==='lock')checkLock(...args.map(read));else if(action==='audit')audit(mode,...args.map(read));else throw Error('unknown action');}
module.exports={prepare,checkLock,audit,plans};
