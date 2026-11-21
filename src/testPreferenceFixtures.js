// Explicit provenance for fixture records. Production must never infer ownership
// from the legacy shared key, including when no cloud service is configured.
import { readPreferenceScope, savePreferenceScope } from './lib/ownerPreferences';
export const seedPreferenceFixture = (owner, raw) => savePreferenceScope(owner, JSON.parse(raw), []);
export const readPreferenceFixture = owner => JSON.stringify(readPreferenceScope({}, owner).prefs);
