describe('POST /api/account/delete', () => {
  const userId = '123e4567-e89b-42d3-a456-426614174000';
  let calls;
  let storageError;
  let transactionError;
  let userError;
  let handler;

  beforeEach(() => {
    calls = [];
    storageError = null;
    transactionError = null;
    userError = null;
    jest.resetModules();
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: (url, key) => (key === 'service'
        ? {
          from: (table) => ({
            delete: () => ({
              eq: async (column, value) => {
                calls.push(['delete', table, column, value]);
                return { error: transactionError };
              },
            }),
          }),
          auth: { admin: { deleteUser: async (id) => {
            calls.push(['deleteUser', id]);
            return { error: userError };
          } } },
          storage: { from: (bucket) => ({
            list: async (prefix) => {
              calls.push(['list', bucket, prefix]);
              if (storageError) return { data: null, error: storageError };
              if (prefix === userId) {
                return { data: [{ name: bucket === 'movo-receipts' ? 'transactions' : 'accounts', id: null, metadata: null }], error: null };
              }
              if (prefix === userId + '/transactions') {
                return { data: [{ name: 'receipt.pdf', id: 'receipt-file', metadata: { size: 10 } }], error: null };
              }
              if (prefix === userId + '/accounts') {
                return { data: [{ name: 'qr.png', id: 'qr-file', metadata: { size: 10 } }], error: null };
              }
              return { data: [], error: null };
            },
            remove: async (paths) => {
              calls.push(['remove', bucket, ...paths]);
              return { error: storageError };
            },
          }) },
        }
        : { auth: { getUser: async (token) => {
          calls.push(['getUser', token]);
          return { data: { user: { id: userId } }, error: null };
        } } }),
    }));
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    handler = require('../../api/account/delete');
  });

  afterEach(() => {
    jest.dontMock('@supabase/supabase-js');
    jest.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  const invoke = async ({ method = 'POST', body = { confirm: 'DELETE' }, token = 'valid-jwt' } = {}) => {
    const res = {
      headers: {},
      statusCode: 0,
      body: null,
      setHeader(key, value) { this.headers[key] = value; },
      status(code) { this.statusCode = code; return this; },
      json(value) { this.body = value; return this; },
    };
    await handler({ method, headers: token ? { authorization: 'Bearer ' + token } : {}, body }, res);
    return res;
  };

  test('removes every private user bucket recursively before deleting database rows and auth user', async () => {
    const result = await invoke();
    expect(result.statusCode).toBe(200);
    expect(calls).toContainEqual(['remove', 'movo-account-qrs', userId + '/accounts/qr.png']);
    expect(calls).toContainEqual(['remove', 'movo-receipts', userId + '/transactions/receipt.pdf']);
    const lastStorageRemove = Math.max(...calls.map((call, index) => call[0] === 'remove' ? index : -1));
    const transactionDelete = calls.findIndex((call) => call[0] === 'delete' && call[1] === 'transactions');
    const authDelete = calls.findIndex((call) => call[0] === 'deleteUser');
    expect(lastStorageRemove).toBeLessThan(transactionDelete);
    expect(transactionDelete).toBeLessThan(authDelete);
  });

  test('does not delete database or auth data when storage cleanup fails', async () => {
    storageError = { message: 'storage unavailable', statusCode: '500' };
    const result = await invoke();
    expect(result.statusCode).toBe(500);
    expect(calls.some((call) => call[0] === 'delete')).toBe(false);
    expect(calls.some((call) => call[0] === 'deleteUser')).toBe(false);
  });

  test('requires explicit confirmation and authenticated ownership', async () => {
    const result = await invoke({ body: { confirm: 'no' } });
    expect(result.statusCode).toBe(400);
    expect(calls.some((call) => call[0] === 'remove')).toBe(false);
  });
});
