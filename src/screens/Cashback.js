import React, { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { RootHeader, SectionTitle, Sheet } from '../components/ui';
import { money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { cashbackTotals, estimateCashback } from '../lib/cashback';

const today = () => new Date().toLocaleDateString('en-CA');
const round = n => Math.round((Number(n) || 0) * 100) / 100;

export default function Cashback({ c }) {
  const { prefs = {}, setPref, accountsView = [], txs = [], show } = c;
  const rules = prefs.cashbackRules || {};
  const manual = prefs.cashbackEntries || [];
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const wallets = accountsView.filter(a => !a.is_archived && ['e_wallet', 'bank'].includes(a.account_type));
  const auto = useMemo(() => estimateCashback(txs, accountsView, rules), [txs, accountsView, rules]);
  const totals = cashbackTotals(manual.filter(x => x.status !== 'Redeemed'));
  const estimatedTotals = cashbackTotals(auto);
  const formatTotals = values => Object.entries(values);
  const cash = (value, currency = 'PHP') => shown(show, money(value, currency));
  const saveRules = next => setPref('cashbackRules', next);
  const saveManual = event => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e12) {
      setError(tr('Enter a valid cashback amount.'));
      return;
    }
    const account = wallets.find(a => a.id === form.accountId);
    const entry = {
      id: window.crypto?.randomUUID?.() || String(Date.now()),
      amount: round(amount),
      currency: account?.currency || form.currency || 'PHP',
      date: form.date || today(),
      source: String(form.source || '').trim().slice(0, 100) || 'Manual cashback',
      account: account ? (account.institution_name || account.name) : '',
      accountId: account?.id || '',
      status: form.status || 'Received',
    };
    setPref('cashbackEntries', [entry, ...manual].slice(0, 500));
    setSheet(null);
    setError('');
  };
  const updateEntry = (id, patch) => setPref('cashbackEntries', manual.map(entry => entry.id === id ? { ...entry, ...patch } : entry));
  const removeEntry = id => setPref('cashbackEntries', manual.filter(entry => entry.id !== id));

  return <>
    <RootHeader title={tr('Cashback')} onSearch={c.openSearch} onBell={() => c.go('Notifications')} onSettings={() => c.go('Settings')} unread={c.unread} />
    <section className="card total-card cashback-total">
      <small>{tr('Cashback tracked')}</small>
      {formatTotals(totals).length ? formatTotals(totals).map(([currency, amount]) => <div className="balance-amount" key={currency}>{cash(amount, currency)}</div>) : <div className="balance-amount">{cash(0, c.base || 'PHP')}</div>}
      <p className="form-note">{tr('Received and pending rewards you have manually recorded.')}</p>
      {formatTotals(estimatedTotals).map(([currency, amount]) => <p className="form-note" key={currency}>{tr('Estimated')}: {cash(amount, currency)}</p>)}
    </section>

    <SectionTitle action={tr('Add cashback')} onAction={() => { setForm({ amount: '', date: today(), status: 'Received' }); setError(''); setSheet({ kind: 'manual' }); }}>{tr('Manual cashback')}</SectionTitle>
    <div className="card list-card">
      {manual.length ? manual.map(entry => <div className="fp-row" key={entry.id}>
        <span className="stat-icon tone-green"><Icon name="gift" size={17} /></span>
        <span className="fp-main"><strong>{entry.source || tr('Manual cashback')}</strong><small>{entry.date} · {entry.account || tr('No account selected')} · {tr(entry.status || 'Received')}</small></span>
        <span className="fp-amount"><b>{cash(entry.amount, entry.currency)}</b><small><button type="button" className="link-button" onClick={() => updateEntry(entry.id, { status: entry.status === 'Redeemed' ? 'Received' : 'Redeemed' })}>{tr(entry.status === 'Redeemed' ? 'Mark received' : 'Mark redeemed')}</button> · <button type="button" className="link-button" onClick={() => removeEntry(entry.id)}>{tr('Delete')}</button></small></span>
      </div>) : <p className="form-note">{tr('No manual cashback entries yet.')}</p>}
    </div>

    <SectionTitle>{tr('Automatic cashback rules')}</SectionTitle>
    <p className="form-note cashback-intro">{tr('Set a cashback rate for each bank or e-wallet. MOVO estimates rewards from matching expense transactions; confirm actual rewards with your provider.')}</p>
    <div className="cashback-rule-list">
    {wallets.map(account => {
      const rule = rules[account.id] || {};
      return <article className="card fp-goal cashback-rule" key={account.id}>
        <div className="fp-goal-head">
          <span className="stat-icon tone-green"><Icon name={account.account_type === 'e_wallet' ? 'wallet' : 'bank'} size={17} /></span>
          <span className="fp-main"><strong>{account.institution_name || account.name}</strong><small>{tr(account.account_type === 'e_wallet' ? 'Digital wallet' : 'Bank account')}</small></span>
          <label className="legal-disclosure-check"><input type="checkbox" checked={!!rule.enabled} onChange={event => saveRules({ ...rules, [account.id]: { ...rule, enabled: event.target.checked } })} /><span>{tr('Auto')}</span></label>
        </div>
        <div className="cashback-rule-fields">
          <label className="cashback-field"><span>{tr('Cashback rate (%)')}</span><input className="cashback-input" type="number" inputMode="decimal" min="0" max="100" step="0.01" placeholder="e.g. 1.5" aria-label={tr('Cashback rate (%)')} value={rule.rate ?? ''} onChange={event => saveRules({ ...rules, [account.id]: { ...rule, rate: event.target.value } })} /></label>
          <label className="cashback-field"><span>{tr('Maximum per transaction')}</span><input className="cashback-input" type="number" inputMode="decimal" min="0" step="0.01" placeholder="" aria-label={tr('Maximum per transaction')} value={rule.cap ?? ''} onChange={event => saveRules({ ...rules, [account.id]: { ...rule, cap: event.target.value } })} /></label>
        </div>
        <small className="form-note cashback-hint">{tr('Estimate only · based on logged purchases')}</small>
      </article>;
    })}
    </div>

    <SectionTitle>{tr('Estimated automatic cashback')}</SectionTitle>
    <div className="card list-card">
      {auto.length ? auto.map(entry => <div className="fp-row" key={entry.id}>
        <span className="stat-icon tone-blue"><Icon name="sparkles" size={17} /></span>
        <span className="fp-main"><strong>{entry.source}</strong><small>{entry.date} · {entry.account} · {entry.rate}% · {tr('Estimated')}</small></span>
        <span className="fp-amount"><b>{cash(entry.amount, entry.currency)}</b></span>
      </div>) : <p className="form-note">{tr('No automatic cashback estimates. Enable a rule and log purchases from that account.')}</p>}
    </div>

    {sheet?.kind === 'manual' && <Sheet title={tr('Add cashback')} onClose={() => setSheet(null)} label={tr('Add cashback')}>
      <form className="sheet-form" onSubmit={saveManual}>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <label>{tr('Amount received')}<input required type="number" min="0.01" max="999999999999" step="0.01" value={form.amount || ''} onChange={event => setForm({ ...form, amount: event.target.value })} /></label>
        <label>{tr('Source / promotion')}<input maxLength="100" value={form.source || ''} onChange={event => setForm({ ...form, source: event.target.value })} /></label>
        <label>{tr('Bank or e-wallet')}<select value={form.accountId || ''} onChange={event => setForm({ ...form, accountId: event.target.value })}><option value="">{tr('Choose account (optional)')}</option>{wallets.map(account => <option key={account.id} value={account.id}>{account.institution_name || account.name}</option>)}</select></label>
        <label>{tr('Date received')}<input type="date" value={form.date || today()} onChange={event => setForm({ ...form, date: event.target.value })} /></label>
        <label>{tr('Status')}<select value={form.status || 'Received'} onChange={event => setForm({ ...form, status: event.target.value })}><option>Received</option><option>Pending</option><option>Redeemed</option></select></label>
        <button className="primary-button">{tr('Save cashback')}</button>
      </form>
    </Sheet>}
  </>;
}
