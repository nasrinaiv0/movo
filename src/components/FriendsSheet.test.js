import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FriendsWorkspace from './FriendsWorkspace';
import { useFriendsController } from './FriendsController';
import { friendsRequest } from '../lib/friends';
import { chatRequest } from '../lib/friendChat';
jest.mock('../lib/friendChat', () => ({ ...jest.requireActual('../lib/friendChat'), chatRequest: jest.fn() }));

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
function FriendsHarness(props) {
  const [mode, navigate] = React.useState(props.initialMode || (props.inviteToken ? 'join' : 'chats'));
  const [friend, select] = React.useState(props.initialFriend || null);
  const onNavigate = (next, person) => { if (person) select(person); navigate(next); };
  const controller = useFriendsController({ ...props, routeMode: mode, onNavigate });
  return <FriendsWorkspace {...props} controller={controller} friend={friend} user={{ name: 'Nas', initial: 'N' }}
    onNavigate={onNavigate} onBack={() => navigate('chats')} inbox={{ friends: controller.friends, error: '', reload: controller.reload }} />;
}
async function mount(props) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<FriendsHarness {...props} />));
  return { el, render: async props => { await act(async () => root.render(<FriendsHarness {...props} />)); }, close: () => { act(() => root.unmount()); el.remove(); } };
}

test('opening a received link previews a name, then an explicit tap accepts and refreshes the list', async () => {
  let accepted = false;
  friendsRequest.mockImplementation(async (_auth, action) => {
    if (action === 'preview') return { name: 'Mika', connected: false };
    if (action === 'accept') { accepted = true; return { name: 'Mika', connected: true }; }
    return { friends: accepted ? [{ id: 'connection', name: 'Mika' }] : [], activeInviteUntil: null };
  });
  const onInviteHandled = jest.fn();
  const onConnectionsChanged = jest.fn();
  const { el, close } = await mount({ session, inviteToken: token, onInviteHandled, onConnectionsChanged });
  expect(el.textContent).toContain('Mika');
  expect(friendsRequest.mock.calls.some(call => call[1] === 'accept')).toBe(false);
  type(el, 'Nas');
  await click(el, 'Accept invite');
  expect(friendsRequest).toHaveBeenCalledWith(session, 'accept', { token, name: 'Nas' }, expect.any(AbortSignal));
  expect(onInviteHandled).toHaveBeenCalled();
  expect(onConnectionsChanged).toHaveBeenCalled();
  expect(el.textContent).toContain('You and Mika are now friends.');
  expect(el.querySelector('.friend-chat-inbox-text strong').textContent).toBe('Mika');
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
  await act(async () => el.querySelector('[aria-label="My profile"]').click());
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
  await act(async () => el.querySelector('[aria-label="Add friend"]').click());
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
  await act(async () => el.querySelector('[aria-label="My profile"]').click());
  await click(el, 'Share profile'); type(el, 'Alice'); await click(el, 'Create invite');
  await act(async () => el.querySelector('[aria-label="Back"]').click());
  await act(async () => el.querySelector('[aria-label="Add friend"]').click()); await click(el, 'Paste invite link');
  type(el, 'https://movo.nasrinai.com/friend#invite=' + token); await click(el, 'Review invite');
  type(el, 'Bob'); await act(async () => el.querySelector('[aria-label="Back"]').click());
  await act(async () => el.querySelector('[aria-label="My profile"]').click()); await click(el, 'Share profile');
  expect(el.querySelector('.friend-profile-card h3').textContent).toBe('Alice');
  close();
});


test('an invite mutation from the previous owner is aborted and cannot expose its QR to the new owner', async () => {
  let finishCreate;
  friendsRequest.mockImplementation(async (_auth, action) => {
    if (action === 'create') return new Promise(resolve => { finishCreate = resolve; });
    return { friends: [], activeInviteUntil: null, requests: [], blocked: [] };
  });
  const { el, render, close } = await mount({ session, initialMode: 'invite' });
  type(el, 'Previous owner'); await click(el, 'Create invite');
  const signal = friendsRequest.mock.calls.find(call => call[1] === 'create')[3];
  await render({ session: { user: { id: 'another-owner' }, access_token: 'another-token' } });
  expect(signal.aborted).toBe(true);
  await act(async () => finishCreate({ token, expiresAt: new Date(Date.now()+60000).toISOString() }));
  expect(el.querySelector('.friends-qr')).toBeNull(); expect(el.textContent).not.toContain('Previous owner'); close();
});

test('confirming a safety dialog after an account switch cannot mutate the previous account', async () => {
  let finishConfirm;
  const confirmAction = jest.fn(() => new Promise(resolve => { finishConfirm = resolve; }));
  friendsRequest.mockResolvedValue({ friends: [], requests: [], blocked: [], activeInviteUntil: null });
  const { el, render, close } = await mount({ session, initialMode: 'detail', initialFriend: { id: 'connection', name: 'Mika' }, confirmAction });
  await click(el, 'Remove friend');
  expect(confirmAction).toHaveBeenCalled();
  await render({ session: { user: { id: 'next-owner' }, access_token: 'next-token' }, confirmAction });
  await act(async () => finishConfirm(true));
  expect(friendsRequest.mock.calls.some(call => call[1] === 'remove')).toBe(false); close();
});

test('a confirmed block removes the current inbox contact immediately and returns to Chats', async () => {
  const removed = jest.fn(), confirmAction = jest.fn().mockResolvedValue(true);
  friendsRequest.mockResolvedValue({ friends: [], requests: [], blocked: [], activeInviteUntil: null });
  const { el, close } = await mount({ session, initialMode: 'detail', initialFriend: { id: 'connection', name: 'Mika' }, confirmAction, onConnectionRemoved: removed });
  await click(el, 'Block user');
  expect(friendsRequest).toHaveBeenCalledWith(session, 'block', { connectionId: 'connection' }, expect.any(AbortSignal));
  expect(removed).toHaveBeenCalledWith('connection'); expect(el.querySelector('h1').textContent).toBe('Chats'); close();
});


test('sent requests reload from server state on another session and cancel without removing a friendship', async () => {
  const requestId = '33333333-3333-4333-8333-333333333333';
  let outgoing = [];
  friendsRequest.mockImplementation(async (auth, action, payload) => {
    if (action === 'directory') return { handle: 'my_handle', discoverable: false, requests: [], blocked: [], outgoing: auth.user?.id === session.user.id || !auth.user ? outgoing : [] };
    if (action === 'search') return { people: [{ handle: 'kai_lee' }] };
    if (action === 'request') { outgoing = [{ id: requestId, handle: 'kai_lee' }]; return { ok: true }; }
    if (action === 'cancel_request') { expect(payload).toEqual({ requestId }); outgoing = []; return { ok: true, canceled: true }; }
    return { friends: [], activeInviteUntil: null };
  });
  const first = await mount({ session, initialMode: 'search' });
  type(first.el, 'kai_lee'); await click(first.el, 'Search'); await click(first.el, 'Send request');
  expect(first.el.textContent).toContain('Awaiting response');
  first.close();
  const otherDevice = { ...session, access_token: 'second-device-token' };
  const second = await mount({ session: otherDevice, initialMode: 'search' });
  expect(second.el.querySelector('.friends-outgoing').textContent).toContain('@kai_lee');
  await click(second.el, 'Cancel request');
  expect(second.el.querySelector('.friends-outgoing').textContent).toContain('No pending requests.');
  expect(friendsRequest.mock.calls.some(call => call[1] === 'remove')).toBe(false); second.close();
});

test('message reporting is shown only for a real server capability and sends identifiers after confirmation', async () => {
  const connection = { id: '33333333-3333-4333-8333-333333333333', name: 'Synthetic friend' };
  const message = { id: '44444444-4444-4444-8444-444444444444', senderId: 'other', kind: 'text', body: 'Synthetic message', createdAt: '2026-11-27T00:00:00Z' };
  let enabled = false;
  friendsRequest.mockImplementation(async (_auth, action) => action === 'directory' ? { handle: 'mine', outgoing: [], messageReportsAvailable: enabled } : { friends: [connection] });
  chatRequest.mockImplementation(async (_auth, action) => action === 'open' ? { name: connection.name, messages: [message] } : { ok: true });
  const first = await mount({ session, initialMode: 'chat', initialFriend: connection });
  expect(first.el.querySelector('.friend-chat-options')).toBeNull(); first.close(); enabled = true;
  const confirmAction = jest.fn().mockResolvedValue(true);
  const second = await mount({ session, initialMode: 'chat', initialFriend: connection, confirmAction });
  const menu = second.el.querySelector('.friend-chat-options');
  menu.open = true;
  act(() => menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(menu.open).toBe(false); expect(document.activeElement).toBe(menu.querySelector('summary'));
  await click(second.el, 'Report a message');
  expect(document.activeElement.textContent).toBe('Cancel');
  await click(second.el, 'Cancel');
  expect(document.activeElement).toBe(menu.querySelector('summary'));
  await click(second.el, 'Report a message');
  expect(friendsRequest.mock.calls.some(call => call[1] === 'report_message')).toBe(false);
  await click(second.el, 'Report this message');
  expect(confirmAction).toHaveBeenCalled();
  expect(friendsRequest).toHaveBeenCalledWith(session, 'report_message', { connectionId: connection.id, messageId: message.id }, expect.any(AbortSignal));
  expect(second.el.textContent).toContain('Report recorded.');
  expect(document.activeElement).toBe(menu.querySelector('summary')); second.close();
});
