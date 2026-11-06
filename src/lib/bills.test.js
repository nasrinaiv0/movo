import { amountDue, amountRemaining, billsSummary, currentCycleBillOccurrences, occurrenceState, reminderFor, paymentKey } from './bills';
import { validateBill } from './billsRepository';

const occ = (o) => ({ id: 'o1', bill_id: 'b1', currency: 'PHP', expected_amount: 1000, actual_amount: null, late_fee: 0, paid_amount: 0, status: 'scheduled', is_estimate: false, ...o });
const today = '2026-11-15';

describe('MOVO bills', () => {
  test('amount due uses the actual amount over the estimate and adds the late fee', () => {
    expect(amountDue(occ({ actual_amount: 1200, late_fee: 50 }))).toBe(1250);
    expect(amountRemaining(occ({ actual_amount: 1200, late_fee: 50, paid_amount: 250.1 }))).toBe(999.9);
    expect(amountRemaining(occ({ status: 'cancelled' }))).toBe(0);
    expect(amountDue(occ({ expected_amount: 0.1, late_fee: 0.2 }))).toBe(0.3); // no binary float drift
  });

  test('state follows the due date and payments', () => {
    expect(occurrenceState(occ({ due_date: '2026-11-10' }), today)).toBe('overdue');
    expect(occurrenceState(occ({ due_date: today }), today)).toBe('due_today');
    expect(occurrenceState(occ({ due_date: '2026-11-17' }), today)).toBe('due_soon');
    expect(occurrenceState(occ({ due_date: '2026-11-30' }), today)).toBe('scheduled');
    expect(occurrenceState(occ({ due_date: '2026-11-30', paid_amount: 100 }), today)).toBe('partially_paid');
    expect(occurrenceState(occ({ due_date: '2026-11-10', paid_amount: 1000 }), today)).toBe('paid');
    expect(occurrenceState(occ({ due_date: '2026-11-10', status: 'cancelled' }), today)).toBe('cancelled');
  });

  test('summary: due this month counts unpaid amounts only, overdue is past and unpaid, paid comes from payments', () => {
    const list = [
      occ({ id: 'a', due_date: '2026-11-05', paid_amount: 400 }),                       // overdue 600
      occ({ id: 'b', due_date: '2026-11-20', is_estimate: true }),                        // estimated 1000
      occ({ id: 'c', due_date: '2026-11-25', paid_amount: 1000, status: 'paid' }),        // paid, not counted
      occ({ id: 'd', due_date: '2026-12-05' }),                                           // future month: excluded from active due totals
      occ({ id: 'e', due_date: '2026-11-28', status: 'cancelled' }),                      // ignored
    ];
    const s = billsSummary(list, [{ amount: 400, currency: 'PHP', paid_at: '2026-11-04T12:00:00Z' }, { amount: 1000, currency: 'PHP', paid_at: '2026-11-14T12:00:00Z' }, { amount: 250, currency: 'PHP', paid_at: '2026-11-15T12:00:00Z', status: 'reversed' }, { amount: 99, currency: 'PHP', paid_at: '2026-10-30T12:00:00Z' }], today);
    expect(s).toEqual(expect.objectContaining({ dueThisMonth: 1600, estimatedThisMonth: 1000, paidThisMonth: 1400, remaining: 1600, totalDue: 1600, overdue: 600, overdueCount: 1 }));
    expect(s.upcoming.map(o => o.id)).toEqual(['a', 'b']);
  });

  test('summary converts other currencies with toBase', () => {
    const s = billsSummary([occ({ due_date: '2026-11-20', currency: 'USD', expected_amount: 10 })], [], today, (v, cur) => (cur === 'USD' ? v * 58 : v));
    expect(s.dueThisMonth).toBe(580);
  });

  test('reminders: days before, on the day and overdue; none once paid', () => {
    const bill = { reminder_days: [3, 1, 0] };
    expect(reminderFor(occ({ due_date: '2026-11-18' }), bill, today)).toEqual({ kind: 'before', days: 3 });
    expect(reminderFor(occ({ due_date: '2026-11-17' }), bill, today)).toBeNull();
    expect(reminderFor(occ({ due_date: today }), bill, today)).toEqual({ kind: 'today', days: 0 });
    expect(reminderFor(occ({ due_date: '2026-11-12' }), bill, today)).toEqual({ kind: 'overdue', days: 3 });
    expect(reminderFor(occ({ due_date: '2026-11-12', paid_amount: 1000 }), bill, today)).toBeNull();
  });

  test('payment keys are stable per attempt so a retry is recorded once', () => {
    expect(paymentKey('o1', 'n1')).toBe(paymentKey('o1', 'n1'));
    expect(paymentKey('o1', 'n1')).not.toBe(paymentKey('o1', 'n2'));
    expect(paymentKey('o1', 'n1').length).toBeGreaterThanOrEqual(8);
  });

  test('bill input is validated before it reaches the database', () => {
    expect(() => validateBill({ name: '', amount: 1, first_due_date: '2026-11-01' })).toThrow();
    expect(() => validateBill({ name: 'Rent', amount: -5, first_due_date: '2026-11-01' })).toThrow();
    expect(() => validateBill({ name: 'Rent', amount: 5, first_due_date: '31/12/2026' })).toThrow();
    expect(validateBill({ name: ' Rent ', amount: '15000.456', first_due_date: '2026-11-30', frequency: 'nope', reminder_days: [7, 7, 99, 1] }))
      .toEqual(expect.objectContaining({ name: 'Rent', amount: 15000.46, frequency: 'monthly', reminder_days: [7, 1], amount_type: 'fixed', currency: 'PHP' }));
  });
});

test('split payments validate cents, ownership choices, duplicates and total before writing', () => {
  const { validateBillSplits } = require('./bills');
  const accounts = [{ id: 'cash' }, { id: 'bank' }];
  expect(validateBillSplits([{ account_id: 'cash', amount: '0.10' }, { account_id: 'bank', amount: '0.20' }], 0.3, accounts)).toEqual({ valid: true, total: 0.3 });
  for (const parts of [
    [{ account_id: 'cash', amount: '0.301' }],
    [{ account_id: 'cash', amount: 'NaN' }],
    [{ account_id: 'other', amount: '0.20' }],
    [{ account_id: 'cash', amount: '0.20' }, { account_id: 'cash', amount: '0.10' }],
    [{ account_id: 'cash', amount: '0.31' }],
  ]) expect(validateBillSplits(parts, 0.3, accounts).valid).toBe(false);
});


describe('single current billing cycle without duplicated dues', () => {
  const invoice = (id, date, amount = 399.75, more = {}) => occ({
    id: id + '-' + date, bill_id: id, due_date: date,
    expected_amount: amount, ...more,
  });

  test('overdue + present cycle only; no future renewal and no double addition', () => {
    const rows = [
      invoice('internet', '2026-10-16', 450.25),
      invoice('internet', '2026-11-16', 450.25),
      invoice('internet', '2026-12-16', 450.25),
      invoice('internet', '2027-01-16', 450.25),
    ];
    const result = billsSummary(rows, [], '2026-11-06');
    expect(result.upcoming.map(o => o.due_date)).toEqual(['2026-10-16', '2026-11-16']);
    expect(result.overdue).toBe(450.25);
    expect(result.dueThisMonth).toBe(450.25);
    expect(result.totalDue).toBe(900.5);
    expect(result.remaining).toBe(900.5);
  });

  test('no overdue means only the present cycle, not two consecutive bills', () => {
    const result = billsSummary([
      invoice('rent', '2026-11-10', 5250.15),
      invoice('rent', '2026-12-10', 5250.15),
    ], [], '2026-11-06');
    expect(result.overdueCount).toBe(0);
    expect(result.upcoming).toHaveLength(1);
    expect(result.totalDue).toBe(5250.15);
  });

  test('only the next weekly due is current, while actual missed payments remain overdue', () => {
    const rows = ['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24'].map(d => invoice('weekly', d, 10.12));
    const result = billsSummary(rows, [], '2026-11-06');
    expect(result.upcoming.map(o => o.due_date)).toEqual(['2026-11-03', '2026-11-10']);
    expect(result.totalDue).toBe(20.24);
    expect(result.overdue).toBe(10.12);
  });

  test('duplicate occurrence copies count once, and separate bills on the same day remain separate', () => {
    const row = invoice('water', '2026-11-11', 50.05);
    const other = invoice('power', '2026-11-11', 100.10);
    const result = currentCycleBillOccurrences([row, { ...row, id: 'copy' }, other], '2026-11-06');
    expect(result).toHaveLength(2);
    expect(billsSummary([row, row, other], [], '2026-11-06').totalDue).toBe(150.15);
  });

  test('fully paid or cancelled cycles do not recur or count as overdue', () => {
    const result = billsSummary([
      invoice('phone', '2026-10-10', 29.99, { paid_amount: 29.99 }),
      invoice('phone', '2026-11-10', 29.99),
      invoice('phone', '2026-12-10', 29.99),
      invoice('other', '2026-11-10', 44, { status: 'cancelled' }),
    ], [], '2026-11-06');
    expect(result.overdueCount).toBe(0);
    expect(result.upcoming).toHaveLength(1);
    expect(result.totalDue).toBe(29.99);
  });

  test('paid current-month overdue is included in Due this month only once', () => {
    const result = billsSummary([invoice('gas', '2026-11-02', 120.22)], [], '2026-11-06');
    expect(result.dueThisMonth).toBe(120.22);
    expect(result.overdue).toBe(120.22);
    expect(result.totalDue).toBe(120.22);
  });
});
