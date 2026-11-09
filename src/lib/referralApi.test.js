/* Server routes for referral codes, the free month and download links (api/). */
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
const { createClient } = require('@supabase/supabase-js');
const claim = require('../../api/referrals/claim');
const status = require('../../api/referrals/status');
const challenge = require('../../api/referrals/challenge');
const trial = require('../../api/purchases/trial');
const download = require('../../api/download');
const { normalizeReferralCode, normalizeTrialCode } = require('../../api/lib/referralCode');

const USER = '11111111-1111-4111-8111-111111111111';
const res = () => {
  const r = { headers: {}, statusCode: 200 };
  r.setHeader = jest.fn((k, v) => { r.headers[k] = v; });
  r.status = jest.fn(code => { r.statusCode = code; return r; });
  r.json = jest.fn(body => { r.body = body; return r; });
  r.end = jest.fn(() => r);
  return r;
};
let rpc;
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'public-test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'private-test-key';
  delete process.env.MOVO_REFERRAL_POINTS_ENABLED;
  delete process.env.MOVO_IOS_APP_STORE_URL;
  delete process.env.MOVO_ANDROID_STORE_URL;
  rpc = jest.fn().mockResolvedValue({ data: { claimed: true }, error: null });
  createClient.mockImplementation(() => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null }) },
    rpc,
  }));
});
afterAll(() => {
  ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'MOVO_REFERRAL_POINTS_ENABLED', 'MOVO_IOS_APP_STORE_URL', 'MOVO_ANDROID_STORE_URL'].forEach(k => delete process.env[k]);
});
const post = (body, auth = 'Bearer signed-in') => ({ method: 'POST', headers: { authorization: auth }, body });

test('server and app agree on the code format', () => {
  expect(normalizeReferralCode(' m78038 ')).toBe('M78038');
  expect(normalizeReferralCode('MO7803')).toBeNull();
  expect(normalizeTrialCode(undefined)).toBe('');
  expect(normalizeTrialCode('M78038')).toBe('M78038');
  expect(normalizeTrialCode('abcdefabcdefabcdefabcdef')).toBe('abcdefabcdefabcdefabcdef');
  expect(normalizeTrialCode('nope')).toBeNull();
  expect(normalizeTrialCode(5)).toBeNull();
});

test('claim: needs a valid code and a signed-in account, and passes only the verified user id', async () => {
  let r = res(); await claim(post({ code: 'not-a-code' }), r);
  expect(r.statusCode).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
  r = res(); await claim(post({ code: 'M78038' }, ''), r);
  expect(r.statusCode).toBe(401);
  r = res(); await claim(post({ code: 'm78038', userId: 'someone-else' }), r);
  expect(r.statusCode).toBe(200);
  expect(r.body).toEqual({ claimed: true });
  expect(rpc).toHaveBeenCalledWith('movo_claim_referral_code', { p_user_id: USER, p_code: 'M78038' });
  expect(r.headers['Cache-Control']).toBe('private, no-store');
});

test('claim: database reasons map to statuses, unknown reasons are not echoed', async () => {
  rpc.mockResolvedValueOnce({ data: { claimed: false, error: 'too_many_attempts' }, error: null });
  let r = res(); await claim(post({ code: 'M78038' }), r);
  expect(r.statusCode).toBe(429);
  expect(r.body).toEqual({ error: 'too_many_attempts' });
  rpc.mockResolvedValueOnce({ data: { claimed: false, error: 'already_referred' }, error: null });
  r = res(); await claim(post({ code: 'M78038' }), r);
  expect(r.statusCode).toBe(409);
  rpc.mockResolvedValueOnce({ data: { claimed: false, error: '<internal detail>' }, error: null });
  r = res(); await claim(post({ code: 'M78038' }), r);
  expect(r.body).toEqual({ error: 'referral_not_eligible' });
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'function does not exist' } });
  r = res(); await claim(post({ code: 'M78038' }), r);
  expect(r.statusCode).toBe(503);
  r = res(); await claim({ method: 'GET', headers: {} }, r);
  expect(r.statusCode).toBe(405);
});

test('status reports whether points are switched on; native proof routes stay closed until then', async () => {
  rpc.mockResolvedValueOnce({ data: { referralCode: 'M78038', points: 0, canClaim: true }, error: null });
  let r = res(); await status({ method: 'GET', headers: { authorization: 'Bearer x' } }, r);
  expect(r.body).toEqual({ referralCode: 'M78038', points: 0, canClaim: true, pointsEnabled: false });
  r = res(); await challenge(post({}), r);
  expect(r.statusCode).toBe(503);
  expect(r.body).toEqual({ error: 'referrals_not_configured' });
  process.env.MOVO_REFERRAL_POINTS_ENABLED = 'true';
  rpc.mockResolvedValueOnce({ data: { points: 5 }, error: null });
  r = res(); await status({ method: 'GET', headers: { authorization: 'Bearer x' } }, r);
  expect(r.body.pointsEnabled).toBe(true);
});

test('free month: short and older codes are sent, wrong ones refused, returned errors are reported', async () => {
  rpc.mockResolvedValue({ data: { tier: 'pro', source: 'trial' }, error: null });
  let r = res(); await trial(post({ referralCode: ' m78038 ' }), r);
  expect(rpc).toHaveBeenLastCalledWith('claim_movo_trial', { p_referral_code: 'M78038' });
  expect(r.statusCode).toBe(200);
  r = res(); await trial(post({}), r);
  expect(rpc).toHaveBeenLastCalledWith('claim_movo_trial', { p_referral_code: null });
  r = res(); await trial(post({ referralCode: 'ABCDEFABCDEFABCDEFABCDEF' }), r);
  expect(rpc).toHaveBeenLastCalledWith('claim_movo_trial', { p_referral_code: 'abcdefabcdefabcdefabcdef' });
  rpc.mockClear();
  r = res(); await trial(post({ referralCode: 'a'.repeat(64) }), r);
  expect(r.statusCode).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
  rpc.mockResolvedValueOnce({ data: { error: 'invalid_referral_code' }, error: null });
  r = res(); await trial(post({ referralCode: 'M00001' }), r);
  expect(r.statusCode).toBe(400);
  expect(r.body).toEqual({ error: 'invalid_referral_code' });
  rpc.mockResolvedValueOnce({ data: { error: 'too_many_attempts' }, error: null });
  r = res(); await trial(post({ referralCode: 'M00001' }), r);
  expect(r.statusCode).toBe(429);
});

test('download: sends each platform to its store once listed, otherwise to the web app with the code', () => {
  let r = res(); download({ method: 'GET', query: { platform: 'ios', ref: 'm78038' } }, r);
  expect(r.statusCode).toBe(302);
  expect(r.headers.Location).toBe('/?download=ios&ref=M78038');
  process.env.MOVO_IOS_APP_STORE_URL = 'https://apps.apple.com/ph/app/movo/id1234567890';
  process.env.MOVO_ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.nasrinai.movo';
  r = res(); download({ method: 'GET', query: { platform: 'ios', ref: 'M78038' } }, r);
  expect(r.headers.Location).toBe('https://apps.apple.com/ph/app/movo/id1234567890');
  r = res(); download({ method: 'GET', query: { platform: 'android' } }, r);
  expect(r.headers.Location).toBe('https://play.google.com/store/apps/details?id=com.nasrinai.movo');
});

test('download: never redirects to an unexpected address and ignores bad input', () => {
  process.env.MOVO_IOS_APP_STORE_URL = 'https://evil.example/app/id1234567890';
  process.env.MOVO_ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.someone.else';
  let r = res(); download({ method: 'GET', query: { platform: 'ios', ref: '"><script>' } }, r);
  expect(r.headers.Location).toBe('/?download=ios');
  r = res(); download({ method: 'GET', query: { platform: 'android', ref: 'M78038' } }, r);
  expect(r.headers.Location).toBe('/?download=android&ref=M78038');
  r = res(); download({ method: 'GET', query: { platform: 'https://evil.example', ref: 'M78038' } }, r);
  expect(r.headers.Location).toBe('/?ref=M78038');
  r = res(); download({ method: 'GET', query: { platform: '__proto__' } }, r);
  expect(r.headers.Location).toBe('/');
  r = res(); download({ method: 'POST', query: {} }, r);
  expect(r.statusCode).toBe(405);
});
