import { activateNativeReferral, claimReferralInvite, createReferralInvite } from './referrals';
import { AppAttest } from '@capgo/capacitor-app-attest';
import { isNativeApp } from './platform';

jest.mock('@capgo/capacitor-app-attest', () => ({
  AppAttest: { isSupported: jest.fn(), prepare: jest.fn(), createAttestation: jest.fn() }
}));
jest.mock('./platform', () => ({ apiUrl: value => value, isNativeApp: jest.fn() }));

const session={access_token:'test',user:{id:'user1'}};
afterEach(() => { jest.clearAllMocks(); delete global.fetch; });

test('a claimed referral token never includes a point amount controlled by the browser', async () => {
  const fetched=jest.fn().mockResolvedValue({ok:true,json:async()=>({claimed:true})});
  global.fetch=fetched;
  await claimReferralInvite(session,'a'.repeat(64));
  const [url,request]=fetched.mock.calls[0];
  expect(url).toBe('/api/referrals/claim');
  expect(JSON.parse(request.body)).toEqual({token:'a'.repeat(64)});
  expect(request.headers.Authorization).toBe('Bearer test');
});

test('invites are issued by server, not by local random identifiers', async () => {
  global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({token:'b'.repeat(64)})});
  const result=await createReferralInvite(session);
  expect(result.token).toBe('b'.repeat(64));
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({});
});

test('web and non-referred accounts cannot generate native signup rewards', async () => {
  isNativeApp.mockReturnValue(false);
  global.fetch=jest.fn();
  expect(await activateNativeReferral(session)).toBe(false);
  expect(global.fetch).not.toHaveBeenCalled();
  isNativeApp.mockReturnValue(true);
  global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({pendingNativeProof:false})});
  expect(await activateNativeReferral(session)).toBe(false);
  expect(AppAttest.prepare).not.toHaveBeenCalled();
});

test('native signup proof is generated for a server challenge, never a client-issued reward', async () => {
  isNativeApp.mockReturnValue(true);
  AppAttest.isSupported.mockResolvedValue({isSupported:true});
  AppAttest.prepare.mockResolvedValue({keyId:'native-key'});
  AppAttest.createAttestation.mockResolvedValue({platform:'ios',format:'apple-app-attest',token:'signed-attestation',keyId:'native-key'});
  global.fetch=jest.fn()
    .mockResolvedValueOnce({ok:true,json:async()=>({pendingNativeProof:true})})
    .mockResolvedValueOnce({ok:true,json:async()=>({challenge:'c'.repeat(64),challengeId:'01234567-aaaa-4aaa-aaaa-0123456789ab'})})
    .mockResolvedValueOnce({ok:true,json:async()=>({verified:true})});
  expect(await activateNativeReferral(session)).toBe(true);
  expect(AppAttest.createAttestation).toHaveBeenCalledWith(expect.objectContaining({keyId:'native-key',challenge:'c'.repeat(64)}));
  const body=JSON.parse(global.fetch.mock.calls[2][1].body);
  expect(body.points).toBeUndefined();
  expect(body.challenge).toBe('c'.repeat(64));
  expect(body.platform).toBe('ios');
});

test('the server verifier refuses web tokens and unsigned client declarations', async () => {
  const { verify }=require('../../api/lib/verifyReferralIntegrity');
  await expect(verify({platform:'web',format:'web-fallback',token:'x'.repeat(90),challenge:'a'})).rejects.toThrow('unsupported_attestation');
  await expect(verify({platform:'ios',format:'apple-app-attest',token:'x'.repeat(90),challenge:'a',keyId:'fake'})).rejects.toThrow('attestation_not_configured');
});
