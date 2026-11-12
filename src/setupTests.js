// Jest's jsdom does not expose the browser TextEncoder/TextDecoder globals.
// Production browsers supply them natively; tests use Node's standards-based APIs.
import { TextEncoder, TextDecoder } from 'util';
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: TextEncoder });
}
if (typeof globalThis.TextDecoder === 'undefined') {
  Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: TextDecoder });
}
