import { linkedBankIdForCard, linkedCardsForBank, accountActivityRows } from './bankCardActivity';

const bankA = { id: 'bank-a', account_type: 'bank', name: 'Bank A' };
const bankB = { id: 'bank-b', account_type: 'bank', name: 'Bank B' };
const debit1 = { id: 'debit-1', account_type: 'card', cardKind: 'debit', linkedAccountId: 'bank-a' };
const debit2 = { id: 'debit-2', account_type: 'card', cardKind: 'debit' };
const credit1 = { id: 'credit-1', account_type: 'card', cardKind: 'credit' };
const wrongBank = { id: 'credit-b', account_type: 'card', cardKind: 'credit', issuerBankId: 'bank-b' };
const archived = { id: 'archived', account_type: 'card', cardKind: 'debit', linkedAccountId: 'bank-a', is_archived: true };
const prefs = { cardBankLinks: { 'debit-2': 'bank-a', 'credit-1': 'bank-b' },
  accountStyles: { 'credit-1': { cardKind: 'credit', issuerBankId: 'bank-a' } } };

test('debit links and issuing bank links place each active card under exactly the owning bank', () => {
  expect(linkedCardsForBank(bankA, [bankA, bankB, debit1, debit2, credit1, wrongBank, archived], prefs).map(item => item.id))
    .toEqual(['debit-1', 'debit-2', 'credit-1']);
  expect(linkedCardsForBank(bankB, [bankA, bankB, debit1, debit2, credit1, wrongBank], prefs).map(item => item.id))
    .toEqual(['credit-b']);
  expect(linkedBankIdForCard(credit1, prefs)).toBe('bank-a');
  expect(linkedBankIdForCard(wrongBank, prefs)).toBe('bank-b');
  expect(linkedCardsForBank(debit1, [bankA, debit1], prefs)).toEqual([]);
  expect(linkedCardsForBank(bankA, [{ ...debit1, account_type: 'e_wallet' }], prefs)).toEqual([]);
});

test('bank aggregate contains its own and card activity, transfer appears once, other banks excluded', () => {
  const rows = [
    { id: 'bank-tx', account_id: 'bank-a', date: '2026-11-10' },
    { id: 'debit-tx', account_id: 'debit-1', date: '2026-11-11' },
    { id: 'credit-tx', account_id: 'credit-1', date: '2026-11-12' },
    { id: 'transfer', account_id: 'bank-a', transfer_to_account_id: 'debit-1', date: '2026-11-09' },
    { id: 'transfer', account_id: 'bank-a', transfer_to_account_id: 'debit-1', date: '2026-11-09' },
    { id: 'other-tx', account_id: 'credit-b', date: '2026-11-12' },
  ];
  expect(accountActivityRows(rows, ['bank-a', 'debit-1', 'credit-1']).map(item => item.id))
    .toEqual(['credit-tx', 'debit-tx', 'bank-tx', 'transfer']);
  expect(accountActivityRows(rows, ['debit-1']).map(item => item.id)).toEqual(['debit-tx', 'transfer']);
  expect(accountActivityRows(rows, ['credit-1']).map(item => item.id)).toEqual(['credit-tx']);
  expect(accountActivityRows(rows, ['bank-a']).map(item => item.id)).toEqual(['bank-tx', 'transfer']);
});

test('transfer destination is visible but unrelated and malformed records are excluded', () => {
  expect(accountActivityRows([
    { id: 'incoming', account_id: 'outside', transfer_to_account_id: 'bank-a', date: '2026-11-09' },
    { id: 'outside', account_id: 'outside', date: '2026-11-10' },
    null, { id: 'invalid', date: 'not-a-date' },
  ], ['bank-a']).map(item => item.id)).toEqual(['incoming']);
  expect(accountActivityRows([], ['bank-a'])).toEqual([]);
  expect(accountActivityRows([{ id: 'x', account_id: 'bank-a' }], [])).toEqual([]);
});
