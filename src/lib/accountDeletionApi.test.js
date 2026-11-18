import { createClient } from '@supabase/supabase-js';
import handler from '../../api/account/delete';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER_OWNER = '22222222-2222-4222-8222-222222222222';

function response() {
  return {
    setHeader: jest.fn(),
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

let originalEnv;
let work;
let failTable;
let providerError;

beforeEach(() => {
  originalEnv = process.env;
  process.env = { ...process.env, SUPABASE_URL: 'https://auth.example', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' };
  work = [];
  failTable = '';
  providerError = jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  createClient.mockImplementation((_url, key) => key === 'anon' ? {
    auth: { getUser: async token => token === 'valid-token'
      ? { data: { user: { id: OWNER } } } : { error: 'expired' } },
  } : {
    storage: { from: bucket => ({
      list: async prefix => ({ data: prefix === OWNER ? [{ name: `${bucket}.jpg`, id: 'file' }] : [] }),
      remove: async paths => { work.push(['storage', bucket, paths]); return {}; },
    }) },
    from: table => ({ delete: () => ({ eq: async (column, value) => {
      work.push([table, column, value]);
      return failTable === table ? { error: { message: `Error for ${OWNER}/private.jpg` } } : {};
    } }) }),
    auth: { admin: { deleteUser: async owner => { work.push(['auth', owner]); return {}; } } },
  });
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

test('deletes only verified-owner storage and financial-account blockers before Auth deletion', async () => {
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' }, body: { confirm: 'DELETE', userId: OTHER_OWNER } }, res);
  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ deleted: true });
  expect(work).toEqual([
    ['storage', 'movo-account-qrs', [`${OWNER}/movo-account-qrs.jpg`]],
    ['storage', 'movo-receipts', [`${OWNER}/movo-receipts.jpg`]],
    ['scheduled_transactions', 'user_id', OWNER],
    ['transactions', 'user_id', OWNER],
    ['auth', OWNER],
  ]);
});

test('stops on an owner row cleanup failure and leaves provider details out of logs', async () => {
  failTable = 'scheduled_transactions';
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid-token' }, body: { confirm: 'DELETE' } }, res);
  expect(res.statusCode).toBe(500);
  expect(res.body).toEqual({ error: 'delete_failed' });
  expect(work.map(([type]) => type)).toEqual(['storage', 'storage', 'scheduled_transactions']);
  expect(providerError).toHaveBeenCalledWith('[movo-account] delete failed', { stage: 'delete_scheduled_transactions' });
});

test('never touches account records for an invalid token', async () => {
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer expired' }, body: { confirm: 'DELETE' } }, res);
  expect(res.statusCode).toBe(401);
  expect(work).toEqual([]);
});
