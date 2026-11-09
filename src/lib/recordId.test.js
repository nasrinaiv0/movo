import { newRecordId } from './recordId';
const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
test('always returns a v4 UUID, with or without crypto.randomUUID', () => {
  const original = globalThis.crypto;
  const ids = new Set();
  try {
    Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: a => { for (let i = 0; i < a.length; i += 1) a[i] = (i * 37 + ids.size) % 256; return a; } }, configurable: true });
    for (let i = 0; i < 5; i += 1) { const id = newRecordId(); expect(id).toMatch(V4); ids.add(id); }
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    expect(newRecordId()).toMatch(V4);
    Object.defineProperty(globalThis, 'crypto', { value: { randomUUID: () => '123e4567-e89b-42d3-a456-426614174000' }, configurable: true });
    expect(newRecordId()).toBe('123e4567-e89b-42d3-a456-426614174000');
  } finally { Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true }); }
  expect(ids.size).toBe(5);
});
