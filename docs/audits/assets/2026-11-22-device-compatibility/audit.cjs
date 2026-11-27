const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = process.env.MOVO_COMPAT_BASE_URL || 'http://127.0.0.1:4195';
const account = '10000000-0000-4000-8000-000000000092';
const output = process.env.MOVO_COMPAT_RESULTS || '/tmp/movo-device-compatibility-results.json';
(async () => {
 const browser = await chromium.launch({executablePath:process.env.MOVO_CHROMIUM_EXECUTABLE || '/usr/bin/chromium', headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const results=[], errors=[];
 try {
  const context = await browser.newContext({viewport:{width:360,height:800},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.route('**/*', route => route.request().url().startsWith(base+'/') ? route.continue() : route.abort());
  await context.addInitScript(id => {
   if(localStorage.getItem('movo.finance.vault.initialized.v1')) return;
   localStorage.setItem('movo.preferences.scope.v1.guest',JSON.stringify({version:1,ownerId:null,stickers:[],prefs:{theme:'light',language:'en',onboarded:true,tutorialSeen:true,planWelcomeSeen:true,logsSeenAt:Date.now(),legalAccepted:'2026-11-20',legalAcceptedRevision:'2026-11-20-r1'}}));
   localStorage.setItem('movo.local.accounts.v1',JSON.stringify([{id,name:'Synthetic fold continuity cash',account_type:'cash',opening_balance:100.25,currency:'PHP'}]));
  },account);
  const page = await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const record=async (step)=>{
   await page.waitForTimeout(150);
   const geometry=await page.evaluate(()=>({view:document.querySelector('main')?.dataset.view,width:innerWidth,height:innerHeight,bodyWidth:document.documentElement.scrollWidth,layout:document.querySelector('.movo-app')?.className.match(/layout-\w+/g),segments:{horizontal:matchMedia('(horizontal-viewport-segments: 2)').matches,vertical:matchMedia('(vertical-viewport-segments: 2)').matches},dialogs:[...document.querySelectorAll('[role=dialog]')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};})}));
   geometry.pass=geometry.bodyWidth<=geometry.width+1 && geometry.dialogs.every(d=>d.x>=-1 && d.y>=-1 && d.x+d.width<=geometry.width+1 && d.y+d.height<=geometry.height+1 && d.scrollWidth<=d.clientWidth+1);
   results.push({step,...geometry});
  };
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Wallet',exact:true}).click();
  await page.locator('main[data-view="Wallet"]').waitFor();
  await page.locator('main').getByRole('button',{name:'Add Transaction',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Add transaction',exact:true}); await dialog.waitFor();
  await dialog.getByLabel('Description',{exact:true}).fill('Synthetic fold continuity expense');
  await dialog.getByLabel('Account',{exact:true}).selectOption(account);
  const pad=dialog.getByRole('group',{name:'Amount keypad',exact:true});
  for(const digit of ['1','2','.','3','4'])await pad.getByRole('button',{name:digit,exact:true}).click();
  for(const viewport of [{width:344,height:882},{width:466,height:678},{width:674,height:898},{width:768,height:1024},{width:890,height:626},{width:1024,height:768},{width:280,height:653},{width:674,height:370},{width:360,height:800}]){
   await page.setViewportSize(viewport);
   await record('draft-'+viewport.width+'x'+viewport.height);
   assert.equal(await dialog.getByLabel('Description',{exact:true}).inputValue(),'Synthetic fold continuity expense');
   assert.equal(await dialog.getByLabel('Account',{exact:true}).inputValue(),account);
  }
  await dialog.getByRole('button',{name:'Save Expense',exact:true}).click(); await dialog.waitFor({state:'detached'});
  const done=page.locator('.rl-done'); if(await done.isVisible()) await done.click();
  await page.getByTitle('Wallet',{exact:true}).first().click();
  await page.waitForFunction(()=>document.querySelector('main')?.textContent.includes('87.91'));
  for(const viewport of [{width:344,height:882},{width:466,height:678},{width:674,height:898},{width:768,height:1024},{width:890,height:626},{width:1024,height:768},{width:280,height:653}]){
   await page.setViewportSize(viewport);
   await record('wallet-'+viewport.width+'x'+viewport.height);
  }
  await page.setViewportSize({width:768,height:1024});
  const cdp=await context.newCDPSession(page);
  let segmentEmulation;
  try {
   await cdp.send('Emulation.setDisplayFeaturesOverride',{features:[{orientation:'vertical',offset:374,maskLength:20}]});
   await page.setViewportSize({width:769,height:1024});
   await record('simulated-vertical-hinge');
   await cdp.send('Emulation.setDisplayFeaturesOverride',{features:[{orientation:'horizontal',offset:502,maskLength:20}]});
   await page.setViewportSize({width:768,height:1025});
   await record('simulated-horizontal-hinge');
   await cdp.send('Emulation.clearDisplayFeaturesOverride');
   segmentEmulation='CDP display features applied; media-query results recorded, no physical posture claim';
  } catch(e) {segmentEmulation='Unavailable: '+e.message;}
  await page.reload({waitUntil:'networkidle'});
  console.log(JSON.stringify({afterReloadDialogs:await page.getByRole('dialog').allTextContents()}));
  const reloadDone=page.locator('.rl-done'); if(await reloadDone.isVisible()) await reloadDone.click();
  await page.getByTitle('Wallet',{exact:true}).first().click();
  await page.waitForFunction(()=>document.querySelector('main')?.textContent.includes('87.91'));
  assert.deepEqual(errors,[]);
  fs.writeFileSync(output,JSON.stringify({date:'2026-11-22',browser:await browser.version(),nativeDeviceAcceptance:false,externalRequestsBlocked:true,appSourceMatches:'cc4ae63e8c86aa7cf88cd985e02ccf46b4b0a682 (web files identical to tested e8f8742d bundle)',draftDescriptionAndAccountPreserved:true,savedBalanceAfterResizeAndReload:87.91,expense:12.34,segmentEmulation,results,errors},null,2)+'\n');
  console.log(JSON.stringify({output,checks:results.length,failed:results.filter(r=>!r.pass),segmentEmulation,errors}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
