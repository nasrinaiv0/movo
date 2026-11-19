/** @jest-environment node */
'use strict';

const handler = require('../../api/nasrinai/chat');
const { transcribeAudio } = require('../../api/nasrinai/transcription.cjs');
const { createClient } = require('@supabase/supabase-js');
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
const key = 'sk-or-' + 'a'.repeat(24);
const audio = Buffer.from('synthetic test audio');
const response = () => ({
  statusCode: 200, headers: {},
  status(code) { this.statusCode = code; return this; },
  setHeader(k, v) { this.headers[k] = v; return this; },
  end(body) { this.body = JSON.parse(body); }
});
const ok = text => ({ ok: true, json: async () => ({ text }) });

describe('server-only MOVO transcription recovery', () => {
  const base = { audio, mime: 'audio/mp4', nasrinKey: 'nasrin-test-key', nasrinBase: 'https://nasrinai.com', env: { OPENROUTER_API_KEY: key } };

  test('uses the existing NasrinAI raw-audio contract first', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(ok('Lunch 250'));
    expect(await transcribeAudio({ ...base, fetchImpl })).toEqual({ text: 'Lunch 250' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://nasrinai.com/v1/transcriptions?name=movo-voice.m4a');
    expect(options.body).toBe(audio);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  test.each([
    ['rejected authentication', () => Promise.resolve({ ok: false, status: 401 })],
    ['rate limiting', () => Promise.resolve({ ok: false, status: 429 })],
    ['malformed JSON', () => Promise.resolve({ ok: true, json: async () => { throw new Error('not JSON'); } })],
    ['missing text', () => Promise.resolve({ ok: true, json: async () => ({ message: 'bad response' }) })],
    ['timeout', () => Promise.reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))],
    ['network failure', () => Promise.reject(new Error('network'))],
  ])('recovers from %s using exactly one private OpenRouter transcription request', async (_label, primary) => {
    const fetchImpl = jest.fn().mockImplementationOnce(primary).mockResolvedValueOnce(ok('Recovered words'));
    expect(await transcribeAudio({ ...base, fetchImpl })).toEqual({ text: 'Recovered words' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [url, options] = fetchImpl.mock.calls[1];
    expect(url).toBe('https://openrouter.ai/api/v1/audio/transcriptions');
    expect(JSON.parse(options.body)).toEqual({
      model: 'openai/whisper-large-v3-turbo',
      input_audio: { data: audio.toString('base64'), format: 'm4a' },
      provider: { data_collection: 'deny' }
    });
    expect(options.headers.Authorization).toBe('Bearer ' + key);
    expect(options.body).not.toMatch(/user_id|email|accounts|transactions|conversation/);
  });

  test.each(['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg'])('works with only OpenRouter configured for %s', async mime => {
    const fetchImpl = jest.fn().mockResolvedValue(ok('Words'));
    expect(await transcribeAudio({ ...base, nasrinKey: '', mime, fetchImpl })).toEqual({ text: 'Words' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).input_audio.format).toBe(({ 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/mpeg': 'mp3' })[mime]);
  });

  test('valid silence is not retried or treated as a provider outage', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(ok(''));
    expect(await transcribeAudio({ ...base, fetchImpl })).toEqual({ text: '' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('does not expose provider errors or keep retrying when both providers fail', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    expect(await transcribeAudio({ ...base, fetchImpl })).toEqual({ error: 'transcription_busy' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('a missing fallback key leaves the stable primary error', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(Object.assign(new Error('private provider details'), { name: 'TimeoutError' }));
    expect(await transcribeAudio({ ...base, env: {}, fetchImpl })).toEqual({ error: 'transcription_timeout' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test.each([{ error: 'budget_reached' }, { error: { code: 'budget_reached' } }, { code: 'budget_reached' }])('never bypasses a configured upstream budget limit (%j)', async body => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => body });
    expect(await transcribeAudio({ ...base, fetchImpl })).toEqual({ error: 'transcription_busy', noFallback: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('honors a valid server-only STT model override', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(ok('Words'));
    await transcribeAudio({ ...base, nasrinKey: '', env: { OPENROUTER_API_KEY: key, OPENROUTER_TRANSCRIPTION_MODEL: 'openai/whisper-1' }, fetchImpl });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).model).toBe('openai/whisper-1');
  });
});

describe('authenticated transcription route', () => {
  let env; let fetchOriginal; let db;
  const request = body => ({ method: 'POST', headers: { authorization: 'Bearer abcdefghijklmnopqrstuvwxyz' }, body: { action: 'transcribe', consent: true, audioBase64: audio.toString('base64'), mime: 'audio/mp4', ...body } });
  beforeEach(() => {
    env = process.env;
    process.env = { ...env, SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon', NASRINAI_API_KEY: '', OPENROUTER_API_KEY: key };
    db = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }) },
      rpc: jest.fn().mockResolvedValue({ data: { active: true, tier: 'pro', expiresAt: '2099-01-01T00:00:00Z' } }),
      from: jest.fn()
    };
    createClient.mockReturnValue(db);
    fetchOriginal = global.fetch;
    global.fetch = jest.fn().mockResolvedValue(ok('  Lunch\u0000 250  '));
  });
  afterEach(() => { process.env = env; global.fetch = fetchOriginal; jest.clearAllMocks(); });

  test('sanitizes the transcript without reading or writing financial data or chat history', async () => {
    const res = response();
    await handler(request(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ text: 'Lunch 250' });
    expect(db.from).not.toHaveBeenCalled();
    expect(res.headers['Cache-Control']).toContain('no-store');
  });

  test.each([
    ['consent', { consent: false }, 400],
    ['unsupported MIME', { mime: 'text/html' }, 400],
    ['noncanonical base64', { audioBase64: 'YQ' }, 400],
    ['oversized audio', { audioBase64: 'x'.repeat(3_200_004) }, 400],
  ])('rejects %s without contacting a provider', async (_label, body, status) => {
    const res = response();
    await handler(request(body), res);
    expect(res.statusCode).toBe(status);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test.each(['session', 'plan'])('requires a verified %s before forwarding audio', async kind => {
    if (kind === 'session') db.auth.getUser.mockResolvedValue({ data: { user: null } });
    else db.rpc.mockResolvedValue({ data: { active: false } });
    const res = response();
    await handler(request(), res);
    expect(res.statusCode).toBe(kind === 'session' ? 401 : 403);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
