import { CapacitorHttp } from '@capacitor/core';
import { chatRequest, transactionShareCard } from './friendChat';
import { isNativeApp } from './platform';

jest.mock('@capacitor/core', () => ({ ...jest.requireActual('@capacitor/core'), CapacitorHttp: { request: jest.fn() } }));
jest.mock('./platform', () => ({ apiUrl: value => value, isNativeApp: jest.fn() }));
test('only safe fields are visible in a share card, with description hidden by default', () => {
  const record = { type: 'expense', id: '123', amount: 200, origAmount: 100, origCurrency: 'USD',
    currency: 'PHP', date: '2026-11-23T11:00:00Z', merchant: 'Restaurant', category: 'Food',
    accountId: 'private', accountName: 'Never shared', receipt_path: 'secret', note: 'hidden' };
  expect(transactionShareCard(record)).toEqual({ type: 'expense', amount: 100, currency: 'USD', date: '2026-11-23' });
  expect(transactionShareCard(record, { description: true, category: true })).toEqual({
    type: 'expense', amount: 100, currency: 'USD', date: '2026-11-23', description: 'Restaurant', category: 'Food',
  });
  expect(transactionShareCard({ ...record, type: 'allocation' })).toBeNull();
});

test('uses native HTTP with verified bearer token and forwards no payment credentials', async () => {
  isNativeApp.mockReturnValue(true);
  CapacitorHttp.request.mockResolvedValue({ status: 200, data: '{"friends":[]}' });
  await expect(chatRequest({ access_token: 'abc' }, 'inbox')).resolves.toEqual({ friends: [] });
  expect(CapacitorHttp.request).toHaveBeenCalledWith(expect.objectContaining({
    url: '/api/chat', headers: { Authorization: 'Bearer abc' }, method: 'GET',
  }));
  isNativeApp.mockReturnValue(false);
});

test('separates service outage from expired sign-in', async () => {
  isNativeApp.mockReturnValue(false);
  const previous = global.fetch;
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ status: 503, json: async () => ({ error: 'chat_update_pending' }) })
    .mockResolvedValueOnce({ status: 401, json: async () => ({ error: 'unauthorized' }) });
  try {
    await expect(chatRequest({ access_token: 'abc' })).rejects.toMatchObject({ code: 'chat_update_pending' });
    await expect(chatRequest({ access_token: 'abc' })).rejects.toMatchObject({ code: 'sign_in_required' });
  } finally { global.fetch = previous; }
});
