'use strict';
const {createClient}=require('@supabase/supabase-js');
const {hasPlan}=require('../lib/planAccess');
const {openRouterConfigured,OPENROUTER_URL}=require('../nasrinai/openrouter-fallback.cjs');
const {buildProviderBody,readProviderResponse}=require('./receiptScanCore.cjs');
const MAX_IMAGE_CHARS=2200000; // capped base64 image; bounded under function request limit
const MAX_TEXT_CHARS=14000;
const reply=(res,code,body)=>{
  res.status(code).setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.end(JSON.stringify(body));
};
function originAllowed(req){
  const origin=req.headers?.origin;
  if(!origin)return true; // native apps lack browser Origin, but still require Supabase JWT
  const list=String(process.env.MOVO_ALLOWED_ORIGINS||'https://movo.nasrinai.com,https://movo-lime.vercel.app')
    .split(',').map(v=>v.trim());
  if(process.env.VERCEL_ENV==='preview' && process.env.VERCEL_URL)list.push('https://'+process.env.VERCEL_URL);
  if(process.env.NODE_ENV!=='production')list.push('http://localhost:3000');
  return list.includes(origin);
}
function validPayload(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.consent!==true)return null;
  const data=typeof raw.imageDataUrl==='string'?raw.imageDataUrl:'';
  const text=typeof raw.text==='string'?raw.text:'';
  if(data){
    const matched=/^data:image\/(?:jpeg|png|webp);base64,([a-zA-Z0-9+/]+={0,2})$/.exec(data);
    if(!matched||data.length>MAX_IMAGE_CHARS||matched[1].length<100)return null;
    return {imageDataUrl:data};
  }
  if(!text.trim()||text.length>MAX_TEXT_CHARS)return null;
  return {text:text.trim()};
}
async function scan(req,res,{env=process.env,fetchImpl=globalThis.fetch,clientFactory=createClient,planChecker=hasPlan}={}){
  res.setHeader('Vary','Origin');res.setHeader('Cache-Control','no-store, private');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,{error:'method_not_allowed'});}
  if(!originAllowed(req))return reply(res,403,{error:'origin_not_allowed'});
  const token=/^Bearer ([\w.-]{20,4096})$/.exec(String(req.headers?.authorization||''))?.[1];
  if(!token)return reply(res,401,{error:'sign_in_required'});
  if(req.body?.consent!==true)return reply(res,400,{error:'receipt_ai_consent_required'});
  if(Number(req.headers?.['content-length']||0)>2800000)return reply(res,413,{error:'receipt_too_large'});
  const payload=validPayload(req.body);
  if(!payload)return reply(res,400,{error:'invalid_receipt_input'});
  const url=env.SUPABASE_URL||env.REACT_APP_SUPABASE_URL;
  const pub=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY||env.REACT_APP_SUPABASE_ANON_KEY;
  if(!url||!pub)return reply(res,503,{error:'auth_not_configured'});
  if(!openRouterConfigured(env))return reply(res,503,{error:'receipt_ai_not_configured'});
  try{
    const db=clientFactory(url,pub,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      global:{headers:{Authorization:'Bearer '+token}}});
    const {data,error}=await db.auth.getUser(token);
    if(error||!data?.user?.id)return reply(res,401,{error:'invalid_session'});
    if(!(await planChecker(db,data.user.id)))return reply(res,403,{error:'pro_required'});
    // No account names, balances or existing user financial records are sent to the AI provider.
    const upstream=await fetchImpl(OPENROUTER_URL,{
      method:'POST',
      headers:{Authorization:'Bearer '+String(env.OPENROUTER_API_KEY).trim(),'Content-Type':'application/json',
        Accept:'application/json','HTTP-Referer':'https://movo.nasrinai.com','X-Title':'MOVO Receipt Scan'},
      body:JSON.stringify(buildProviderBody(payload,env)),
      signal:AbortSignal.timeout(30000)
    });
    if(!upstream.ok)return reply(res,upstream.status===429?429:502,{error:upstream.status===429?'ai_rate_limited':'receipt_ai_unavailable'});
    if(Number(upstream.headers?.get?.('content-length')||0)>250000)return reply(res,502,{error:'invalid_ai_reply'});
    const dataText=await upstream.text();
    if(dataText.length>250000)return reply(res,502,{error:'invalid_ai_reply'});
    let structured;
    try{structured=readProviderResponse(JSON.parse(dataText));}
    catch{return reply(res,502,{error:'invalid_ai_reply'});}
    return reply(res,200,{receipt:structured});
  }catch(err){
    const error=err?.name==='TimeoutError'||err?.name==='AbortError'?'ai_timeout':'receipt_ai_unavailable';
    // Never log receipt, token, provider response, customer identifiers or image.
    return reply(res,error==='ai_timeout'?504:503,{error});
  }
}
module.exports=(req,res)=>scan(req,res);
module.exports.scan=scan;
module.exports.validPayload=validPayload;
module.exports.originAllowed=originAllowed;
