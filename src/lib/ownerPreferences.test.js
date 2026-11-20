import { LEGACY_PREFERENCES, PREFERENCE_RECOVERY, preferenceScopeKey,
  readPreferenceScope, savePreferenceScope } from './ownerPreferences';

const defaults = { theme: 'system', subscriptions: [], archive: [], accountStyles: {}, profileName: '' };
beforeEach(() => localStorage.clear());

test('guest, two owners and offline restarts keep separate financial lists and artwork', () => {
  for (const owner of [null, 'owner-a', 'owner-b']) {
    savePreferenceScope(owner, { ...defaults, profileName: String(owner), subscriptions: [{ id: String(owner) }] }, [{ id: String(owner) }]);
  }
  for (const owner of [null, 'owner-a', 'owner-b']) {
    expect(readPreferenceScope(defaults, owner)).toMatchObject({
      prefs: { profileName: String(owner), subscriptions: [{ id: String(owner) }] }, stickers: [{ id: String(owner) }],
    });
  }
});

test('a new owner inherits safe appearance and setup, with no guest finance, profile or cloud setting', () => {
  savePreferenceScope(null, { theme: 'dark', onboarded: true, cloudSyncEnabled: false,
    subscriptions: [{ id: 'guest' }], archive: [{ id: 'private' }], profileName: 'Guest', accountStyles: { a: {} } }, []);
  expect(readPreferenceScope(defaults, 'new-owner')).toEqual({
    prefs: { ...defaults, theme: 'dark', onboarded: true }, stickers: [],
  });
});

test('ambiguous legacy preferences and artwork survive byte-for-byte without being assigned to anyone', () => {
  const legacy = JSON.stringify({ theme: 'dark', subscriptions: [{ id: 'unknown-owner' }], phone: 'synthetic-phone' });
  const artwork = JSON.stringify([{ id: 'legacy-art', src: 'synthetic' }]);
  localStorage.setItem(LEGACY_PREFERENCES, legacy);
  localStorage.setItem('movo.customStickers.v1', artwork);
  for (const owner of [null, 'a', 'b']) {
    expect(readPreferenceScope(defaults, owner).prefs.subscriptions).toEqual([]);
  }
  expect(JSON.parse(localStorage.getItem(PREFERENCE_RECOVERY))).toContainEqual({ preferences: legacy, stickers: artwork });
  expect(JSON.parse(localStorage.getItem(LEGACY_PREFERENCES))).toEqual({ theme: 'dark' });
});

test('a stale legacy tab writing another copy cannot replace the first recovery snapshot', () => {
  for (const id of ['first', 'second']) {
    localStorage.setItem(LEGACY_PREFERENCES, JSON.stringify({ archive: [{ id }] }));
    readPreferenceScope(defaults, 'a');
  }
  expect(JSON.parse(localStorage.getItem(PREFERENCE_RECOVERY)).map(row => JSON.parse(row.preferences).archive[0].id))
    .toEqual(['first', 'second']);
});

test('a quota error while preserving legacy data blocks migration and leaves the original intact', () => {
  const raw = JSON.stringify({ subscriptions: [{ id: 'unsynced' }] });
  localStorage.setItem(LEGACY_PREFERENCES, raw);
  const storage = { getItem: key => localStorage.getItem(key), setItem: () => { throw new Error('quota'); } };
  expect(() => readPreferenceScope(defaults, 'a', storage)).toThrow('quota');
  expect(localStorage.getItem(LEGACY_PREFERENCES)).toBe(raw);
  expect(localStorage.getItem(preferenceScopeKey('a'))).toBeNull();
});

test.each(['wrong-owner', 'malformed'])('an invalid surviving snapshot (%s) is preserved and never overwritten', kind => {
  const raw = kind === 'malformed' ? '{' : JSON.stringify({ version: 1, ownerId: 'other', prefs: {}, stickers: [] });
  localStorage.setItem(preferenceScopeKey('a'), raw);
  expect(() => readPreferenceScope(defaults, 'a')).toThrow();
  expect(() => savePreferenceScope('a', defaults, [])).toThrow();
  expect(localStorage.getItem(preferenceScopeKey('a'))).toBe(raw);
});

test('legacy artwork is preserved even when the old preference key is absent', () => {
  localStorage.setItem('movo.customStickers.v1', '[{"id":"art"}]');
  readPreferenceScope(defaults, null);
  expect(JSON.parse(localStorage.getItem(PREFERENCE_RECOVERY))[0].stickers).toBe('[{"id":"art"}]');
});

test('one account legal acknowledgement cannot waive another account setup agreement', () => {
  savePreferenceScope('a', { theme: 'dark', legalAccepted: '2026-11-20', legalAcceptedRevision: '2026-11-20-r1' }, []);
  const b = readPreferenceScope({ ...defaults, legalAccepted: '', legalAcceptedRevision: '' }, 'b');
  expect(b.prefs.legalAccepted).toBe('');
  expect(b.prefs.legalAcceptedRevision).toBe('');
  expect(readPreferenceScope(defaults, 'a').prefs.legalAcceptedRevision).toBe('2026-11-20-r1');
});

// An appearance-only legacy key still cannot establish who owns its artwork.
test('legacy artwork beside safe settings is retained before any scope exists', () => {
  localStorage.setItem(LEGACY_PREFERENCES, '{"theme":"dark"}');
  localStorage.setItem('movo.customStickers.v1', '[{"id":"unassigned-art"}]');
  expect(readPreferenceScope(defaults, 'b').stickers).toEqual([]);
  expect(JSON.parse(localStorage.getItem(PREFERENCE_RECOVERY))).toContainEqual({
    preferences: '{"theme":"dark"}', stickers: '[{"id":"unassigned-art"}]',
  });
});
