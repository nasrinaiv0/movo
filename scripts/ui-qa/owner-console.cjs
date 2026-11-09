'use strict';
// Isolated UI QA only. Requires Playwright and a local server for a build made with a fictitious
// REACT_APP_SUPABASE_URL=https://example.supabase.co (e.g. "serve -s build -l 3000"). Uses a fictitious Supabase session and intercepted API.
// Never use live customer tokens, owner ids, or service-role credentials.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
async function run(){
  const owner='11111111-1111-4111-8111-111111111111';
  const recipient='22222222-2222-4222-8222-222222222222';
  const exp=Math.floor(Date.now()/1000)+3600;
  const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const access_token=[enc({alg:'HS256',typ:'JWT'}),enc({sub:owner,aal:'aal2',role:'authenticated',exp}),'fixture'].join('.');
  const session={access_token,refresh_token:'fixture-only',token_type:'bearer',expires_in:3600,expires_at:exp,
    user:{id:owner,email:'owner@example.test',aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z'}};
  const browser=await chromium.launch({...(process.env.OWNER_QA_CHROME?{executablePath:process.env.OWNER_QA_CHROME}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    for(const width of [390,768,1440]){
      const page=await browser.newPage({viewport:{width,height:900}});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(({session})=>{
        localStorage.setItem('sb-example-auth-token',JSON.stringify(session));
      },{session});
      await page.route('**/auth/v1/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:session.user})}));
      await page.route('**/api/owner?**',route=>{
        const view=new URL(route.request().url()).searchParams.get('view');
        if(route.request().method()==='POST')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'})});
        const metrics=Object.fromEntries(['accounts','transactions','subscriptions','grants','pro','plus'].map((name,i)=>[name,{value:[42,300,12,3,9,3][i],status:'verified'}]));
        const item={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',area:'support',title:'Follow up on billing issue',notes:'Illustrative only',status:'pending',priority:'medium',
          created_at:'2026-11-09T00:00:00Z',updated_at:'2026-11-09T00:00:00Z',updated_by:owner};
        const signupSeries={status:'verified',data:Array.from({length:12},(_,i)=>({
          week:new Date(Date.UTC(2026,7,17+i*7)).toISOString().slice(0,10),count:2+i
        }))};
        const daily=Array.from({length:30},(_,i)=>({day:new Date(Date.UTC(2026,9,11+i)).toISOString().slice(0,10),signups:i%4,activeUsers:3+(i%6),transactions:6+((i*7)%15)}));
        const kpis={status:'verified',data:{generatedAt:'2026-11-09T00:00:00Z',users:{total:42,verified:39,new7d:5,new30d:14,signedIn7d:20,signedIn30d:31},
          plans:{free:28,pro:11,proPlus:3,bySource:{store:4,manual:1,trial:8,referral:1}},trials:{started:20,active:8,ended:12,converted:3},
          activity:{transactions7d:70,transactions30d:300,activeUsers7d:15,activeUsers30d:26,usersWithAccounts:33},
          sources:[{source:'manual',count:180},{source:'notification',count:80},{source:'csv_import',count:40}],daily}};
        const body=['overview','analytics','billing'].includes(view)?{metrics,storeRecords:[],signupSeries,kpis}:
          view==='users'?{users:[{id:recipient,email:'test@example.org',verified:true,createdAt:'2026-10-09T00:00:00Z',lastSignIn:'2026-11-08T00:00:00Z',plan:'pro',planSource:'trial',planExpiresAt:'2026-12-01T00:00:00Z'}],page:1,total:1,plans:'verified'}:
          view==='grants'?{grants:[]}:view==='security'?{events:[]}:
          {items:view==='support'?[item]:[],server:'reachable',database:'reachable',status:'ready'};
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
      });
      await page.goto('http://127.0.0.1:3000/owner',{waitUntil:'networkidle'});
      await page.getByRole('heading',{name:'Overview',exact:true}).waitFor({timeout:10000});
      assert.equal(await page.locator('.occ-stat').count(),4);
      assert.equal(await page.locator('.occ-trend-point').count(),12);
      assert.equal(await page.locator('path.occ-bar').count(),30);
      assert.equal(await page.locator('.occ-legend li').count(),3);
      await page.locator('rect.occ-hit').nth(29).hover();
      assert.ok((await page.locator('.occ-tooltip').innerText()).includes('Records'),'activity tooltip');
      await page.screenshot({path:(process.env.OWNER_QA_OUT||'/tmp')+'/occ-overview-'+width+'.png',fullPage:true});
      const overflow=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
      assert.ok(overflow[0]<=overflow[1]+1,'page overflow '+width+': '+overflow);
      if(width<=760)await page.locator('.occ-mobile-toggle').click();
      await page.getByRole('button',{name:/Users/}).first().click();
      await page.getByRole('heading',{name:'Users',exact:true}).waitFor();
      await page.getByText('te•••@example.org').first().waitFor({timeout:10000});
      assert.ok((await page.locator('.occ-table-scroll').innerText()).includes('te•••@example.org'));
      assert.ok((await page.locator('.occ-table-scroll').innerText()).includes('Free month'),'trial plan source');
      await page.getByRole('button',{name:'Manage',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'Confirm and grant access'}).isDisabled(),true);
      if(width<=760)await page.locator('.occ-mobile-toggle').click();
      await page.getByRole('button',{name:/Support Center/}).first().click();
      await page.getByRole('heading',{name:'Support Center',exact:true}).waitFor();
      await page.locator('.occ-work-item').first().waitFor({timeout:10000});
      assert.equal(await page.locator('.occ-work-item').count(),1);
      await page.getByRole('button',{name:'+ New item'}).click();
      await page.getByRole('textbox',{name:'Title'}).fill('Review import reconciliation');
      assert.equal(await page.getByRole('button',{name:'Create item'}).isEnabled(),true);
      const obstruction=await page.evaluate(()=>{
        const e=document.querySelector('.occ-work-board .occ-primary'),r=e?.getBoundingClientRect();
        if(!e||!r)return 'missing';
        if(r.top<0||r.bottom>innerHeight)return 'outside-view';
        const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
        return e===hit||e.contains(hit)?null:(hit?.className||'unknown');
      });
      assert.equal(obstruction,null,'obstructed new-item button '+width);
      assert.deepEqual(errors,[],'browser javascript errors');
      await page.screenshot({path:(process.env.OWNER_QA_OUT||'/tmp')+'/occ-'+width+'.png',fullPage:true});
      console.log('PASS '+width+'px: dashboard, user grant guard, support form, no horizontal overflow or obstructed controls');
      await page.close();
    }
  } finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
