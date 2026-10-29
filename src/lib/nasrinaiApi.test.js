'use strict';

const handler = require('../../api/nasrinai/chat');

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
