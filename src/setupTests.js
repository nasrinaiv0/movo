// Jest's jsdom does not expose the browser TextEncoder/TextDecoder globals.
// Production browsers supply them natively; tests use Node's standards-based APIs.
import { TextEncoder, TextDecoder } from 'util';
import { runInThisContext } from 'vm';
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, writable: true, value: TextEncoder });
}
if (typeof globalThis.TextDecoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, writable: true, value: TextDecoder });
}

// fake-indexeddb v6 needs structuredClone; jsdom lacks Node's native method.
// Use Node's built-in structured clone to preserve non-extractable CryptoKey objects.
if (typeof globalThis.structuredClone !== 'function') {
  Object.defineProperty(globalThis, 'structuredClone', {
    configurable: true, writable: true, value: runInThisContext('structuredClone')
  });
}

import { webcrypto } from 'crypto';
// Provide an isolated test-only data key; production MUST initialise from the
// persistent browser/native vault before rendering any financial UI.
if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { configurable: true, writable: true, value: webcrypto });
}
globalThis.__MOVO_TEST_FINANCE_KEY__ = new Uint8Array(32).fill(0x73);
