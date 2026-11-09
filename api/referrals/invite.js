'use strict';
const crypto=require('crypto');
const {send,gate,clients}=require('../lib/referralAuth');
module.exports=async function handler(req,res){
 if(!gate(req,res,'POST'))return;
 try {
  const session=await clients(req);
  if(session.error)return send(res,session.status,{error:session.error});
  const token=crypto.randomBytes(32).toString('hex');
  const hash=crypto.createHash('sha256').update(token,'utf8').digest('hex');
  const {data,error}=await session.admin.rpc('movo_issue_invite',{p_user_id:session.userId,p_hash:hash});
  if(error)return send(res,String(error.message||'').includes('invite_rate_limit')?429:503,{error:'invite_unavailable'});
  return send(res,200,{...data,token});
 }catch{return send(res,503,{error:'invite_unavailable'});}
};