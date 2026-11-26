'use strict';
// Run in the disposable checkout AFTER installing the actual candidate lock.
// No outside hosts, credentials, proxy environment, or real data.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {createRequire} = require('node:module');
const {resolve} = require('node:path');
const requireApp=createRequire(resolve(process.cwd(),'package.json'));
const {JSDOM,ResourceLoader}=requireApp('jsdom');
const {HttpProxyAgent}=requireApp('http-proxy-agent');
const proxyRequire=createRequire(requireApp.resolve('http-proxy-agent'));
const onceModule=proxyRequire('@tootallnate/once');
const once=onceModule.default||onceModule;
const {EventEmitter}=require('node:events');
function start(server){return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server.address().port));});}
function close(server){server.closeAllConnections();return new Promise(resolve=>server.close(resolve));}
function request(url,agent){return new Promise((resolve,reject)=>{const r=http.get(url,{agent},res=>{let s='';res.setEncoding('utf8');res.on('data',x=>s+=x);res.on('end',()=>resolve({status:res.statusCode,body:s}));});r.setTimeout(2000,()=>r.destroy(Error('timeout')));r.on('error',reject);});}
test('resolved once handles event, error and already-aborted signal', {timeout:5000}, async()=>{
  const e=new EventEmitter();const p=once(e,'done');e.emit('done','synthetic');assert.deepEqual(await p,['synthetic']);assert.equal(e.listenerCount('done'),0);
  const failed=once(e,'done');e.emit('error',Error('synthetic'));await assert.rejects(failed,/synthetic/);assert.equal(e.listenerCount('done'),0);
  const c=new AbortController();c.abort();await assert.rejects(once(e,'done',{signal:c.signal}),{name:'AbortError'});assert.equal(e.listenerCount('done'),0);assert.equal(e.listenerCount('error'),0);
});
test('legacy proxy agent and jsdom use actual loopback proxy, reject HTTP failure',{timeout:10000},async t=>{
  let targetHits=0;const target=http.createServer((req,res)=>{targetHits++;res.end('unexpected direct access');});
  const port=await start(target);t.after(()=>close(target));const targetURL=`http://127.0.0.1:${port}/synthetic`;
  const seen=[];const proxy=http.createServer((req,res)=>{seen.push(req.url);if(req.url===targetURL+'/fail'){res.writeHead(502);res.end('synthetic failure');return;}assert.equal(req.url,targetURL);res.writeHead(200,{'content-type':'text/html;charset=utf-8'});res.end('<!doctype html><p id="proof">proxy-only-fixture</p>');});
  const pp=await start(proxy);t.after(()=>close(proxy));const proxyURL=`http://127.0.0.1:${pp}`;
  const agent=new HttpProxyAgent(proxyURL);t.after(()=>agent.destroy());const result=await request(targetURL,agent);assert.equal(result.status,200);assert.match(result.body,/proxy-only-fixture/);
  const loader=new ResourceLoader({proxy:proxyURL});const dom=await JSDOM.fromURL(targetURL,{resources:loader});try{assert.equal(dom.window.document.querySelector('#proof').textContent,'proxy-only-fixture');}finally{dom.window.close();}
  await assert.rejects(JSDOM.fromURL(targetURL+'/fail',{resources:loader}),/502/);assert.equal(targetHits,0);assert.deepEqual(seen,[targetURL,targetURL,targetURL+'/fail']);
});
