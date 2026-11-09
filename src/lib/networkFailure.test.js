import { isNetworkFailure, withTimeout, NetworkTimeoutError } from './networkFailure';

afterEach(() => { jest.useRealTimers(); Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true }); });

test('unreachable servers, browser offline and timeouts are network failures', () => {
  expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
  expect(isNetworkFailure({ message: 'TypeError: Load failed', code: '' })).toBe(true);
  expect(isNetworkFailure({ message: 'FetchError', details: 'TypeError: NetworkError when attempting to fetch resource.' })).toBe(true);
  expect(isNetworkFailure(new NetworkTimeoutError())).toBe(true);
  Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
  expect(isNetworkFailure(new Error('anything'))).toBe(true);
});

test('server answers are never treated as a lost connection', () => {
  expect(isNetworkFailure(null)).toBe(false);
  expect(isNetworkFailure({ message: 'new row violates row-level security policy', code: '42501' })).toBe(false);
  expect(isNetworkFailure({ message: 'canceling statement due to statement timeout', code: '57014' })).toBe(false);
  expect(isNetworkFailure(new Error('Transaction amount must be greater than zero.'))).toBe(false);
});

test('withTimeout resolves fast answers and rejects slow ones', async () => {
  await expect(withTimeout(Promise.resolve(3), 50)).resolves.toBe(3);
  jest.useFakeTimers();
  const slow = withTimeout(new Promise(() => {}), 1000);
  jest.advanceTimersByTime(1001);
  await expect(slow).rejects.toMatchObject({ code: 'MOVO_TIMEOUT' });
});
