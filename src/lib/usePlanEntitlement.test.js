import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

jest.mock('./nativePurchases', () => ({
  getStoreEntitlements: jest.fn(),
  isNativePurchasePlatform: () => false,
  syncStorePurchases: jest.fn(),
}));
import { getStoreEntitlements } from './nativePurchases';
import { usePlanEntitlement } from './usePlanEntitlement';

global.IS_REACT_ACT_ENVIRONMENT = true;

const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const signedIn = { user: { id: OWNER }, access_token: 'token-a' };
const verified = { tier: 'pro', active: true, expiresAt: '2099-01-01T00:00:00Z' };

describe('usePlanEntitlement', () => {
  let container; let root; let hook;
  function Probe({ session }) { hook = usePlanEntitlement(session); return null; }
  const render = session => act(async () => { root.render(<Probe session={session} />); });
  beforeEach(() => {
    getStoreEntitlements.mockReset().mockResolvedValue(verified);
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  test('without a session nothing is requested and the answer is "not verified"', async () => {
    await render(null);
    let value; await act(async () => { value = await hook.refreshEntitlement(); });
    expect(value).toBeNull();
    expect(getStoreEntitlements).not.toHaveBeenCalled();
    expect(hook.entitlement).toBeNull();
  });

  test('a caller holding the signed-in session can verify before this hook has rendered with it (launch, sign-in)', async () => {
    await render(null);
    let value; await act(async () => { value = await hook.refreshEntitlement(signedIn); });
    // The server was asked with that session; a missing session is not reported as an unreachable server.
    expect(getStoreEntitlements).toHaveBeenCalledTimes(1);
    expect(getStoreEntitlements).toHaveBeenCalledWith(signedIn);
    expect(value).toEqual(verified);
    // The hook grants nothing for a session it was not given.
    expect(hook.entitlement).toBeNull();
    await render(signedIn);
    expect(hook.entitlement).toEqual({ ...verified, owner: OWNER });
    expect(hook.entitlementReady).toBe(true);
  });

  test('an incomplete or unrelated argument falls back to the hook\'s own session', async () => {
    await render(signedIn);
    getStoreEntitlements.mockClear();
    await act(async () => { await hook.refreshEntitlement({ user: { id: 'someone-else' } }); }); // no access token
    await act(async () => { await hook.refreshEntitlement(verified); }); // e.g. chained after a store sync
    await act(async () => { await hook.refreshEntitlement(); });
    expect(getStoreEntitlements).toHaveBeenCalledTimes(3);
    getStoreEntitlements.mock.calls.forEach(call => expect(call[0]).toBe(signedIn));
  });

  test('a failed request returns "not verified" and keeps the last verified plan', async () => {
    await render(signedIn);
    expect(hook.entitlement).toEqual({ ...verified, owner: OWNER });
    getStoreEntitlements.mockRejectedValueOnce(new Error('network'));
    let value; await act(async () => { value = await hook.refreshEntitlement(); });
    expect(value).toBeNull();
    expect(hook.entitlement).toEqual({ ...verified, owner: OWNER });
  });
});
