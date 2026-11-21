const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const base = 'http://127.0.0.1:8080';
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*', route => route.request().url().startsWith(base + '/') ? route.continue() : route.abort());
 await context.addInitScript(() => {
  const id='10000000-0000-4000-8000-000000000021';
  localStorage.setItem('movo.preferences.scope.v1.guest', JSON.stringify({version:1,ownerId:null,stickers:[],prefs:{theme:'light',language:'en',onboarded:true,tutorialSeen:true,planWelcomeSeen:true,logsSeenAt:Date.now(),legalAccepted:'2026-11-19',legalAcceptedRevision:'2026-11-19-r2'}}));
  if (!localStorage.getItem('movo.local.accounts.v1')) localStorage.setItem('movo.local.accounts.v1', JSON.stringify([{id,name:'Audit cash fixture',account_type:'cash',opening_balance:100.25,currency:'PHP'}]));
 });
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/', {waitUntil:'networkidle'});
 const results=[];
 const record=async (step,capture=false)=>{
  await page.locator('main').waitFor();
  const geometry=await page.evaluate(()=>({view:document.querySelector('main')?.getAttribute('data-view'),width:innerWidth,bodyWidth:document.documentElement.scrollWidth,dialogs:[...document.querySelectorAll('[role=dialog]')].map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};})}));
  assert.ok(geometry.bodyWidth<=geometry.width+1,`${step} page overflow: ${JSON.stringify(geometry)}`);
  const splitFontLabels = await page.locator('.font-styles small').evaluateAll(labels => labels.filter(el=>el.getBoundingClientRect().height > parseFloat(getComputedStyle(el).fontSize)*1.6).map(el=>el.textContent));
  assert.deepEqual(splitFontLabels,[],`${step} font labels split inside words`);
  for(const d of geometry.dialogs)assert.ok(d.x>=-1 && d.y>=-1 && d.x+d.width<=geometry.width+1,`${step} panel outside viewport`);
  if(capture) await page.screenshot({path:`/tmp/movo-full-audit-20261121/${step}.png`,animations:'disabled'});
  results.push({step,...geometry});
 };
 await record('01-home',true);
 await page.getByRole('button',{name:'Wallet',exact:true}).click();
 await page.locator('main[data-view="Wallet"]').waitFor();
 await record('02-wallet',true);
 await page.locator('main').getByRole('button',{name:'Add Transaction',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Add transaction',exact:true});await dialog.waitFor();
 await record('03-transaction',true);
 await dialog.getByLabel('Description',{exact:true}).fill('Audit fixture expense');
 await dialog.getByLabel('Account',{exact:true}).selectOption('10000000-0000-4000-8000-000000000021');
 const pad=dialog.getByRole('group',{name:'Amount keypad',exact:true});
 for(const digit of ['1','2','.','3','4'])await pad.getByRole('button',{name:digit,exact:true}).click();
 await dialog.getByRole('button',{name:'Save Expense',exact:true}).click();await dialog.waitFor({state:'detached'});
 await page.waitForFunction(()=>document.querySelector('main')?.textContent.includes('87.91'));
 const rows=await page.evaluate(()=>JSON.parse(localStorage.getItem('movo.local.transactions.v1')));assert.equal(rows.length,1);assert.equal(rows[0].amount,12.34);
 await page.getByRole('button',{name:'Transactions',exact:true}).click();await page.locator('main[data-view="Transactions"]').waitFor();await record('04-transactions',true);
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.locator('main[data-view="Menu"]').waitFor();await record('05-menu',true);
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('main[data-view="Settings"]').waitFor();await record('06-settings',true);
 console.log(JSON.stringify({step:'settings-dom',buttons:await page.locator('main').getByRole('button').allTextContents()}));
 await page.getByRole('button',{name:/Text size & font/}).click();await page.locator('main[data-view="Appearance"]').waitFor();await record('07-appearance',true);
 const size=page.getByRole('slider',{name:'Text size',exact:true});await size.fill('4');
 await record('08-large-text',true);
 for(const viewport of [{width:320,height:568},{width:844,height:390},{width:1280,height:900}]){
  await page.setViewportSize(viewport);await record(`09-appearance-${viewport.width}`,true);
  for(const name of ['Home','Wallet','Transactions','Menu']){
   await page.getByTitle(name,{exact:true}).first().click();await page.locator(`main[data-view="${name}"]`).waitFor();await record(`10-${name.toLowerCase()}-${viewport.width}`,name==='Wallet');
  }
  await page.getByRole('button',{name:'Settings',exact:true}).first().click();await page.locator('main[data-view="Settings"]').waitFor();
  await page.getByRole('button',{name:/Text size & font/}).click();await page.locator('main[data-view="Appearance"]').waitFor();
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('radio',{name:'Dark',exact:true}).click();
 await record('11-dark-appearance',true);
 await page.getByTitle('Menu',{exact:true}).first().click();
 await page.getByRole('button',{name:'Settings',exact:true}).first().click();
 await page.getByRole('button',{name:/Import & Export/}).click();
 const backup=page.getByRole('dialog',{name:'Financial backups',exact:true});await backup.waitFor();
 await record('12-backup-panel',true);
 const focus=[];
 for(let i=0;i<12;i++){await page.keyboard.press('Tab');focus.push(await backup.evaluate(el=>el.contains(document.activeElement)));}
 assert.ok(focus.every(Boolean),'Keyboard focus escaped the backup dialog');
 await page.keyboard.press('Escape');await backup.waitFor({state:'detached'});
 await page.getByRole('button',{name:/Terms of Service/}).click();
 await page.getByRole('button',{name:'Third-party notices',exact:true}).click();
 const notices=page.getByRole('dialog');await notices.getByText('MOVO — Third-party software notices',{exact:false}).waitFor();
 await record('13-notices',true);
 await page.keyboard.press('Escape');await notices.waitFor({state:'detached'});
 await page.getByTitle('Menu',{exact:true}).first().click();
 await page.getByRole('button',{name:/Friends/}).click();
 await record('14-sharing-guest',true);
 console.log(JSON.stringify({step:'sharing-dom',text:(await page.locator('main').innerText()).slice(0,1200)}));
 assert.deepEqual(errors,[]);
 fs.writeFileSync('/tmp/movo-full-audit-20261121/ui-results.json',JSON.stringify({results,errors,focusStayedInDialog:focus.every(Boolean),escapeClosesDialogs:true,localLedger:{amount:rows[0].amount,count:rows.length,balance:87.91},browser:'isolated Chromium; external requests blocked'},null,2));
 console.log(JSON.stringify({checks:results.length,errors,ledgerExpense:rows[0].amount}));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
