import { buildNotifications } from './Notifications';

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
    expect(result[0].title).toBe('Transfer Completed');
    expect(result[0].body).toContain('Transfer to BPI');
  });
});
