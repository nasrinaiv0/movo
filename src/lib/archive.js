/*
 * MOVO Archive: things the person removes are kept for 90 days, then deleted for good.
 *   - transaction, subscription, budget, plan: kept in preferences (`prefs.archive`), so they follow a signed-in
 *     person across devices like budgets and subscriptions do. Each entry keeps the removed item as it was.
 *   - failed phone automations: kept server-side in `movo_automation_inbox` with status `dismissed`
 *     (see listArchivedAutomations / purgeArchivedAutomations in financeRepository.js).
 * Nothing here moves money; restoring puts the record back exactly as it was.
 */
export const ARCHIVE_DAYS = 90;
export const ARCHIVE_LIMIT = 300;
const DAY = 86400000;

export const ARCHIVE_KINDS = {
  transaction: { label: 'Transactions', icon: 'list' },
  subscription: { label: 'Subscriptions', icon: 'refresh' },
  budget: { label: 'Limits', icon: 'sliders' },
  plan: { label: 'Plans', icon: 'target' },
  automation: { label: 'Failed automations', icon: 'info' },
};

const iso = (d) => new Date(d).toISOString();

/** A new archive entry for a removed item. `item` must carry its own id. */
export function archiveEntry(kind, item, now = new Date()) {
  if (!ARCHIVE_KINDS[kind] || !item || item.id === undefined || item.id === null) throw new Error('Nothing to archive.');
  return { id: `${kind}:${item.id}`, kind, archivedAt: iso(now), item };
}

/** When an entry is deleted for good. */
export const expiresAt = (archivedAt) => new Date(new Date(archivedAt).getTime() + ARCHIVE_DAYS * DAY);

/** Whole days left before the entry is deleted: 90 right after archiving, 0 on its last day. */
export function daysLeft(archivedAt, now = new Date()) {
  const ms = expiresAt(archivedAt).getTime() - new Date(now).getTime();
  return Math.max(0, Math.floor(ms / DAY));
}

export const isExpired = (archivedAt, now = new Date()) => !Number.isFinite(Date.parse(archivedAt)) || expiresAt(archivedAt).getTime() <= new Date(now).getTime();

/** Adds an entry (newest first), drops expired entries and keeps at most ARCHIVE_LIMIT. */
export function addToArchive(list, entry, now = new Date()) {
  const rest = (Array.isArray(list) ? list : []).filter(e => e && e.id !== entry.id);
  return purgeArchive([entry, ...rest], now);
}

/** Entries still inside the 90 days, newest first, at most ARCHIVE_LIMIT. */
export function purgeArchive(list, now = new Date()) {
  return (Array.isArray(list) ? list : [])
    .filter(e => e && typeof e.id === 'string' && ARCHIVE_KINDS[e.kind] && e.item && !isExpired(e.archivedAt, now))
    .sort((a, b) => Date.parse(b.archivedAt) - Date.parse(a.archivedAt))
    .slice(0, ARCHIVE_LIMIT);
}

export const removeFromArchive = (list, id) => (Array.isArray(list) ? list : []).filter(e => e && e.id !== id);
