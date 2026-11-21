import 'fake-indexeddb/auto';
import { webcrypto } from 'crypto';
import { clearHybridOwner } from './lib/hybridLocalStore';
import { saveLocalAccountQr, getLocalAccountQr } from './lib/accountQrLocalStore';
import { putLocalAttachment, getLocalAttachment } from './lib/localAttachments';
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
const mockClearCloud = jest.fn();
const mockDeleteAccount = jest.fn();
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
  deleteAllCloudData: (...args) => mockClearCloud(...args),
  deleteMyAccount: (...args) => mockDeleteAccount(...args),
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
    mockClearCloud.mockReset().mockResolvedValue(null);
    mockDeleteAccount.mockReset().mockResolvedValue(true);
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

  const submitClear = async (name = 'clear') => {
    await act(async () => { mockContext.setSheet({ name }); });
    const input = container.querySelector('input[aria-label="Type DELETE to confirm"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'DELETE');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      container.querySelector('[role="dialog"] form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  };

  test('clearing B preserves A, guest and unassigned preference recovery copies', async () => {
    await auth(B);
    const a = localStorage.getItem(preferenceScopeKey(A));
    const guest = localStorage.getItem(preferenceScopeKey(null));
    const recovery = '[{"preferences":"synthetic-unassigned","stickers":null}]';
    localStorage.setItem(PREFERENCE_RECOVERY, recovery);
    localStorage.setItem('movo.preferences.recovery.pending.v1', 'true');
    await submitClear();
    expect(mockClearCloud).toHaveBeenCalledWith(B);
    expect(localStorage.getItem(preferenceScopeKey(A))).toBe(a);
    expect(localStorage.getItem(preferenceScopeKey(null))).toBe(guest);
    expect(localStorage.getItem(PREFERENCE_RECOVERY)).toBe(recovery);
    expect(localStorage.getItem('movo.preferences.recovery.pending.v1')).toBe('true');
    expect(readPreferenceScope({}, B).prefs.subscriptions).toEqual([]);
  });

  test('clearing B preserves foreign wallets, offline workspaces, chats and files', async () => {
    await auth(B);
    const ownAccount = '123e4567-e89b-42d3-a456-426614174010';
    const ownReceipt = 'localreceipt:synthetic-b';
    const otherReceipt = 'localreceipt:synthetic-a';
    const otherWorkspace = JSON.stringify({ synthetic: 'pending A records' });
    const guestAccounts = '[{"id":"guest-cash","name":"Guest cash","account_type":"cash","opening_balance":100}]';
    const guestTransactions = '[{"id":"guest-tx","account_id":"guest-cash","merchant":"Guest private","amount":5,"transaction_type":"expense","occurred_at":"2026-11-20T09:00:00Z"}]';
    localStorage.setItem('movo.local.accounts.v1', guestAccounts);
    localStorage.setItem('movo.local.transactions.v1', guestTransactions);
    localStorage.setItem('movo.offline.workspace.v2.' + A, otherWorkspace);
    localStorage.setItem('movo.chatHistory.v1:user.' + A + ':thread:turn', 'synthetic-sealed-a-chat');
    localStorage.setItem('movo.readCache.v1:' + A + ':loans', 'synthetic-sealed-a-loans');
    localStorage.setItem('movo.ai.ack.v1.' + A, '1');
    localStorage.setItem('movo.profile-photo.v1.' + A, 'synthetic-a-photo');
    localStorage.setItem('movo.chatHistory.v1:user.' + B + ':thread:turn', 'synthetic-b-chat');
    sessionStorage.setItem('movo.ai.active.v1.user.' + A + '.device', 'synthetic-a-active');
    sessionStorage.setItem('movo.ai.active.v1.user.' + B + '.device', 'synthetic-b-active');
    saveOfflineWorkspace(B, { baseline: { financial_accounts: [], transactions: [] }, working: {
      financial_accounts: [{ id: ownAccount, name: 'B cash', account_type: 'cash', user_id: B }],
      transactions: [{ id: '123e4567-e89b-42d3-a456-426614174011', account_id: ownAccount, user_id: B, receipt_path: ownReceipt }],
    } });
    await putLocalAttachment(new File(['a'], 'a.png', { type: 'image/png' }), otherReceipt);
    await putLocalAttachment(new File(['b'], 'b.png', { type: 'image/png' }), ownReceipt);
    const image = 'data:image/png;base64,iVBORw0KGgo=';
    await saveLocalAccountQr(A + ':account-a', image);
    await saveLocalAccountQr(B + ':' + ownAccount, image);
    await submitClear();
    expect(localStorage.getItem('movo.local.accounts.v1')).toBe(guestAccounts);
    expect(localStorage.getItem('movo.local.transactions.v1')).toBe(guestTransactions);
    expect(localStorage.getItem('movo.offline.workspace.v2.' + A)).toBe(otherWorkspace);
    expect(localStorage.getItem('movo.chatHistory.v1:user.' + A + ':thread:turn')).toBe('synthetic-sealed-a-chat');
    expect(localStorage.getItem('movo.readCache.v1:' + A + ':loans')).toBe('synthetic-sealed-a-loans');
    expect(localStorage.getItem('movo.ai.ack.v1.' + A)).toBe('1');
    expect(localStorage.getItem('movo.profile-photo.v1.' + A)).toBe('synthetic-a-photo');
    expect(localStorage.getItem('movo.chatHistory.v1:user.' + B + ':thread:turn')).toBeNull();
    expect(sessionStorage.getItem('movo.ai.active.v1.user.' + A + '.device')).toBe('synthetic-a-active');
    expect(sessionStorage.getItem('movo.ai.active.v1.user.' + B + '.device')).toBeNull();
    expect(await getLocalAttachment(otherReceipt)).not.toBeNull();
    expect(await getLocalAttachment(ownReceipt)).toBeNull();
    expect(await getLocalAccountQr(A + ':account-a')).toBe(image);
    expect(await getLocalAccountQr(B + ':' + ownAccount)).toBeNull();
  });

  test('a file cleanup failure is reported and retains preferences for a safe retry', async () => {
    await auth(B);
    const cleanup = jest.spyOn(require('./lib/localAttachments'), 'removeLocalAttachments')
      .mockRejectedValue(new Error('synthetic storage failure'));
    try {
      await submitClear();
      expect(container.textContent).toContain('Some records could not be cleared.');
      expect(container.textContent).not.toContain('Records cleared.');
      expect(readPreferenceScope({}, B).prefs.subscriptions.map(item => item.id)).toEqual(['b']);
    } finally { cleanup.mockRestore(); }
    await submitClear();
    expect(container.textContent).toContain('Records cleared.');
    expect(readPreferenceScope({}, B).prefs.subscriptions).toEqual([]);
  });

  test('a clear request started by A cannot reset B after an account switch', async () => {
    let releaseClear;
    mockClearCloud.mockImplementation(() => new Promise(resolve => { releaseClear = resolve; }));
    await auth(A);
    await submitClear();
    expect(releaseClear).toEqual(expect.any(Function));
    await auth(B);
    const b = localStorage.getItem(preferenceScopeKey(B));
    await act(async () => { releaseClear(); await new Promise(resolve => setTimeout(resolve, 100)); });
    expect(localStorage.getItem(preferenceScopeKey(B))).toBe(b);
    expect(container.textContent).toContain('Bob');
  });

  test('an account deletion response for A cannot erase B device preferences', async () => {
    let releaseDeletion;
    mockDeleteAccount.mockImplementation(() => new Promise(resolve => { releaseDeletion = resolve; }));
    await auth(A);
    await submitClear('deleteAccount');
    expect(mockDeleteAccount).toHaveBeenCalledWith(A);
    await auth(B);
    const b = localStorage.getItem(preferenceScopeKey(B));
    await act(async () => { releaseDeletion(true); await new Promise(resolve => setTimeout(resolve, 100)); });
    expect(localStorage.getItem(preferenceScopeKey(B))).toBe(b);
    expect(container.textContent).toContain('Bob');
  });

  test('a switch during A device cleanup leaves B preferences usable', async () => {
    await auth(A);
    let releaseCleanup;
    const cleanup = jest.spyOn(require('./lib/hybridLocalStore'), 'clearHybridOwner')
      .mockImplementation(() => new Promise(resolve => { releaseCleanup = resolve; }));
    try {
      await submitClear('deleteAccount');
      expect(cleanup).toHaveBeenCalledWith(A);
      expect(releaseCleanup).toEqual(expect.any(Function));
      await auth(B);
      await act(async () => { releaseCleanup(); await new Promise(resolve => setTimeout(resolve, 100)); });
      await act(async () => { mockContext.setPref('profileName', 'Bob active'); });
      expect(readPreferenceScope({}, B).prefs.profileName).toBe('Bob active');
      expect(readPreferenceScope({}, B).prefs.subscriptions.map(item => item.id)).toEqual(['b']);
    } finally { cleanup.mockRestore(); }
  });

  test('localized navigation keeps readable labels and restores the selected tab after a cancelled touch', async () => {
    const arabic = require('./i18n/locales/ar.json');
    await act(async () => {
      mockContext.setPref('language', 'ar');
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    const wallet = Array.from(container.querySelectorAll('.bottom-nav button')).find(button => button.title === arabic.Wallet);
    expect(wallet).toBeTruthy();
    expect(wallet.getAttribute('aria-label')).toBe(arabic.Wallet);
    await act(async () => { wallet.click(); });
    expect(container.querySelector('main').getAttribute('data-view')).toBe('Wallet');
    await act(async () => { wallet.dispatchEvent(new MouseEvent('pointercancel', { bubbles: true })); });
    expect(wallet.classList.contains('nav-active')).toBe(true);
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
