import 'fake-indexeddb/auto';
import { webcrypto } from 'crypto';
import { clearHybridOwner } from './lib/hybridLocalStore';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

if(typeof global.structuredClone!=='function')global.structuredClone=value=>JSON.parse(JSON.stringify(value));
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});

const OWNER = '123e4567-e89b-42d3-a456-426614174000';
const ACCOUNT = '123e4567-e89b-42d3-a456-426614174001';
let mockAuthCallback;
let mockContext;
let mockTier = 'pro';
jest.mock('./screens/Home', () => {
  const React = require('react');
  const Home = jest.requireActual('./screens/Home').default;
  return { __esModule: true, default: props => { mockContext = props.c; return React.createElement(Home, props); } };
});
jest.mock('./lib/offlineSyncCloudAdapter', () => ({ ...jest.requireActual('./lib/offlineSyncCloudAdapter'), fetchOfflineSyncCloud: async () => ({ financial_accounts: [], transactions: [] }) }));
const mockLoadPreferences = jest.fn();
const mockSavePreferences = jest.fn();
const mockRefreshEntitlement = jest.fn();
const mockGetEntitlements = jest.fn();
jest.mock('./lib/nativePurchases', () => ({
  ...jest.requireActual('./lib/nativePurchases'),
  getStoreEntitlements: (...args) => mockGetEntitlements(...args),
  isNativePurchasePlatform: () => false,
}));
jest.mock('./lib/hybridWorkspaceRecovery', () => ({
  recoverHybridWorkspace: jest.fn(async () => null),
}));
jest.mock('./lib/supabaseClient', () => ({
  supabaseConfigured: true,
  supabase: {
    auth: { onAuthStateChange: callback => { mockAuthCallback = callback; return { data: { subscription: { unsubscribe() {} } } }; } },
    storage: { from: () => ({ remove: async () => ({}), upload: async () => ({ error: null }) }) },
  },
}));
jest.mock('./lib/financeRepository', () => ({
  getCurrentSession: async () => null,
  listAccounts: async () => [], listTransactions: async () => [],
  listBudgets: async () => [], listAutomationInbox: async () => [],
  loadPreferences: (...args) => mockLoadPreferences(...args), savePreferences: (...args) => mockSavePreferences(...args),
  purgeArchivedAutomations: async () => null, listArchivedAutomations: async () => [],
}));
jest.mock('./lib/obligationsRepository', () => ({
  listAccountingPostings: async () => [],
  listAccountingActivities: async () => [],
  listLoans: async () => [],
  listReceivables: async () => [],
}));
jest.mock('./lib/billsRepository', () => ({ listBills: async () => [], listOccurrences: async () => [] }));
// eslint-disable-next-line import/first
import App from './App';
// eslint-disable-next-line import/first
import { saveOfflineWorkspace } from './lib/offlineWorkspaceStore';
// eslint-disable-next-line import/first
import { recoverHybridWorkspace } from './lib/hybridWorkspaceRecovery';

jest.mock('./lib/usePlanEntitlement', () => ({ usePlanEntitlement: session => ({
  entitlement: session?.user ? { owner: session.user.id, active: true, tier: mockTier, expiresAt: '2099-01-01T00:00:00Z' } : null,
  refreshEntitlement: mockRefreshEntitlement, entitlementReady: !!session?.user,
}) }));
// eslint-disable-next-line import/first
import { LEGACY_PREFERENCES, PREFERENCE_RECOVERY, preferenceScopeKey, readPreferenceScope, savePreferenceScope } from './lib/ownerPreferences';
// eslint-disable-next-line import/first
import * as platform from './lib/platform';
// eslint-disable-next-line import/first
import * as keyVault from './lib/nativeAutomationKey';
global.IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = jest.fn();

const click = async (container, name) => {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.getAttribute('aria-label') === name || item.textContent.trim() === name);
  if (!button) throw new Error('Button not found: ' + name);
  await act(async () => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};
const nav = (container, name) => click(container, name);


describe('account preference isolation through real App auth transitions', () => {
  jest.setTimeout(15000);
  const A = OWNER;
  const B = '123e4567-e89b-42d3-a456-426614174009';
  const setup = { onboarded: true, tutorialSeen: true, planWelcomeSeen: true };
  let root; let container;
  const auth = async owner => {
    mockRefreshEntitlement.mockResolvedValue(owner ? { owner, active: true, tier: 'pro', expiresAt: '2099-01-01T00:00:00Z' } : null);
    await act(async () => {
      mockAuthCallback(owner ? 'SIGNED_IN' : 'SIGNED_OUT', owner ? { user: { id: owner }, access_token: 'synthetic-' + owner } : null);
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  };
  beforeEach(async () => {
    mockTier = 'pro';
    localStorage.clear();
    await Promise.all([clearHybridOwner(A), clearHybridOwner(B)]);
    savePreferenceScope(null, { ...setup, profileName: 'Gwen', subscriptions: [{ id: 'guest', name: 'Guest private' }] }, []);
    savePreferenceScope(A, { ...setup, profileName: 'Alice', subscriptions: [{ id: 'a', name: 'Owner A private' }] }, []);
    savePreferenceScope(B, { ...setup, profileName: 'Bob', subscriptions: [{ id: 'b', name: 'Owner B private' }] }, []);
    mockLoadPreferences.mockReset().mockResolvedValue(null);
    mockSavePreferences.mockReset().mockResolvedValue(null);
    recoverHybridWorkspace.mockReset().mockResolvedValue(null);
    container = document.createElement('div'); document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root.render(<App />); });
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); localStorage.clear(); });

  test('guest and owner lists stay isolated across A to B to signed-out to A', async () => {
    for (const owner of [A, B, null, A]) {
      await auth(owner);
      expect(container.textContent).toContain(owner === A ? 'Alice' : owner === B ? 'Bob' : 'Gwen');
      const saved = readPreferenceScope({}, owner);
      expect(saved.prefs.subscriptions.map(item => item.id)).toEqual([owner === A ? 'a' : owner === B ? 'b' : 'guest']);
    }
    expect(readPreferenceScope({}, B).prefs.subscriptions.map(item => item.id)).toEqual(['b']);
  });

  test('an A response released after B signs in cannot enter B view or upload', async () => {
    let releaseA;
    mockLoadPreferences.mockImplementation(owner => owner === A
      ? new Promise(resolve => { releaseA = resolve; }) : Promise.resolve({ prefs: { subscriptions: [{ id: 'b-cloud' }] } }));
    await auth(A);
    expect(mockLoadPreferences).toHaveBeenCalledWith(A);
    await auth(B);
    await act(async () => {
      releaseA({ prefs: { subscriptions: [{ id: 'late-a-secret' }] }, stickers: [] });
      await new Promise(resolve => setTimeout(resolve, 1700));
    });
    const savedB = readPreferenceScope({}, B);
    expect(savedB.prefs.subscriptions.map(item => item.id)).toEqual(['b-cloud', 'b']);
    const bWrites = mockSavePreferences.mock.calls.filter(([owner]) => owner === B);
    expect(bWrites.length).toBeGreaterThan(0);
    expect(JSON.stringify(bWrites)).not.toContain('late-a-secret');
    expect(JSON.stringify(bWrites)).not.toContain('Guest private');
    expect(container.textContent).not.toContain('late-a-secret');
  });
  test('a corrupt owner snapshot blocks preference merge/upload and never inherits the previous account', async () => {
    await auth(A);
    localStorage.setItem(preferenceScopeKey(B), '{');
    const survivingArtwork = '[{"id":"recoverable-art","src":"data:image/png;base64,AA=="}]';
    localStorage.setItem('movo.customStickers.v1', survivingArtwork);
    mockLoadPreferences.mockClear(); mockSavePreferences.mockClear();
    await auth(B);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1700)); });
    expect(container.textContent).not.toContain('Alice');
    expect(localStorage.getItem(preferenceScopeKey(B))).toBe('{');
    expect(localStorage.getItem('movo.customStickers.v1')).toBe(survivingArtwork);
    expect(mockLoadPreferences).not.toHaveBeenCalledWith(B);
    expect(mockSavePreferences.mock.calls.filter(([owner]) => owner === B)).toEqual([]);
  });

  test('callbacks captured in A cannot change B preferences after the session switch', async () => {
    await auth(A);
    const staleSetter = mockContext.setPref;
    await auth(B);
    await act(async () => { staleSetter('subscriptions', [{ id: 'late-a-ui' }]); });
    expect(readPreferenceScope({}, B).prefs.subscriptions.map(item => item.id)).toEqual(['b']);
    expect(container.textContent).not.toContain('Alice');
  });

  test('a protected device key is revalidated before activation and a late A verification cannot activate it in B', async () => {
    const native = jest.spyOn(platform, 'isNativeApp').mockReturnValue(true);
    const key = jest.spyOn(keyVault, 'nativeAutomationKey').mockReturnValue('a'.repeat(32));
    const originalFetch = global.fetch;
    let releaseA;
    const requests = [];
    global.fetch = jest.fn((url, options) => {
      if (String(url).endsWith('/api/log')) {
        requests.push(options);
        if (options.headers.Authorization.endsWith(A)) return new Promise(resolve => { releaseA = resolve; });
      }
      return Promise.resolve({ ok: false, status: 409, json: async () => ({ error: 'key_already_registered' }) });
    });
    try {
      mockTier = 'pro_plus';
      for (const owner of [A, B]) savePreferenceScope(owner, { ...readPreferenceScope({}, owner).prefs, autoLog: true }, []);
      await auth(A);
      expect(releaseA).toEqual(expect.any(Function));
      await auth(B);
      await act(async () => {
        releaseA({ ok: true, json: async () => ({ registered: true }) });
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      expect(requests.some(options => options.headers.Authorization.endsWith(B))).toBe(true);
      expect(mockContext.prefs.autoLogKey).toBe('');
      expect(readPreferenceScope({}, B).prefs.autoLogKey).toBeUndefined();
    } finally { native.mockRestore(); key.mockRestore(); global.fetch = originalFetch; }
  });

  test('unassigned legacy A financial data is retained for recovery and cannot upload when B signs in', async () => {
    act(() => root.unmount());
    localStorage.clear();
    const legacy = { ...setup, profileName: 'Legacy person', subscriptions: [{ id: 'unassigned-a-private', name: 'Private A' }],
      archive: [{ id: 'unassigned-a-archive' }], membershipCards: [{ id: 'unassigned-a-member' }] };
    const raw = JSON.stringify(legacy);
    localStorage.setItem(LEGACY_PREFERENCES, raw);
    root = createRoot(container);
    await act(async () => { root.render(<App />); });
    expect(container.textContent).toContain('Older device preferences are saved for recovery');
    await auth(B);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1700)); });
    const writes = mockSavePreferences.mock.calls.filter(([owner]) => owner === B);
    expect(writes.length).toBeGreaterThan(0);
    expect(JSON.stringify(writes)).not.toContain('unassigned-a-');
    expect(JSON.parse(localStorage.getItem(PREFERENCE_RECOVERY))).toContainEqual({ preferences: raw, stickers: null });
  });

});
