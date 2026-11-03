const DIRECTIONS = new Set(['above', 'below']);

export function normalizeCryptoAlert(input) {
  if (!input || typeof input !== 'object') return null;
  const target = Number(input.target);
  if (typeof input.id !== 'string' || !input.id || typeof input.coinId !== 'string'
    || !/^[a-z0-9]+-[a-z0-9-]{1,90}$/.test(input.coinId)
    || !DIRECTIONS.has(input.direction) || !Number.isFinite(target) || target <= 0
    || typeof input.quote !== 'string' || !/^[A-Z]{3}$/.test(input.quote)) return null;
  return {
    id: input.id.slice(0, 80), coinId: input.coinId, name: String(input.name || '').slice(0, 100),
    symbol: String(input.symbol || '').slice(0, 20), direction: input.direction,
    target, quote: input.quote, enabled: input.enabled !== false,
    lastObservedPrice: Number.isFinite(input.lastObservedPrice) && input.lastObservedPrice >= 0 ? input.lastObservedPrice : null,
    lastTriggeredAt: typeof input.lastTriggeredAt === 'string' ? input.lastTriggeredAt : null
  };
}

/** Evaluate only genuine threshold crossings. First observation seeds the baseline without firing. */
export function evaluateCryptoAlerts(alerts, coins, now = new Date().toISOString()) {
  const prices = new Map((Array.isArray(coins) ? coins : []).filter(c => c && typeof c.id === 'string'
    && typeof c.price === 'number' && Number.isFinite(c.price) && c.price >= 0).map(c => [c.id, c.price]));
  const triggered = [];
  let changed = false;
  const next = (Array.isArray(alerts) ? alerts : []).map((raw) => {
    const alert = normalizeCryptoAlert(raw);
    if (!alert) { changed = true; return null; }
    const price = prices.get(alert.coinId);
    if (price === undefined) return alert;
    const crossed = alert.enabled && alert.lastObservedPrice !== null && (
      alert.direction === 'above'
        ? alert.lastObservedPrice < alert.target && price >= alert.target
        : alert.lastObservedPrice > alert.target && price <= alert.target
    );
    const updated = { ...alert, lastObservedPrice: price, ...(crossed ? { lastTriggeredAt: now } : {}) };
    if (crossed) triggered.push({ ...updated, price });
    if (updated.lastObservedPrice !== alert.lastObservedPrice || crossed) changed = true;
    return updated;
  }).filter(Boolean);
  return { alerts: next, triggered, changed };
}
