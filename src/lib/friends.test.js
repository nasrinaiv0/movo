import { captureFriendInvite, friendDisplayName, friendInviteToken, friendInviteUrl, saveFriendInvite, shareFriendInvite } from './friends';
import { MovoNative, readAppUrl } from './native';
import { isNativeApp } from './platform';

jest.mock('./platform', () => ({ apiUrl: url => url, appOrigin: () => 'https://movo.nasrinai.com', isNativeApp: jest.fn() }));
jest.mock('./native', () => ({ ...jest.requireActual('./native'), MovoNative: { shareFriendInvite: jest.fn() } }));
const token = 'a'.repeat(43);
const url = 'https://movo.nasrinai.com/friend#invite=' + token;

afterEach(() => {
  saveFriendInvite('');
  window.history.replaceState({}, '', '/');
  delete navigator.share;
});

test('accepts only a MOVO link or standalone token and keeps its fragment out of requests', () => {
  expect(friendInviteUrl(token)).toBe(url);
  expect(friendInviteToken(url)).toBe(token);
  expect(friendInviteToken(token)).toBe(token);
  expect(friendInviteToken('https://untrusted.example/friend#invite=' + token)).toBe('');
  expect(friendInviteToken(url.replace('/friend#', '/friend?other=x#'))).toBe('');
  expect(friendInviteToken(url + '&invite=' + token)).toBe('');
  expect(friendInviteToken('movo://friend?invite=' + token)).toBe('');
  window.history.replaceState({}, '', '/#friend=' + token);
  expect(captureFriendInvite()).toBe(token);
  expect(window.location.hash).toBe('');
  expect(captureFriendInvite()).toBe(token);
});

test('native intake accepts only exact friend links and does not reinterpret OAuth or automation links', () => {
  expect(readAppUrl('movo://friend?invite=' + token)).toEqual({ kind: 'friend', token });
  expect(readAppUrl('movo://friend?invite=' + token + '&code=other')).toBeNull();
  expect(readAppUrl('movo://friend?invite=' + token + '#frag')).toBeNull();
  expect(readAppUrl('movo://friend?invite=' + token.slice(1))).toBeNull();
});

test('shares only the invitation URL on the system sheet', async () => {
  isNativeApp.mockReturnValue(true);
  await expect(shareFriendInvite(url, 'Invite')).resolves.toBe('shared');
  expect(MovoNative.shareFriendInvite).toHaveBeenCalledWith({ url });
  isNativeApp.mockReturnValue(false);
  navigator.share = jest.fn().mockResolvedValue(undefined);
  await expect(shareFriendInvite(url, 'Invite')).resolves.toBe('shared');
  expect(navigator.share).toHaveBeenCalledWith({ url, title: 'Invite' });
});

test('display names keep international text and reject control characters and oversized values', () => {
  expect(friendDisplayName('  Nasrin · 李  ')).toBe('Nasrin · 李');
  expect(friendDisplayName('Alice\u202E')).toBe('');
  expect(friendDisplayName('Alice\nBob')).toBe('');
  expect(friendDisplayName('a'.repeat(41))).toBe('');
});
