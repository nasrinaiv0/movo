const { _test } = require('../../api/log');

describe('background automation API input helpers', () => {
  test('amounts are positive, bounded and rounded to cents', () => {
    expect(_test.amountValue('109.009')).toBe(109.01);
    expect(_test.amountValue(0)).toBe(0);
    expect(_test.amountValue(-1)).toBe(0);
    expect(_test.amountValue('-109.00')).toBe(0);
    expect(_test.amountValue('1.234,50')).toBe(1234.5);
    expect(_test.amountValue('not a number')).toBe(0);
    expect(_test.amountValue(1000000000)).toBe(0);
  });

  test('text is bounded and strips control and markup characters', () => {
    expect(_test.cleanText('  Ga\u0000dc <test>  ', 10)).toBe('Gadc test');
    expect(_test.cleanText('a'.repeat(200), 160)).toHaveLength(160);
  });

  test('account mapping requires an unambiguous match', () => {
    const accounts = [
      { id: '1', name: 'BPI Visa', institution_name: 'BPI', currency: 'PHP' },
      { id: '2', name: 'Cash', institution_name: null, currency: 'PHP' },
    ];
    expect(_test.accountFor(accounts, 'BPI Visa').id).toBe('1');
    expect(_test.accountFor(accounts, '')).toBeNull();
    expect(_test.accountFor([{ id: 'only', name: 'Cash' }], '') .id).toBe('only');
    expect(_test.accountFor(accounts, 'Unknown Card')).toBeNull();
    const sameBank = [
      { id: 'visa', name: 'BPI Visa', institution_name: 'BPI' },
      { id: 'savings', name: 'BPI Savings', institution_name: 'BPI' },
    ];
    expect(_test.accountFor(sameBank, 'BPI Visa').id).toBe('visa');
    expect(_test.accountFor(sameBank, 'BPI')).toBeNull();
  });

  test('idempotency keys are stable for the same payment and differ across transactions', () => {
    const payment = { source: 'applepay', amount: 109, merchant: 'Gadc', card: 'BPI Visa', occurredAt: '2026-10-31T12:01:00.000Z', reference: '' };
    expect(_test.idempotencyKey(payment)).toBe(_test.idempotencyKey({ ...payment }));
    expect(_test.idempotencyKey(payment)).not.toBe(_test.idempotencyKey({ ...payment, amount: 110 }));
    expect(_test.idempotencyKey({ ...payment, reference: 'REF-1' })).toBe(_test.idempotencyKey({ ...payment, reference: 'REF-1' }));
    expect(_test.idempotencyKey({ ...payment, reference: 'REF-1', amount: 110 })).not.toBe(_test.idempotencyKey({ ...payment, reference: 'REF-1' }));
    expect(_test.idempotencyKey({ ...payment, reference: 'REF-1', card: 'Cash' })).not.toBe(_test.idempotencyKey({ ...payment, reference: 'REF-1' }));
  });
});

const { parseVoice, guessCategory } = require('../../api/_lib/voice');

describe('voice parser (Siri Shortcut / Android assistant)', () => {
  const now = new Date('2026-11-02T10:00:00+08:00');
  test.each([
    ['I bought 3 pesos of banana', { type: 'expense', amount: 3, currency: 'PHP', merchant: 'banana' }],
    ['I spent 150 pesos on lunch', { type: 'expense', amount: 150, merchant: 'lunch' }],
    ['I received 2,000 pesos from work', { type: 'income', amount: 2000, merchant: 'work' }],
    ['I spent 80 pesos on a tricycle using my cash account', { amount: 80, merchant: 'a tricycle', accountHint: 'cash' }],
    ['Paid 1,250.50 for Meralco via GCash', { amount: 1250.5, merchant: 'Meralco', accountHint: 'GCash' }],
    ['Gumastos ako ng 80 sa tricycle', { amount: 80, merchant: 'tricycle' }],
    ['spent 12 dollars on coffee', { amount: 12, currency: 'USD', merchant: 'coffee' }],
  ])('%s', (text, expected) => { expect(parseVoice(text, now)).toMatchObject({ ok: true, ...expected }); });

  test('yesterday moves the date back one day', () => {
    expect(parseVoice('I paid 500 pesos for electricity yesterday', now)).toMatchObject({ ok: true, merchant: 'electricity', occurredAt: new Date(now.getTime() - 86400000).toISOString() });
  });

  test('ambiguous requests ask for clarification instead of guessing', () => {
    expect(parseVoice('', now)).toEqual({ ok: false, reason: 'empty' });
    expect(parseVoice('I bought banana', now)).toEqual({ ok: false, reason: 'amount_missing' });
    expect(parseVoice('I spent 50 on bread and 30 on milk', now)).toEqual({ ok: false, reason: 'multiple_amounts' });
    expect(parseVoice('150 pesos', now)).toEqual({ ok: false, reason: 'description_missing' });
  });

  test('brand names with digits are not counted as a second amount', () => {
    expect(parseVoice('spent 99 at 7-Eleven', now)).toMatchObject({ ok: true, amount: 99 });
  });

  test('categories', () => {
    expect(guessCategory('banana', 'expense')).toBe('Food & drinks');
    expect(guessCategory('tricycle', 'expense')).toBe('Transport');
    expect(guessCategory('work', 'income')).toBe('Income');
    expect(guessCategory('something', 'expense')).toBe('Other');
  });
});

describe('POST /api/log handler', () => {
  const ACCOUNTS = [
    { id: 'acct-bpi', name: 'BPI Visa', account_type: 'card', institution_name: 'BPI', currency: 'PHP', is_archived: false, display_order: 0 },
    { id: 'acct-cash', name: 'Cash', account_type: 'cash', institution_name: null, currency: 'PHP', is_archived: false, display_order: 1 },
  ];
  const KEY = 'a'.repeat(32);
  let calls; let rpcResult; let tokenRow;
  const fakeAdmin = () => ({
    from: (table) => {
      const q = { _table: table, select: () => q, eq: () => q, order: () => Promise.resolve({ data: ACCOUNTS, error: null }), maybeSingle: () => Promise.resolve({ data: tokenRow, error: null }), update: () => q, upsert: () => Promise.resolve({ error: null }) };
      q.then = (ok) => Promise.resolve({ error: null }).then(ok); // update(...).eq(...) awaited
      return q;
    },
    rpc: (name, params) => { calls.push({ name, params }); return Promise.resolve(rpcResult); },
  });
  const load = () => {
    jest.resetModules();
    jest.doMock('@supabase/supabase-js', () => ({ createClient: (url, key) => (key === 'service' ? fakeAdmin() : { auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) } }) }));
    process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'anon'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    return require('../../api/log');
  };
  const call = async (handler, body, token = KEY) => {
    const res = { headers: {}, statusCode: 0, body: null, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    await handler({ method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-length': '200' }, body }, res);
    return res;
  };
  beforeEach(() => { calls = []; rpcResult = { data: { duplicate: false, matched_by: null, transaction_id: 'tx-1' }, error: null }; tokenRow = { user_id: 'user-1', active: true }; jest.spyOn(console, 'info').mockImplementation(() => {}); jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); jest.dontMock('@supabase/supabase-js'); });

  test.each(['applepay', 'googlepay', 'bank', 'notification'])('%s keeps its source, amount, currency, time, merchant and account', async (source) => {
    const handler = load();
    const res = await call(handler, { amount: '₱1,234.50', merchant: 'Jollibee', card: 'BPI Visa', source, occurredAt: '2026-11-01T04:00:00.000Z', reference: 'REF-1' });
    expect(res.statusCode).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe('log_automation_transaction_v2');
    expect(calls[0].params).toMatchObject({ p_source: source, p_transaction_type: 'expense', p_amount: 1234.5, p_currency: 'PHP', p_merchant: 'Jollibee', p_account_id: 'acct-bpi', p_occurred_at: '2026-11-01T04:00:00.000Z', p_external_reference: 'REF-1', p_user_id: 'user-1' });
    expect(res.body).toMatchObject({ success: true, duplicate: false, source });
  });

  test('unknown sources are stored as generic notifications, never trusted as given', async () => {
    const handler = load();
    await call(handler, { amount: 10, merchant: 'X', card: 'Cash', source: 'webhook' });
    expect(calls[0].params.p_source).toBe('notification');
  });

  test('Siri sends the spoken sentence; it is parsed, categorised and attributed to Siri', async () => {
    const handler = load();
    const res = await call(handler, { text: 'I spent 80 pesos on a tricycle using my cash', source: 'siri_shortcut' });
    expect(res.statusCode).toBe(200);
    expect(calls[0].params).toMatchObject({ p_source: 'siri_shortcut', p_amount: 80, p_merchant: 'a tricycle', p_account_id: 'acct-cash', p_category: 'Transport', p_transaction_type: 'expense' });
    expect(res.body.message).toMatch(/Logged/);
  });

  test('Android assistant income is stored as income', async () => {
    const handler = load();
    await call(handler, { text: 'I received 2,000 pesos from work to my BPI Visa', source: 'android_assistant' });
    expect(calls[0].params).toMatchObject({ p_source: 'android_assistant', p_transaction_type: 'income', p_amount: 2000, p_account_id: 'acct-bpi', p_category: 'Income' });
  });

  test('unclear speech is not logged and asks for clarification', async () => {
    const handler = load();
    const res = await call(handler, { text: 'I spent 50 on bread and 30 on milk', source: 'siri_shortcut', card: 'Cash' });
    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({ error: 'clarification_required', reason: 'multiple_amounts' });
    expect(calls).toHaveLength(0);
  });

  test('a duplicate from another channel is reported, not inserted twice', async () => {
    rpcResult = { data: { duplicate: true, matched_by: 'cross_source', transaction_id: 'tx-first' }, error: null };
    const handler = load();
    const res = await call(handler, { amount: 109, merchant: 'POS GADC', card: 'BPI Visa', source: 'bank' });
    expect(res.body).toMatchObject({ success: true, duplicate: true, matchedBy: 'cross_source', transactionId: 'tx-first' });
    expect(res.body.message).toMatch(/Already in MOVO/);
  });

  test('ambiguous accounts are refused rather than guessed', async () => {
    const handler = load();
    const res = await call(handler, { amount: 10, merchant: 'X', source: 'applepay' });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('account_match_required');
    expect(calls).toHaveLength(0);
  });

  test('unregistered or revoked device keys are rejected', async () => {
    tokenRow = { user_id: 'user-1', active: false };
    const handler = load();
    expect((await call(handler, { amount: 10, merchant: 'X', card: 'Cash', source: 'applepay' })).statusCode).toBe(401);
    expect((await call(handler, { amount: 10, merchant: 'X', card: 'Cash' }, 'not-a-key')).statusCode).toBe(401);
  });

  test('database errors map to safe responses without leaking details', async () => {
    const handler = load();
    for (const [message, status] of [['rate_limited', 429], ['account_invalid', 409], ['token_invalid', 401], ['invalid_transaction', 400], ['connection reset by peer', 500]]) {
      rpcResult = { data: null, error: { message } };
      const res = await call(handler, { amount: 10, merchant: 'X', card: 'Cash', source: 'applepay' });
      expect(res.statusCode).toBe(status);
      expect(JSON.stringify(res.body)).not.toMatch(/peer/);
    }
  });

  test('income type and explicit currency are passed through', async () => {
    const handler = load();
    await call(handler, { amount: '25.00', merchant: 'Refund', card: 'BPI Visa', source: 'bank', type: 'income', currency: 'usd' });
    expect(calls[0].params).toMatchObject({ p_transaction_type: 'income', p_currency: 'USD' });
  });
});

describe('POST /api/log rollout fallback', () => {
  test('before the v2 migration, expenses still log through the earlier function as notifications', async () => {
    jest.resetModules();
    const calls = [];
    jest.doMock('@supabase/supabase-js', () => ({ createClient: (url, key) => (key === 'service' ? {
      from: () => { const q = { select: () => q, eq: () => q, order: () => Promise.resolve({ data: [{ id: 'acct-cash', name: 'Cash', currency: 'PHP', is_archived: false }], error: null }), maybeSingle: () => Promise.resolve({ data: { user_id: 'u1', active: true }, error: null }), update: () => q }; q.then = (ok) => Promise.resolve({ error: null }).then(ok); return q; },
      rpc: (name, params) => { calls.push({ name, params }); return Promise.resolve(name === 'log_automation_transaction_v2' ? { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.log_automation_transaction_v2' } } : { data: { duplicate: false, transaction_id: 't1' }, error: null }); },
    } : {}) }));
    process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'anon'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    jest.spyOn(console, 'info').mockImplementation(() => {});
    const handler = require('../../api/log');
    const res = { headers: {}, setHeader() {}, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    await handler({ method: 'POST', headers: { authorization: `Bearer ${'a'.repeat(32)}` }, body: { amount: 50, merchant: 'Bread', source: 'applepay' } }, res);
    expect(res.statusCode).toBe(200);
    expect(calls.map(c => c.name)).toEqual(['log_automation_transaction_v2', 'log_automation_transaction']);
    expect(calls[1].params.p_source).toBe('notification');
    jest.dontMock('@supabase/supabase-js'); jest.restoreAllMocks();
  });
});
