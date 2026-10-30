import { buildNotifications } from './Notifications';
import { t } from '../lib/i18n';

describe('buildNotifications', () => {
  test('includes transfers and labels them as transfer records', () => {
    const result = buildNotifications([{
      id: 'transfer-1',
      type: 'transfer',
      amount: 2000,
      merchant: 'Transfer to BPI',
      date: '2026-10-29T10:00:00.000Z',
      currency: 'PHP',
    }], []);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Transfer Recorded');
    const body = t(result[0].body, result[0].vars);
    expect(body).toContain('Transfer to BPI');
    expect(body).toContain('transfer recorded');
  });

  test('describes income and expense as recorded entries rather than verified payments', () => {
    const result = buildNotifications([
      { id: 'income-1', type: 'income', amount: 500, merchant: 'Salary', date: '2026-10-29T11:00:00.000Z' },
      { id: 'expense-1', type: 'expense', amount: 125, merchant: 'Coffee', date: '2026-10-29T09:00:00.000Z' },
    ], []);
    expect(result.map(item => item.title)).toEqual(['Income Recorded', 'Expense Recorded']);
    expect(result[0].body).toContain('income recorded');
    expect(result[1].body).toContain('expense recorded');
  });
});
