import {
  friendImportReference, eligibleFriendImportAccounts, friendImportAlreadySaved,
  prepareFriendImport, sameImportedCard,
} from './friendTransactionImport';

const message = {
  id: 'd48c0401-90ee-43c4-9b0e-bac4fbaca001', kind: 'transaction',
  card: { type: 'expense', amount: 124.5, currency: 'PHP', date: '2026-11-23',
    description: 'Lunch', category: 'food:groceries', accountId: 'sender-private',
    cardNumber: '4111111111111111', receipt_path: '/private', beneficiary: 'private' },
};
const friendId = 'd48c0401-90ee-43c4-9b0e-bac4fbaca002';
const accounts = [
  { id: 'account-1', currency: 'PHP', account_type: 'bank', name: 'Own bank' },
  { id: 'account-2', currency: 'PHP', account_type: 'e_wallet', name: 'Own wallet' },
  { id: 'account-3', currency: 'USD', account_type: 'cash', name: 'Foreign wallet' },
  { id: 'account-4', currency: 'PHP', account_type: 'bank', is_archived: true },
];

test('can only select active, same-currency recipient accounts', () => {
  expect(eligibleFriendImportAccounts(message.card, accounts).map(a => a.id)).toEqual(['account-1','account-2']);
  expect(prepareFriendImport({ message, connectionId: friendId, accountId: 'account-3', accounts })).toBeNull();
  expect(prepareFriendImport({ message, connectionId: friendId, accountId: 'account-4', accounts })).toBeNull();
});

test('imports a narrow receipt-free ledger draft with the immutable source amount and ID', () => {
  const result = prepareFriendImport({ message, connectionId: friendId, accountId: 'account-1', accounts });
  expect(result).toEqual({
    messageId: message.id, connectionId: friendId,
    shared: { amount: 124.5, type: 'expense', currency: 'PHP', date: '2026-11-23' },
    draft: expect.objectContaining({
      amount: '124.5', merchant: 'Lunch', transaction_type: 'expense',
      category: 'food:groceries', account_id: 'account-1', transfer_to_account_id: '',
      occurred_at: '2026-11-23', receipt_path: '', receipt_file: null,
      payment_reference: '', subscriptionPaymentId: '',
    }),
  });
  expect(JSON.stringify(result)).not.toMatch(/sender-private|cardNumber|411111|beneficiary|\/private/);
  expect(friendImportReference(message.id)).toBe('movo-friend:' + message.id);
  expect(sameImportedCard(result.draft, result.shared, 'PHP')).toBe(true);
  expect(sameImportedCard({ ...result.draft, amount: '124.51' }, result.shared, 'PHP')).toBe(false);
  expect(sameImportedCard({ ...result.draft, transaction_type: 'income' }, result.shared, 'PHP')).toBe(false);
  expect(sameImportedCard(result.draft, result.shared, 'USD')).toBe(false);
});

test('a transfer needs two distinct recipient-owned accounts in exactly the same currency', () => {
  const tx = { ...message, card: { ...message.card, type: 'transfer' } };
  expect(prepareFriendImport({ message: tx, connectionId: friendId, accountId: 'account-1', accounts })).toBeNull();
  expect(prepareFriendImport({ message: tx, connectionId: friendId, accountId: 'account-1', transferToAccountId: 'account-1', accounts })).toBeNull();
  expect(prepareFriendImport({ message: tx, connectionId: friendId, accountId: 'account-1', transferToAccountId: 'account-3', accounts })).toBeNull();
  const result = prepareFriendImport({ message: tx, connectionId: friendId, accountId: 'account-1', transferToAccountId: 'account-2', accounts });
  expect(result.draft).toMatchObject({ account_id: 'account-1', transfer_to_account_id: 'account-2', transaction_type: 'transfer' });
});

test('exactly-once identity survives retries, existing ledger rows and synced copies', () => {
  const reference = friendImportReference(message.id);
  expect(friendImportAlreadySaved([{ id: message.id }], message.id)).toBe(true);
  expect(friendImportAlreadySaved([{ id: 'another', external_reference: reference }], message.id)).toBe(true);
  expect(friendImportAlreadySaved([{ id: 'another', external_reference: 'some-other-reference' }], message.id)).toBe(false);
  expect(friendImportAlreadySaved([], 'bad-message-id')).toBe(false);
  expect(prepareFriendImport({ message: { ...message, id: 'invalid' }, connectionId: friendId, accountId: 'account-1', accounts })).toBeNull();
  expect(prepareFriendImport({ message: { ...message, card: { ...message.card, date: '2026-02-31' } }, connectionId: friendId, accountId: 'account-1', accounts })).toBeNull();
});
