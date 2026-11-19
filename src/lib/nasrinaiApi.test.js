/** @jest-environment node */
'use strict';

const handler = require('../../api/nasrinai/chat');
const { createClient } = require('@supabase/supabase-js');

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    end(body) { this.body = body || ''; this.writableEnded = true; return this; }
  };
}

describe('MOVO NasrinAI API security boundary', () => {
  test('rejects an unapproved browser origin before doing any work', async () => {
    const res = response();
    await handler({ method: 'POST', headers: { origin: 'https://attacker.example' }, body: { message: 'hello' } }, res);
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: 'origin_not_allowed' });
  });

  test('rejects unauthenticated requests and marks responses private/non-indexable', async () => {
    const res = response();
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: 'sign_in_required' });
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers['x-robots-tag']).toContain('noindex');
  });


  test('requires explicit financial-context consent on authenticated chat requests', async () => {
    const res = response();
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer abcdefghijklmnopqrstuvwxyz' },
      body: { message: 'Summarize my spending', consent: false }
    }, res);
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'financial_context_consent_required' });
  });

  test('rejects unsupported methods', async () => {
    const res = response();
    await handler({ method: 'PUT', headers: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe('GET, POST');
  });
});

describe('MOVO chat history reads', () => {
  const headers = { authorization: 'Bearer abcdefghijklmnopqrstuvwxyz' };
  let env;
  let db;
  const query = () => ({
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(),
    range: jest.fn(), maybeSingle: jest.fn(),
  });

  beforeEach(() => {
    env = process.env;
    process.env = { ...env, SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon', NASRINAI_API_KEY: '' };
    db = { auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) }, from: jest.fn() };
    createClient.mockReturnValue(db);
  });

  afterEach(() => { process.env = env; jest.clearAllMocks(); });

  test('lists a bounded page of the signed-in owner’s conversations without a model key', async () => {
    const conversations = query();
    conversations.range.mockResolvedValue({ data: Array.from({ length: 26 }, (_, i) => ({
      id: `chat-${i}`, title: 'Saved chat', updated_at: '2026-11-18T00:00:00Z', user_id: 'owner-1',
    })) });
    db.from.mockReturnValue(conversations);
    const res = response();
    await handler({ method: 'GET', headers, query: { history: '1', offset: '25' } }, res);
    expect(res.statusCode).toBe(200);
    expect(conversations.eq).toHaveBeenCalledWith('user_id', 'owner-1');
    expect(conversations.range).toHaveBeenCalledWith(25, 50);
    const data = JSON.parse(res.body);
    expect(data.conversations).toHaveLength(25);
    expect(data.conversations[0]).toEqual({ id: 'chat-0', title: 'Saved chat', updatedAt: '2026-11-18T00:00:00Z' });
    expect(data.nextOffset).toBe(50);
  });

  test('cannot open a conversation that is outside the caller’s account', async () => {
    const conversations = query();
    conversations.maybeSingle.mockResolvedValue({ data: null });
    db.from.mockReturnValue(conversations);
    const res = response();
    await handler({ method: 'GET', headers, query: { conversationId: 'another-owner-chat' } }, res);
    expect(conversations.eq).toHaveBeenCalledWith('user_id', 'owner-1');
    expect(conversations.eq).toHaveBeenCalledWith('id', 'another-owner-chat');
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(404);
  });

  test('returns recent messages in chronological order and exposes another page', async () => {
    const conversations = query();
    conversations.maybeSingle.mockResolvedValue({ data: { id: 'chat-1', title: 'Saved chat' } });
    const messages = query();
    messages.range.mockResolvedValue({ data: Array.from({ length: 201 }, (_, i) => ({
      id: `message-${i}`, role: 'user', content: 'Saved message', created_at: '2026-11-18T00:00:00Z',
    })) });
    db.from.mockReturnValueOnce(conversations).mockReturnValueOnce(messages);
    const res = response();
    await handler({ method: 'GET', headers, query: { conversationId: 'chat-1' } }, res);
    expect(res.statusCode).toBe(200);
    expect(messages.eq).toHaveBeenCalledWith('user_id', 'owner-1');
    expect(messages.eq).toHaveBeenCalledWith('conversation_id', 'chat-1');
    const data = JSON.parse(res.body);
    expect(data.messages).toHaveLength(200);
    expect(data.messages[0].id).toBe('message-199');
    expect(data.messages.at(-1).id).toBe('message-0');
    expect(data.nextMessageOffset).toBe(200);
  });

  test('saves both messages together and does not fail a saved turn if recency cannot be updated', async () => {
    process.env.NASRINAI_API_KEY = 'test-model-key';
    db.rpc = jest.fn().mockResolvedValue({ data: { active: true, tier: 'pro', expiresAt: '2099-01-01T00:00:00Z' } });
    const conversations = query();
    conversations.maybeSingle.mockResolvedValue({ data: { id: 'chat-1', title: 'Saved chat' } });
    conversations.update = jest.fn().mockReturnThis();
    conversations.lt = jest.fn().mockResolvedValue({ error: { code: 'connection_lost' } });
    const finance = { ...query(), limit: jest.fn().mockResolvedValue({ data: [] }) };
    const messages = { insert: jest.fn() };
    messages.insert.mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [
        { id: 'user-message', role: 'user', content: 'What did I spend?' },
        { id: 'assistant-message', role: 'assistant', content: 'Here is your total.' },
      ] }),
    });
    db.from.mockImplementation((name) => name === 'movo_ai_conversations' ? conversations : name === 'movo_ai_messages' ? messages : finance);
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, text: async () => JSON.stringify({ context_scope: 'movo', reply: 'Here is your total.' }),
    });
    const log = jest.spyOn(console, 'info').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = response();
      await handler({ method: 'POST', headers, body: { conversationId: 'chat-1', message: 'What did I spend?', consent: true } }, res);
      expect(messages.insert).toHaveBeenCalledTimes(1);
      expect(messages.insert).toHaveBeenCalledWith([
        expect.objectContaining({ user_id: 'owner-1', conversation_id: 'chat-1', role: 'user', content: 'What did I spend?' }),
        expect.objectContaining({ user_id: 'owner-1', conversation_id: 'chat-1', role: 'assistant', content: 'Here is your total.' }),
      ]);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).messages.map(({ id }) => id)).toEqual(['user-message', 'assistant-message']);
    } finally {
      global.fetch = originalFetch;
      log.mockRestore();
      error.mockRestore();
    }
  });
});
