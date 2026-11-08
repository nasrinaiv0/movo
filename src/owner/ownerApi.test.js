'use strict';
jest.mock('@supabase/supabase-js',()=>({createClient:jest.fn()}));
const {createClient}=require('@supabase/supabase-js');
const handler=require('../../api/owner');
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
