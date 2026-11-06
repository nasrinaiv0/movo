const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}); const results=[]; const errors=[];
for(const mode of ['light','dark'])for(const accent of ['green','orange'])for(const width of [320,390,430])for(const screen of ['crypto','planning','reminder']){
 console.log(mode,accent,width,screen);
 const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://localhost:3000')?r.continue():r.abort());
 await page.route('**/api/crypto?**',r=>r.fulfill({json:{coins:[{id:'btc-bitcoin',name:'Bitcoin',symbol:'BTC',price:5456789.23,rank:1,change24h:2.53,updatedAt:new Date().toISOString()},{id:'eth-ethereum',name:'Ethereum with a longer asset name',symbol:'ETH',price:185825.12,rank:2,change24h:-3.71,updatedAt:new Date().toISOString()}],points:[]}}));
 await page.goto(`http://localhost:3000/?screen=${screen}&mode=${mode}&accent=${accent}`,{waitUntil:'domcontentloaded'});await page.waitForTimeout(450);
 if(screen==='planning')await page.locator('.fp-glance .fp-row').filter({hasText:'Loans & debts'}).click();
 if(screen==='reminder')await page.locator('.scheduled-due-prompt').waitFor();
 const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,headers:[...document.querySelectorAll('.screen-header button')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),dialog:document.querySelector('[role="dialog"]')?{scroll:document.querySelector('[role="dialog"]').scrollWidth,width:document.querySelector('[role="dialog"]').clientWidth}:null}));
 if(metrics.overflow||metrics.headers.some(x=>x.width!==45||x.height!==45)||metrics.dialog&&metrics.dialog.scroll>metrics.dialog.width+1)throw new Error(JSON.stringify({mode,accent,width,screen,metrics}));
 if(width===390&&accent==='green')await page.screenshot({path:`/tmp/movo-source-transfer/${screen}-${mode}.png`,fullPage:true});
 results.push({mode,accent,width,screen,...metrics});await page.close();
}
await browser.close();fs.writeFileSync('/tmp/movo-source-transfer/ui-results.json',JSON.stringify({results,errors},null,2));if(errors.length)throw new Error(errors.join('\n'));console.log(`${results.length} mobile screen/theme checks passed`);
})().catch(e=>{console.error(e);process.exit(1)});
