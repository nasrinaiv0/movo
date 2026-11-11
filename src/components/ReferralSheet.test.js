import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ReferralSheet from './ReferralSheet';

jest.mock('../lib/platform', () => ({
  apiUrl: path => path, appOrigin: () => 'https://movo.nasrinai.com', isNativeApp: () => false,
}));
jest.mock('@capgo/capacitor-app-attest', () => ({ AppAttest: {} }));

global.IS_REACT_ACT_ENVIRONMENT = true;
const session = { access_token: 'token', user: { id: 'u1' } };
const reply = (body, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });
let calls;
const serve = routes => {
  calls = [];
  global.fetch = (url, init = {}) => {
    calls.push([url, init]);
    const route = routes[url];
    return typeof route === 'function' ? route(init) : route ? reply(route) : reply({ error: 'unknown' }, false);
  };
};
const flush = () => act(async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); });
async function render(props) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => root.render(<ReferralSheet onClose={() => {}} {...props} />));
  await flush();
  return { el, cleanup: () => { act(() => root.unmount()); el.remove(); } };
}
const button = (el, name) => Array.from(el.querySelectorAll('button')).find(b => b.textContent.trim() === name);
const typeInto = (input, value) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
});
afterEach(() => { delete global.fetch; window.localStorage.clear(); });

test('shows the short code, the 10-friend progress and one download QR code per platform', async () => {
  serve({ '/api/referrals/status': { referralCode: 'M78038', pointsEnabled: false, canClaim: false } });
  const { el, cleanup } = await render({ session, entitlement: { referralCode: 'M78038', qualifiedReferrals: 3 } });
  expect(el.textContent).not.toContain('iPhone');
  expect(el.querySelector('.referral-code').textContent).toBe('M78038');
  // Referrals are counted in points now: the old "n of 10 friends subscribed" line is gone.
  expect(el.textContent).not.toMatch(/of 10 friends subscribed/);
  const qrs = Array.from(el.querySelectorAll('.referral-qr-code'));
  expect(qrs.map(q => q.getAttribute('aria-label'))).toEqual(['QR code to get MOVO on iOS', 'QR code to get MOVO on Android']);
  expect(qrs.every(q => q.querySelector('svg path'))).toBe(true);
  expect(Array.from(el.querySelectorAll('.referral-qr figcaption')).map(f => f.textContent)).toEqual(['iOSApp Store', 'AndroidGoogle Play']);
  expect(calls.map(c => c[0])).toEqual(['/api/referrals/status']);
  // Points are switched off on the server and this account cannot add a code: neither is shown.
  expect(el.querySelector('.referral-stats')).toBeNull();
  expect(el.querySelector('#movo-redeem-code')).toBeNull();
  cleanup();
});

test('the two QR codes differ and carry the code', async () => {
  serve({ '/api/referrals/status': { referralCode: 'M78038' } });
  const { el, cleanup } = await render({ session, entitlement: {} });
  const [ios, android] = Array.from(el.querySelectorAll('.referral-qr-code svg')).map(svg => svg.innerHTML);
  expect(ios).not.toBe(android);
  expect(el.querySelector('.referral-code').textContent).toBe('M78038');
  cleanup();
});

test('share sends the code with both download links', async () => {
  serve({ '/api/referrals/status': { referralCode: 'M78038', pointsEnabled: false } });
  const share = jest.fn(() => Promise.resolve());
  Object.defineProperty(navigator, 'share', { value: share, configurable: true });
  const { el, cleanup } = await render({ session, entitlement: { referralCode: 'M78038' } });
  await act(async () => { button(el, 'Share').click(); });
  const text = share.mock.calls[0][0].text;
  expect(text).toContain('M78038');
  expect(text).toContain('iOS: https://movo.nasrinai.com/api/download?platform=ios&ref=M78038');
  expect(text).not.toContain('iPhone');
  expect(text).toContain('Android: https://movo.nasrinai.com/api/download?platform=android&ref=M78038');
  delete navigator.share;
  cleanup();
});

test('a new account adds a friend’s code (prefilled from a download link) and sees the result', async () => {
  window.localStorage.setItem('movo.pendingReferral.v1', 'M12345');
  let claimed = false;
  serve({
    '/api/referrals/status': () => reply({ referralCode: 'M78038', pointsEnabled: true, points: 0, canClaim: !claimed }),
    '/api/referrals/claim': init => { claimed = JSON.parse(init.body).code === 'M12345'; return reply({ claimed }); },
  });
  const notify = jest.fn();
  const { el, cleanup } = await render({ session, entitlement: { referralCode: 'M78038' }, notify });
  const input = el.querySelector('#movo-redeem-code');
  expect(input.value).toBe('M12345');
  expect(el.querySelector('.referral-stats').textContent).toContain('Points');
  await act(async () => { button(el, 'Add').click(); });
  await flush();
  expect(el.textContent).toContain('Code added. Thanks for joining through a friend.');
  expect(notify).toHaveBeenCalled();
  expect(window.localStorage.getItem('movo.pendingReferral.v1')).toBeNull();
  expect(el.querySelector('#movo-redeem-code')).toBeNull();
  cleanup();
});

test('a refused code explains why, and invalid input cannot be sent', async () => {
  serve({
    '/api/referrals/status': { referralCode: 'M78038', pointsEnabled: false, canClaim: true },
    '/api/referrals/claim': () => reply({ error: 'own_referral_code' }, false),
  });
  const { el, cleanup } = await render({ session, entitlement: { referralCode: 'M78038' } });
  const input = el.querySelector('#movo-redeem-code');
  typeInto(input, 'mo1');
  expect(button(el, 'Add').disabled).toBe(true);
  typeInto(input, 'm78038');
  expect(input.value).toBe('M78038');
  await act(async () => { button(el, 'Add').click(); });
  await flush();
  expect(el.textContent).toContain('That is your own code. Share it with a friend instead.');
  cleanup();
});

test('signed out: download QR codes still show, with a sign-in prompt instead of a code', async () => {
  serve({});
  const onSignIn = jest.fn();
  const { el, cleanup } = await render({ session: null, onSignIn });
  expect(el.textContent).toContain('Sign in to get your referral code.');
  expect(el.querySelectorAll('.referral-qr-code svg')).toHaveLength(2);
  expect(el.querySelector('.referral-code')).toBeNull();
  act(() => button(el, 'Sign in').click());
  expect(onSignIn).toHaveBeenCalled();
  expect(calls).toHaveLength(0);
  cleanup();
});

test('every 500 points become a month of Pro: confirmed, spent by the server, then the plan refreshes', async () => {
  let points = 620;
  serve({
    '/api/referrals/status': () => reply({ referralCode: 'M78038', pointsEnabled: true, points, canClaim: false, pointsProUntil: points < 500 ? '2026-12-09T00:00:00Z' : null }),
    '/api/referrals/redeem': init => { expect(JSON.parse(init.body)).toEqual({ months: 1 }); points -= 500; return reply({ redeemedMonths: 1, expiresAt: '2026-12-09T00:00:00Z', points }); },
  });
  const confirm = jest.spyOn(window, 'confirm').mockImplementation(() => true);
  const onPlanChanged = jest.fn();
  const { el, cleanup } = await render({ session, entitlement: { referralCode: 'M78038' }, onPlanChanged });
  expect(el.querySelector('.referral-points-redeem').textContent).toContain('500 points = 1 month of Pro');
  expect(el.querySelector('.referral-points-redeem').textContent).toContain('1 month ready to use');
  await act(async () => { button(el, 'Use 500 points').click(); });
  await flush();
  expect(confirm).toHaveBeenCalled();
  expect(onPlanChanged).toHaveBeenCalled();
  expect(el.textContent).toContain('1 month of Pro added. It runs until');
  // 120 points left: the button waits for the next 500, and the Pro date shows.
  expect(button(el, 'Use 500 points').disabled).toBe(true);
  expect(el.querySelector('.referral-points-redeem').textContent).toContain('Pro from points until');
  confirm.mockRestore();
  cleanup();
});

test('below 500 points nothing can be redeemed, and a cancelled confirmation spends nothing', async () => {
  serve({ '/api/referrals/status': { referralCode: 'M78038', pointsEnabled: true, points: 499 } });
  const { el, cleanup } = await render({ session, entitlement: {} });
  expect(button(el, 'Use 500 points').disabled).toBe(true);
  expect(el.textContent).toContain('499 of 500 points for your next month');
  cleanup();
  serve({ '/api/referrals/status': { referralCode: 'M78038', pointsEnabled: true, points: 1000 } });
  const confirm = jest.spyOn(window, 'confirm').mockImplementation(() => false);
  const second = await render({ session, entitlement: {} });
  expect(second.el.textContent).toContain('2 months ready to use');
  await act(async () => { button(second.el, 'Use 500 points').click(); });
  expect(calls.some(([url]) => url === '/api/referrals/redeem')).toBe(false);
  confirm.mockRestore();
  second.cleanup();
});
