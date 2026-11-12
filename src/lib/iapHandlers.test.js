/** @jest-environment node */
jest.mock('@supabase/supabase-js',()=>({createClient:jest.fn()}));
jest.mock('googleapis',()=>({google:{auth:{OAuth2:jest.fn()}}}));
jest.mock('../../api/lib/purchaseVerification',()=>({verifyApple:jest.fn(),verifyGoogle:jest.fn(),decodeAppleTransaction:jest.fn(),verifyAppleNotification:jest.fn(),getProduct:jest.fn(),appleEntitlement:jest.fn()}));
jest.mock('../../api/lib/iapSecurity',()=>{
 const real=jest.requireActual('../../api/lib/iapSecurity');
 return {...real,adminClient:jest.fn(),rpc:jest.fn(),lease:jest.fn(),commit:jest.fn(),acknowledge:jest.fn(),duplicate:jest.fn(),owner:jest.fn()};
});
const S=require('../../api/lib/iapSecurity');
const {google}=require('googleapis');
const V=require('../../api/lib/purchaseVerification');
const verify=require('../../api/purchases/verify');
const googleHook=require('../../api/purchases/google-notifications');
const res=()=>({setHeader:jest.fn(),status:jest.fn().mockReturnThis(),json:jest.fn()});
beforeEach(()=>{jest.clearAllMocks();jest.spyOn(console,'warn').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());
test('client receives the revoked committed result, not the stale active lookup',async()=>{
 const db={auth:{getUser:jest.fn().mockResolvedValue({data:{user:{id:'user'}}})}};
 S.adminClient.mockReturnValue(db);S.rpc.mockResolvedValue(true);
 S.lease.mockImplementation(async(_db,_platform,_key,fn)=>fn('fence'));
 const token='private-token';const key=require('crypto').createHash('sha256').update(token).digest('hex');
 V.verifyGoogle.mockResolvedValue({platform:'google',status:'active',storeSubscriptionKey:key});
 S.commit.mockResolvedValue({entitlementId:'id',status:'revoked',tier:'pro'});S.acknowledge.mockResolvedValue(undefined);
 const response=res();
 await verify({method:'POST',headers:{authorization:'Bearer session'},body:{platform:'google',purchaseToken:token,productIdentifier:'known'}},response);
 expect(response.json).toHaveBeenCalledWith(expect.objectContaining({status:'revoked',acknowledged:false}));
 expect(S.commit.mock.invocationCallOrder[0]).toBeLessThan(S.acknowledge.mock.invocationCallOrder[0]);
});
test('failed commit never acknowledges',async()=>{
 S.adminClient.mockReturnValue({auth:{getUser:async()=>({data:{user:{id:'user'}}})}});S.rpc.mockResolvedValue(true);
 S.lease.mockRejectedValue(new Error('iap_database_unavailable'));
 const response=res();
 await verify({method:'POST',headers:{authorization:'Bearer session'},body:{platform:'google',purchaseToken:'token',productIdentifier:'known'}},response);
 expect(S.acknowledge).not.toHaveBeenCalled();expect(response.status).toHaveBeenCalledWith(503);
});
test.each([
 {iss:'https://evil.example'}, {aud:'wrong'}, {email:'attacker@example.com'}, {email_verified:false},
])('rejects authenticated RTDN with wrong claim %j',async bad=>{
 process.env.GOOGLE_PLAY_RTDN_AUDIENCE='https://movo.example/rtdn';process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL='push@example.com';process.env.GOOGLE_PLAY_RTDN_SUBSCRIPTION='projects/p/subscriptions/s';
 google.auth.OAuth2.mockImplementation(()=>({verifyIdToken:async()=>({getPayload:()=>({iss:'https://accounts.google.com',aud:process.env.GOOGLE_PLAY_RTDN_AUDIENCE,email:'push@example.com',email_verified:true,...bad})})}));
 const response=res();await googleHook({method:'POST',headers:{authorization:'Bearer oidc'},body:{}},response);
 expect(response.status).toHaveBeenCalledWith(401);expect(S.adminClient).not.toHaveBeenCalled();
});
test('authenticated duplicate webhook returns 200 before provider lookup',async()=>{
 process.env.GOOGLE_PLAY_RTDN_AUDIENCE='aud';process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL='push@example.com';process.env.GOOGLE_PLAY_RTDN_SUBSCRIPTION='projects/p/subscriptions/s';
 google.auth.OAuth2.mockImplementation(()=>({verifyIdToken:async()=>({getPayload:()=>({iss:'https://accounts.google.com',aud:'aud',email:'push@example.com',email_verified:true})})}));
 S.duplicate.mockResolvedValue(true);
 const response=res();await googleHook({method:'POST',headers:{authorization:'Bearer oidc'},body:{subscription:process.env.GOOGLE_PLAY_RTDN_SUBSCRIPTION,message:{messageId:'processed',data:'e30='}}},response);
 expect(response.status).toHaveBeenCalledWith(200);expect(V.verifyGoogle).not.toHaveBeenCalled();
});

test('entitlement listing excludes sandbox even for legacy test-user allowlists',async()=>{
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_ANON_KEY='anon';process.env.SUPABASE_SERVICE_ROLE_KEY='service';process.env.MOVO_STORE_TEST_USER_IDS='user';
 const db={auth:{getUser:async()=>({data:{user:{id:'user'}}})},rpc:async()=>({data:{tier:'free',active:false}})};
 const query={select:()=>query,eq:()=>query,order:async()=>({data:[{platform:'apple',product_id:'prod',environment:'production'},{platform:'apple',product_id:'test',environment:'sandbox'}]}),upsert:async()=>({error:null})};
 db.from=jest.fn(()=>query);require('@supabase/supabase-js').createClient.mockReturnValue(db);
 const response=res();await require('../../api/purchases/entitlements')({method:'GET',headers:{authorization:'Bearer session'}},response);
 expect(response.status).toHaveBeenCalledWith(200);
 expect(response.json.mock.calls[0][0].entitlements.map(e=>e.environment)).toEqual(['production']);
 expect(db.from).not.toHaveBeenCalledWith('movo_store_test_users');
 delete process.env.MOVO_STORE_TEST_USER_IDS;
});

test.each([
  ['AUTO_RENEW_DISABLED', 'canceled'],
  ['AUTO_RENEW_ENABLED', 'active'],
])('Apple verified renewal notification %s commits %s without shortening paid time', async (subtype, status) => {
  const appleHook = require('../../api/purchases/apple-notifications');
  const signedDate = Date.parse('2026-11-12T14:00:00.000Z');
  const expiration = '2026-12-12T14:00:00.000Z';
  S.adminClient.mockReturnValue({});
  S.duplicate.mockResolvedValue(false);
  S.owner.mockResolvedValue({ user_id: 'owner' });
  S.lease.mockImplementation(async (_db, _platform, _key, fn) => fn('fence'));
  S.commit.mockResolvedValue({ status });
  V.verifyAppleNotification.mockResolvedValue({
    notificationUUID: 'notification-' + subtype,
    notificationType: 'DID_CHANGE_RENEWAL_STATUS',
    subtype,
    signedDate,
    data: { signedTransactionInfo: 'verified-transaction' },
  });
  V.decodeAppleTransaction.mockResolvedValue({ transaction: { originalTransactionId: 'original', transactionId: 'transaction' } });
  V.verifyApple.mockResolvedValue({ status: 'active', expiresAt: expiration, paidVerified: true, eventAt: '2026-11-10T00:00:00.000Z' });
  const response = res();
  await appleHook({ method: 'POST', body: { signedPayload: 'verified-notification' } }, response);
  expect(response.status).toHaveBeenCalledWith(200);
  const committed = S.commit.mock.calls[0][2];
  expect(committed.status).toBe(status);
  expect(committed.expiresAt).toBe(expiration);
  expect(committed.paidVerified).toBe(true);
  expect(committed.eventAt).toBe(new Date(signedDate).toISOString());
});
