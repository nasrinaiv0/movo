/** @jest-environment node */
import vm from 'vm';
import { Buffer } from 'buffer';
import { webcrypto } from 'crypto';

// Jest 27's isolated Node global predates Node 26's built-in WebCrypto global.
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });

// Development dependencies only: the app never imports this test into its bundle.
test('patched serialization still preserves the callback, date and regex shapes used by build tools', () => {
  const serialize = require('serialize-javascript');
  const source = serialize({ match: /audit/gi, date: new Date('2026-11-20T00:00:00Z'), callback: function (value) { return value + 1; } });
  const value = vm.runInNewContext('(' + source + ')', {}, { timeout: 1000 });
  expect(value.match.test('AUDIT')).toBe(true);
  expect(value.date.toISOString()).toBe('2026-11-20T00:00:00.000Z');
  expect(value.callback(1)).toBe(2);
});

test.each(['v3', 'v5'])('patched UUID %s rejects undersized buffers rather than returning a truncated identifier', version => {
  const uuid = require('uuid');
  expect(() => uuid[version]('synthetic-build-fixture', uuid[version].DNS, Buffer.alloc(15))).toThrow(RangeError);
});

test('SockJS and JSONPath retain their build/development integration contracts', () => {
  expect(typeof require('sockjs').createServer().installHandlers).toBe('function');
  expect(require('jsonpath').query({ assets: [{ size: 1 }, { size: 2 }] }, '$.assets[*].size')).toEqual([1, 2]);
});
