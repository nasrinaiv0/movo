'use strict';
const crypto=require('crypto');
const {send,gate,clients}=require('../lib/referralAuth');
module.exports=async function handler(req,res){
 if(!gate(req,res,'POST'))return;
 try{
  const session=await clients(req);
  if(session.error)return send(res,session.status,{error:session.error});
  const challenge=crypto.randomBytes(32).toString('hex');
  const hash=crypto.createHash('sha256').update(challenge,'utf8').digest('hex');
  const {data,error}=await session.admin.rpc('movo_issue_referral_challenge',{p_user_id:session.userId,p_hash:hash});
  if(error) {
   const code=String(error.message||'');
   return send(res,code.includes('challenge_rate_limit')?429:409,{error:code.includes('no_pending_referral')?'no_pending_referral':'challenge_unavailable'});
  }
  return send(res,200,{challenge,...data});
 }catch{return send(res,503,{error:'challenge_unavailable'});}
};