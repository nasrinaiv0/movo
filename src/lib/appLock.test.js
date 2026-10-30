/** @jest-environment node */
import { webcrypto } from 'crypto';

const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
const { setPasscode, verifyPasscode, lockState, removeLock, validPasscode } = require('./appLock');

test('stores only a salted PBKDF2 hash and verifies the passcode', async () => {
  expect(validPasscode('12a4')).toBe(false);
  await expect(setPasscode('12')).rejects.toThrow('4 to 6 digits');
  await setPasscode('482913');
  const saved = store['movo.lock.v1'];
  expect(saved).not.toContain('482913');
  expect(JSON.parse(saved)).toMatchObject({ len: 6 });
  expect(lockState()).toMatchObject({ enabled: true, length: 6, biometric: false });
  expect(await verifyPasscode('482913')).toBe(true);
  expect(await verifyPasscode('482914')).toBe(false);
  removeLock();
  expect(lockState().enabled).toBe(false);
}, 20000);
