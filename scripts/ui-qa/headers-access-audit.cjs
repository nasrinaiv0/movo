// Audit geometry and plan routing; records padding without asserting zero-padding compliance.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[],results=[];
 try {
 const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Manila'});
 page.on('pageerror',e=>errors.push(e.message));
 let fail=false,stamp='2026-11-06T04:35:00Z';
 await page.route('**/api/crypto?**',async r=>{await new Promise(resolve=>setTimeout(resolve,600));await r.fulfill(fail?{status:503,json:{error:'unavailable'}}:{json:{coins:[{id:'btc-bitcoin',name:'Bitcoin',symbol:'BTC',price:5456789.23,rank:1,change24h:2.53,updatedAt:stamp}],points:[]}})});
 await page.addInitScript(()=>localStorage.setItem('movo.preferences.v3',JSON.stringify({onboarded:true,planWelcomeSeen:true,theme:'light',language:'en',biometrics:false})));
 await page.goto(process.env.QA_URL || 'http://127.0.0.1:4174/',{waitUntil:'domcontentloaded'});
 await page.locator('.home-utility-pill').waitFor();
 if(await page.locator('.tour-backdrop').count())await page.locator('.tour-backdrop button').filter({hasText:'Skip'}).click();
 if(await page.locator('.legal-disclosure-backdrop').count()) {await page.locator('.legal-disclosure-backdrop input[type=checkbox]').check();await page.locator('.legal-disclosure-backdrop button').filter({hasText:'Review later'}).click();}
 const nav=async name=>{await page.locator(`.bottom-nav button[aria-label="${name}"]`).click();await page.waitForTimeout(180);};
 const measure=async (screen,groupCount,plus)=>{
 for(const width of [320,390,430]) for(const dark of [false,true]) {
 await page.setViewportSize({width,height:844});
 await page.evaluate(dark=>{const a=document.querySelector('.movo-app');a.classList.toggle('theme-dark',dark);a.classList.toggle('theme-light',!dark);},dark);
 await page.waitForTimeout(350);
 const m=await page.evaluate(()=>{
 const header=document.querySelector('main .screen-header'),group=header.querySelector('.header-utility-group');
 const buttons=[...header.querySelectorAll('.round-button,.back-button')].map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return {label:b.ariaLabel,x:r.x,y:r.y,right:r.right,width:r.width,height:r.height,background:s.backgroundImage,border:s.borderWidth,padding:s.padding,display:s.display};});
 return {overflow:document.documentElement.scrollWidth>innerWidth,buttons,groupCount:group?.querySelectorAll('button').length||0,groupGradient:group?getComputedStyle(group).backgroundImage:null,plusSeparate:!!header.querySelector('.header-actions > .header-add-action')};
 });
 assert.equal(m.overflow,false,JSON.stringify({screen,width,dark,m}));
 assert.equal(m.groupCount,groupCount,screen);
 assert.equal(m.plusSeparate,plus,screen);
 for(const b of m.buttons){assert.equal(b.width,45,JSON.stringify(b));assert.equal(b.height,45,JSON.stringify(b));assert.equal(b.background,'none');assert.ok(b.right<=width+1,JSON.stringify(b));}
 if(screen==='crypto')assert.ok(Math.abs(m.buttons[0].y-m.buttons[1].y)<=1,'Back and refresh align');
 if(groupCount){assert.equal(m.groupGradient,'none');const bs=m.buttons.filter(b=>b.label!=='Back');assert.ok(Math.max(...bs.map(b=>b.y))-Math.min(...bs.map(b=>b.y))<=1,'vertical alignment');}
 results.push({screen,width,dark,...m});
 if(width===390)await page.screenshot({path:`/tmp/header-${screen}-${dark?'dark':'light'}.png`});
 }
 };
 await measure('home',3,false);
 await nav('Wallet');await measure('wallet',2,true);
 await page.locator('.header-add-action').click();await page.locator('[role="dialog"]').waitFor();await page.keyboard.press('Escape');
 await nav('Transactions');await measure('transactions',2,true);
 await page.locator('.header-add-action').click();await page.locator('[role="dialog"]').waitFor();await page.keyboard.press('Escape');
 await nav('Menu');await measure('menu',3,false);
 await page.locator('.menu-tile').filter({hasText:'Crypto market'}).click();
 await page.locator('.market-update time').waitFor();
 await measure('crypto',0,false);
 assert.match(await page.locator('.market-update time').innerText(),/GMT\+8/);
 stamp='2026-11-06T04:40:00Z';
 await page.locator('.market-refresh-button').click();
 await page.locator('.market-update.is-updating').waitFor();
 assert.equal(await page.locator('.market-refresh-button').isDisabled(),true);
 assert.equal(await page.locator('.market-telemetry i').first().evaluate(e=>getComputedStyle(e).animationName),'market-telemetry-pulse');
 await page.waitForFunction(()=>document.querySelector('.market-update time')?.dateTime==='2026-11-06T04:40:00.000Z');
 fail=true;await page.locator('.market-refresh-button').click();await page.locator('.market-update.is-stale:not(.is-updating)').waitFor();
 assert.equal(await page.locator('.market-update time').getAttribute('datetime'),'2026-11-06T04:40:00.000Z');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.market-refresh-button').click();
 assert.equal(await page.locator('.market-telemetry i').first().evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.locator('.market-update:not(.is-updating)').waitFor();
 await page.locator('.screen-header .back-button').click();
 await page.locator('.menu-tile').filter({hasText:'Scheduled'}).click();await page.getByRole('heading',{name:'Scheduled automation · Pro+'}).waitFor();
 assert.deepEqual(errors,[]);
 fs.writeFileSync('/tmp/header-telemetry-results.json',JSON.stringify({results,errors},null,2));
 console.log(`${results.length} responsive screen checks passed; Plus actions, crypto refresh, stale timestamps, timezone and reduced motion passed.`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
