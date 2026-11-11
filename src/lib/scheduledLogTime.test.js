/* Logging a scheduled payment records the moment it was logged on this device (owner, 2026-11-11). */
const mockState = { existing: null, updates: [], created: [], filters: [] };
jest.mock('./supabaseClient', () => {
  const query = (table) => {
    const q = {
      _table: table, _filters: [],
      select() { return q; },
      eq(col, val) { q._filters.push([col, val]); return q; },
      async maybeSingle() { mockState.filters.push([...q._filters]); return { data: mockState.existing, error: null }; },
      update(values) { mockState.updates.push(values); return q; },
      async single() { return { data: { id: 'sched-1' }, error: null }; },
    };
    return q;
  };
  return { supabase: { from: query } };
});
jest.mock('./financeRepository', () => ({
  // A plain function: CRA resets jest.fn implementations between tests.
  createTransaction: async (payload) => { mockState.created.push(payload); return { id: 'tx-1', ...payload }; },
}));
// eslint-disable-next-line import/first
import { logScheduledTransaction } from './scheduledTransactions';

const item = { id: 'sched-1', user_id: 'owner', title: 'Meralco', amount: 2100, currency: 'PHP', transaction_type: 'expense', category: 'Bills', account_id: 'acc-1', scheduled_for: '2026-11-08', frequency: 'monthly', ends_on: null };

beforeEach(() => { mockState.existing = null; mockState.updates = []; mockState.created = []; mockState.filters = []; });

test('the log is stamped with the device time it was logged, not noon UTC on the due date', async () => {
  const now = new Date(2026, 10, 10, 13, 54, 21);
  await logScheduledTransaction(item, 'acc-1', null, now);
  expect(mockState.created).toHaveLength(1);
  expect(mockState.created[0].occurred_at).toBe(now.toISOString());
  expect(mockState.created[0].occurred_at).not.toContain('T12:00:00');
  expect(mockState.created[0].external_reference).toBe('movo-schedule:sched-1:2026-11-08');
  // The schedule still moves to its next due date.
  expect(mockState.updates[0].scheduled_for).toBe('2026-12-08');
});

test('an occurrence already logged is found by its reference and never logged twice', async () => {
  mockState.existing = { id: 'tx-earlier' };
  const result = await logScheduledTransaction(item, 'acc-1', null, new Date());
  expect(result).toEqual({ id: 'tx-earlier' });
  expect(mockState.created).toHaveLength(0);
  expect(mockState.filters[0]).toEqual([['schedule_id', 'sched-1'], ['external_reference', 'movo-schedule:sched-1:2026-11-08']]);
});
