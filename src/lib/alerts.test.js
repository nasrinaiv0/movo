import { buildSystemNotices, isQuiet, deviceLabel } from './alerts';

test('quiet hours handle same-day and overnight windows', () => {
  const at = (h, m = 0) => new Date(2026, 9, 30, h, m);
  expect(isQuiet(at(23), '22:00', '07:00')).toBe(true);
  expect(isQuiet(at(6, 59), '22:00', '07:00')).toBe(true);
  expect(isQuiet(at(7), '22:00', '07:00')).toBe(false);
  expect(isQuiet(at(13), '12:00', '14:00')).toBe(true);
  expect(isQuiet(at(13), '', '07:00')).toBe(false);
});

test('builds real notices from records: renewals, limits, monthly report, tip, sign-ins and updates', () => {
  const now = new Date(2026, 10, 1, 10);
  const txs = [{ date: '2026-10-05T10:00:00', type: 'expense', amount: 300 }, { date: '2026-10-06T10:00:00', type: 'income', amount: 1000 }];
  const subs = { upcoming: [{ id: 's1', name: 'Netflix', amount: 549, currency: 'PHP', next: '2026-11-02' }, { id: 's2', name: 'Far', amount: 1, next: '2026-11-20' }] };
  const out = buildSystemNotices({ txs, now, subs, budgets: [{ category: 'Food', level: 'over', percent: 120 }], tips: [{ key: 'Tip {n}', vars: { n: 1 } }], devices: [{ id: 'me', label: 'Safari on iPhone', at: '2026-10-30T00:00:00Z' }, { id: 'other', label: 'Chrome on Mac', at: '2026-10-31T00:00:00Z' }], deviceId: 'me', fmt: v => `₱${v}` });
  const ids = out.map(n => n.id);
  expect(ids).toEqual(expect.arrayContaining(['renew-s1-2026-11-02', 'limit-Food-2026-11', 'report-2026-10', 'signin-other']));
  expect(ids).not.toContain('renew-s2-2026-11-20');
  expect(ids).not.toContain('signin-me');
  expect(out.find(n => n.id === 'report-2026-10').vars).toMatchObject({ spent: '₱300', earned: '₱1000' });
  expect(out.find(n => n.id.startsWith('tip-')).cat).toBe('catPromo');
  expect(out.filter(n => n.cat === 'catAi').length).toBeGreaterThan(0);
});

test('device labels name only the browser and device type', () => {
  expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toBe('Safari on iPhone');
  expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36')).toBe('Chrome on Windows');
});
