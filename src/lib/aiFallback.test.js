'use strict';

// MOVO's fallback AI provider (api/nasrinai/openrouter-fallback.cjs) through the real chat route.
jest.mock('@supabase/supabase-js', () => ({ createClient: (...args) => mockCreateClient(...args) }));
jest.mock('../../api/lib/planAccess', () => ({ hasPlan: async () => true }));

const USER = '11111111-1111-4111-8111-111111111111';
let mockCreateClient;
let saved;
const fakeDb = () => {
  const rows = {
    financial_accounts: [{ id: 'a1', name: 'Main', account_type: 'bank', currency: 'PHP', opening_balance: 1000, is_archived: false }],
    transactions: [{ account_id: 'a1', transaction_type: 'expense', amount: 120, currency: 'PHP', merchant: 'Groceries', category: 'Food', occurred_at: '2026-11-01T00:00:00Z' }],
    budgets: [],
  };
  const builder = (table) => {
    const state = { table, op: 'select', payload: null };
    const result = () => {
      if (state.op === 'insert') { saved.push({ table, payload: state.payload }); return { data: table === 'movo_ai_conversations' ? { id: 'conv-1', user_id: USER, title: 'Hi' } : null, error: null }; }
      if (state.op === 'delete') { saved.push({ table, deleted: true }); return { data: null, error: null }; }
      if (state.op === 'update') return { data: null, error: null };
      return { data: rows[table] || [], error: null };
    };
    const b = {
      select: () => b, eq: () => b, order: () => b, limit: () => b,
      insert: (payload) => { state.op = 'insert'; state.payload = payload; return b; },
      update: () => { state.op = 'update'; return b; },
      delete: () => { state.op = 'delete'; return b; },
      single: async () => result(), maybeSingle: async () => result(),
      then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject),
    };
    return b;
  };
  return { auth: { getUser: async () => ({ data: { user: { id: USER, email: 'person@example.com' } }, error: null }) }, from: builder };
};

// jsdom lacks AbortSignal.timeout (Node on Vercel has it).
if (typeof AbortSignal.timeout !== 'function') AbortSignal.timeout = () => new AbortController().signal;
const handler = require('../../api/nasrinai/chat');
const response = () => ({ statusCode: 200, headers: {}, body: '', status(c) { this.statusCode = c; return this; }, setHeader(n, v) { this.headers[n.toLowerCase()] = v; return this; }, end(b) { this.body = b || ''; return this; } });
const ask = async (body = {}) => { const res = response(); await handler({ method: 'POST', headers: { authorization: 'Bearer abcdefghijklmnopqrstuvwxyz' }, body: { message: 'How much did I spend on food?', consent: true, ...body } }, res); return { status: res.statusCode, body: JSON.parse(res.body || '{}'), headers: res.headers }; };
const reply = (data, ok = true, status = 200) => ({ ok, status, headers: { get: () => null }, text: async () => JSON.stringify(data), json: async () => data });
const env = { ...process.env };

beforeEach(() => {
  saved = [];
  mockCreateClient = () => fakeDb();
  Object.assign(process.env, { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'public-test-key', NASRINAI_API_KEY: 'nsr_test_key_123456789', OPENROUTER_API_KEY: 'sk-or-v1-' + 'a'.repeat(40) });
  delete process.env.OPENROUTER_MODEL;
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => { process.env = { ...env }; delete global.fetch; jest.restoreAllMocks(); });

test('when NasrinAI fails, OpenRouter answers with the same bounded context and the turn is saved', async () => {
  global.fetch = jest.fn(async (url) => String(url).includes('openrouter.ai')
    ? reply({ choices: [{ message: { content: 'You spent ₱120 on Food.' } }] })
    : reply({ error: { code: 'service_unavailable' } }, false, 503));
  const result = await ask();
  expect(result.status).toBe(200);
  expect(result.body.reply).toBe('You spent ₱120 on Food.');
  expect(saved.filter(s => s.table === 'movo_ai_messages').map(s => s.payload.role)).toEqual(['user', 'assistant']);
  const [url, init] = global.fetch.mock.calls.find(([u]) => String(u).includes('openrouter.ai'));
  expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
  const sent = JSON.parse(init.body);
  expect(sent.provider).toEqual({ data_collection: 'deny' });
  expect(sent.model).toBe('openrouter/auto');
  expect(sent.user).toBeUndefined();
  const text = init.body;
  expect(text).not.toContain(USER);
  expect(text).not.toContain('person@example.com');
  expect(text).toContain('Groceries');
  expect(init.headers.Authorization).toBe('Bearer sk-or-v1-' + 'a'.repeat(40));
});

test('NasrinAI stays first: a good NasrinAI reply never calls OpenRouter', async () => {
  global.fetch = jest.fn(async () => reply({ context_scope: 'movo', reply: 'From NasrinAI.' }));
  const result = await ask();
  expect(result.body.reply).toBe('From NasrinAI.');
  expect(global.fetch.mock.calls.some(([u]) => String(u).includes('openrouter.ai'))).toBe(false);
});

test('chat works with only OpenRouter configured', async () => {
  delete process.env.NASRINAI_API_KEY;
  global.fetch = jest.fn(async () => reply({ choices: [{ message: { content: 'Fallback only.' } }] }));
  const result = await ask();
  expect(result.status).toBe(200);
  expect(result.body.reply).toBe('Fallback only.');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('a reached NasrinAI budget is not bypassed through the fallback', async () => {
  global.fetch = jest.fn(async () => reply({ error: { code: 'budget_reached' } }, false, 402));
  const result = await ask();
  expect(result.status).toBe(502);
  expect(global.fetch.mock.calls.some(([u]) => String(u).includes('openrouter.ai'))).toBe(false);
});

test('when both fail: the original error, the empty conversation removed, nothing saved', async () => {
  global.fetch = jest.fn(async (url) => String(url).includes('openrouter.ai') ? reply({ error: 'down' }, false, 500) : reply({}, false, 429));
  const result = await ask();
  expect(result.status).toBe(429);
  expect(result.body.error).toBe('nasrinai_rate_limited');
  expect(saved.some(s => s.table === 'movo_ai_messages')).toBe(false);
  expect(saved.some(s => s.table === 'movo_ai_conversations' && s.deleted)).toBe(true);
});

test('without a valid OpenRouter key nothing extra is called', async () => {
  process.env.OPENROUTER_API_KEY = 'not-a-key';
  global.fetch = jest.fn(async () => reply({}, false, 500));
  const result = await ask();
  expect(result.status).toBe(502);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
