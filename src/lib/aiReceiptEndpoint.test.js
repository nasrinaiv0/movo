'use strict';
const {normalizeReceipt,readProviderResponse,buildProviderBody}=require('../../api/receipts/receiptScanCore.cjs');
const {scan,validPayload}=require('../../api/receipts/scan.js');
const response=()=>({statusCode:200,headers:{},body:'',status(v){this.statusCode=v;return this;},setHeader(k,v){this.headers[k.toLowerCase()]=v;return this;},end(v){this.body=v||'';return this;}});
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example',OPENROUTER_API_KEY:'sk-or-abcdefghijklmnopqrstuv'};
const auth={auth:{getUser:async()=>({data:{user:{id:'user-123'}},error:null})}};
const photo='data:image/jpeg;base64,'+'A'.repeat(120);
const request=()=>({method:'POST',headers:{authorization:'Bearer abcdefghijklmnopqrstuvwxyz'},body:{consent:true,imageDataUrl:photo}});
test('receipt 159: VAT already included and change not counted',()=>{
 const d=normalizeReceipt({merchant:"McDonald's",date:'2026-11-14',time:'02:41:33',total:159,tax:17.04,taxableSales:141.96,cashTendered:500,change:341,currency:'PHP',category:'food:fast_food',items:[{name:'Meal',quantity:1,total:159,category:'food:fast_food',options:['Fries','Coke']}]});
 expect(d).toMatchObject({amount:159,total:159,taxIncluded:true,cashTendered:500,change:341,date:'2026-11-14',time:'02:41:33',category:'food:fast_food',warnings:[]});
 expect(d.items[0].options).toEqual(['Fries','Coke']);
});
test('untrusted model output cannot insert invalid date/category/PAN or invent a total',()=>{
 const d=normalizeReceipt({merchant:'SHOP',date:'2026-02-30',last4:'1234567890123456',category:'../../bad',total:null,items:[{name:'Milk',total:100,category:'evil:foo'}]});
 expect(d).toMatchObject({date:'',last4:'',category:'',amount:0});
 expect(d.items[0].category).toBe('');
 expect(d.warnings).toContain('Total not found. Enter the actual amount before logging.');
});
test('API guards methods, auth, consent and image type before any upstream call',async()=>{
 let r=response();await scan({method:'GET',headers:{},body:{}},r);expect(r.statusCode).toBe(405);
 r=response();await scan({method:'POST',headers:{},body:{consent:true,imageDataUrl:photo}},r);expect(r.statusCode).toBe(401);
 r=response();await scan({...request(),body:{consent:false,imageDataUrl:photo}},r);expect(r.statusCode).toBe(400);
 expect(validPayload({consent:true,imageDataUrl:'data:image/svg+xml;base64,'+'A'.repeat(120)})).toBe(null);
});
test('paid user receives validated AI scan; provider sees only selected receipt',async()=>{
 let sent;const r=response();
 const fetchImpl=async(_url,opt)=>{sent=JSON.parse(opt.body);return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify({choices:[{message:{content:JSON.stringify({merchant:'SHOP',total:159,currency:'PHP'})}}]})};};
 await scan(request(),r,{env,fetchImpl,clientFactory:()=>auth,planChecker:async()=>true});
 expect(r.statusCode).toBe(200);expect(JSON.parse(r.body).receipt.amount).toBe(159);
 expect(JSON.stringify(sent)).toContain('image_url');
 expect(JSON.stringify(sent)).not.toContain('user-123');
 expect(JSON.stringify(sent)).not.toContain('accounts');
 expect(sent.provider.data_collection).toBe('deny');
});
test('entitlement and malformed provider response fail closed',async()=>{
 let r=response();let called=jest.fn();
 await scan(request(),r,{env,fetchImpl:called,clientFactory:()=>auth,planChecker:async()=>false});
 expect(r.statusCode).toBe(403);expect(called).not.toHaveBeenCalled();
 r=response();await scan(request(),r,{env,clientFactory:()=>auth,planChecker:async()=>true,fetchImpl:async()=>({ok:true,headers:{get:()=>null},text:async()=>'{bad'})});
 expect(r.statusCode).toBe(502);
 expect(()=>readProviderResponse({choices:[{message:{content:'invalid'}}]})).toThrow();
 expect(buildProviderBody({imageDataUrl:photo},env).model).toBe('openai/gpt-4.1-mini');
});
