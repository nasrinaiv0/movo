const { chatPayload, cardPayload } = require('../../api/lib/friendChat');
const connectionId = '44f55c33-1749-4507-9ff9-a0e6a0000001';
const clientId = '44f55c33-1749-4507-9ff9-a0e6a0000002';

test('only a verified connection identifier and projected text leave the client API', () => {
  expect(chatPayload('open', { connectionId, ownerId: 'impersonated', ledger: ['private'] })).toEqual({ connectionId });
  expect(chatPayload('send', { connectionId, clientId, kind: 'text', body: ' Hello ', senderId: 'forged', accountId: 'secret' }))
    .toEqual({ connectionId, clientId, kind: 'text', body: 'Hello' });
  expect(chatPayload('send', { connectionId, clientId, kind: 'text', body: 'Hi\u202e' })).toEqual({ error: 'invalid_message' });
  expect(chatPayload('send', { connectionId, clientId, kind: 'text', body: 'x'.repeat(2001) })).toEqual({ error: 'invalid_message' });
  expect(chatPayload('send', { connectionId: 'forged', clientId, kind: 'text', body: 'Hi' })).toEqual({ error: 'friend_connection_required' });
});

test('a transaction is an explicit, strictly projected immutable share card, not a payment instruction', () => {
  const input = {
    type: 'expense', amount: 123.456, currency: 'PHP', date: '2026-11-23',
    description: 'Lunch', category: 'Food', accountId: 'bank-secret', cardNumber: '4111', receipt: 'private',
    destinationAccount: 'third party', sendMoney: true,
  };
  expect(cardPayload(input)).toEqual({ type: 'expense', amount: 123.46, currency: 'PHP', date: '2026-11-23',
    description: 'Lunch', category: 'Food' });
  expect(chatPayload('send', { connectionId, clientId, kind: 'transaction', card: input, amount: 999,
    senderId: 'spoofed' })).toEqual({ connectionId, clientId, kind: 'transaction', body: '', card: cardPayload(input) });
  expect(cardPayload({ ...input, amount: -2 })).toBeNull();
  expect(cardPayload({ ...input, date: '2026-02-31' })).toBeNull();
  expect(cardPayload({ ...input, currency: 'PHP!', amount: 20 })).toBeNull();
  expect(chatPayload('send', { connectionId, clientId, kind: 'transaction', card: { ...input, type: 'payment_initiation' } }))
    .toEqual({ error: 'invalid_transaction_card' });
  expect(chatPayload('send', { connectionId, clientId, kind: 'transaction', card: input, receipt: 'private' }).card).not.toHaveProperty('receipt');
});

test('inbox is a read-only action and unknown operations are rejected', () => {
  expect(chatPayload('inbox', { ownerId: 'forged' })).toEqual({});
  expect(chatPayload('transfer_money', { connectionId, clientId })).toEqual({ error: 'invalid_action' });
});
