const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[],errors=[];
 try {
 for(const width of [320,390,430]) for(const theme of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height:844}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(theme=>localStorage.setItem('movo.preferences.v3',JSON.stringify({onboarded:true,theme,language:'en',planWelcomeSeen:false,biometrics:false})),theme);
  await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4174')?r.continue():r.abort());
  await page.goto('http://127.0.0.1:4174');
  const sheet=page.locator('.plan-offer-sheet');await sheet.waitFor();
  assert.match(await sheet.innerText(),/One month free/);
  assert.match(await sheet.innerText(),/no automatic charge/);
  await sheet.locator('.plan-tabs button').filter({hasText:/^Pro$/}).click();
  await page.waitForTimeout(600);
  assert.equal(await sheet.locator('.plan-tabs button[aria-pressed=true]').innerText(),'Pro');
  const m=await sheet.evaluate(el=>{const b=el.querySelector('.primary-button').getBoundingClientRect();return {pageOverflow:document.documentElement.scrollWidth>innerWidth,sheetOverflow:el.scrollWidth>el.clientWidth+1,claimVisible:b.top>=0&&b.bottom<=innerHeight};});
  assert.deepEqual(m,{pageOverflow:false,sheetOverflow:false,claimVisible:true});
  await sheet.locator('button').filter({hasText:/^Continue$/}).click();
  await sheet.waitFor({state:'detached'});
  for(const name of ['Wallet','Transactions','Menu','Home']){
   await page.locator('.bottom-nav button[aria-label="'+name+'"]').click();
   await page.waitForTimeout(500);
   const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,wide:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).filter(e=>e.right>innerWidth+1).slice(0,12)}));
   assert.equal(overflow.scroll>width,false,JSON.stringify({name,width,theme,overflow}));
  }
  await page.screenshot({path:'/tmp/movo-source-transfer/app-'+width+'-'+theme+'.png'});
  results.push({width,theme,...m});await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync('/tmp/movo-source-transfer/plan-app-results.json',JSON.stringify({results,errors},null,2));
 console.log('PASS: 6 production-app width/theme cases; Pro carousel, trial terms, visible claim, Continue, and four navigation buttons');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
