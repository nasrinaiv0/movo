import React, { useEffect, useRef, useState } from 'react';
import { formatDate, money, monthKey } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { friendsRequest } from '../lib/friends';
import { buildFriendSummary, SUMMARY_SECTIONS, summarySections } from '../lib/friendSummary';
import usePlanning from '../lib/usePlanning';
import Icon from './Icon';
import { Sheet, SubHeader } from './ui';
import { useConfirm } from './ConfirmDialog';
import { friendErrorMessage } from './FriendsSheet';

const PERIOD_OPTIONS = { month: 'long', year: 'numeric', timeZone: 'UTC' };
const DAY_OPTIONS = { dateStyle: 'medium', timeZone: 'UTC' };
const weekLabels = ['1–7', '8–14', '15–21', '22–28', '29–31'];
const labels = () => ({ income: tr('Income'), expenses: tr('Expenses'), savings: tr('Savings'),
  flow: tr('Money Flow'), planning: tr('Financial planning'), budgets: tr('Budgets & plans'), spending: tr('Spending this month') });
const icons = { income: 'arrowDown', expenses: 'arrowUp', savings: 'bank', flow: 'chart', planning: 'receipt', budgets: 'target', spending: 'dollar' };

function Section({ title, section, children }) {
  return <section className={`card friend-section friend-section-${section}`} aria-label={title}>
    <h3><span className="stat-icon"><Icon name={icons[section]} size={17} /></span>{title}</h3>
    {children}
  </section>;
}

function Rows({ items }) {
  return <dl className="friend-summary-rows">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function FriendSummaryCards({ snapshot }) {
  const values = summarySections(snapshot);
  const sectionLabels = labels();
  const currency = snapshot.currency || snapshot.totals?.currency;
  const format = value => money(value, currency);
  const peak = Math.max(1, ...(values.flow || []).map(Math.abs));
  const period = formatDate(`${snapshot.month}-01T00:00:00Z`, PERIOD_OPTIONS);
  const date = snapshot.asOf ? formatDate(`${snapshot.asOf}T00:00:00Z`, DAY_OPTIONS) : '';
  const days = new Date(Date.UTC(Number(snapshot.month.slice(0, 4)), Number(snapshot.month.slice(5)), 0)).getUTCDate();
  return <div className="friend-dashboard">
    <div className="friend-summary-period"><b>{period}</b>{date && <small>{tr('As of {date}', { date })}</small>}</div>
    {snapshot.note && <div className="card friend-note"><h3>{tr('How I track my money')}</h3><p dir="auto">{snapshot.note}</p></div>}
    <div className="friend-summary-grid">
      {['income', 'expenses', 'savings'].filter(key => values[key] !== undefined).map(key =>
        <Section title={sectionLabels[key]} section={key} key={key}><strong className="friend-amount">{format(values[key])}</strong>
          {key === 'savings' && date && <small>{tr('As of {date}', { date })}</small>}</Section>)}
      {values.flow && <Section title={sectionLabels.flow} section="flow">
        <strong className="friend-amount">{format(values.flow.reduce((sum, item) => sum + item, 0))}</strong>
        <ul className="friend-flow" aria-label={tr('Weekly net cash flow')}>
          {values.flow.slice(0, Math.ceil(days / 7)).map((value, index) => {
            const dayRange = index === 4 ? (days === 29 ? '29' : `29–${days}`) : weekLabels[index];
            return <li key={dayRange}>
              <span>{dayRange}</span><div className="friend-flow-track" aria-hidden="true">
                <i className={value < 0 ? 'negative' : 'positive'} style={{ '--flow-length': `${Math.abs(value) / peak * 50}%` }} />
              </div><b dir="auto">{format(value)}</b>
            </li>;
          })}
        </ul>
      </Section>}
      {values.planning && <Section section="planning" title={sectionLabels.planning}>
        <Rows items={[[tr('Bills due'), format(values.planning.bills)], [tr('Loans & debts'), format(values.planning.debt)], [tr('Owed to you'), format(values.planning.owed)]]} />
      </Section>}
      {values.budgets && <Section section="budgets" title={sectionLabels.budgets}>
        <Rows items={[[tr('Budgets on track'), `${values.budgets.onTrack} / ${values.budgets.budgets}`], [tr('Active plans'), values.budgets.plans], [tr('Plan progress'), `${values.budgets.progress}%`]]} />
      </Section>}
      {values.spending && <Section section="spending" title={sectionLabels.spending}>
        {values.spending.length === 0 ? <p className="friends-note">{tr('No expenses in this period.')}</p> : <ul className="friends-breakdown" aria-label={tr('Spending categories')}>
          {values.spending.map(({ key, percent }) => <li key={key}><span>{tr(key)}</span><meter value={percent} min="0" max="100" aria-label={tr(key)} /><b>{percent}%</b></li>)}
        </ul>}
      </Section>}
    </div>
  </div>;
}

function ShareSettings({ c, finance, friend, own, busy, run, onClose, error }) {
  const currentMonth = monthKey(new Date());
  const months = Array.from(new Set([currentMonth, ...finance.months, ...(own?.month ? [own.month] : [])]));
  const [month, setMonth] = useState(own?.month || currentMonth);
  const [note, setNote] = useState(own?.note || '');
  const [selected, setSelected] = useState(() => SUMMARY_SECTIONS.filter(key => key in summarySections(own)));
  const [preview, setPreview] = useState(null);
  const planning = usePlanning(c);
  const sectionLabels = labels();
  const available = buildFriendSummary({ c, finance, planning, month, note, selected: SUMMARY_SECTIONS });
  const currentSections = ['savings', 'planning', 'budgets'];
  const incomplete = selected.some(key => !(key in available.sections));
  const update = (setter, value) => { setter(value); setPreview(null); };
  function review(event) {
    event.preventDefault();
    if (!incomplete && (note.trim() || selected.length)) {
      setPreview(buildFriendSummary({ c, finance, planning, month, note, selected }));
    }
  }
  return <Sheet title={tr('Share your summary')} className="friends-sheet" onClose={onClose}>
    <form className="friends-form friend-sharing" onSubmit={review}>
      <label className="friends-field"><span>{tr('Month')}</span><select value={month} onChange={event => update(setMonth, event.target.value)}>
        {months.map(item => <option key={item} value={item}>{formatDate(`${item}-01T00:00:00Z`, PERIOD_OPTIONS)}</option>)}
      </select></label>
      <fieldset><legend>{tr('Sections to share')}</legend>
        {SUMMARY_SECTIONS.map(key => <label className="friends-option" key={key}>
          <input type="checkbox" checked={selected.includes(key)} disabled={busy || (!(key in available.sections) && !selected.includes(key))}
            onChange={event => update(setSelected, event.target.checked ? [...selected, key] : selected.filter(item => item !== key))} />
          <span>{sectionLabels[key]}{currentSections.includes(key) && <small>{tr('Current values')}</small>}</span>
        </label>)}
      </fieldset>
      {incomplete && <p className="friends-note" role="status">{tr('Some selected sections are unavailable. Try again or clear their selection.')}</p>}
      <label className="friends-field"><span>{tr('How I track my money')}</span>
        <textarea rows={3} maxLength={500} value={note} onChange={event => update(setNote, event.target.value)} />
      </label>
      <p className="friends-note">{tr('Keep account numbers and other private details out of your note.')}</p>
      <button type="submit" className="friends-secondary" disabled={busy || incomplete || !(note.trim() || selected.length)}>{tr('Preview summary')}</button>
    </form>
    {error && <p className="friends-note friends-error" role="alert">{error}</p>}
    {preview && <div className="friends-content friend-preview">
      <p className="friends-note">{tr('Only {name} can view this snapshot through MOVO.', { name: friend.name })}</p>
      <FriendSummaryCards snapshot={preview} />
      <button type="button" className="primary-button" disabled={busy} onClick={() => run('share_summary', { summary: preview }, 'share')}>{tr('Approve and share')}</button>
    </div>}
  </Sheet>;
}

export default function FriendFinanceSummary({ friend, session, finance, c, onClose }) {
  const [shared, setShared] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const confirm = useConfirm();
  const { access_token: accessToken } = session;
  const connectionId = friend.id;

  useEffect(() => {
    let controller;
    function refresh() {
      controller?.abort();
      setShared(null);
      if (document.hidden) return;
      setError('');
      controller = new AbortController();
      const { signal } = controller;
      friendsRequest({ access_token: accessToken }, 'summary', { connectionId }, signal)
        .then(result => { if (!signal.aborted) setShared(result); })
        .catch(cause => { if (!signal.aborted) setError(friendErrorMessage(cause)); });
    }
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => { controller?.abort(); document.removeEventListener('visibilitychange', refresh); };
  }, [accessToken, connectionId, revision]);

  async function run(action, payload, success) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(''); setStatus('');
    try {
      await friendsRequest(session, action, { ...payload, connectionId });
      if (action === 'block') { onClose(); return; }
      if (action === 'share_summary') setEditing(false);
      if (action !== 'report') setRevision(value => value + 1);
      setStatus(success === 'share' ? tr('Summary shared.') : success === 'revoke' ? tr('Summary access revoked.') : tr('Report sent.'));
    } catch (cause) { setError(friendErrorMessage(cause)); }
    finally { locked.current = false; setBusy(false); }
  }

  async function safety(action) {
    const blocking = action === 'block';
    const title = blocking ? tr('Block user') : tr('Report to MOVO');
    if (await confirm({ title, message: blocking ? tr('Blocking removes the connection and stops future friend requests.') : tr('MOVO support will review your report.'), confirmLabel: title, danger: blocking })) run(action, {}, 'report');
  }

  return <>
    <SubHeader title={tr('Summary')} onBack={onClose} />
    <div className="friends-page friend-summary-page">
      <header className="friend-summary-profile card">
        <span className="friends-initial" aria-hidden="true">{Array.from(friend.name)[0]?.toLocaleUpperCase()}</span>
        <h2 dir="auto">{friend.name}</h2>
      </header>
      {error && !editing && <div className="card friend-note"><p role="alert">{error}</p><button type="button" className="friends-secondary" onClick={() => setRevision(value => value + 1)}>{tr('Try again')}</button></div>}
      {!shared && !error && <p className="friends-note" role="status">{tr('Loading…')}</p>}
      {shared?.sharedWithYou ? <FriendSummaryCards snapshot={shared.sharedWithYou} /> : shared && <p className="card friend-note">{tr('Your friend has not shared a summary with you.')}</p>}
      {shared && <div className="friends-actions friend-summary-actions">
        <button type="button" className="primary-button" disabled={busy} onClick={() => { setStatus(''); setError(''); setEditing(true); }}>{tr('Share your summary')}</button>
        {shared.yourShare && <button type="button" className="friends-secondary" disabled={busy} onClick={() => run('revoke_summary', {}, 'revoke')}>{tr('Revoke summary access')}</button>}
      </div>}
      {shared && <div className="friends-actions friends-safety">
        {shared.sharedWithYou && <button type="button" className="friends-secondary" disabled={busy} onClick={() => safety('report')}>{tr('Report to MOVO')}</button>}
        <button type="button" className="friends-secondary" disabled={busy} onClick={() => safety('block')}>{tr('Block user')}</button>
      </div>}
      {status && <p className="friends-note" role="status">{status}</p>}
      {editing && <ShareSettings c={c} finance={finance} friend={friend} own={shared?.yourSummary} busy={busy} run={run} error={error}
        onClose={() => { setEditing(false); setError(''); }} />}
    </div>
  </>;
}
