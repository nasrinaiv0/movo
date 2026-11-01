import { amountDue, amountRemaining, billsSummary, occurrenceState, reminderFor, paymentKey } from './bills';
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
      occ({ id: 'd', due_date: '2026-12-05' }),                                           // next month: remaining only
      occ({ id: 'e', due_date: '2026-11-28', status: 'cancelled' }),                      // ignored
    ];
    const s = billsSummary(list, [{ amount: 400, currency: 'PHP', paid_at: '2026-11-04T12:00:00Z' }, { amount: 1000, currency: 'PHP', paid_at: '2026-11-14T12:00:00Z' }, { amount: 99, currency: 'PHP', paid_at: '2026-10-30T12:00:00Z' }], today);
    expect(s).toEqual(expect.objectContaining({ dueThisMonth: 1600, estimatedThisMonth: 1000, paidThisMonth: 1400, remaining: 2600, overdue: 600, overdueCount: 1 }));
    expect(s.upcoming.map(o => o.id)).toEqual(['a', 'b', 'd']);
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
