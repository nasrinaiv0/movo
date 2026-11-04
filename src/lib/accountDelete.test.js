describe('POST /api/account/delete', () => {
  let calls; let authUser; let txError; let userError;
  const load = () => {
    jest.resetModules();
    jest.doMock('@supabase/supabase-js', () => ({
      createClient: (url, key) => (key === 'service'
        ? {
          from: (table) => ({ delete: () => ({ eq: (col, val) => { calls.push(['delete', table, col, val]); return Promise.resolve({ error: txError }); } }) }),
          auth: { admin: { deleteUser: async (id) => { calls.push(['deleteUser', id]); return { error: userError }; } } },
          storage: { from: () => ({ list: async () => ({ data: [], error: null }), remove: async () => ({ error: null }) }) },
        }
        : { auth: { getUser: async (token) => { calls.push(['getUser', token]); return authUser ? { data: { user: authUser }, error: null } : { data: { user: null }, error: { message: 'bad jwt' } }; } } }),
    }));
    process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'anon'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    return require('../../api/account/delete');
  };
  const call = async (handler, { body = { confirm: 'DELETE' }, token = 'jwt-1', method = 'POST' } = {}) => {
    const res = { headers: {}, statusCode: 0, body: null, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    await handler({ method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, res);
    return res;
  };
  beforeEach(() => { calls = []; authUser = { id: 'user-1' }; txError = null; userError = null; jest.spyOn(console, 'info').mockImplementation(() => {}); jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); jest.dontMock('@supabase/supabase-js'); });

  test('the verified person is deleted: transactions first, then the Auth user', async () => {
    const res = await call(load());
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(calls).toEqual([['getUser', 'jwt-1'], ['delete', 'transactions', 'user_id', 'user-1'], ['deleteUser', 'user-1']]);
  });

  test('the user id comes from the verified token, never from the request', async () => {
    await call(load(), { body: { confirm: 'DELETE', userId: 'someone-else', user_id: 'someone-else' } });
    expect(calls.filter(c => c[0] !== 'getUser').every(c => c.includes('user-1') && !c.includes('someone-else'))).toBe(true);
  });

  test('nothing is deleted without the confirmation, a token, or a valid token', async () => {
    let res = await call(load(), { body: {} });
    expect(res.statusCode).toBe(400);
    res = await call(load(), { token: '' });
    expect(res.statusCode).toBe(401);
    authUser = null;
    res = await call(load());
    expect(res.statusCode).toBe(401);
    expect(calls.some(c => c[0] === 'delete' || c[0] === 'deleteUser')).toBe(false);
    res = await call(load(), { method: 'GET' });
    expect(res.statusCode).toBe(405);
  });

  test('if transactions cannot be deleted the account is kept and the reply leaks nothing', async () => {
    txError = { message: 'permission denied for table transactions' };
    const res = await call(load());
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'delete_failed' });
    expect(calls.some(c => c[0] === 'deleteUser')).toBe(false);
  });
});
