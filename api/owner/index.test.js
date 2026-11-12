'use strict';
jest.mock('@supabase/supabase-js',()=>({createClient:jest.fn()}));
const {createClient}=require('@supabase/supabase-js');
const handler=require('./index');
const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const res=()=>({setHeader:jest.fn(),status:jest.fn().mockReturnThis(),json:jest.fn().mockReturnThis()});
const ownerAuth=(aal='aal2',uid=OWNER)=>({
  auth:{getUser:jest.fn().mockResolvedValue({data:{user:{id:uid}},error:null}),
    getClaims:jest.fn().mockResolvedValue({data:{claims:{sub:uid,aal}},error:null})}
});
const admin=()=>({
  rpc:jest.fn().mockResolvedValue({data:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',error:null}),
  auth:{admin:{getUserById:jest.fn().mockResolvedValue({data:{user:{id:OTHER,email_confirmed_at:'2026-01-01'}},error:null})}},
  from:jest.fn(()=>({select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),order:jest.fn().mockReturnThis(),
    limit:jest.fn().mockResolvedValue({data:[],error:null}),in:jest.fn().mockResolvedValue({data:[],error:null})}))
});
beforeEach(()=>{
  jest.clearAllMocks();
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY='public-test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY='private-test-key';
  process.env.MOVO_OWNER_USER_IDS=OWNER;
});
afterAll(()=>{['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','MOVO_OWNER_USER_IDS'].forEach(k=>delete process.env[k]);});
test('owner API is disabled without an explicit configured UID allowlist',async()=>{
  delete process.env.MOVO_OWNER_USER_IDS;
  const response=res();await handler({method:'GET',headers:{authorization:'Bearer test'},query:{view:'overview'}},response);
  expect(response.status).toHaveBeenCalledWith(503);
  expect(createClient).not.toHaveBeenCalled();
});
test('rejects unauthenticated access before creating privileged clients',async()=>{
  const response=res();await handler({method:'GET',headers:{},query:{view:'overview'}},response);
  expect(response.status).toHaveBeenCalledWith(401);
});
test('rejects regular authenticated users even if they have a paid subscription',async()=>{
  createClient.mockReturnValueOnce(ownerAuth('aal2',OTHER)).mockReturnValueOnce(admin());
  const response=res();await handler({method:'GET',headers:{authorization:'Bearer test'},query:{view:'overview'}},response);
  expect(response.status).toHaveBeenCalledWith(403);expect(response.json).toHaveBeenCalledWith({error:'not_owner'});
});
test('rejects allowlisted owner without MFA',async()=>{
  createClient.mockReturnValueOnce(ownerAuth('aal1')).mockReturnValueOnce(admin());
  const response=res();await handler({method:'GET',headers:{authorization:'Bearer test'},query:{view:'overview'}},response);
  expect(response.status).toHaveBeenCalledWith(403);expect(response.json).toHaveBeenCalledWith({error:'mfa_required'});
});
test('rejects a forged claim subject',async()=>{
  const auth=ownerAuth();auth.auth.getClaims.mockResolvedValue({data:{claims:{sub:OTHER,aal:'aal2'}}});
  createClient.mockReturnValueOnce(auth).mockReturnValueOnce(admin());
  const response=res();await handler({method:'GET',headers:{authorization:'Bearer test'},query:{view:'overview'}},response);
  expect(response.status).toHaveBeenCalledWith(401);
});
test('rejects unrecognized paid tier and invalid grant expiry',async()=>{
  createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(admin());
  const response=res();await handler({method:'POST',headers:{authorization:'Bearer test'},
    body:{action:'grant',userId:OTHER,tier:'ultra',days:400,reason:'Support complimentary grant'}},response);
  expect(response.status).toHaveBeenCalledWith(400);
});
test('authorized verified owner can request server-logged time-bounded Pro+ grant',async()=>{
  const a=admin();createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(a);
  const response=res();await handler({method:'POST',headers:{authorization:'Bearer test'},
    body:{action:'grant',userId:OTHER,tier:'pro_plus',days:30,reason:'Owner complimentary grant'}},response);
  expect(a.rpc).toHaveBeenCalledWith('movo_owner_plan_grant',
    {p_actor:OWNER,p_user:OTHER,p_tier:'pro_plus',p_days:30,p_reason:'Owner complimentary grant'});
  expect(response.status).toHaveBeenCalledWith(200);
});


test('authorized owner can create an audited support work item without a target user',async()=>{
  const a=admin();createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(a);
  const response=res();await handler({method:'POST',headers:{authorization:'Bearer test'},
    body:{action:'work_create',area:'support',title:'Investigate local import',notes:'Test report',priority:'high'}},response);
  expect(a.rpc).toHaveBeenCalledWith('movo_owner_work_create',{
    p_actor:OWNER,p_area:'support',p_title:'Investigate local import',p_notes:'Test report',p_priority:'high'
  });
  expect(response.status).toHaveBeenCalledWith(200);
});
test('owner operational writes reject unsupported areas and oversized notes',async()=>{
  const a=admin();createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(a);
  const response=res();await handler({method:'POST',headers:{authorization:'Bearer test'},
    body:{action:'work_create',area:'internal_finance',title:'Read expenses',notes:'test',priority:'high'}},response);
  expect(response.status).toHaveBeenCalledWith(400);
  expect(a.rpc).not.toHaveBeenCalled();
});
test('owner read access scopes work items by area',async()=>{
  const a=admin();createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(a);
  const response=res();await handler({method:'GET',headers:{authorization:'Bearer test'},query:{view:'support'}},response);
  expect(a.from).toHaveBeenCalledWith('movo_owner_work_items');
  expect(response.status).toHaveBeenCalledWith(200);
});
test('owner work updates fail closed on optimistic write conflict',async()=>{
  const a=admin();a.rpc.mockResolvedValue({data:false,error:null});
  createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(a);
  const response=res();await handler({method:'POST',headers:{authorization:'Bearer test'},
    body:{action:'work_update',id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      expectedUpdatedAt:'2026-11-09T00:00:00.000Z',status:'blocked',priority:'high',notes:'Conflict'}},response);
  expect(response.status).toHaveBeenCalledWith(409);
  expect(response.json).toHaveBeenCalledWith({error:'work_item_changed_reload'});
});

test('overview returns verified aggregate KPIs from the owner-only database function',async()=>{
  const a=admin();
  const kpis={users:{total:3},plans:{free:1,pro:1,proPlus:1},activity:{activeUsers30d:2},daily:[]};
  a.rpc.mockImplementation(async name=>name==='movo_owner_kpis'?{data:kpis,error:null}:{data:[],error:null});
  a.from.mockImplementation(()=>{const q={select:jest.fn(()=>q),eq:jest.fn(()=>q),then:r=>r({count:5,error:null})};return q;});
  createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(a);
  const response=res();await handler({method:'GET',headers:{authorization:'Bearer test'},query:{view:'overview'}},response);
  expect(a.rpc).toHaveBeenCalledWith('movo_owner_kpis');
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json.mock.calls[0][0].kpis).toEqual({status:'verified',data:kpis});
});
test('a missing KPI function is reported as unavailable, never as zeros',async()=>{
  const a=admin();
  a.rpc.mockImplementation(async name=>name==='movo_owner_kpis'?{data:null,error:{code:'42883'}}:{data:[],error:null});
  a.from.mockImplementation(()=>{const q={select:jest.fn(()=>q),eq:jest.fn(()=>q),then:r=>r({count:null,error:{code:'x'}})};return q;});
  createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(a);
  const response=res();await handler({method:'GET',headers:{authorization:'Bearer test'},query:{view:'analytics'}},response);
  expect(response.json.mock.calls[0][0].kpis).toEqual({status:'unavailable'});
});
test('user directory shows each account effective plan, including trials',async()=>{
  const a=admin();
  a.auth.admin.listUsers=jest.fn().mockResolvedValue({data:{users:[{id:OTHER,email:'person@example.test',email_confirmed_at:'2026-01-01',created_at:'2026-01-01',last_sign_in_at:'2026-11-08'}],total:1},error:null});
  a.rpc.mockImplementation(async name=>name==='movo_owner_user_plans'?{data:[{userId:OTHER,tier:'pro',source:'trial',expiresAt:'2026-12-01T00:00:00Z'}],error:null}:{data:null,error:null});
  createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(a);
  const response=res();await handler({method:'GET',headers:{authorization:'Bearer test'},query:{view:'users'}},response);
  expect(a.rpc).toHaveBeenCalledWith('movo_owner_user_plans',{p_users:[OTHER]});
  const body=response.json.mock.calls[0][0];
  expect(body.plans).toBe('verified');
  expect(body.users[0]).toEqual(expect.objectContaining({plan:'pro',planSource:'trial',lastSignIn:'2026-11-08'}));
});
test('billing view reports store checkout readiness by setting NAME only, never values', async()=>{
  const keys=['MOVO_STORE_BILLING_ENABLED','APPLE_IAP_SIGNING_KEY','APPLE_IAP_KEY_ID','APPLE_IAP_ISSUER_ID','APPLE_APP_ID','MOVO_IAP_TOKEN_ENCRYPTION_KEY','CRON_SECRET'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{MOVO_STORE_BILLING_ENABLED:'true',APPLE_IAP_SIGNING_KEY:'SECRET-SIGNING-VALUE',APPLE_IAP_KEY_ID:'SECRET-KEY-ID',
    APPLE_IAP_ISSUER_ID:'SECRET-ISSUER',APPLE_APP_ID:'com.nasrinai.movo',MOVO_IAP_TOKEN_ENCRYPTION_KEY:'a'.repeat(64),CRON_SECRET:'c'.repeat(40)});
  try{
    createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(admin());
    const response=res();await handler({method:'GET',headers:{authorization:'Bearer test'},query:{view:'billing'}},response);
    expect(response.status).toHaveBeenCalledWith(200);
    const body=response.json.mock.calls[0][0];
    expect(body.storeReadiness.apple).toEqual({enabled:false,switchedOn:true,settingsToFix:['APPLE_APP_ID']});
    expect(body.storeReadiness.google.enabled).toBe(false);
    expect(body.storeReadiness.google.settingsToFix).toEqual(expect.arrayContaining(['GOOGLE_PLAY_SERVICE_ACCOUNT_JSON']));
    const text=JSON.stringify(body);
    ['SECRET-SIGNING-VALUE','SECRET-KEY-ID','SECRET-ISSUER','com.nasrinai.movo','private-test-key','a'.repeat(64)].forEach(v=>expect(text).not.toContain(v));
    // Other views never include it.
    createClient.mockReturnValueOnce(ownerAuth()).mockReturnValueOnce(admin());
    const other=res();await handler({method:'GET',headers:{authorization:'Bearer test'},query:{view:'overview'}},other);
    expect(other.json.mock.calls[0][0].storeReadiness).toBeUndefined();
  } finally {
    keys.forEach(k=>{ if(saved[k]===undefined) delete process.env[k]; else process.env[k]=saved[k]; });
  }
});
