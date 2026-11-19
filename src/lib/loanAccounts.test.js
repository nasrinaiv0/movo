import { loanPaymentMethods, loanPaymentLedger } from './loanAccounts';
const accounts = [
  { id: 'bank', account_type: 'bank', currency: 'PHP' },
  { id: 'debit', account_type: 'card', cardKind: 'debit', linkedAccountId: 'bank', currency: 'PHP' },
  { id: 'credit', account_type: 'card', cardKind: 'credit', currency: 'PHP' },
  { id: 'foreign', account_type: 'card', cardKind: 'credit', currency: 'USD' },
  { id: 'archived', account_type: 'bank', is_archived: true, currency: 'PHP' },
  { id: 'orphan', account_type: 'card', cardKind: 'debit', linkedAccountId: 'missing', currency: 'PHP' },
];
test('repayment choices include active matching-currency cards and resolve linked debit to one bank ledger', () => {
  expect(loanPaymentMethods(accounts, 'PHP').map(a => a.id)).toEqual(['bank', 'debit', 'credit']);
  expect(loanPaymentLedger(accounts, 'debit', 'PHP')).toBe('bank');
  expect(loanPaymentLedger(accounts, 'credit', 'PHP')).toBe('credit');
  expect(loanPaymentLedger(accounts, 'foreign', 'PHP')).toBe('');
  expect(loanPaymentLedger(accounts, 'archived', 'PHP')).toBe('');
});
