import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

const handler = require('../../api/nasrinai/chat');

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    end(body) { this.body = body; return this; }
  };
}

function createDatabaseMock({ existingConversation = null } = {}) {
  const state = { inserts: [], updates: [], deletes: [], filters: [] };
  const tableRows = {
    financial_accounts: [{
      id: 'account-1',
      name: 'Main account',
      account_type: 'bank',
      currency: 'PHP',
      opening_balance: 1000,
      is_archived: false
    }],
    transactions: [{
      account_id: 'account-1',
      transaction_type: 'expense',
      amount: 25,
      currency: 'PHP',
      merchant: 'Grocery Store',
      category: 'Food',
      occurred_at: '2026-10-29T00:00:00.000Z'
    }],
    budgets: []
  };

  function builder(table) {
    const query = {
      select: jest.fn(() => query),
      eq: jest.fn((key, value) => {
        state.filters.push({ table, key, value });
        return query;
      }),
      order: jest.fn(() => query),
      limit: jest.fn(() => query),
      insert: jest.fn((row) => {
        state.inserts.push({ table, row });
        return query;
      }),
      update: jest.fn((row) => {
        state.updates.push({ table, row });
        return query;
      }),
      delete: jest.fn(() => {
        state.deletes.push(table);
        return query;
      }),
      maybeSingle: jest.fn(async () => ({ data: existingConversation, error: null })),
      single: jest.fn(async () => ({
        data: { id: 'conversation-new', user_id: 'user-1', title: 'Summarize my spending' },
        error: null
      })),
      then(resolve, reject) {
        return Promise.resolve({ data: tableRows[table] || null, error: null }).then(resolve, reject);
      }
    };
    return query;
  }

  return {
    state,
    client: {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: jest.fn((table) => builder(table))
    }
  };
}

describe('MOVO NasrinAI API handler context isolation', () => {
  const envNames = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'NASRINAI_API_KEY', 'NASRINAI_BASE_URL'];
  let originalEnv;
  let originalFetch;
  let originalAbortSignal;
  let errorSpy;
  let infoSpy;
  let dbMock;

  beforeEach(() => {
    originalEnv = Object.fromEntries(envNames.map((key) => [key, process.env[key]]));
    process.env.SUPABASE_URL = 'https://movo-test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NASRINAI_API_KEY = 'test-server-only-key';
    process.env.NASRINAI_BASE_URL = 'https://nasrinai.example.test';
    originalFetch = global.fetch;
    originalAbortSignal = global.AbortSignal;
    global.AbortSignal = { timeout: jest.fn(() => ({ mockedTimeout: true })) };
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    dbMock = createDatabaseMock();
    createClient.mockReset().mockReturnValue(dbMock.client);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.AbortSignal = originalAbortSignal;
    errorSpy.mockRestore();
    infoSpy.mockRestore();
    envNames.forEach((key) => {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    });
    jest.clearAllMocks();
  });

  function request(body) {
    return {
      method: 'POST',
      headers: { authorization: 'Bearer ' + 'a'.repeat(40) },
      body: { message: 'Summarize my spending', consent: true, ...body }
    };
  }

  test('rejects an unconfirmed scope and persists neither user nor assistant message', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        context_scope: 'global',
        reply: 'Unrelated portfolio canary content'
      })
    });
    const res = makeResponse();

    await handler(request({}), res);

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).error).toBe('nasrinai_scope_unconfirmed');
    expect(dbMock.state.inserts.filter((item) => item.table === 'movo_ai_messages')).toEqual([]);
    expect(dbMock.state.deletes).toContain('movo_ai_conversations');

    const upstreamOptions = global.fetch.mock.calls[0][1];
    const upstreamBody = JSON.parse(upstreamOptions.body);
    expect(upstreamBody).toMatchObject({ message: 'Summarize my spending', context_scope: 'movo' });
    expect(upstreamBody).not.toHaveProperty('conversation_id');
    expect(JSON.stringify(upstreamBody)).not.toContain('Unrelated portfolio canary content');
  });

  test('persists the turn only after an explicitly confirmed MOVO-scoped reply', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ context_scope: 'movo', reply: 'Your MOVO spending summary is ready.' })
    });
    const res = makeResponse();

    await handler(request({}), res);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).reply).toBe('Your MOVO spending summary is ready.');
    expect(dbMock.state.inserts.filter((item) => item.table === 'movo_ai_messages').map((item) => item.row.role))
      .toEqual(['user', 'assistant']);
    expect(dbMock.state.inserts.filter((item) => item.table === 'movo_ai_messages').every((item) => item.row.user_id === 'user-1'))
      .toBe(true);
  });

  test('rejects another account conversation ID before contacting the upstream', async () => {
    dbMock = createDatabaseMock({ existingConversation: null });
    createClient.mockReset().mockReturnValue(dbMock.client);
    const res = makeResponse();

    await handler(request({ conversationId: 'foreign-conversation-id' }), res);

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe('conversation_not_found');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(dbMock.state.inserts).toEqual([]);
    expect(dbMock.state.filters).toContainEqual({ table: 'movo_ai_conversations', key: 'user_id', value: 'user-1' });
  });
});
