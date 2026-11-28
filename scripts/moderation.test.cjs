'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { highRiskText, reportPayload, submitAIReport } = require('../api/lib/moderation');
const id = '11111111-1111-4111-8111-111111111111';
const reportId = '22222222-2222-4222-8222-222222222222';
const body = { messageId: id, reason: 'privacy', ownerId: 'forged', content: 'fictional private data' };
test('normal finance text remains allowed and explicit abusive phrases are blocked', () => {
  for (const text of ['Pay the electric bill','Check PIN settings','Child care expense']) assert.equal(highRiskText(text),false);
  for (const text of ['send me your password','ＫＹＳ','send\u200b nudes','kill   yourself']) assert.equal(highRiskText(text),true);
});
test('report only projects UUID and enumerated reason',()=>{
  assert.deepEqual(reportPayload(body),{messageId:id,reason:'privacy'});
  for(const invalid of [null,[],{messageId:'wrong',reason:'privacy'},{messageId:id,reason:'free text'}]) assert.equal(reportPayload(invalid),null);
});
test('disabled report and malformed data do not invoke auth or storage',async()=>{
  let called=0;const get=async()=>{called++;};
  assert.equal((await submitAIReport(body,get,false)).status,503);
  assert.equal((await submitAIReport({},get,true)).status,400);assert.equal(called,0);
});
test('verified session, never caller identity or message body, reaches RPC',async()=>{
  const get=async()=>({verified:true,userId:'owner-A',admin:{rpc:async(name,args)=>{
    assert.equal(name,'movo_report_ai_message');assert.deepEqual(args,{p_actor:'owner-A',p_message_id:id,p_reason:'privacy'});
    return {data:{ok:true,reportId,content:'never returned'}};
  }}});
  assert.deepEqual(await submitAIReport(body,get,true),{status:200,body:{ok:true,reportId}});
});
test('unverified and invalid sessions rejected before RPC',async()=>{
  assert.equal((await submitAIReport(body,async()=>({verified:false}),true)).status,403);
  assert.equal((await submitAIReport(body,async()=>({error:'sign_in_required',status:401}),true)).status,401);
});
test('missing RPC, foreign message, rate limit and malformed success fail closed',async()=>{
  for(const [result,status] of [[{error:{code:'PGRST202'}},503],[{data:{error:'message_unavailable'}},404],[{data:{error:'report_rate_limit'}},429],[{data:{ok:true}},503]]){
    assert.equal((await submitAIReport(body,async()=>({verified:true,userId:'A',admin:{rpc:async()=>result}}),true)).status,status);
  }
});
