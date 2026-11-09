import {
  activateNativeReferral, captureReferralFromUrl, claimReferralCode, clearPendingReferralCode, downloadUrl,
  normalizeReferralCode, pendingReferralCode, trialReferralCode,
} from './referrals';
import { AppAttest } from '@capgo/capacitor-app-attest';
import { isNativeApp } from './platform';

jest.mock('@capgo/capacitor-app-attest', () => ({
  AppAttest: { isSupported: jest.fn(), prepare: jest.fn(), createAttestation: jest.fn() }
}));
jest.mock('./platform', () => ({ apiUrl: value => value, appOrigin: () => 'https://movo.nasrinai.com', isNativeApp: jest.fn() }));

const session = { access_token: 'test', user: { id: 'user1' } };
const ok = data => ({ ok: true, json: async () => data });
afterEach(() => { jest.clearAllMocks(); delete global.fetch; window.localStorage.clear(); });

test('referral codes are M + five characters; case and spaces do not matter', () => {
  expect(normalizeReferralCode('M78038')).toBe('M78038');
  expect(normalizeReferralCode(' m78 038 ')).toBe('M78038');
  expect(normalizeReferralCode('MK7Q2Z')).toBe('MK7Q2Z');
  // Too short, too long, wrong prefix, I/O (look like 1/0), symbols, or not text.
  ['M7803', 'M780381', 'X78038', 'MI7803', 'MO7803', 'M78-38', '', null, 78038].forEach(value => expect(normalizeReferralCode(value)).toBeNull());
});

test('the free month sends a short code, an older 24-character code, nothing, or refuses', () => {
  expect(trialReferralCode('m78038')).toBe('M78038');
  expect(trialReferralCode('ABCDEF0123456789ABCDEF01')).toBe('abcdef0123456789abcdef01');
  expect(trialReferralCode('   ')).toBe('');
  expect(trialReferralCode(undefined)).toBe('');
  expect(trialReferralCode('a'.repeat(64))).toBeNull();
  expect(trialReferralCode('hello')).toBeNull();
});

test('download links are per platform and carry only a valid code', () => {
  expect(downloadUrl('ios', 'm78038')).toBe('https://movo.nasrinai.com/api/download?platform=ios&ref=M78038');
  expect(downloadUrl('android', 'M78038')).toBe('https://movo.nasrinai.com/api/download?platform=android&ref=M78038');
  expect(downloadUrl('android', '<script>')).toBe('https://movo.nasrinai.com/api/download?platform=android');
});

test('a code that arrives in a download link is kept on this device and removed from the address', () => {
  window.history.replaceState(null, '', '/?download=ios&ref=m78038&tab=home#top');
  expect(captureReferralFromUrl()).toBe('M78038');
  expect(pendingReferralCode()).toBe('M78038');
  expect(window.location.search).toBe('?tab=home');
  expect(window.location.hash).toBe('#top');
  clearPendingReferralCode();
  expect(pendingReferralCode()).toBe('');
  window.history.replaceState(null, '', '/?ref=not-a-code');
  expect(captureReferralFromUrl()).toBeNull();
  expect(pendingReferralCode()).toBe('');
  expect(window.location.search).toBe('');
  window.history.replaceState(null, '', '/');
});

test('claiming sends only the code; the server decides the link and any reward', async () => {
  global.fetch = jest.fn().mockResolvedValue(ok({ claimed: true }));
  await claimReferralCode(session, 'M78038');
  const [url, request] = global.fetch.mock.calls[0];
  expect(url).toBe('/api/referrals/claim');
  expect(JSON.parse(request.body)).toEqual({ code: 'M78038' });
  expect(request.headers.Authorization).toBe('Bearer test');
});

test('a refused claim reports the server reason as its code', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'too_many_attempts' }) });
  await expect(claimReferralCode(session, 'M78038')).rejects.toMatchObject({ code: 'too_many_attempts' });
});

test('web, non-referred accounts and switched-off points never ask the device for proof', async () => {
  isNativeApp.mockReturnValue(false);
  global.fetch = jest.fn();
  expect(await activateNativeReferral(session)).toBe(false);
  expect(global.fetch).not.toHaveBeenCalled();
  isNativeApp.mockReturnValue(true);
  global.fetch = jest.fn().mockResolvedValue(ok({ pointsEnabled: true, pendingNativeProof: false }));
  expect(await activateNativeReferral(session)).toBe(false);
  global.fetch = jest.fn().mockResolvedValue(ok({ pointsEnabled: false, pendingNativeProof: true }));
  expect(await activateNativeReferral(session)).toBe(false);
  expect(AppAttest.prepare).not.toHaveBeenCalled();
});

test('native signup proof is generated for a server challenge, never a client-issued reward', async () => {
  isNativeApp.mockReturnValue(true);
  AppAttest.isSupported.mockResolvedValue({ isSupported: true });
  AppAttest.prepare.mockResolvedValue({ keyId: 'native-key' });
  AppAttest.createAttestation.mockResolvedValue({ platform: 'ios', format: 'apple-app-attest', token: 'signed-attestation', keyId: 'native-key' });
  global.fetch = jest.fn()
    .mockResolvedValueOnce(ok({ pointsEnabled: true, pendingNativeProof: true }))
    .mockResolvedValueOnce(ok({ challenge: 'c'.repeat(64), challengeId: '01234567-aaaa-4aaa-aaaa-0123456789ab' }))
    .mockResolvedValueOnce(ok({ verified: true }));
  expect(await activateNativeReferral(session)).toBe(true);
  expect(AppAttest.createAttestation).toHaveBeenCalledWith(expect.objectContaining({ keyId: 'native-key', challenge: 'c'.repeat(64) }));
  const body = JSON.parse(global.fetch.mock.calls[2][1].body);
  expect(body.points).toBeUndefined();
  expect(body.challenge).toBe('c'.repeat(64));
  expect(body.platform).toBe('ios');
});

test('the server verifier refuses web tokens and unsigned client declarations', async () => {
  const { verify } = require('../../api/lib/verifyReferralIntegrity');
  await expect(verify({ platform: 'web', format: 'web-fallback', token: 'x'.repeat(90), challenge: 'a' })).rejects.toThrow('unsupported_attestation');
  await expect(verify({ platform: 'ios', format: 'apple-app-attest', token: 'x'.repeat(90), challenge: 'a', keyId: 'fake' })).rejects.toThrow('attestation_not_configured');
});
