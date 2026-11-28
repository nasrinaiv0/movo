'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),output=process.env.QA_OUTPUT;
assert.ok(output,'isolated artifact output required');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
assert.equal(head,process.env.MOVO_EXPECTED_HEAD,'exact head required');
const owner='11111111-1111-4111-8111-111111111111',messageId='22222222-2222-4222-8222-222222222222',reportId='33333333-3333-4333-8333-333333333333';
const localeCodes=['en','fil','ceb','ar','zh','es','it','de','fr','pt','ja','ko','hi'];
const dict=locale=>locale==='en'?{}:locale==='ceb'?JSON.parse(fs.readFileSync(path.join(root,'src/i18n/extra/ceb.json'),'utf8')).messages:JSON.parse(fs.readFileSync(path.join(root,'src/i18n/locales',locale+'.json'),'utf8'));
const sourceFiles=['src/components/NasrinAIChat.js','src/components/NasrinAIChat.css','src/owner/OwnerConsole.js','src/owner/OwnerConsole.css','src/i18n/catalog/ai-report-safety.js','src/i18n/extra/ceb.json','src/lib/i18n.js','src/App.css','scripts/ui-qa/safety-entry.jsx','scripts/ui-qa/safety.cjs','scripts/ui-qa/build.cjs','scripts/ui-qa/safety-auth-fixture.js'];
const sourceHashes={};for(const p of sourceFiles){const bytes=fs.readFileSync(path.join(root,p));assert.deepEqual(bytes,execFileSync('git',['show',head+':'+p],{cwd:root,maxBuffer:16*1024*1024}),p+' checkout mismatch');sourceHashes[p]=crypto.createHash('sha256').update(bytes).digest('hex');}
fs.mkdirSync(output,{recursive:true});
const results=[],failures=[],requests=[];let failNext=false,denyOwner=false;
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    if(url.pathname.startsWith('/api/')){
      assert.equal(req.headers.authorization,'Bearer synthetic:'+owner);assert.equal(req.method,'POST');
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');
      if(url.pathname==='/api/nasrinai/chat'){
        assert.deepEqual(body,{action:'report',messageId,reason:'privacy'});
        requests.push({type:'report',reason:body.reason});
        if(failNext){failNext=false;return send(503,{error:'ai_reports_unavailable'});}
        return send(200,{ok:true,reportId});
      }
      if(url.pathname==='/api/owner'){
        assert.equal(url.searchParams.get('view'),'support');assert.equal(body.action,'ai_moderation');assert.equal(body.reportId,reportId);
        assert.ok(['inspect','reviewed'].includes(body.decision));requests.push({type:'moderation',decision:body.decision});
        if(denyOwner)return send(403,{error:'moderation_unavailable'});
        if(body.decision==='inspect'){assert.equal(body.expectedStatus,null);return send(200,{id:reportId,response:'Fictional reported response. No account or transaction identifiers.',status:'pending',reason:'privacy'});}
        assert.equal(body.expectedStatus,'pending');return send(200,{ok:true});
      }
      return send(404,{error:'unknown_fixture_endpoint'});
    }
    const filename=path.basename(url.pathname==='/'?'index.html':url.pathname);
    const file=path.join('/tmp/movo-ui-qa',filename);
    const data=fs.readFileSync(file);
    res.writeHead(200,{'Content-Type':filename.endsWith('.js')?'application/javascript; charset=utf-8':'text/html; charset=utf-8'});res.end(data);
  }catch(e){failures.push(String(e.message));res.writeHead(500);res.end('fixture failure');}
});
(async()=>{
  await new Promise(resolve=>server.listen(4182,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.MOVO_CHROMIUM_EXECUTABLE?{executablePath:process.env.MOVO_CHROMIUM_EXECUTABLE}:{})});
    async function pageFor(width,mode,query){
      const page=await browser.newPage({viewport:{width,height:900},colorScheme:mode,reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4182/')?route.continue():route.abort());
      await page.goto('http://127.0.0.1:4182/?mode='+mode+'&'+query);
      return {page,errors};
    }
    async function capture(page,name,scope){
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' viewport overflow');
      const undersized=await page.locator(scope+' button,'+scope+' summary,'+scope+' select').evaluateAll(nodes=>nodes.filter(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<44||r.height<44);}).map(node=>node.textContent));
      assert.deepEqual(undersized,[],name+' touch targets');
    }
    for(const locale of localeCodes)for(const mode of ['light','dark']){
      const width=320,{page,errors}=await pageFor(width,mode,'locale='+locale);
      const messages=dict(locale),tr=k=>messages[k]||k,prefix=locale+'-'+width+'-'+mode;
      try{
        if(locale!=='en')assert.notEqual(tr('Report AI response'),'Report AI response',locale+' translation missing');
        const summary=page.locator('.movo-ai-report summary');await summary.waitFor();assert.equal(await summary.innerText(),tr('Report AI response'));
        assert.equal(await page.locator('html').getAttribute('lang'),locale);assert.equal(await page.locator('html').getAttribute('dir'),locale==='ar'?'rtl':'ltr');
        await summary.focus();await page.keyboard.press('Enter');
        await page.locator('.movo-ai-report select').selectOption('privacy');
        await capture(page,prefix+'-form','.movo-ai-report');
        const submit=page.locator('.movo-ai-report button[type=submit]');
        if(locale==='en'&&mode==='light'){failNext=true;await submit.click();await page.locator('.movo-ai-report [role=status]').filter({hasText:tr('Report not received. Try again, or contact support@nasrinai.com.')}).waitFor();await capture(page,prefix+'-retry','.movo-ai-report');}
        await submit.click();await page.locator('.movo-ai-report [role=status]').filter({hasText:tr('Report received.')}).waitFor();assert.equal(await submit.isDisabled(),true);
        await capture(page,prefix+'-received','.movo-ai-report');assert.deepEqual(errors,[]);
        results.push({locale,width,mode,status:'passed',case:'report'});
      }catch(e){failures.push(prefix+': '+e.message);}finally{await page.close();}
    }
    for(const locale of ['ar','fil','ceb','de']){
      const {page,errors}=await pageFor(320,'dark','locale='+locale+'&large=1');
      try{await page.locator('.movo-ai-report summary').click();await capture(page,locale+'-320-dark-200pct','.movo-ai-report');assert.deepEqual(errors,[]);results.push({locale,width:320,mode:'dark',scale:200,status:'passed'});}
      catch(e){failures.push(locale+' 200%: '+e.message);}finally{await page.close();}
    }
    for(const width of [320,390,768,1280]){
      const {page,errors}=await pageFor(width,'light','view=owner');
      try{
        const scope='.occ-ai-moderation';await page.getByRole('heading',{name:'AI safety review'}).waitFor();await capture(page,'owner-'+width+'-queue',scope);
        const review=page.getByRole('button',{name:'Review response',exact:true});
        if(width===320){denyOwner=true;await review.click();await page.getByRole('alert').waitFor();await capture(page,'owner-'+width+'-denied',scope);denyOwner=false;}
        await review.click();await page.getByRole('heading',{name:'Reported response'}).waitFor();await capture(page,'owner-'+width+'-detail',scope);
        await page.getByRole('button',{name:'reviewed',exact:true}).click();await page.getByText('No pending AI reports.').waitFor();await capture(page,'owner-'+width+'-resolved',scope);assert.deepEqual(errors,[]);
        results.push({width,mode:'light',case:'moderation',status:'passed'});
      }catch(e){failures.push('owner '+width+': '+e.message);}finally{denyOwner=false;await page.close();}
    }
  }finally{
    if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({head,fixture:'actual exported app components; local synthetic auth and loopback APIs; not native or Vercel',sourceHashes,results,requests,failures},null,2));
  }
  assert.deepEqual(failures,[],'safety visual acceptance failures');console.log('PASS',results.length,'actual-component safety scenarios');
})().catch(e=>{console.error(e);process.exitCode=1;});
