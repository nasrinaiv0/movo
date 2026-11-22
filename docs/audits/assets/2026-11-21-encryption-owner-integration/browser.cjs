const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = 'http://127.0.0.1:4193';
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.route('**/*', route => route.request().url().startsWith(base+'/') ? route.continue() : route.abort());
  await context.addInitScript(() => {
   if (localStorage.getItem('movo.finance.vault.initialized.v1')) return;
   const id='10000000-0000-4000-8000-000000000091';
   localStorage.setItem('movo.preferences.scope.v1.guest', JSON.stringify({version:1,ownerId:null,stickers:[],prefs:{language:'en',theme:'light',onboarded:true,tutorialSeen:true,planWelcomeSeen:true,logsSeenAt:Date.now(),legalAccepted:'2026-11-20',legalAcceptedRevision:'2026-11-20-r1'}}));
   localStorage.setItem('movo.local.accounts.v1', JSON.stringify([{id,name:'Synthetic encrypted cash',account_type:'cash',opening_balance:100.25,currency:'PHP'}]));
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const wallet=async amount=>{
   await page.getByRole('button',{name:'Wallet',exact:true}).waitFor();
   const recent=page.locator('.rl-done');if(await recent.isVisible())await recent.click();
   await page.getByRole('button',{name:'Wallet',exact:true}).click();await page.locator('main[data-view="Wallet"]').waitFor();
   await page.waitForFunction(v=>document.querySelector('main')?.textContent.includes(v),amount);
  };
  await page.goto(base+'/',{waitUntil:'networkidle'});await wallet('100.25');
  const account = await page.evaluate(()=>({legacy:localStorage.getItem('movo.local.accounts.v1'),sealed:localStorage.getItem('movo.finance.sealed.v1:movo.local.accounts.v1')}));
  assert.equal(account.legacy,null);assert.equal(JSON.parse(account.sealed).__movo_finance_sealed_v1,1);assert.ok(!account.sealed.includes('Synthetic encrypted cash'));
  await page.locator('main').getByRole('button',{name:'Add Transaction',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Add transaction',exact:true});await dialog.waitFor();
  await dialog.getByLabel('Description',{exact:true}).fill('Synthetic encrypted expense');
  await dialog.getByLabel('Account',{exact:true}).selectOption('10000000-0000-4000-8000-000000000091');
  const pad=dialog.getByRole('group',{name:'Amount keypad',exact:true});
  for(const digit of ['1','2','.','3','4']) await pad.getByRole('button',{name:digit,exact:true}).click();
  await dialog.getByRole('button',{name:'Save Expense',exact:true}).click();await dialog.waitFor({state:'detached'});await wallet('87.91');
  const transaction=await page.evaluate(()=>({legacy:localStorage.getItem('movo.local.transactions.v1'),sealed:localStorage.getItem('movo.finance.sealed.v1:movo.local.transactions.v1')}));
  assert.equal(transaction.legacy,null);assert.equal(JSON.parse(transaction.sealed).__movo_finance_sealed_v1,1);assert.ok(!transaction.sealed.includes('Synthetic encrypted expense'));
  await page.reload({waitUntil:'networkidle'});await wallet('87.91');
  await page.screenshot({path:'/tmp/movo-merge291-wallet.png',animations:'disabled'});
  const key=await page.evaluate(async()=>new Promise((resolve,reject)=>{
   const r=indexedDB.open('movo.finance.vault.v1');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const read=db.transaction('keys','readonly').objectStore('keys').get('hmac-sha256-v1');read.onsuccess=()=>{const key=read.result;db.close();resolve({exists:!!key,extractable:key?.extractable,type:key?.type});};read.onerror=()=>reject(read.error);};
  }));
  assert.deepEqual(key,{exists:true,extractable:false,type:'secret'});
  const beforeKeyLoss=await page.evaluate(()=>localStorage.getItem('movo.finance.sealed.v1:movo.local.transactions.v1'));
  await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('movo.finance.vault.v1');r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('fixture key database blocked'));}));
  await page.reload({waitUntil:'networkidle'});await page.getByRole('heading',{name:'Saved financial records are locked',exact:true}).waitFor();
  assert.equal(await page.locator('.movo-app').count(),0);
  assert.ok((await page.evaluate(()=>localStorage.getItem('movo.finance.sealed.v1:movo.local.transactions.v1')))===beforeKeyLoss,'Key-loss recovery changed the retained ciphertext');
  await page.screenshot({path:'/tmp/movo-merge291-key-loss.png',animations:'disabled'});
  assert.deepEqual(errors,[]);
  const results={date:'2026-11-21',browser:'isolated Chromium',syntheticRecordsOnly:true,legacyMigratedBeforeRendering:true,financialWritesEncrypted:true,amount:12.34,balance:87.91,reloadDecrypts:true,webKeyNonExportable:true,keyLossBlocksWallet:true,keyLossPreservesCiphertext:true,pageErrors:errors,nativeDeviceAcceptance:false};
  fs.writeFileSync('/tmp/movo-merge291-browser-results.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
