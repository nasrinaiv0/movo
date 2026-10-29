import {
  calculateAccountBalances,
  calculateExpenseCategoryTotals,
  calculateLedgerNet,
  calculateMonthlyStats,
  sumMoneyValues,
  transactionAccountDeltaCents,
} from './financeCalculations';

const account = (id, opening_balance = 0) => ({ id, name: id, opening_balance, currency: 'PHP' });
const tx = (id, transaction_type, amount, account_id, extra = {}) => ({
  id, transaction_type, amount, account_id, occurred_at: '2026-10-10T12:00:00+08:00', category: 'Food', ...extra,
});

describe('shared finance calculations', () => {
  test('recalculates all account balances from the same ledger', () => {
    const accounts = [account('cash', 1000), account('bank', 500)];
    const transactions = [
      tx('salary', 'income', 1000.1, 'bank'),
      tx('groceries', 'expense', 25.25, 'cash'),
      tx('transfer', 'transfer', 100, 'cash', { transfer_to_account_id: 'bank' }),
    ];
    expect(calculateAccountBalances(accounts, transactions).map((row) => row.balance)).toEqual([874.75, 1600.1]);
    expect(sumMoneyValues(calculateAccountBalances(accounts, transactions).map((row) => row.balance))).toBe(2474.85);
    expect(calculateLedgerNet(transactions)).toBe(974.85);
  });

  test('transfers move money between accounts without changing overall net', () => {
    const transfer = tx('transfer', 'transfer', 250, 'checking', { transfer_to_account_id: 'savings' });
    expect(transactionAccountDeltaCents(transfer, 'checking')).toBe(-25000);
    expect(transactionAccountDeltaCents(transfer, 'savings')).toBe(25000);
    expect(calculateLedgerNet([transfer])).toBe(0);
  });

  test('pending transactions do not change balances or realized month totals', () => {
    const pending = tx('pending', 'expense', 50, 'cash', { is_pending: true });
    expect(calculateAccountBalances([account('cash', 100)], [pending])[0].balance).toBe(100);
    const month = calculateMonthlyStats([pending], '2026-10');
    expect(month.expenses).toBe(0);
    expect(month.net).toBe(0);
  });

  test('monthly summaries keep currencies separate and never imply an FX conversion', () => {
    const rows = [
      tx('php-income', 'income', 100, 'php', { currency: 'PHP' }),
      tx('php-expense', 'expense', 25, 'php', { currency: 'PHP' }),
      tx('usd-income', 'income', 20, 'usd', { currency: 'USD' }),
      tx('usd-expense', 'expense', 5, 'usd', { currency: 'USD' }),
    ];
    const php = calculateMonthlyStats(rows, '2026-10', 'PHP');
    const usd = calculateMonthlyStats(rows, '2026-10', 'USD');
    expect(php).toMatchObject({ currency: 'PHP', income: 100, expenses: 25, net: 75 });
    expect(php.list.map((row) => row.id)).toEqual(['php-income', 'php-expense']);
    expect(usd).toMatchObject({ currency: 'USD', income: 20, expenses: 5, net: 15 });
    expect(usd.list.map((row) => row.id)).toEqual(['usd-income', 'usd-expense']);
  });

  test('account balances ignore transactions whose currency does not match the account', () => {
    const accounts = [
      { ...account('php', 100), currency: 'PHP' },
      { ...account('usd', 50), currency: 'USD' },
    ];
    const rows = [
      tx('php-income', 'income', 10, 'php', { currency: 'PHP' }),
      tx('usd-income', 'income', 20, 'usd', { currency: 'USD' }),
    ];
    expect(calculateAccountBalances(accounts, rows).map((row) => [row.currency, row.balance])).toEqual([
      ['PHP', 110], ['USD', 70],
    ]);
  });

  test('monthly savings equals income minus expenses and excludes transfers', () => {
    const rows = [
      tx('income', 'income', 1200.1, 'bank'),
      tx('expense', 'expense', 200.05, 'bank'),
      tx('transfer', 'transfer', 500, 'bank', { transfer_to_account_id: 'savings' }),
      { ...tx('old', 'expense', 900, 'bank'), occurred_at: '2026-09-30T23:59:00+08:00' },
    ];
    const month = calculateMonthlyStats(rows, '2026-10');
    expect(month.income).toBe(1200.1);
    expect(month.expenses).toBe(200.05);
    expect(month.transfers).toBe(500);
    expect(month.net).toBe(1000.05);
    expect(month.count).toBe(3);
  });

  test('category totals use the same cent-safe expense values as the summary', () => {
    const rows = [
      tx('a', 'expense', 0.1, 'cash', { category: 'Food' }),
      tx('b', 'expense', 0.2, 'cash', { category: 'Food' }),
      tx('c', 'income', 100, 'cash', { category: 'Income' }),
    ];
    expect(calculateExpenseCategoryTotals(rows, (category) => category)).toEqual({ Food: 0.3 });
  });

  test('sum of decimal values is calculated in integer cents', () => {
    expect(sumMoneyValues([0.1, 0.2, 0.3])).toBe(0.6);
  });
});
