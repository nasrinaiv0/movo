import { fetchAllRows } from './supabasePagination';
import { accountBalance, accountAvailableBalance } from './financeCalculations';

const queryFrom = (source, failPage = -1) => {
  const calls = [];
  const factory = jest.fn(() => ({
    range: jest.fn(async (start, end) => {
      calls.push([start, end]);
      if (start === failPage) return { data: null, error: new Error('network_down') };
      return { data: source.slice(start, end + 1), error: null };
    }),
  }));
  return { factory, calls };
};

test.each([1001, 10000, 10001])('retrieves all %s owner-scoped transactions without cutoff', async count => {
  const original = Array.from({ length: count }, (_, i) => ({ id: 'tx-' + i, transaction_type: 'income', account_id: 'a', amount: 0.01 }));
  const { factory, calls } = queryFrom(original);
  const rows = await fetchAllRows(factory);
  expect(rows).toHaveLength(count);
  expect(rows[0].id).toBe('tx-0');
  expect(rows[count - 1].id).toBe('tx-' + (count - 1));
  expect(calls[0]).toEqual([0, 499]);
  expect(calls[calls.length - 1][0]).toBeGreaterThanOrEqual(1000);
  expect(accountBalance({ id: 'a', opening_balance: 5 }, rows)).toBe(Number((5 + count / 100).toFixed(2)));
});

test('rejects a failed page rather than showing incomplete balances', async () => {
  const { factory } = queryFrom(Array(1001).fill({ amount: 1 }), 500);
  await expect(fetchAllRows(factory)).rejects.toThrow('network_down');
});

test('handles transfers, reversals, pending funds and mixed currencies', async () => {
  const ledger = [
    { id: '1', account_id: 'a', transaction_type: 'expense', amount: 100, currency: 'PHP', is_pending: true },
    { id: '2', account_id: 'a', transaction_type: 'income', amount: 50, currency: 'PHP' },
    { id: '3', account_id: 'a', transfer_to_account_id: 'b', transaction_type: 'transfer', amount: 20, currency: 'PHP' },
    { id: '4', account_id: 'a', transaction_type: 'expense', amount: 5, currency: 'USD', status: 'reversed' },
    { id: '5', account_id: 'a', transaction_type: 'income', amount: 2.25, currency: 'USD' },
  ];
  const { factory } = queryFrom(ledger);
  const rows = await fetchAllRows(factory, { pageSize: 2 });
  const fx = (amount, from) => from === 'USD' ? amount * 50 : amount;
  expect(accountBalance({id:'a',currency:'PHP',opening_balance:100}, rows, fx)).toBe(242.5);
  expect(accountAvailableBalance({id:'a',currency:'PHP',opening_balance:100}, rows, fx)).toBe(142.5);
  expect(accountBalance({id:'b',currency:'PHP',opening_balance:0}, rows, fx)).toBe(20);
  expect(accountBalance({id:'a',currency:'PHP',opening_balance:100}, [{...ledger[4],currency:'XYZ'}], () => NaN)).toBeNaN();
});
