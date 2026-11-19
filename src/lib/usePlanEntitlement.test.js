import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { usePlanEntitlement } from './usePlanEntitlement';
import { getStoreEntitlements } from './nativePurchases';
import { CLOUD_READ_TIMEOUT_MS } from './networkFailure';
import { readOfflineEntitlement, saveOfflineEntitlement } from './offlineEntitlement';

jest.mock('./offlineEntitlement', () => ({ readOfflineEntitlement: jest.fn(), saveOfflineEntitlement: jest.fn() }));

jest.mock('./nativePurchases', () => ({ getStoreEntitlements: jest.fn(), isNativePurchasePlatform: () => false }));
global.IS_REACT_ACT_ENVIRONMENT = true;
let latest;
function Probe({ session }) { latest = usePlanEntitlement(session); return null; }
const session = { user: { id: 'owner' }, access_token: 'token' };

describe('entitlement startup requests', () => {
  let root; let container;
  beforeEach(() => {
    readOfflineEntitlement.mockResolvedValue(null);
    saveOfflineEntitlement.mockResolvedValue();
    jest.useFakeTimers();
    container = document.createElement('div'); root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); jest.clearAllTimers(); jest.useRealTimers(); });
  test('keeps refresh stable across sign-in and shares the current token request', async () => {
    let resolve;
    getStoreEntitlements.mockImplementation(() => new Promise(done => { resolve = done; }));
    await act(async () => root.render(<Probe session={null} />));
    const refresh = latest.refreshEntitlement;
    await act(async () => root.render(<Probe session={session} />));
    expect(latest.refreshEntitlement).toBe(refresh);
    let pending;
    act(() => { pending = refresh(); });
    expect(getStoreEntitlements).toHaveBeenCalledTimes(1);
    expect(getStoreEntitlements).toHaveBeenCalledWith(session);
    await act(async () => { resolve({ active: true, tier: 'pro' }); await pending; });
    expect(latest.entitlement.tier).toBe('pro');
  });
  test('an unanswered check expires so a later refresh can retry', async () => {
    getStoreEntitlements.mockImplementation(() => new Promise(() => {}));
    await act(async () => root.render(<Probe session={session} />));
    await act(async () => { jest.advanceTimersByTime(CLOUD_READ_TIMEOUT_MS); });
    expect(latest.entitlement).toBeNull();
    getStoreEntitlements.mockResolvedValue({ active: true, tier: 'pro' });
    await act(async () => { await latest.refreshEntitlement(); });
    expect(getStoreEntitlements).toHaveBeenCalledTimes(2);
    expect(latest.entitlement.tier).toBe('pro');
  });
  test('an old owner response cannot grant the new owner access', async () => {
    let resolve;
    getStoreEntitlements.mockImplementationOnce(() => new Promise(done => { resolve = done; }))
      .mockResolvedValue({ active: false, tier: 'free' });
    await act(async () => root.render(<Probe session={session} />));
    await act(async () => root.render(<Probe session={{ user: { id: 'other' }, access_token: 'other-token' }} />));
    await act(async () => { resolve({ active: true, tier: 'pro' }); });
    expect(latest.entitlement.tier).toBe('free');
    expect(latest.entitlement.owner).toBe('other');
  });

  test('annual access survives the maximum browser timeout chunk', async () => {
    jest.spyOn(global, 'setInterval').mockImplementation(() => 0);
    const cached = { owner: 'owner', active: true, tier: 'pro_plus', expiresAt: new Date(Date.now() + 365 * 86400000).toISOString() };
    readOfflineEntitlement.mockResolvedValue(cached);
    getStoreEntitlements.mockRejectedValue(new Error('offline'));
    await act(async () => root.render(<Probe session={session} />));
    await act(async () => { jest.advanceTimersByTime(2147483647); });
    expect(latest.entitlement).toEqual(cached);
    global.setInterval.mockRestore();
  });

  test('an offline restart keeps the verified plan and a later server revocation replaces it', async () => {
    const cached = { owner: 'owner', active: true, tier: 'pro_plus', expiresAt: '2099-01-01T00:00:00Z' };
    readOfflineEntitlement.mockResolvedValue(cached);
    getStoreEntitlements.mockRejectedValue(new Error('offline'));
    await act(async () => root.render(<Probe session={session} />));
    expect(latest.entitlement).toEqual(cached);
    expect(latest.entitlementReady).toBe(true);
    getStoreEntitlements.mockResolvedValue({ active: false, tier: 'free' });
    await act(async () => { await latest.refreshEntitlement(); });
    expect(latest.entitlement.active).toBe(false);
    expect(saveOfflineEntitlement).toHaveBeenLastCalledWith('owner', { active: false, tier: 'free' });
  });
});
