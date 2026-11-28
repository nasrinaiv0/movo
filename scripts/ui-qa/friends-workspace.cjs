const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const actualHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(process.env.MOVO_EXPECTED_HEAD)assert.equal(actualHead,process.env.MOVO_EXPECTED_HEAD,'checkout must match requested head');
const output=process.env.QA_OUTPUT||'/tmp/movo-friends-workspace';
const owner='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222',cid='33333333-3333-4333-8333-333333333333';
(async()=>{
 fs.mkdirSync(output,{recursive:true});let unavailable=false,scenario='normal',activeInviteUntil=null,outgoing=[];const requests=[],sent=new Map(),reports=new Set();
 const friend={id:cid,name:'Mika Santos',lastMessage:'See you at the weekend!',updatedAt:'2026-11-27T08:30:00Z',unread:3};
 const messages=Array.from({length:80},(_,i)=>({id:`90000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,senderId:i%3===0?owner:other,kind:'text',body:i===79?'See you at the weekend!':i%3===0?'Sounds good. Let’s make a plan.':'A quiet coffee and a catch-up?',createdAt:new Date(Date.UTC(2026,10,26,12,i*15)).toISOString()}));
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');
   const action=body.action||(url.pathname==='/api/chat'?'inbox':'list');requests.push({path:url.pathname,action});
   const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
   if(req.headers.authorization!=='Bearer synthetic:'+owner)return send(401,{error:'sign_in_required'});
   if(scenario==='expired')return send(401,{error:'sign_in_required'});
   if(unavailable)return send(503,{error:'synthetic_unavailable'});
   if(url.pathname==='/api/chat'){
    if(action==='inbox'||action==='inbox_brief')return send(200,{friends:scenario==='empty'?[]:[friend]});
    if(body.connectionId!==cid)return send(403,{error:'friend_connection_required'});
    if(action==='open')return send(200,{name:friend.name,messages:[...messages,...sent.values()]});
    if(action==='send'){
     if(!sent.has(body.clientId))sent.set(body.clientId,{id:body.clientId,senderId:owner,kind:'text',body:body.body,createdAt:new Date().toISOString()});
     return send(200,{ok:true});
    }
    return send(200,{ok:true});
   }
   if(action==='list')return send(200,{friends:scenario==='empty'?[]:[friend],activeInviteUntil});
   if(action==='directory')return send(200,{handle:'alex_rivera',discoverable:false,requests:[{id:'request-1',handle:'jules_reyes'}],blocked:[{id:'block-1',handle:'blocked_person'}],outgoing,workspaceAvailable:true,messageReportsAvailable:true});
   if(action==='request'){outgoing=[{id:'77777777-7777-4777-8777-777777777777',handle:body.handle,createdAt:'2026-11-27T00:00:00Z'}];return send(200,{ok:true});}
   if(action==='cancel_request'){assert.equal(body.requestId,'77777777-7777-4777-8777-777777777777');outgoing=[];return send(200,{ok:true,canceled:true});}
   if(action==='report_message'){assert.deepEqual(Object.keys(body).sort(),['action','connectionId','messageId']);assert.equal(body.connectionId,cid);assert.match(body.messageId,/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i);assert.ok(messages.some(m=>m.id===body.messageId&&m.senderId!==owner));reports.add(body.messageId);return send(200,{ok:true,reportId:'fixture-report'});}
   if(action==='search')return send(200,{people:[{handle:'kai_lee'}]});
   if(action==='create'){activeInviteUntil=new Date(Date.now()+86400000).toISOString();return send(200,{token:'b'.repeat(43),expiresAt:activeInviteUntil});}
   if(action==='preview')return send(200,{name:'Kai Lee',connected:false});
   if(action==='revoke'){activeInviteUntil=null;return send(200,{ok:true});}
   return send(200,{ok:true});
  }
  const file=path.join('/tmp/movo-ui-qa',url.pathname==='/'?'index.html':path.basename(url.pathname));
  fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'});res.end(error?'Not found':data);});
 });
 await new Promise(resolve=>server.listen(4178,'127.0.0.1',resolve));let browser;const results=[];
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.MOVO_CHROMIUM_EXECUTABLE?{executablePath:process.env.MOVO_CHROMIUM_EXECUTABLE}:{})});
  for(const width of [320,390,768,1280])for(const mode of ['light','dark']){
   const page=await browser.newPage({viewport:{width,height:900},colorScheme:mode,reducedMotion:'reduce'});const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4178/')?route.continue():route.abort());
   sent.clear(); reports.clear(); outgoing=[]; activeInviteUntil=null;
   const start=Date.now(),requestStart=requests.length;
   const button=name=>page.getByRole('button',{name,exact:true});
   const open=async(extra='')=>{await page.goto('http://127.0.0.1:4178/?mode='+mode+extra);await page.locator('.friend-chat-inbox-row').waitFor();};
   const capture=async(name)=>{
    await page.evaluate(()=>document.fonts.ready);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} ${mode} ${name} overflow`);
    const undersized=await page.locator('.friends-workspace button,.friends-workspace summary').evaluateAll(buttons=>buttons.filter(b=>{
     const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<44||r.width<44);
    }).map(b=>({label:b.textContent,height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width})));
    assert.deepEqual(undersized,[],`${name}: touch targets`);
    await page.screenshot({path:path.join(output,`${width}-${mode}-${name}.png`),fullPage:true});
   };
   try{
    await open();const inboxReadyMs=Date.now()-start;await capture('chats');
    await page.getByPlaceholder('Search chats').fill('missing');await page.getByText('No chats match your search.').waitFor();await page.getByPlaceholder('Search chats').fill('Mika');
    await page.locator('.friend-chat-inbox-row').click();await page.getByText('See you at the weekend!',{exact:true}).last().waitFor();await capture('conversation');
    await page.locator('.friend-chat-profile').click();await capture('friend-profile');
    await open();await button('My profile').click();await capture('my-profile');
    await button('Friends settings').click();await page.getByLabel('Your MOVO username').waitFor();await capture('settings');
    await button('Back').click();await button('Share profile').click();await page.getByLabel('Name friends will see').fill('Alex Rivera');await page.getByRole('button',{name:/^(Create|Replace) invite$/}).click();await page.locator('.friends-qr').waitFor();await capture('qr');
    await open();await button('Add friend').click();await page.getByLabel('Search MOVO usernames').waitFor();await capture('discovery');
    await page.getByLabel('Search MOVO usernames').fill('kai_lee');await button('Search').click();await button('Send request').click();await button('Request sent').waitFor();assert.equal(await button('Request sent').isDisabled(),true);
    await page.reload();await page.locator('.friend-chat-inbox-row').waitFor();await button('Add friend').click();await page.locator('.friends-outgoing').getByText('@kai_lee',{exact:true}).waitFor();await capture('sent-request');await button('Cancel request').click();await page.getByText('No pending requests.',{exact:true}).waitFor();
    await button('Paste invite link').click();await page.getByLabel('Paste invite link').fill('http://127.0.0.1:4178/friend#invite='+'c'.repeat(43));await button('Review invite').click();await page.getByText('Kai Lee',{exact:true}).waitFor();await capture('invite-review');
    // Actual send client and synchronous duplicate-tap guard, never a delivery/read claim.
    await open();await page.locator('.friend-chat-inbox-row').click();await page.locator('#friend-chat-message').fill('Synthetic draft');
    await page.locator('.friend-chat-profile').click();await button('Back').click();assert.equal(await page.locator('#friend-chat-message').inputValue(),'Synthetic draft');
    await button('Send message').click();await page.getByText('Synthetic draft',{exact:true}).last().waitFor();
    await page.getByLabel('Conversation options').click();await button('Report a message').click();await capture('report-selection');await page.locator('.friend-message-report').last().click();await page.locator('.confirm-dialog').getByRole('button',{name:'Report to MOVO',exact:true}).click();await page.getByText('Report recorded.',{exact:true}).waitFor();assert.equal(reports.size,1);assert.equal(await page.locator('.friend-message-report').count(),0);
    await page.locator('.friend-chat-messages').evaluate(node=>{node.scrollTop=0;node.dispatchEvent(new Event('scroll'));});
    const scrollBefore=await page.locator('.friend-chat-messages').evaluate(node=>node.scrollTop);
    await page.getByRole('button',{name:'Send message',exact:true}).focus();assert.equal(await page.locator('.friend-chat-messages').evaluate(node=>node.scrollTop),scrollBefore);
    const frames=await page.evaluate(()=>new Promise(resolve=>{let last=performance.now(),d=[];function frame(t){d.push(t-last);last=t;if(d.length===30)resolve(d.slice(1));else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
    results.push({width,mode,inboxReadyMs,requests:requests.length-requestStart,frameMaxMs:Math.max(...frames),frameMedianMs:frames.sort((a,b)=>a-b)[Math.floor(frames.length/2)],heapBytes:await page.evaluate(()=>performance.memory?.usedJSHeapSize||null),screens:10});
    assert.deepEqual(errors,[]);
   }catch(error){await page.screenshot({path:path.join(output,`${width}-${mode}-failure.png`),fullPage:true});throw error;}finally{await page.close();}
  }
  const page=await browser.newPage({viewport:{width:320,height:900},reducedMotion:'reduce'});
  for(const extra of ['&large=1','&rtl=1']){
   await page.goto('http://127.0.0.1:4178/?mode=dark'+extra);await page.locator('.friend-chat-inbox-row').waitFor();await page.getByRole('button',{name:'My profile',exact:true}).click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(output,extra.includes('large')?'320-dark-200-percent.png':'320-dark-rtl.png'),fullPage:true});
   await page.getByRole('button',{name:'Back',exact:true}).click();await page.locator('.friend-chat-inbox-row').click();await page.locator('.friend-chat-messages article').first().waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(output,extra.includes('large')?'320-dark-conversation-200-percent.png':'320-dark-conversation-rtl.png'),fullPage:true});
  }
  scenario='empty';await page.goto('http://127.0.0.1:4178/');await page.getByText('No conversations yet. Add a friend to start chatting.',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'empty-inbox.png'),fullPage:true});
  scenario='expired';await page.reload();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();assert.equal(await page.locator('.friend-chat-inbox-row').count(),0);await page.screenshot({path:path.join(output,'expired-session.png'),fullPage:true});
  scenario='normal';unavailable=true;await page.goto('http://127.0.0.1:4178/');await page.getByRole('alert').first().waitFor();await page.screenshot({path:path.join(output,'service-unavailable.png'),fullPage:true});
  unavailable=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await page.locator('.friend-chat-inbox-row').waitFor();
  await page.getByRole('button',{name:'Add friend',exact:true}).click();await page.getByRole('button',{name:'Try again',exact:true}).first().click();await page.getByLabel('Search MOVO usernames').waitFor();
  await page.context().setOffline(true);await page.getByLabel('Search MOVO usernames').fill('kai_lee');await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByText('Could not connect to Friends. Check your connection and try again.',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'offline-discovery.png'),fullPage:true});
  await page.context().setOffline(false);await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('button',{name:'Send request',exact:true}).waitFor();await page.close();

  const adaptive=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'no-preference'});
  await adaptive.goto('http://127.0.0.1:4178/');await adaptive.locator('.friend-chat-inbox-row').click();await adaptive.locator('.friend-chat-messages article').first().waitFor();
  assert.equal(await adaptive.locator('.just-arrived').count(),0,'initial history must not replay arrival animations');
  await adaptive.locator('main').evaluate(node=>node.style.width='360px');
  assert.equal(await adaptive.locator('.friends-workspace-inbox').isVisible(),false,'a narrow app pane must use phone layout even in a wide window');
  assert.ok(await adaptive.locator('.friends-workspace').evaluate(node=>node.scrollWidth<=node.clientWidth+1));
  await adaptive.screenshot({path:path.join(output,'1280-window-360-pane.png'),fullPage:true});
  await adaptive.locator('main').evaluate(node=>node.style.width='');await adaptive.setViewportSize({width:390,height:844});
  await adaptive.locator('#friend-chat-message').fill('Motion fixture');await adaptive.getByRole('button',{name:'Send message',exact:true}).click();await adaptive.getByText('Motion fixture',{exact:true}).last().waitFor();
  assert.equal(await adaptive.locator('.just-arrived').count(),1);
  const motionFrames=await adaptive.evaluate(()=>new Promise(resolve=>{let previous=performance.now(),d=[];const log=document.querySelector('.friend-chat-messages');function frame(t){d.push(t-previous);previous=t;log.scrollTop=Math.max(0,log.scrollTop-12);if(d.length===45)resolve(d.slice(1));else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));
  await adaptive.emulateMedia({reducedMotion:'reduce'});assert.equal(await adaptive.locator('.just-arrived').evaluate(node=>getComputedStyle(node).animationName),'none');await adaptive.close();

  const bundle=fs.readFileSync('/tmp/movo-ui-qa/qa.js');
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({fixture:'actual components; loopback synthetic services; browser evidence only',head:actualHead,workingTree:require('child_process').execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()?'uncommitted':'clean',motionFramesMs:motionFrames,sourceHashes:Object.fromEntries(['package.json','package-lock.json','api/friends/index.js','api/lib/friendSocial.js','supabase/migrations/20261127114611_friend_workspace_safety.sql','src/App.js','src/App.css','src/components/FriendsWorkspace.js','src/components/FriendsSheet.js','src/components/FriendsWorkspace.css','src/components/FriendsController.js','src/components/FriendInvitations.js','src/components/FriendMessages.js','src/components/FriendMessages.css','src/components/FriendsDiscovery.js','src/components/FriendFinanceSummary.js'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),bundle:{bytes:bundle.length,gzipBytes:zlib.gzipSync(bundle).length,sha256:crypto.createHash('sha256').update(bundle).digest('hex')},results},null,2));
  console.log(`${results.length} workspace profiles passed; 89 actual screenshots, error/retry, drafts, QR review and targets checked`);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1);});
