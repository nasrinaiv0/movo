'use strict';
const { execFileSync } = require('node:child_process');
const image = process.argv[2] || 'movo-cloud-run:local';
if (!/^[a-z0-9][a-z0-9._/:@-]+$/.test(image)) throw Error('Provide a trusted built image name.');
const name = 'movo-cloud-run-smoke-' + process.pid;
let started = false;
try {
  execFileSync('docker', ['run', '--detach', '--rm', '--name', name, '--read-only', '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true', '--memory=1g', '--cpus=1', '--env', 'PORT=9090', image], { stdio: 'pipe' });
  started = true;
  execFileSync('docker', ['exec', name, 'node', '-e', `
    const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os');
    (async()=>{
      assert.notEqual(process.getuid(),0);
      assert.equal(process.env.MOVO_BIND_HOST,'0.0.0.0');
      assert.equal(process.env.NODE_EXTRA_CA_CERTS,undefined);
      for(const file of ['/app/.env.production','/app/.env.local','/app/.git','/app/src','/app/docs/app-store/evidence','/run/secrets/npm_ca'])assert.equal(fs.existsSync(file),false,file);
      const address=Object.values(os.networkInterfaces()).flat().find(value=>value.family==='IPv4'&&!value.internal)?.address;
      assert.ok(address,'container interface');
      const base='http://'+address+':9090';
      const deadline=Date.now()+30000;let healthy=false;
      while(Date.now()<deadline){try{healthy=(await fetch(base+'/healthz',{signal:AbortSignal.timeout(1000)})).ok;}catch{}if(healthy)break;await new Promise(resolve=>setTimeout(resolve,200));}
      assert.equal(healthy,true);
      const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/<html/);
      assert.equal(page.headers.get('x-content-type-options'),'nosniff');
      assert.match(await (await fetch(base+'/third-party-notices.txt')).text(),/Third-party software notices/);
      assert.deepEqual(await (await fetch(base+'/api/purchases/config?platform=apple')).json(),{enabled:false});
      assert.equal((await fetch(base+'/api/friends')).status,401);
      for(const file of ['/.env.production','/api/lib/iapSecurity.js','/brands/offline/bpi.com.ph.png','/wallpapers/live/l01.mp4'])assert.equal((await fetch(base+file)).status,404,file);
      assert.equal(JSON.parse(fs.readFileSync('/app/build/app-store-assets.json')).policy,'original-only');
      console.log('Cloud Run container smoke: PASS (non-root, injected PORT, container interface, read-only filesystem, public shell/notices, auth/billing gates, source/asset exclusions).');
    })().catch(failure=>{console.error(failure.message);process.exitCode=1;});
  `], { stdio: 'inherit', timeout: 45000 });
} finally {
  if (started) execFileSync('docker', ['stop', '--time', '10', name], { stdio: 'pipe', timeout: 20000 });
}
