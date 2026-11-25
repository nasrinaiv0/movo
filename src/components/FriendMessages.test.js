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
  return { el, close: () => { act(() => root.unmount()); el.remove(); } };
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
  }));
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
