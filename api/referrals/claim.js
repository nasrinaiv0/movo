'use strict';
const crypto=require('crypto');
const {send,gate,clients}=require('../lib/referralAuth');
module.exports=async function handler(req,res){
 if(!gate(req,res,'POST'))return;
 const token=req.body?.token;
 if(typeof token!=='string'||!/^[0-9a-f]{64}$/i.test(token))return send(res,400,{error:'invalid_invite_token'});
 try{
  const session=await clients(req);
  if(session.error)return send(res,session.status,{error:session.error});
  const hash=crypto.createHash('sha256').update(token.toLowerCase(),'utf8').digest('hex');
  const {data,error}=await session.admin.rpc('movo_claim_invite',{p_user_id:session.userId,p_hash:hash});
  if(error)return send(res,409,{error:'invite_ineligible_or_used'});
  return send(res,200,data);
 }catch{return send(res,503,{error:'claim_unavailable'});}
};