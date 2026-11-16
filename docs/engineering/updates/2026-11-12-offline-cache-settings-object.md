# 2026-11-12 — Encrypted offline cache keeps settings objects

**PR:** #289 (review fix before merge)

## Problem
`cachedList` wraps every cloud list read so subscribers can see their data offline. One wrapped read,
`getReminderPreferences`, returns a single settings object, not a list. The encrypted cache in #289 only accepted
arrays, so reminder preferences were no longer saved for offline use and showed an error offline instead.

## Change
`src/lib/offlineReadCache.js` accepts any non-null object (lists and settings objects) when writing, reading and
validating a cached copy. Encryption (AES-256-GCM, owner and list name bound as AAD), owner isolation and the
network-failure-only fallback are unchanged.

## Validation
- New test: a reminder-preferences object is stored as ciphertext and returned offline.
- Jest full suite, `tsc --noEmit`, strict build (see PR for the head SHA).
