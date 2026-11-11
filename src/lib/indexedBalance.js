import { isPostedTransaction } from './financeCalculations';
import { moneyCents, roundMoney } from './moneyMath';

/**
 * Compute all wallet balances with a single pass over the ledger. Linked debit
 * cards share one bank ledger; credit cards remain independent.
 * This is a pure display selector, never a source of authority for cloud writes.
 */
export function buildIndexedBalances(accounts, ledger, links = {}, styles = {}, convertAmount = a => a, cloudMode = false) {
  const byId = new Map((Array.isArray(accounts) ? accounts : []).filter(a => a?.id).map(a => [a.id, a]));
  const alias = new Map();
  for (const account of byId.values()) {
    const kind = styles?.[account.id]?.cardKind || account.cardKind || 'debit';
    const bankId = links?.[account.id];
    if (account.account_type === 'card' && kind === 'debit' && bankId && byId.get(bankId)?.account_type === 'bank')
      alias.set(account.id, bankId);
  }
  const route = id => alias.get(id) || id;
  const totals = new Map(Array.from(byId.keys(), id => [id, { delta: 0, held: 0, invalid: false }]));
  const apply = (id, signed, currency, hold = false) => {
    if (!id || !byId.has(id)) return;
    const account = byId.get(id), target = totals.get(id);
    if (target.invalid || !Number.isFinite(signed)) return;
    const converted = Number(convertAmount(Math.abs(signed), currency || account.currency || 'PHP', account.currency || 'PHP'));
    const cents = moneyCents(converted);
    if (!Number.isFinite(converted) || converted < 0 || !Number.isSafeInteger(cents)) {
      target.invalid = true; return;
    }
    if (hold) target.held += cents;
    else target.delta += Math.sign(signed) * cents;
    if (!Number.isSafeInteger(target.delta) || !Number.isSafeInteger(target.held)) target.invalid = true;
  };
  const seen = new Set();
  for (const row of Array.isArray(ledger) ? ledger : []) {
    if (!row) continue;
    const type = row.transaction_type || row.type;
    const from = route(row.account_id);
    const to = route(row.transfer_to_account_id);
    const currency = row.origCurrency || row.currency;
    const raw = Number(row.origAmount ?? row.amount);
    if (row.is_pending === true &&
      !['deleted','reversed','void','voided','cancelled','canceled','refunded','failed'].includes(String(row.status || '').toLowerCase()) &&
      (type === 'expense' || type === 'transfer') && byId.has(from)) {
      if (!Number.isFinite(raw) || raw < 0) totals.get(from).invalid = true;
      else apply(from, raw, currency, true);
    }
    if (!isPostedTransaction(row)) continue;
    if (row.id != null && row.id !== '') {
      const key = `${type}:${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    if (type === 'accounting_posting') {
      const signed = Number(row.signed_amount);
      if (Number.isFinite(signed) && signed !== 0) apply(from, signed, currency);
      continue;
    }
    if (!Number.isFinite(raw) || raw < 0 || raw === 0) continue;
    if (type === 'expense') apply(from, -raw, currency);
    else if (type === 'income') apply(from, raw, currency);
    else if (type === 'transfer' && from !== to) {
      apply(from, -raw, currency);
      apply(to, raw, currency);
    }
  }
  const result = new Map();
  for (const account of byId.values()) {
    const state = totals.get(account.id);
    const initial = Number(cloudMode ? (account.opening_balance || 0) : (account.opening_balance ?? account.balance ?? 0));
    const opening = Number.isFinite(initial) ? initial : 0;
    const settled = state.invalid ? NaN : roundMoney(opening + state.delta / 100);
    const available = state.invalid ? NaN : roundMoney(settled - state.held / 100);
    result.set(account.id, { settled, available });
  }
  return result;
}
