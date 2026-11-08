/* NasrinAI server: the model is part of Pro and Pro+; Free is refused before any upstream call. */
describe('POST /api/nasrinai/chat plan check', () => {
  let planResult; let upstream;
  const load = () => {
    jest.resetModules();
    jest.doMock('@supabase/supabase-js', () => ({ createClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
      rpc: async (name) => (name === 'movo_current_plan' ? planResult : { data: null, error: null }),
      from: () => { throw new Error('no database access expected before the plan check'); },
    }) }));
    process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.NASRINAI_API_KEY = 'nsk_' + 'x'.repeat(40);
    return require('../../api/nasrinai/chat');
  };
  const call = async (handler, body) => {
    const res = { headers: {}, statusCode: 0, body: null, setHeader(k, v) { this.headers[k] = v; return this; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, end(text) { this.body = text ? JSON.parse(text) : null; return this; } };
    await handler({ method: 'POST', headers: { authorization: `Bearer ${'t'.repeat(40)}` }, body }, res);
    return res;
  };
  beforeEach(() => { upstream = jest.fn(); global.fetch = upstream; jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { jest.dontMock('@supabase/supabase-js'); delete global.fetch; jest.restoreAllMocks(); });

  test('Free is refused with plan_required for chat and voice transcription, and nothing goes upstream', async () => {
    const handler = load();
    planResult = { data: 'free', error: null };
    const chat = await call(handler, { consent: true, message: 'How much did I spend?' });
    expect(chat.statusCode).toBe(403);
    expect(chat.body).toMatchObject({ error: 'plan_required', plan: 'free' });
    const voice = await call(handler, { consent: true, action: 'transcribe', audioBase64: 'AAAA', mime: 'audio/webm' });
    expect(voice.statusCode).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  test('a failed plan lookup is refused, not treated as paid', async () => {
    const handler = load();
    planResult = { data: null, error: { code: '57014', message: 'timeout' } };
    const res = await call(handler, { consent: true, message: 'Hi' });
    expect(res.statusCode).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  test('Pro passes the plan check (it then reaches the conversation lookup)', async () => {
    const handler = load();
    planResult = { data: 'pro', error: null };
    const res = await call(handler, { consent: true, message: 'Hi' });
    expect(res.body?.error).not.toBe('plan_required');
  });
});
