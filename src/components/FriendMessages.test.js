import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { FriendChatsDirectory, FriendConversation } from './FriendMessages';
import FriendImportControls from './FriendImportControls';
import { chatRequest } from '../lib/friendChat';

jest.mock('../lib/friendChat', () => ({ ...jest.requireActual('../lib/friendChat'), chatRequest: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;
const session = { user: { id: 'my-owner' }, access_token: 'secure-session' };
const connection = { id: '123ea9e7-ced2-422c-83ca-e21111111111', name: 'Mika' };

beforeEach(() => {
  chatRequest.mockReset();
  chatRequest.mockImplementation(async (_, action) => {
    if (action === 'inbox') return { friends: [{ ...connection, photo: 'data:image/jpeg;base64,/9j/2Q==', lastMessage: 'Hi', unread: 1 }] };
    if (action === 'open') return { name: 'Mika', photo: 'data:image/jpeg;base64,/9j/2Q==', messages: [] };
    return { ok: true };
  });
});
async function mount(child) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(child));
  return { el, render: async child => { await act(async () => root.render(child)); }, close: () => { act(() => root.unmount()); el.remove(); } };
}
function change(element, value) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set;
    setter.call(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    if (element.tagName !== 'SELECT') element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function click(button) { await act(async () => button.click()); }

test('inbox shows shared friend photo and unread count with no private ledger details', async () => {
  const select = jest.fn();
  const { el, close } = await mount(<FriendChatsDirectory session={session} onSelect={select} />);
  expect(el.textContent).toContain('Mika');
  expect(el.querySelector('.friend-chat-avatar img')).not.toBeNull();
  expect(el.querySelector('.friend-chat-unread').textContent).toBe('1');
  await click(el.querySelector('.friend-chat-inbox-row'));
  expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: connection.id }));
  close();
});

test('sends a private text, with owner identity derived by the server rather than a forged field', async () => {
  const { el, close } = await mount(<FriendConversation session={session} friend={connection} />);
  const field = el.querySelector('#friend-chat-message');
  change(field, 'Hello Mika');
  await click(el.querySelector('.friend-chat-send'));
  expect(chatRequest).toHaveBeenCalledWith(session, 'send', expect.objectContaining({
    connectionId: connection.id, kind: 'text', body: 'Hello Mika', clientId: expect.any(String),
  }), expect.any(AbortSignal));
  expect(el.querySelector('#friend-chat-message').value).toBe('');
  close();
});

test('transaction sharing is opt-in and excludes hidden account fields', async () => {
  const tx = { id: 'tx-1', type: 'expense', date: '2026-11-23', merchant: 'Lunch', category: 'Food',
    amount: 500, origAmount: 50, origCurrency: 'USD', currency: 'PHP', cardNumber: 'not-shared',
    accountName: 'Secret', receipt_path: '/private' };
  const { el, close } = await mount(<FriendConversation session={session} friend={connection} transactions={[tx]} />);
  expect(chatRequest.mock.calls.some(call => call[1] === 'send')).toBe(false);
  await click([...el.querySelectorAll('button')].find(button => button.textContent.includes('Share a transaction')));
  change(el.querySelector('.friend-chat-picker select'), 'tx-1');
  expect(el.textContent).toContain('50.00');
  expect(el.textContent).not.toContain('Secret');
  await click([...el.querySelectorAll('button')].find(button => button.textContent.includes('Send this transaction card')));
  const sent = chatRequest.mock.calls.find(call => call[1] === 'send');
  expect(sent[2]).toMatchObject({
    kind: 'transaction', card: { type: 'expense', amount: 50, currency: 'USD', date: '2026-11-23' },
  });
  expect(JSON.stringify(sent[2])).not.toMatch(/accountName|cardNumber|receipt_path|Secret/);
  close();
});

test('inbox polls status without retransferring cached profile photos', async () => {
  jest.useFakeTimers();
  try {
    chatRequest.mockImplementation(async (_, action) => {
      if (action === 'inbox') return { friends: [{ ...connection, photo: 'data:image/jpeg;base64,/9j/2Q==', unread: 0 }] };
      if (action === 'inbox_brief') return { friends: [{ ...connection, photo: '', lastMessage: 'Hi', unread: 1 }] };
      return { ok: true };
    });
    const { el, close } = await mount(<FriendChatsDirectory session={session} onSelect={() => {}} />);
    expect(el.querySelector('.friend-chat-avatar img')).not.toBeNull();
    await act(async () => { jest.advanceTimersByTime(30000); });
    expect(chatRequest.mock.calls.some(call => call[1] === 'inbox_brief')).toBe(true);
    expect(el.querySelector('.friend-chat-avatar img')).not.toBeNull();
    expect(el.querySelector('.friend-chat-unread').textContent).toBe('1');
    close();
  } finally { jest.useRealTimers(); }
});


test('atomic controls require explicit consent and account mapping; lost response retries same payload', async () => {
  const owner = '123ea9e7-ced2-422c-83ca-e21111111112';
  const mid = '123ea9e7-ced2-422c-83ca-e21111111113';
  const bank = '123ea9e7-ced2-422c-83ca-e21111111114';
  const owned = { user: { id: owner }, access_token: 'synthetic' };
  const message = { id: mid, senderId: 'other', kind: 'transaction', card: { type: 'expense', currency: 'PHP', date: '2026-11-23', amount: 42.25 } };
  const save = jest.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ ownerId: owner, messageId: mid, transactionId: mid, status: 'imported', refreshed: true });
  chatRequest.mockResolvedValue({ messageId: mid, status: 'accepted' });
  const { el, close } = await mount(<FriendImportControls session={owned} connectionId={connection.id} message={message} initialStatus="unreviewed"
    accounts={[{ id: bank, user_id: owner, account_type: 'bank', currency: 'PHP', name: 'Owned bank' }, { id: mid, user_id: 'other', account_type: 'bank', currency: 'PHP', name: 'Foreign bank' }]} onImport={save} />);
  const button = label => [...el.querySelectorAll('button')].find(b => b.textContent.includes(label));
  expect(save).not.toHaveBeenCalled();
  await click(button('Accept'));
  expect(button('Save to my transactions').disabled).toBe(true);
  expect(el.textContent).not.toContain('Foreign bank');
  change(el.querySelector('select'), bank);
  await click(button('Save to my transactions'));
  expect(el.querySelector('select').disabled).toBe(true);
  await click(button('Retry same import'));
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[0][0]).toEqual(save.mock.calls[1][0]);
  expect(el.textContent).toContain('Imported to your records');
  close();
});


test('duplicate send taps use one request; an uncertain failure retries the same UUID and body', async () => {
  let rejectSend;
  chatRequest.mockImplementation(async (_, action) => {
    if (action === 'open') return { name: 'Mika', messages: [] };
    if (action === 'send') return new Promise((_, reject) => { rejectSend = reject; });
    return { ok: true };
  });
  const { el, close } = await mount(<FriendConversation session={session} friend={connection} />);
  change(el.querySelector('#friend-chat-message'), 'Keep this exact draft');
  await act(async () => { el.querySelector('.friend-chat-send').click(); el.querySelector('.friend-chat-send').click(); });
  expect(chatRequest.mock.calls.filter(call => call[1] === 'send')).toHaveLength(1);
  const original = chatRequest.mock.calls.find(call => call[1] === 'send')[2];
  await act(async () => rejectSend(Object.assign(new Error('lost reply'), { code: 'chat_network' })));
  expect(el.querySelector('#friend-chat-message').value).toBe('Keep this exact draft');
  chatRequest.mockImplementation(async (_, action) => action === 'open' ? { name: 'Mika', messages: [] } : { ok: true });
  await click(el.querySelector('.friend-chat-send'));
  const attempts = chatRequest.mock.calls.filter(call => call[1] === 'send');
  expect(attempts).toHaveLength(2); expect(attempts[1][2]).toEqual(original);
  close();
});

test('a send reply from the previous owner cannot clear the next owner draft or reopen the old conversation', async () => {
  let resolveSend;
  const nextSession = { user: { id: 'next-owner' }, access_token: 'next-token' };
  chatRequest.mockImplementation(async (auth, action) => {
    if (action === 'open') return { name: auth.user.id === 'next-owner' ? 'New owner friend' : 'Mika', messages: [] };
    if (action === 'send') return new Promise(resolve => { resolveSend = resolve; });
    return { ok: true };
  });
  const { el, render, close } = await mount(<FriendConversation session={session} friend={connection} />);
  change(el.querySelector('#friend-chat-message'), 'Old owner secret'); await click(el.querySelector('.friend-chat-send'));
  const signal = chatRequest.mock.calls.find(call => call[1] === 'send')[3];
  await render(<FriendConversation session={nextSession} friend={connection} />);
  expect(signal.aborted).toBe(true); expect(el.textContent).not.toContain('Old owner secret');
  change(el.querySelector('#friend-chat-message'), 'New owner draft');
  const before = chatRequest.mock.calls.filter(call => call[0].user.id === session.user.id && call[1] === 'open').length;
  await act(async () => resolveSend({ ok: true }));
  expect(el.querySelector('#friend-chat-message').value).toBe('New owner draft');
  expect(el.textContent).toContain('New owner friend');
  expect(chatRequest.mock.calls.filter(call => call[0].user.id === session.user.id && call[1] === 'open')).toHaveLength(before);
  close();
});

test('draft and retry identity survive a profile round trip without persisting to storage', async () => {
  const drafts = new Map();
  let first = await mount(<FriendConversation session={session} friend={connection} drafts={drafts} />);
  change(first.el.querySelector('#friend-chat-message'), 'Only this owner and friend'); first.close();
  const second = await mount(<FriendConversation session={session} friend={connection} drafts={drafts} />);
  expect(second.el.querySelector('#friend-chat-message').value).toBe('Only this owner and friend'); second.close();
  const third = await mount(<FriendConversation session={{ user: { id: 'someone-else' }, access_token: 'other' }} friend={connection} drafts={drafts} />);
  expect(third.el.querySelector('#friend-chat-message').value).toBe(''); third.close();
});

test('foreground message polling preserves history position and offers an explicit jump to latest', async () => {
  jest.useFakeTimers(); const scroll = jest.fn();
  const original = HTMLElement.prototype.scrollIntoView; HTMLElement.prototype.scrollIntoView = scroll;
  try {
    let count = 1;
    chatRequest.mockImplementation(async (_, action) => action === 'open' ? { name: 'Mika', messages: Array.from({ length: count }, (_, i) => ({
      id: String(i), senderId: 'other', kind: 'text', body: 'Message '+i, createdAt: '2026-11-27T00:00:00Z',
    })) } : { ok: true });
    const { el, close } = await mount(<FriendConversation session={session} friend={connection} />);
    const history = el.querySelector('.friend-chat-messages');
    Object.defineProperty(history, 'scrollHeight', { value: 1200 }); Object.defineProperty(history, 'clientHeight', { value: 300 });
    history.scrollTop = 100; act(() => history.dispatchEvent(new Event('scroll', { bubbles: true }))); scroll.mockClear();
    count = 2; await act(async () => { jest.advanceTimersByTime(18000); });
    expect(scroll).not.toHaveBeenCalled(); expect(history.scrollTop).toBe(100);
    await click([...el.querySelectorAll('button')].find(button => button.textContent === 'Jump to latest'));
    expect(scroll).toHaveBeenCalledTimes(1); close();
  } finally { HTMLElement.prototype.scrollIntoView = original; jest.useRealTimers(); }
});

test('a late inbox response cannot replace the current owner inbox even when transport ignores abort', async () => {
  let finishOld;
  const nextSession = { user: { id: 'new-inbox-owner' }, access_token: 'new-inbox-token' };
  chatRequest.mockImplementation(async (auth, action) => {
    if (action === 'inbox' && auth.user.id === session.user.id) return new Promise(resolve => { finishOld = resolve; });
    return { friends: [{ ...connection, name: 'Current owner contact' }] };
  });
  const { el, render, close } = await mount(<FriendChatsDirectory session={session} onSelect={() => {}} />);
  await render(<FriendChatsDirectory session={nextSession} onSelect={() => {}} />);
  await act(async () => finishOld({ friends: [{ ...connection, name: 'Previous owner secret' }] }));
  expect(el.textContent).toContain('Current owner contact'); expect(el.textContent).not.toContain('Previous owner secret'); close();
});


test('opening a conversation after a profile visit restores the stored reading position', async () => {
  const drafts = new Map([[`${session.user.id}:${connection.id}`, { text: 'Draft', scrollTop: 80, atLatest: false }]]);
  chatRequest.mockImplementation(async (_, action) => action === 'open' ? { name: 'Mika', messages: [{ id: '1', senderId: 'other', kind: 'text', body: 'History', createdAt: '2026-11-27T00:00:00Z' }] } : { ok: true });
  const { el, close } = await mount(<FriendConversation session={session} friend={connection} drafts={drafts} />);
  expect(el.querySelector('.friend-chat-messages').scrollTop).toBe(80);
  expect(el.querySelector('#friend-chat-message').value).toBe('Draft');
  expect(el.textContent).toContain('Jump to latest'); close();
});


test('revoked membership removes cached messages and disables sending on the next foreground check', async () => {
  jest.useFakeTimers(); let revoked = false;
  try {
    chatRequest.mockImplementation(async (_, action) => {
      if (action === 'open' && revoked) throw Object.assign(new Error('revoked'), { code: 'friend_connection_required' });
      if (action === 'open') return { name: 'Mika', messages: [{ id: 'old', senderId: 'other', kind: 'text', body: 'Previously authorized', createdAt: '2026-11-27T00:00:00Z' }] };
      return { ok: true };
    });
    const { el, close } = await mount(<FriendConversation session={session} friend={connection} />);
    expect(el.textContent).toContain('Previously authorized'); revoked = true;
    await act(async () => { jest.advanceTimersByTime(18000); });
    expect(el.textContent).not.toContain('Previously authorized');
    expect(el.textContent).toContain('This friend connection is no longer available.');
    expect(el.querySelector('.friend-chat-send').disabled).toBe(true); close();
  } finally { jest.useRealTimers(); }
});
