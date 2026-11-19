import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FriendsSheet from './FriendsSheet';
import { friendsRequest } from '../lib/friends';

jest.mock('../lib/friends', () => ({ ...jest.requireActual('../lib/friends'), friendsRequest: jest.fn() }));
jest.mock('../lib/platform', () => ({
  nativePlatform: () => 'web', isNativeApp: () => false, appOrigin: () => 'https://movo.nasrinai.com',
}));
global.IS_REACT_ACT_ENVIRONMENT = true;
const session = { user: { id: 'signed-in' }, access_token: 'test' };
const token = 'b'.repeat(43);
const click = (el, name) => act(async () => {
  [...el.querySelectorAll('button')].find(button => button.textContent.trim() === name).click();
});
const type = (el, value) => act(() => {
  const input = el.querySelector('input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
async function mount(props) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<FriendsSheet onClose={() => {}} {...props} />));
  return { el, close: () => { act(() => root.unmount()); el.remove(); } };
}

test('opening a received link previews a name, then an explicit tap accepts and refreshes the list', async () => {
  let accepted = false;
  friendsRequest.mockImplementation(async (_auth, action) => {
    if (action === 'preview') return { name: 'Mika', connected: false };
    if (action === 'accept') { accepted = true; return { name: 'Mika', connected: true }; }
    return { friends: accepted ? [{ id: 'connection', name: 'Mika' }] : [], activeInviteUntil: null };
  });
  const onInviteHandled = jest.fn();
  const { el, close } = await mount({ session, inviteToken: token, onInviteHandled });
  expect(el.textContent).toContain('Mika');
  expect(friendsRequest.mock.calls.some(call => call[1] === 'accept')).toBe(false);
  type(el, 'Nas');
  await click(el, 'Accept invite');
  expect(friendsRequest).toHaveBeenCalledWith(session, 'accept', { token, name: 'Nas' });
  expect(onInviteHandled).toHaveBeenCalled();
  expect(el.textContent).toContain('You and Mika are now friends.');
  expect(el.querySelector('.friends-list b').textContent).toBe('Mika');
  close();
});

test('creates a single QR after entering a share name and clears it after revocation', async () => {
  let activeInviteUntil = null;
  friendsRequest.mockImplementation(async (_auth, action) => {
    if (action === 'create') {
      activeInviteUntil = new Date(Date.now() + 60_000).toISOString();
      return { token, expiresAt: activeInviteUntil };
    }
    if (action === 'revoke') activeInviteUntil = null;
    return { friends: [], activeInviteUntil };
  });
  const { el, close } = await mount({ session });
  await click(el, 'Share profile');
  type(el, 'Nas');
  await click(el, 'Create invite');
  expect(el.querySelector('.friends-qr title').textContent).toBe('Friend invite QR code');
  expect(el.querySelector('input[readonly]').value).toBe('https://movo.nasrinai.com/friend#invite=' + token);
  await click(el, 'Revoke invite');
  expect(el.querySelector('.friends-qr')).toBeNull();
  expect(el.textContent).toContain('Invite revoked.');
  close();
});

test('Add friend offers scanning and pasted links, then requires review before acceptance', async () => {
  friendsRequest.mockImplementation(async (_auth, action) => action === 'preview' ? { name: 'Dirk', connected: false } : { friends: [], activeInviteUntil: null });
  const { el, close } = await mount({ session });
  await click(el, 'Add friend');
  expect(el.textContent).toContain('Scan QR code');
  await click(el, 'Paste invite link');
  type(el, 'https://untrusted.example/friend#invite=' + token);
  await click(el, 'Review invite');
  expect(el.textContent).toContain('Enter a valid MOVO invite link.');
  expect(friendsRequest.mock.calls.some(call => call[1] === 'preview')).toBe(false);
  type(el, 'https://movo.nasrinai.com/friend#invite=' + token);
  await click(el, 'Review invite');
  expect(el.querySelector('.friends-recipient').textContent).toBe('Dirk');
  expect(friendsRequest.mock.calls.some(call => call[1] === 'accept')).toBe(false);
  close();
});

test('an existing QR keeps its original display name after reviewing another invite', async () => {
  const expiresAt = new Date(Date.now() + 60000).toISOString();
  let activeInviteUntil = null;
  friendsRequest.mockImplementation(async (_auth, action) => {
    if (action === 'create') { activeInviteUntil = expiresAt; return { token, expiresAt }; }
    if (action === 'preview') return { name: 'Other friend', connected: false };
    return { friends: [], activeInviteUntil };
  });
  const { el, close } = await mount({ session });
  await click(el, 'Share profile'); type(el, 'Alice'); await click(el, 'Create invite');
  await click(el, 'Add friend'); await click(el, 'Paste invite link');
  type(el, 'https://movo.nasrinai.com/friend#invite=' + token); await click(el, 'Review invite');
  type(el, 'Bob'); await click(el, 'Share profile');
  expect(el.querySelector('.friend-profile-card h3').textContent).toBe('Alice');
  close();
});
