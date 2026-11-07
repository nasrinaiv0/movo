import { accountTransactionDelta, isPostedTransaction } from './financeCalculations';
import { creditCardPaymentSummary } from './creditCard';
import { roundMoney } from './moneyMath';

/**
 * Reconstruct account balances at each posted event, using MOVO's opening-balance
 * and transaction-effect rules. This is a VIEW of the ledger, never a second
 * source of truth or an independent transaction record.
 *
 * Balances are in the affected account's native currency, not the dashboard
 * currency. When a conversion, account, or posting timestamp is missing, omit
 * the amount rather than present a fabricated balance.
 */
export function buildTransactionRunningBalances({
  transactions = [], postings = [], accounts = [], cardBankLinks = {},
  accountStyles = {}, creditCardPayments = {}, convertAmount = amount => amount,
} = {}) {
  const byAccount = new Map(accounts.filter(a => a?.id).map(a => [a.id, a]));
  const canonical = id => {
    const card = byAccount.get(id);
    if (card?.account_type !== 'card') return id;
    const kind = accountStyles[id]?.cardKind || card.cardKind || 'debit';
    const bankId = cardBankLinks[id];
    return kind === 'debit' && byAccount.get(bankId)?.account_type === 'bank' ? bankId : id;
  };
  const balances = new Map();
  const invalid = new Set();
  const snapshots = new Map();
  for (const account of accounts) {
    if (!account?.id || canonical(account.id) !== account.id) continue;
    const opening = Number(account.opening_balance ?? account.balance ?? 0);
    if (Number.isFinite(opening)) balances.set(account.id, roundMoney(opening));
    else invalid.add(account.id);
  }

  const toEvent = (tx, source) => ({
    tx, source,
    date: new Date(tx.occurred_at || tx.date || tx.posted_at || tx.created_at).getTime(),
    created: new Date(tx.created_at || tx.occurred_at || tx.date || 0).getTime(),
  });
  const events = [
    ...transactions.map(tx => toEvent(tx, 'transaction')),
    ...postings.map(tx => toEvent(tx, 'posting')),
  ];
  const affected = tx => [...new Set([
    canonical(tx.account_id || (tx.type === 'allocation' ? tx.source_account_id : null)),
    tx.type === 'transfer' || tx.transaction_type === 'transfer' ? canonical(tx.transfer_to_account_id) : null,
  ].filter(Boolean))];

  // Payments that have an associated ledger transaction are already counted.
  // Other saved card payments have their own dates and must be applied once.
  for (const [cardId, payments] of Object.entries(creditCardPayments)) {
    if (canonical(cardId) !== cardId || !byAccount.has(cardId)) continue;
    const card = byAccount.get(cardId);
    if ((accountStyles[cardId]?.cardKind || card.cardKind) !== 'credit') continue;
    for (const payment of creditCardPaymentSummary(payments).payments) {
      if (payment.transaction_id || payment.transactionId) continue;
      events.push(toEvent({
        id: 'card-payment-' + cardId + '-' + payment.id,
        type: 'income', account_id: cardId,
        origAmount: Number(payment.amount), origCurrency: card.currency || 'PHP',
        date: payment.date + 'T12:00:00',
      }, 'payment'));
    }
  }

  // A posting with an unknown time prevents reliable history for its account.
  for (const event of events) {
    if (!isPostedTransaction(event.tx)) continue;
    if (!Number.isFinite(event.date)) affected(event.tx).forEach(id => invalid.add(id));
  }
  const sorted = events.filter(event => Number.isFinite(event.date) && isPostedTransaction(event.tx))
    .sort((a, b) => a.date - b.date || a.created - b.created
      || String(a.tx.id ?? '').localeCompare(String(b.tx.id ?? '')));

  for (const { tx, source } of sorted) {
    const ids = affected(tx);
    const routed = {
      ...tx,
      account_id: canonical(tx.account_id || (tx.type === 'allocation' ? tx.source_account_id : null)),
      transfer_to_account_id: canonical(tx.transfer_to_account_id),
    };
    const result = [];
    for (const id of ids) {
      const account = byAccount.get(id);
      if (!account || !balances.has(id) || invalid.has(id)) continue;
      const delta = accountTransactionDelta(account, [routed], convertAmount);
      if (!Number.isFinite(delta)) { invalid.add(id); continue; }
      const after = roundMoney(balances.get(id) + delta);
      if (!Number.isFinite(after)) { invalid.add(id); continue; }
      balances.set(id, after);
      const isCredit = account.account_type === 'card' && (accountStyles[id]?.cardKind || account.cardKind) === 'credit';
      const creditLimit = Number(accountStyles[id]?.creditLimit ?? account.creditLimit);
      const creditAvailable = isCredit && Number.isFinite(creditLimit) && creditLimit > 0;
      result.push({
        accountName: account.name,
        currency: account.currency || 'PHP',
        label: creditAvailable ? 'Credit left' : 'Balance after',
        value: creditAvailable ? roundMoney(creditLimit + after) : after,
      });
    }
    if (source === 'transaction' && tx.id != null) snapshots.set(tx.id, result);
  }
  return snapshots;
}
