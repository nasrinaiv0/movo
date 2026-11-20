// Provenance is separate from encryption. Never infer an owner from legacy
// device preferences or merge guest financial lists into a signed-in account.
export const LEGACY_PREFERENCES = 'movo.preferences.v3';
export const PREFERENCE_RECOVERY = 'movo.preferences.recovery.v1';
const RECOVERY_PENDING = 'movo.preferences.recovery.pending.v1';
const DEVICE = 'movo.preferences.device.v1';
const STICKERS = 'movo.customStickers.v1';
const DEVICE_KEYS = new Set([
  'theme', 'glass', 'clarity', 'sceneryVisibility', 'accent', 'customColor',
  'navAccent', 'showBalance', 'showBalanceAfterTransaction', 'compact',
  'fontStyle', 'fontSize', 'categoryColors', 'iconColors', 'language',
  'country', 'currency', 'onboarded', 'tutorialSeen', 'planWelcomeSeen',
]);
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const deviceSettings = value => Object.fromEntries(Object.entries(object(value) ? value : {})
  .filter(([key]) => DEVICE_KEYS.has(key)));
export function preferenceScopeKey(ownerId) {
  if (ownerId === null) return 'movo.preferences.scope.v1.guest';
  if (typeof ownerId !== 'string' || !ownerId || ownerId.length > 128 || /[\x00-\x1f]/.test(ownerId))
    throw new Error('invalid_preference_owner');
  return 'movo.preferences.scope.v1.owner:' + encodeURIComponent(ownerId);
}
function writeVerified(storage, key, value) {
  const raw = JSON.stringify(value);
  storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw new Error('preference_write_unverified');
}
export function hasUnassignedPreferences(storage = localStorage) {
  try { return storage.getItem(RECOVERY_PENDING) === 'true'; } catch { return false; }
}
function preserveUnassigned(storage) {
  const raw = storage.getItem(LEGACY_PREFERENCES);
  const stickers = storage.getItem(STICKERS);
  if (!raw && (!stickers || stickers === '[]')) return;
  let prefs;
  try { prefs = JSON.parse(raw); } catch { prefs = null; }
  if (object(prefs) && Object.keys(prefs).every(key => DEVICE_KEYS.has(key))
    && (!stickers || stickers === '[]' || storage.getItem(DEVICE))) return;
  const backup = storage.getItem(PREFERENCE_RECOVERY);
  const entries = backup ? JSON.parse(backup) : [];
  if (!Array.isArray(entries)) throw new Error('preference_recovery_invalid');
  if (!entries.some(entry => entry.preferences === raw && entry.stickers === stickers)) {
    writeVerified(storage, PREFERENCE_RECOVERY, [...entries, { preferences: raw, stickers }]);
  }
  writeVerified(storage, RECOVERY_PENDING, true);
  // Only rewrite the ambiguous working key after its exact original is durable.
  writeVerified(storage, LEGACY_PREFERENCES, deviceSettings(prefs));
}
export function readPreferenceScope(defaults, ownerId, storage = localStorage) {
  preserveUnassigned(storage);
  const device = JSON.parse(storage.getItem(DEVICE) || storage.getItem(LEGACY_PREFERENCES) || '{}');
  const raw = storage.getItem(preferenceScopeKey(ownerId));
  const value = raw ? JSON.parse(raw) : null;
  if (raw && (!object(value) || value.version !== 1 || value.ownerId !== ownerId || !object(value.prefs)
    || !Array.isArray(value.stickers))) throw new Error('preference_scope_invalid');
  const stored = value?.prefs || {};
  const prefs = { ...defaults, ...deviceSettings(device), ...stored };
  if ('homeHero' in defaults && !stored.homeHeroDefaultNone) {
    prefs.homeHero = !stored.homeHero || stored.homeHero === 'auto' ? 'plain' : stored.homeHero;
    prefs.homeHeroDefaultNone = true;
  }
  return { prefs, stickers: value?.stickers || [] };
}
export function savePreferenceScope(ownerId, prefs, stickers, storage = localStorage) {
  preserveUnassigned(storage);
  const key = preferenceScopeKey(ownerId);
  // Do not overwrite a corrupt or mismatched surviving snapshot with an empty view.
  const previous = storage.getItem(key);
  if (previous) {
    const value = JSON.parse(previous);
    if (value?.version !== 1 || value.ownerId !== ownerId || !object(value.prefs)
      || !Array.isArray(value.stickers)) throw new Error('preference_scope_invalid');
  }
  writeVerified(storage, key, { version: 1, ownerId, prefs, stickers });
  writeVerified(storage, DEVICE, deviceSettings(prefs));
  // Compatibility key is appearance/setup only, never another owner's finance.
  writeVerified(storage, LEGACY_PREFERENCES, deviceSettings(prefs));
}
