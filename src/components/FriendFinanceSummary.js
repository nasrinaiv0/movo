import React, { useEffect, useState } from 'react';
import { money } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { friendsRequest } from '../lib/friends';

function Snapshot({ value }) {
  return <article className="friends-snapshot">
    <strong dir="ltr">{value.month}</strong>
    {value.note && <p dir="auto">{value.note}</p>}
    {value.totals && <dl className="friends-totals">
      <div><dt>{tr('Income')}</dt><dd>{money(value.totals.income, value.totals.currency)}</dd></div>
      <div><dt>{tr('Expenses')}</dt><dd>{money(value.totals.expenses, value.totals.currency)}</dd></div>
    </dl>}
    {value.categories?.length > 0 && <ul className="friends-breakdown" aria-label={tr('Spending categories')}>
      {value.categories.map(({ key, percent }) => <li key={key}><span>{tr(key)}</span><meter value={percent} min="0" max="100" aria-label={tr(key)} /><b>{percent}%</b></li>)}
    </ul>}
  </article>;
}

export default function FriendFinanceSummary({ friend, session, finance, run, busy, onClose, onSafety, errorMessage }) {
  const [month, setMonth] = useState(finance.months[0]);
  const [note, setNote] = useState('');
  const [includeTotals, setIncludeTotals] = useState(false);
  const [includeCategories, setIncludeCategories] = useState(false);
  const [preview, setPreview] = useState(null);
  const [shared, setShared] = useState(null);
  const [readError, setReadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('');
  const connectionId = friend.id;
  const accessToken = session.access_token;

  useEffect(() => {
    const controller = new AbortController();
    let attempt = 0;
    const refresh = () => {
      if (document.hidden) return;
      const current = ++attempt;
      friendsRequest({ access_token: accessToken }, 'summary', { connectionId }, controller.signal)
        .then(result => { if (!controller.signal.aborted && current === attempt) { setShared(result); setReadError(''); } })
        .catch(error => { if (!controller.signal.aborted && current === attempt) { setShared(null); setReadError(errorMessage(error)); } });
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => { controller.abort(); document.removeEventListener('visibilitychange', refresh); };
  }, [connectionId, accessToken, revision, errorMessage]);

  const categories = includeCategories ? finance.breakdownFor(month).data
    .filter(({ percent }) => Number.isInteger(percent) && percent >= 0 && percent <= 100)
    .map(({ key, percent }) => ({ key, percent })) : [];
  const update = (setter, value) => { setter(value); setPreview(null); setStatus(''); };
  function review(event) {
    event.preventDefault();
    const value = { month, ...(note.trim() ? { note: note.trim() } : {}), ...(categories.length ? { categories } : {}) };
    if (includeTotals) {
      const { income, expenses } = finance.statsFor(month);
      value.totals = { income: Math.round(income * 100) / 100, expenses: Math.round(expenses * 100) / 100, currency: finance.currency };
    }
    setPreview(value);
  }

  return <div className="friends-content">
    <button type="button" className="friends-secondary" onClick={onClose}>{tr('Back to friends')}</button>
    <h3 dir="auto">{tr('{name} · Financial summary', { name: friend.name })}</h3>
    {readError && <><p className="friends-note friends-error" role="alert">{readError}</p><button type="button" className="friends-secondary" onClick={() => setRevision(value => value + 1)}>{tr('Try again')}</button></>}
    {shared?.sharedWithYou ? <Snapshot value={shared.sharedWithYou} /> : shared && <p className="friends-note">{tr('Your friend has not shared a summary with you.')}</p>}
    <form className="friends-form" onSubmit={review}>
      <h3>{tr('Share your summary')}</h3>
      <label className="friends-field"><span>{tr('Month')}</span><select value={month} onChange={event => update(setMonth, event.target.value)}>
        {finance.months.map(item => <option key={item} value={item}>{item}</option>)}
      </select></label>
      <label className="friends-field"><span>{tr('How I track my money')}</span>
        <textarea rows={3} maxLength={500} value={note} onChange={event => update(setNote, event.target.value)} />
      </label>
      <p className="friends-note">{tr('Keep account numbers and other private details out of your note.')}</p>
      <label className="friends-option"><input type="checkbox" checked={includeTotals} onChange={event => update(setIncludeTotals, event.target.checked)} />{tr('Include income and expense totals')}</label>
      <label className="friends-option"><input type="checkbox" checked={includeCategories} onChange={event => update(setIncludeCategories, event.target.checked)} />{tr('Include spending percentages by category')}</label>
      <button type="submit" className="friends-secondary" disabled={busy || !(note.trim() || includeTotals || categories.length)}>{tr('Preview summary')}</button>
    </form>
    {preview && <>
      <p className="friends-note">{tr('Only {name} can view this snapshot through MOVO.', { name: friend.name })}</p>
      <Snapshot value={preview} />
      <button type="button" className="primary-button" disabled={busy} onClick={() => run('share_summary', { connectionId, summary: preview }, () => {
        setPreview(null); setStatus(tr('Summary shared.')); setRevision(value => value + 1);
      })}>{tr('Approve and share')}</button>
    </>}
    {shared?.yourShare && <button type="button" className="friends-secondary" disabled={busy} onClick={() => run('revoke_summary', { connectionId }, () => {
      setStatus(tr('Summary access revoked.')); setShared(value => ({ ...value, yourShare: false })); setRevision(value => value + 1);
    })}>{tr('Revoke summary access')}</button>}
    <div className="friends-actions friends-safety">
      <button type="button" className="friends-secondary" disabled={busy} onClick={() => onSafety('report', { connectionId })}>{tr('Report to MOVO')}</button>
      <button type="button" className="friends-secondary" disabled={busy} onClick={() => onSafety('block', { connectionId })}>{tr('Block user')}</button>
    </div>
    {status && <p className="friends-note" role="status">{status}</p>}
  </div>;
}
