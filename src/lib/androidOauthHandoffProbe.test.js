/** @jest-environment node */
'use strict';
const handler = require('../../api/android-oauth-handoff-probe');

function response() {
  const headers = Object.create(null);
  return {
    headers,
    statusCode: 200,
    setHeader: jest.fn((k, v) => { headers[k] = v; }),
    end: jest.fn(),
  };
}

test('fixed 302 redirects to Auth Test with no authorization code', () => {
  const res = response();
  handler({ method: 'GET', query: { code: 'untrusted', redirect_to: 'https://untrusted.invalid' } }, res);
  expect(res.statusCode).toBe(302);
  expect(res.headers.Location).toBe('movo-authcheck://auth-callback');
  expect(res.headers.Location).not.toMatch(/code=|access_token|refresh_token|https:/i);
  expect(res.headers['Cache-Control']).toContain('no-store');
  expect(res.headers['Referrer-Policy']).toBe('no-referrer');
  expect(res.end).toHaveBeenCalledTimes(1);
});

test('never accepts POST or reflects request-supplied destination', () => {
  const res = response();
  handler({ method: 'POST', query: { redirect_to: 'https://untrusted.invalid' } }, res);
  expect(res.statusCode).toBe(405);
  expect(res.headers.Location).toBeUndefined();
  expect(res.headers.Allow).toBe('GET');
  expect(res.end).toHaveBeenCalledWith('Method not allowed');
});
