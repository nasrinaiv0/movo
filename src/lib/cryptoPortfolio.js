const COIN_ID = /^[a-z0-9]+-[a-z0-9-]{1,90}$/;

export function normalizeCryptoHolding(input) {
  if (!input || typeof input !== 'object') return null;
  const quantity = Number(input.quantity);
  const averageCost = input.averageCost === '' || input.averageCost == null ? null : Number(input.averageCost);
  const quote = String(input.quote || '').toUpperCase();
  if (typeof input.id !== 'string' || !input.id || typeof input.coinId !== 'string' || !COIN_ID.test(input.coinId)
    || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1e18
    || (averageCost !== null && (!Number.isFinite(averageCost) || averageCost < 0 || averageCost > 1e18))
    || !/^[A-Z]{3}$/.test(quote)) return null;
  return {
    id: input.id.slice(0, 80), coinId: input.coinId,
    name: String(input.name || '').slice(0, 100), symbol: String(input.symbol || '').slice(0, 20),
    quantity, averageCost, quote,
    acquiredAt: typeof input.acquiredAt === 'string' && Number.isFinite(Date.parse(input.acquiredAt)) ? input.acquiredAt : null,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString()
  };
}

export function summarizeCryptoHoldings(holdings, coins, quote) {
  const market = new Map((Array.isArray(coins) ? coins : []).filter(c => c && typeof c.id === 'string'
    && typeof c.price === 'number' && Number.isFinite(c.price) && c.price >= 0).map(c => [c.id, c]));
  const rows = (Array.isArray(holdings) ? holdings : []).map(normalizeCryptoHolding).filter(Boolean).map(holding => {
    const coin = market.get(holding.coinId);
    const compatible = holding.quote === quote && coin;
    const value = compatible ? holding.quantity * coin.price : null;
    const costBasis = holding.averageCost === null ? null : holding.quantity * holding.averageCost;
    const profitLoss = value !== null && costBasis !== null ? value - costBasis : null;
    return { ...holding, coin, value, costBasis: holding.quote === quote ? costBasis : null, profitLoss };
  });
  const valued = rows.filter(row => row.value !== null);
  const totalValue = valued.reduce((sum, row) => sum + row.value, 0);
  const totalCost = rows.reduce((sum, row) => sum + (row.costBasis ?? 0), 0);
  const hasUnknownCost = rows.some(row => row.costBasis === null);
  const hasUnpriced = rows.some(row => row.value === null);
  return {
    rows, totalValue: hasUnpriced ? null : totalValue,
    totalCost: hasUnknownCost ? null : totalCost,
    profitLoss: hasUnpriced || hasUnknownCost ? null : totalValue - totalCost,
    valuedCount: valued.length, totalCount: rows.length
  };
}

export function upsertCryptoHolding(holdings, input) {
  const row = normalizeCryptoHolding(input);
  if (!row) throw new Error('invalid_crypto_holding');
  const list = Array.isArray(holdings) ? holdings : [];
  return [...list.filter(item => item && item.id !== row.id), row].slice(-200);
}
