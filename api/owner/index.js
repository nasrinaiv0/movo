'use strict';
// MOVO Owner Command Center. This endpoint is never authorized by client-supplied
// role, email, plan, query string, or public REACT_APP configuration.
const { createClient } = require('@supabase/supabase-js');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIER = new Set(['pro','pro_plus']);
const VIEWS = new Set(['overview','analytics','users','billing','grants','security','health','sync','support','compliance','promotions','settings']);
function reply(res,code,data) {
  res.setHeader('Cache-Control','no-store, private');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Vary','Authorization');
  return res.status(code).json(data);
}
function configuration() {
  const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const owners = new Set(String(process.env.MOVO_OWNER_USER_IDS || '').split(',').map(v => v.trim().toLowerCase()).filter(v => UUID.test(v)));
  return {url,anon,service,owners};
}
const safeError = e => String(e?.code || 'unavailable').slice(0,40);
async function collect(admin) {
  const count = async (table,field,eq) => {
    let q = admin.from(table).select('*',{count:'exact',head:true});
    if(field) q=q.eq(field,eq);
    const {count:total,error}=await q;
    return error ? {value:null,status:'unavailable'} : {value:total,status:'verified'};
  };
  const [accounts,transactions,subscriptions,grants,pro,plus] = await Promise.all([
    count('financial_accounts'),count('transactions'),count('movo_store_entitlements'),count('movo_manual_plan_grants'),
    count('movo_store_entitlements','tier','pro'),count('movo_store_entitlements','tier','pro_plus')
  ]);
  return {accounts,transactions,subscriptions,grants,pro,plus};
}
async function audit(admin,actor,action,target,meta) {
  const {error} = await admin.from('movo_owner_audit_log').insert({
    actor_user_id:actor,action,target_user_id:target||null,details:meta||{}
  });
  if(error) throw new Error('audit_failed');
}
async function handler(req,res) {
  if(!['GET','POST'].includes(req.method)){
    res.setHeader('Allow','GET, POST');return reply(res,405,{error:'method_not_allowed'});
  }
  const {url,anon,service,owners}=configuration();
  if(!url||!anon||!service||!owners.size) return reply(res,503,{error:'owner_console_unconfigured'});
  const bearer=/^Bearer ([^\s]+)$/i.exec(req.headers.authorization||'');
  if(!bearer) return reply(res,401,{error:'sign_in_required'});
  const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
  try {
    const auth=createClient(url,anon,opts),admin=createClient(url,service,opts);
    const token=bearer[1];
    const {data:authData,error:authError}=await auth.auth.getUser(token);
    const actor=authData?.user?.id;
    if(authError||!UUID.test(actor||''))return reply(res,401,{error:'invalid_session'});
    if(!owners.has(actor.toLowerCase()))return reply(res,403,{error:'not_owner'});
    // getClaims verifies a signature; never trust raw decoded JWT payload.
    const {data:verified,error:claimsError}=await auth.auth.getClaims(token);
    if(claimsError||!verified?.claims||verified.claims.sub!==actor)
      return reply(res,401,{error:'invalid_claims'});
    if(verified.claims.aal!=='aal2')return reply(res,403,{error:'mfa_required'});
    if(req.method==='POST'){
      const body=req.body && typeof req.body==='object' && !Array.isArray(req.body) ? req.body : {};
      const action=body.action,target=body.userId,tier=body.tier;
      if(!UUID.test(target||'')||typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.length>300)
        return reply(res,400,{error:'invalid_action_fields'});
      if(action==='grant'){
        if(!TIER.has(tier)||!Number.isInteger(body.days)||body.days<1||body.days>366)
          return reply(res,400,{error:'invalid_grant'});
        const {data:userResult,error:userError}=await admin.auth.admin.getUserById(target);
        if(userError||!userResult?.user?.id)return reply(res,404,{error:'user_not_found'});
        if(!userResult.user.email_confirmed_at&&!userResult.user.phone_confirmed_at)
          return reply(res,409,{error:'verified_account_required'});
        const {data,error}=await admin.rpc('movo_owner_plan_grant',{
          p_actor:actor,p_user:target,p_tier:tier,p_days:body.days,p_reason:body.reason.trim()
        });
        if(error)throw error;
        return reply(res,200,{ok:true,id:data});
      }
      if(action==='revoke'){
        if(!UUID.test(body.grantId||''))return reply(res,400,{error:'invalid_grant_id'});
        const {data,error}=await admin.rpc('movo_owner_plan_revoke',{
          p_actor:actor,p_user:target,p_grant:body.grantId,p_reason:body.reason.trim()
        });
        if(error)throw error;
        return reply(res,200,{ok:!!data});
      }
      return reply(res,400,{error:'invalid_action'});
    }
    const view=String(req.query.view||'overview');
    if(!VIEWS.has(view))return reply(res,400,{error:'unknown_view'});
    if(view==='users') {
      const page=Math.min(100,Math.max(1,Number.parseInt(req.query.page,10)||1));
      const {data,error}=await admin.auth.admin.listUsers({page,perPage:50});
      if(error)throw error;
      const ids=(data.users||[]).map(u=>u.id);
      const [{data:manual,error:manualError},{data:store,error:storeError}]=await Promise.all([
        admin.from('movo_manual_plan_grants').select('user_id,tier,expires_at,revoked_at').in('user_id',ids.length?ids:['00000000-0000-0000-0000-000000000000']),
        admin.from('movo_store_entitlements').select('user_id,tier,status,expires_at,environment').in('user_id',ids.length?ids:['00000000-0000-0000-0000-000000000000'])
      ]);
      if(manualError||storeError)throw Error('user_access_unavailable');
      const now=Date.now();
      const users=(data.users||[]).map(u=>{
        const active=[...(manual||[]).filter(g=>g.user_id===u.id&&!g.revoked_at&&Date.parse(g.expires_at)>now),
          ...(store||[]).filter(s=>s.user_id===u.id&&s.environment==='production'&&['active','canceled','grace_period'].includes(s.status)&&Date.parse(s.expires_at)>now)];
        active.sort((a,b)=>Number(b.tier==='pro_plus')-Number(a.tier==='pro_plus'));
        return {id:u.id,email:u.email||'',verified:!!(u.email_confirmed_at||u.phone_confirmed_at),
          createdAt:u.created_at,lastSignIn:u.last_sign_in_at||null,plan:active[0]?.tier||'unknown',
          planSource:active[0]?(Object.hasOwn(active[0],'revoked_at')?'manual':'store'):'not_verified'};
      });
      return reply(res,200,{users,page,total:data.total??null,perPage:50});
    }
    if(view==='grants'){
      const {data,error}=await admin.from('movo_manual_plan_grants')
        .select('id,user_id,tier,expires_at,granted_at,revoked_at,reason')
        .order('granted_at',{ascending:false}).limit(100);
      if(error)throw error;return reply(res,200,{grants:data||[],limitedTo:100});
    }
    if(view==='security'){
      const {data,error}=await admin.from('movo_owner_audit_log')
        .select('id,actor_user_id,action,target_user_id,details,created_at')
        .order('created_at',{ascending:false}).limit(100);
      if(error)throw error;return reply(res,200,{events:data||[],limitedTo:100});
    }
    if(view==='overview'||view==='analytics'||view==='billing'){
      const metrics=await collect(admin);
      return reply(res,200,{metrics,
        revenue:{status:'not_integrated'},retention:{status:'not_integrated'},
        storeSettlements:{status:'not_integrated'},currency:'PHP',
        message:'Only database-backed counts are shown. Revenue and retention require verified integrations.'});
    }
    if(view==='health'){
      const {error}=await admin.from('movo_plan_grants').select('user_id',{head:true,count:'exact'}).limit(1);
      return reply(res,200,{database:error?'degraded':'reachable',server:'reachable',
        deployment:{status:'not_integrated'},mobileCrashes:{status:'not_integrated'},schema:{status:'requires_verification'}});
    }
    return reply(res,200,{status:'not_integrated',
      message:'This module is included in the owner workspace, but no verified provider or backend feed is connected yet.'});
  } catch(e) {
    console.error('[movo-owner] request failed',{code:safeError(e)});
    return reply(res,503,{error:'owner_data_unavailable'});
  }
}
module.exports=handler;
module.exports.configuration=configuration;
