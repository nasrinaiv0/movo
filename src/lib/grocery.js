export function groceryLineTotal(price, quantity) {
  const p = Number(price), q = Number(quantity);
  if (!Number.isFinite(p) || p < 0 || !Number.isFinite(q) || q <= 0) return 0;
  return Math.round(p * q * 100) / 100;
}
export function groceryTotal(items = []) {
  return Math.round(items.reduce((sum, item) => {
    if (!String(item?.name || '').trim()) return sum;
    return sum + groceryLineTotal(item.price, item.quantity);
  }, 0) * 100) / 100;
}
