const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const output=process.env.QA_OUTPUT||'/tmp/movo-friend-ui';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',bank='44444444-4444-4444-8444-444444444444',mid='55555555-5555-4555-8555-555555555555',cid='33333333-3333-4333-8333-333333333333';
(async()=>{
 fs.mkdirSync(output,{recursive:true});const states=new Map();const requests=[];
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/chat'||url.pathname==='/fixture-import'){
   const id=req.headers.authorization?.replace('Bearer synthetic:','');
   if(![owner,other].includes(id)){res.writeHead(401);return res.end();}
   const chunks=[];for await(const ch of req)chunks.push(ch);const b=JSON.parse(Buffer.concat(chunks).toString()||'{}');
   const state=states.get(id)||{decision:'unreviewed',imports:0};states.set(id,state);
   const send=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
   if(url.pathname==='/fixture-import'){
    requests.push(b);
    if(id!==owner||b.ownerId!==id||b.accountId!==bank||b.connectionId!==cid||b.messageId!==mid||b.date!=='2026-11-30'||b.destinationId!==null||!['accepted','imported'].includes(state.decision))return send(403,{error:'denied'});
    if(state.decision!=='imported'){state.imports++;state.decision='imported';return send(503,{error:'synthetic_lost_response'});}
    return send(200,{ownerId:id,messageId:mid,transactionId:mid,status:'imported',refreshed:true});
   }
   if(b.connectionId!==cid)return send(400,{error:'bad_connection'});
   if(b.action==='open')return send(200,{name:'Synthetic friend',messages:id===owner?[{id:mid,senderId:other,kind:'transaction',createdAt:'2026-11-30T12:00:00Z',card:{type:'expense',currency:'PHP',amount:42.25,date:'2026-11-30',description:'Synthetic lunch'}}]:[]});
   if(b.action==='decisions')return send(200,{atomicImport:true,decisions:state.decision==='unreviewed'?[]:[{messageId:mid,status:state.decision}]});
   if(['accept_share','decline_share'].includes(b.action)&&id===owner&&b.messageId===mid){if(state.decision!=='imported')state.decision=b.action==='accept_share'?'accepted':'declined';return send(200,{messageId:mid,status:state.decision});}
   return send(200,{ok:true});
  }
  const file=path.join('/tmp/movo-ui-qa',url.pathname==='/'?'index.html':path.basename(url.pathname));
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream'});res.end(err?'Not found':data);});
 });
 await new Promise(resolve=>server.listen(4176,'127.0.0.1',resolve));let browser;const results=[];
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const timezoneId of ['Asia/Manila','Pacific/Kiritimati','America/Los_Angeles'])for(const width of [320,390,1280])for(const mode of ['light','dark']){
   states.clear();requests.length=0;const page=await browser.newPage({viewport:{width,height:844},timezoneId,colorScheme:mode,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const prefix=timezoneId.replaceAll('/','-')+'-'+width+'-'+mode;
   try{
    await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4176/')?route.continue():route.abort());
    await page.goto('http://127.0.0.1:4176/?mode='+mode);
    const button=name=>page.getByRole('button',{name,exact:true});
    await button('Accept').waitFor();assert.equal(await page.getByTestId('calendar').innerText(),'2026-11-30 · 2026-11');
    await button('Accept').click();const save=button('Save to my transactions');await save.waitFor();assert.equal(await save.isDisabled(),true);
    assert.equal(await page.locator('select option').filter({hasText:'Other owner bank'}).count(),0);
    await page.getByLabel('Your account').selectOption(bank);
    assert.equal(await save.isEnabled(),true);
    if(timezoneId==='Asia/Manila')await page.screenshot({path:output+'/'+prefix+'-mapping.png',fullPage:true});
    const measure=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(measure.scroll<=width+1);
    await save.click();await button('Retry same import').waitFor();assert.equal(states.get(owner).imports,1);
    assert.equal(await page.getByLabel('Your account').isDisabled(),true);
    await button('Retry same import').click();await page.getByText('Imported to your records',{exact:true}).waitFor();
    assert.deepEqual(requests[0],requests[1]);assert.equal(states.get(owner).imports,1);
    if(timezoneId==='Asia/Manila')await page.screenshot({path:output+'/'+prefix+'-imported.png',fullPage:true});
    await page.reload();await page.getByText('Imported to your records',{exact:true}).waitFor();assert.equal(requests.length,2);
    await button('Switch synthetic owner').click();await page.getByText('Say hello! Only you and this friend can see these messages.',{exact:true}).waitFor();
    assert.equal(await page.getByText('Imported to your records',{exact:true}).count(),0);
    assert.equal(await page.locator('.friend-import-controls').count(),0);
    assert.equal(requests.length,2);assert.deepEqual(errors,[]);
    results.push({timezoneId,width,mode,measure,calendar:true,receiptRecovery:true,ownerSwitch:true});
   }catch(e){await page.screenshot({path:output+'/'+prefix+'-failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await page.close();}
  }
  fs.writeFileSync(output+'/results.json',JSON.stringify(results,null,2));console.log(results.length+' isolated real-component checks passed');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exit(1)});
