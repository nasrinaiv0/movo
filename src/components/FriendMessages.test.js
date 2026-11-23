import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { FriendChatsDirectory, FriendConversation } from './FriendMessages';
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


test('recipient must accept and map a same-currency account before opening the normal Save review', async () => {
  const message = {
    id: 'd48c0401-90ee-43c4-9b0e-bac4fbaca001',
    kind: 'transaction', senderId: 'mika-owner', createdAt: '2026-11-23T09:30:00Z',
    card: { type: 'expense', amount: 99.5, currency: 'PHP', date: '2026-11-23', description: 'Lunch' },
  };
  chatRequest.mockImplementation(async (_, action) => {
    if (action === 'open') return { name:'Mika',photo:'',messages:[message] };
    if (action === 'decisions') return { decisions: [] };
    if (action === 'accept_share') return { ok:true,status:'accepted',messageId:message.id };
    if (action === 'decline_share') return { ok:true,status:'declined',messageId:message.id };
    return { ok:true };
  });
  const onReviewImport=jest.fn();
  const accounts=[{id:'bank-php',account_type:'bank',currency:'PHP',name:'My bank'},
    {id:'bank-usd',account_type:'bank',currency:'USD',name:'Other bank'}];
  const {el,close}=await mount(<FriendConversation session={session} friend={connection}
    accounts={accounts} ownedTransactions={[]} onReviewImport={onReviewImport} />);
  expect(el.textContent).toContain('Accept for review');
  expect(el.textContent).toContain('Decline');
  expect(onReviewImport).not.toHaveBeenCalled();
  expect(chatRequest.mock.calls.some(c => c[1] === 'confirm_share_import')).toBe(false);
  await click([...el.querySelectorAll('button')].find(button => button.textContent.includes('Accept for review')));
  expect(el.textContent).toContain('Accepted for review. No transaction has been added yet.');
  const picker=el.querySelector('.friend-chat-import-form select');
  expect(picker.textContent).toContain('My bank');
  expect(picker.textContent).not.toContain('Other bank');
  const button=[...el.querySelectorAll('button')].find(b => b.textContent.includes('Review and import'));
  expect(button.disabled).toBe(true);
  change(picker,'bank-php');
  expect(button.disabled).toBe(false);
  await click(button);
  expect(onReviewImport).toHaveBeenCalledWith({
    message:expect.objectContaining({id:message.id}),accountId:'bank-php',
    transferToAccountId:'',connectionId:connection.id,
  });
  // No ledger operation occurs in the chat UI; the normal save sheet owns the write.
  expect(chatRequest.mock.calls.some(c=>c[1]==='confirm_share_import')).toBe(false);
  close();
});

test('decline leaves finances untouched and a previously imported message cannot be accepted twice', async () => {
  const message={ id:'d48c0401-90ee-43c4-9b0e-bac4fbaca001',
    senderId:'mika-owner',kind:'transaction',card:{type:'income',amount:20,currency:'PHP',date:'2026-11-23'} };
  chatRequest.mockImplementation(async (_, action) => {
    if(action==='open')return {name:'Mika',photo:'',messages:[message]};
    if(action==='decisions')return {decisions:[]};
    if(action==='decline_share')return {ok:true,status:'declined'};
    if(action==='accept_share')return {ok:true,status:'accepted'};
    return {ok:true};
  });
  const onReviewImport=jest.fn();
  const {el,close}=await mount(<FriendConversation session={session} friend={connection}
    onReviewImport={onReviewImport} />);
  await click([...el.querySelectorAll('button')].find(b=>b.textContent==='Decline'));
  expect(el.textContent).toContain('You declined this transaction.');
  expect(onReviewImport).not.toHaveBeenCalled();
  close();
});
