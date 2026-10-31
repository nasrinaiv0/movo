import { creditCardEventEffect, financialPosition, goalProgress, loanEventEffect, loanOutstanding, receivableEventEffect, receivableOutstanding, validateGoalAllocation } from './accounting';

describe('MOVO obligation and goal accounting', () => {
  test('loan proceeds increase cash and liabilities, not income', () => {
    expect(loanEventEffect({ event_type: 'borrowed', amount: 10000 })).toEqual({ accountDelta: 10000, liabilityDelta: 10000, income: 0, expense: 0 });
    expect(loanOutstanding({ id: 'l1', principal_amount: 10000 }, [{ loan_id: 'l1', event_type: 'principal_payment', amount: 2500 }])).toBe(7500);
  });
  test('principal repayment is not expense; interest is expense', () => {
    expect(loanEventEffect({ event_type: 'principal_payment', amount: 1000 })).toEqual({ accountDelta: -1000, liabilityDelta: -1000, income: 0, expense: 0 });
    expect(loanEventEffect({ event_type: 'interest_payment', amount: 100 })).toEqual({ accountDelta: -100, liabilityDelta: 0, income: 0, expense: 100 });
  });
  test('lending and collection are asset transfers, not income or expenses', () => {
    expect(receivableEventEffect({ event_type: 'lent', amount: 2000 })).toEqual({ accountDelta: -2000, receivableDelta: 2000, income: 0, expense: 0 });
    expect(receivableEventEffect({ event_type: 'collected', amount: 500 })).toEqual({ accountDelta: 500, receivableDelta: -500, income: 0, expense: 0 });
    expect(receivableOutstanding({ id: 'r1', amount: 2000 }, [{ receivable_id: 'r1', event_type: 'collected', amount: 500 }])).toBe(1500);
  });
  test('writing off an uncollectible receivable is an expense', () => {
    expect(receivableEventEffect({ event_type: 'written_off', amount: 100 })).toEqual({ accountDelta: 0, receivableDelta: -100, income: 0, expense: 100 });
  });
  test('card purchase creates expense and liability; payment does not duplicate expense', () => {
    expect(creditCardEventEffect({ event_type: 'purchase', amount: 500 })).toEqual({ cashDelta: 0, liabilityDelta: 500, income: 0, expense: 500 });
    expect(creditCardEventEffect({ event_type: 'payment', amount: 500 })).toEqual({ cashDelta: -500, liabilityDelta: -500, income: 0, expense: 0 });
  });
  test('goal progress caps at 100% and released allocations are excluded', () => {
    expect(goalProgress({ id: 'g1', target_amount: 1000 }, [{ goal_id: 'g1', amount: 900 }, { goal_id: 'g1', amount: 300 }, { goal_id: 'g1', amount: 100, status: 'released' }])).toEqual({ target: 1000, saved: 1200, remaining: 0, percent: 100 });
  });
  test('receivables count toward net worth but not available cash', () => {
    expect(financialPosition({ accounts: [{ account_type: 'bank', balance: 10000 }, { account_type: 'cash', balance: 1000 }], loans: [{ outstanding_balance: 3000 }], receivables: [{ outstanding_balance: 2000 }], goalAllocations: [{ amount: 1500 }] })).toMatchObject({ liquidAccounts: 11000, receivableAssets: 2000, assets: 13000, liabilities: 3000, netWorth: 10000, reservedForGoals: 1500, availableMoney: 9500 });
  });
  test('goal allocations cannot exceed eligible funds', () => {
    expect(validateGoalAllocation({ amount: 100, currentAllocated: 400, eligibleFunds: 450 })).toEqual({ valid: false, reason: 'allocation_exceeds_available_funds' });
    expect(validateGoalAllocation({ amount: 50, currentAllocated: 400, eligibleFunds: 450 })).toEqual({ valid: true, reason: null });
  });
});
