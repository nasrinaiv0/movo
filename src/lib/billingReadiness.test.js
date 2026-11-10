/** @jest-environment node */
const { billingConfigurationIssues } = require('../../api/lib/billingReadiness');
const config = require('../../api/purchases/config');
test('checkout stays disabled with an enabled flag but missing billing infrastructure',()=>{
 const saved=process.env.MOVO_STORE_BILLING_ENABLED;
 process.env.MOVO_STORE_BILLING_ENABLED='true';
 const res={setHeader:jest.fn(),status:jest.fn().mockReturnThis(),json:jest.fn()};
 config({method:'GET'},res);
 expect(res.json).toHaveBeenCalledWith({enabled:false});
 if(saved===undefined)delete process.env.MOVO_STORE_BILLING_ENABLED;else process.env.MOVO_STORE_BILLING_ENABLED=saved;
});
test('checks configuration shape without exposing values',()=>{
 const env={APPLE_APP_ID:'1234',APPLE_IAP_SIGNING_KEY:'private-key',APPLE_IAP_KEY_ID:'key-id',APPLE_IAP_ISSUER_ID:'issuer',
 GOOGLE_PLAY_RTDN_AUDIENCE:'https://movo.example/rtdn',GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL:'push@example.com',
 GOOGLE_PLAY_RTDN_SUBSCRIPTION:'projects/movo/subscriptions/rtdn',MOVO_IAP_TOKEN_ENCRYPTION_KEY:'ab'.repeat(32),CRON_SECRET:'c'.repeat(32),
 SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'private-service',
 GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'play@example.com',private_key:'-----BEGIN PRIVATE KEY-----'})};
 expect(billingConfigurationIssues(env)).toEqual([]);
 expect(billingConfigurationIssues({...env,GOOGLE_PLAY_RTDN_SUBSCRIPTION:'guess',MOVO_IAP_TOKEN_ENCRYPTION_KEY:'bad'})).toEqual(['GOOGLE_PLAY_RTDN_SUBSCRIPTION','MOVO_IAP_TOKEN_ENCRYPTION_KEY']);
});

test('Google readiness is independent of App Store credentials and stays strict',()=>{
 const env={APPLE_APP_ID:'1234',APPLE_IAP_SIGNING_KEY:'private-key',APPLE_IAP_KEY_ID:'key-id',APPLE_IAP_ISSUER_ID:'issuer',
 GOOGLE_PLAY_RTDN_AUDIENCE:'https://movo.example/rtdn',GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL:'push@example.com',
 GOOGLE_PLAY_RTDN_SUBSCRIPTION:'projects/movo/subscriptions/rtdn',MOVO_IAP_TOKEN_ENCRYPTION_KEY:'ab'.repeat(32),CRON_SECRET:'c'.repeat(32),
 SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'private-service',
 GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'play@example.com',private_key:'-----BEGIN PRIVATE KEY-----'})};
 const noApple={...env, APPLE_APP_ID:'', APPLE_IAP_SIGNING_KEY:'', APPLE_IAP_KEY_ID:'', APPLE_IAP_ISSUER_ID:''};
 expect(billingConfigurationIssues(noApple,'google')).toEqual([]);
 expect(billingConfigurationIssues(noApple,'all')).toContain('APPLE_APP_ID');
 const noGoogle={...env, GOOGLE_PLAY_RTDN_AUDIENCE:'', GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:''};
 expect(billingConfigurationIssues(noGoogle,'apple')).toEqual([]);
 expect(billingConfigurationIssues(noGoogle,'google')).toContain('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
 expect(billingConfigurationIssues(env,'android')).toEqual(['platform']);
 const response={setHeader:jest.fn(),status:jest.fn().mockReturnThis(),json:jest.fn()};
 config({method:'GET',query:{platform:'android'}},response);
 expect(response.status).toHaveBeenCalledWith(400);
 expect(response.json).toHaveBeenCalledWith({enabled:false});
});
