/** @jest-environment node */
jest.mock('@supabase/supabase-js',()=>({createClient:jest.fn()}));
jest.mock('googleapis',()=>({google:{auth:{OAuth2:jest.fn()}}}));
jest.mock('../../api/lib/purchaseVerification',()=>({verifyApple:jest.fn(),verifyGoogle:jest.fn(),decodeAppleTransaction:jest.fn(),verifyAppleNotification:jest.fn(),appleEntitlement:jest.fn(),getProduct:jest.fn()}));
jest.mock('../../api/lib/iapSecurity',()=>{
 const real=jest.requireActual('../../api/lib/iapSecurity');
 return {...real,adminClient:jest.fn(),rpc:jest.fn(),lease:jest.fn(),commit:jest.fn(),acknowledge:jest.fn(),duplicate:jest.fn(),owner:jest.fn(),publisher:jest.fn()};
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
 const query={select:()=>query,eq:()=>query,order:async()=>({data:[{platform:'apple',product_id:'prod',environment:'production'},{platform:'apple',product_id:'test',environment:'sandbox'}]}),upsert:async()=>({error:null}),maybeSingle:async()=>({data:null,error:null})};
 db.from=jest.fn(()=>query);require('@supabase/supabase-js').createClient.mockReturnValue(db);
 const response=res();await require('../../api/purchases/entitlements')({method:'GET',headers:{authorization:'Bearer session'}},response);
 expect(response.status).toHaveBeenCalledWith(200);
 expect(response.json.mock.calls[0][0].entitlements.map(e=>e.environment)).toEqual(['production']);
 expect(db.from).toHaveBeenCalledWith('movo_store_test_users');
 delete process.env.MOVO_STORE_TEST_USER_IDS;
});

test('service-owned tester admission exposes Apple and Google test entitlements to their owner',async()=>{
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_ANON_KEY='anon';process.env.SUPABASE_SERVICE_ROLE_KEY='service';
 const db={auth:{getUser:async()=>({data:{user:{id:'user'}}})},rpc:async()=>({data:{tier:'pro',active:true}})};
 const query={select:()=>query,eq:()=>query,order:async()=>({data:[{platform:'google',product_id:'real',environment:'production'},{platform:'google',product_id:'test',environment:'sandbox'},{platform:'apple',product_id:'apple-test',environment:'sandbox'}]}),upsert:async()=>({error:null}),maybeSingle:async()=>({data:{user_id:'user'},error:null})};
 db.from=jest.fn(()=>query);require('@supabase/supabase-js').createClient.mockReturnValue(db);
 const response=res();await require('../../api/purchases/entitlements')({method:'GET',headers:{authorization:'Bearer session'}},response);
 expect(response.status).toHaveBeenCalledWith(200);
 expect(response.json.mock.calls[0][0].entitlements.map(e=>e.environment)).toEqual(['production','sandbox','sandbox']);
});
test('unknown-owner license-test RTDN is not promoted to a real paid entitlement',async()=>{
 process.env.GOOGLE_PLAY_RTDN_AUDIENCE='aud';process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL='push@example.com';process.env.GOOGLE_PLAY_RTDN_SUBSCRIPTION='projects/p/subscriptions/s';
 google.auth.OAuth2.mockImplementation(()=>({verifyIdToken:async()=>({getPayload:()=>({iss:'https://accounts.google.com',aud:'aud',email:'push@example.com',email_verified:true})})}));
 S.adminClient.mockReturnValue({});S.duplicate.mockResolvedValue(false);S.owner.mockResolvedValue(null);
 S.publisher.mockReturnValue({purchases:{subscriptionsv2:{get:async()=>({data:{testPurchase:{}}})}}});
 S.lease.mockImplementation(async(_db,_platform,_key,fn)=>fn('fence'));S.acknowledge.mockResolvedValue(true);
 const event={version:'1.0',packageName:'com.nasrinai.movo',eventTimeMillis:String(Date.now()),subscriptionNotification:{version:'1.0',notificationType:4,purchaseToken:'license-test-token'}};
 const response=res();await googleHook({method:'POST',headers:{authorization:'Bearer oidc'},body:{subscription:'projects/p/subscriptions/s',message:{messageId:'test-rtdn',data:Buffer.from(JSON.stringify(event)).toString('base64')}}},response);
 expect(response.status).toHaveBeenCalledWith(200);expect(S.commit).not.toHaveBeenCalled();
});

const appleHook=require('../../api/purchases/apple-notifications');
async function appleEvent({environment='sandbox',owner={user_id:'user'},type='DID_RENEW',eventEnvironment}={}) {
 const tx={originalTransactionId:'apple-test-original',transactionId:'apple-test-transaction',productId:'com.nasrinai.movo.pro.monthly'};
 S.adminClient.mockReturnValue({});S.duplicate.mockResolvedValue(false);S.owner.mockResolvedValue(owner);
 S.lease.mockImplementation(async(_db,_platform,_key,fn)=>fn('fence'));
 V.verifyAppleNotification.mockResolvedValue({notificationUUID:'apple-test-event',notificationType:type,signedDate:Date.now(),data:{signedTransactionInfo:'signed-test-jws',environment:eventEnvironment || (environment==='sandbox'?'Sandbox':'Production')}});
 V.decodeAppleTransaction.mockResolvedValue({transaction:tx,environment});
 V.verifyApple.mockResolvedValue({platform:'apple',environment,status:'active',paidVerified:false});
 V.appleEntitlement.mockReturnValue({platform:'apple',environment,status:'revoked',paidVerified:false});
 V.getProduct.mockReturnValue({tier:'pro'});S.commit.mockResolvedValue({});
 const response=res();await appleHook({method:'POST',body:{signedPayload:'signed-event'},headers:{}},response);return response;
}
test('Apple Sandbox renewal stays bound to its existing MOVO owner',async()=>{
 const response=await appleEvent();
 expect(response.status).toHaveBeenCalledWith(200);
 expect(V.verifyApple).toHaveBeenCalledWith('signed-test-jws','user');
 expect(S.commit).toHaveBeenCalledWith(expect.anything(),'user',expect.objectContaining({environment:'sandbox',paidVerified:false}),'fence','apple-test-event');
});
test('Apple Sandbox refunds retain their environment and never become production evidence',async()=>{
 await appleEvent({type:'REFUND'});
 expect(V.appleEntitlement).toHaveBeenCalledWith(expect.anything(),'sandbox','user');
 expect(S.commit).toHaveBeenCalledWith(expect.anything(),'user',expect.objectContaining({environment:'sandbox',status:'revoked',paidVerified:false}),'fence','apple-test-event');
});
test('unclaimed Apple Sandbox events cannot create production tombstones',async()=>{
 const response=await appleEvent({type:'REFUND',owner:null});
 expect(response.status).toHaveBeenCalledWith(200);expect(S.commit).not.toHaveBeenCalled();
});
test('signed notification and transaction environment must match',async()=>{
 const response=await appleEvent({eventEnvironment:'Production'});
 expect(response.status).toHaveBeenCalledWith(400);expect(S.commit).not.toHaveBeenCalled();expect(S.lease).not.toHaveBeenCalled();
});
