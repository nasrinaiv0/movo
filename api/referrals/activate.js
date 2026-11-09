'use strict';
const crypto=require('crypto');
const {send,gate,clients}=require('../lib/referralAuth');
const {verify}=require('../lib/verifyReferralIntegrity');
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s);
module.exports=async function handler(req,res){
 if(!gate(req,res,'POST'))return;
 try {
  const session=await clients(req);
  if(session.error)return send(res,session.status,{error:session.error});
  const {challengeId,challenge,platform,format,token,keyId}=req.body||{};
  if(!uuid(challengeId)||typeof challenge!=='string'||!/^[a-f0-9]{64}$/.test(challenge))
   return send(res,400,{error:'invalid_challenge'});
  const hash=crypto.createHash('sha256').update(challenge,'utf8').digest('hex');
  const {data:row,error:lookupError}=await session.admin.from('movo_referral_challenges')
   .select('referred_id,challenge_hash,expires_at,used_at').eq('id',challengeId).maybeSingle();
  if(lookupError||!row||row.referred_id!==session.userId||row.challenge_hash!==hash||row.used_at||Date.parse(row.expires_at)<=Date.now())
   return send(res,409,{error:'invalid_or_replayed_challenge'});
  const nativeKeyHash=await verify({platform,format,token,keyId,challenge});
  const {data,error}=await session.admin.rpc('movo_record_native_referral',{
   p_user_id:session.userId,p_challenge_id:challengeId,p_hash:hash,p_platform:platform,p_native_key_hash:nativeKeyHash
  });
  if(error)return send(res,409,{error:'native_referral_claim_rejected'});
  // A legitimate purchase could already have been verified before attestation.
  if(data?.awarded){
   const {data:paid}=await session.admin.from('movo_store_entitlements').select('id')
     .eq('user_id',session.userId).eq('environment','production').eq('paid_verified',true)
     .in('status',['active','canceled','grace_period']).gt('expires_at',new Date().toISOString()).limit(1);
   if(paid?.[0]?.id)await session.admin.rpc('movo_award_referral_upgrade',{p_entitlement_id:paid[0].id,p_user_id:session.userId});
  }
  return send(res,200,{verified:true,...data});
 }catch(error){
  const message=String(error?.message||'');
  console.error('[movo-referrals] native verification failed',{code:message.slice(0,60)});
  return send(res,message==='attestation_not_configured'?503:403,{error:'native_attestation_not_verified'});
 }
};