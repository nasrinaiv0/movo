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
const metricKeys = ['income', 'expenses', 'savings'];
const labels = () => ({ income: tr('Income'), expenses: tr('Expenses'), savings: tr('Savings'),
  flow: tr('Money Flow'), planning: tr('Financial planning'), budgets: tr('Budgets & plans'), spending: tr('Spending this month') });
const icons = { income: 'arrowDown', expenses: 'arrowUp', savings: 'bank', flow: 'chart', planning: 'receipt', budgets: 'target', spending: 'dollar' };

function Section({ title, section, children }) {
  return <section className={`card friend-section friend-section-${section}`} aria-label={title}>
    <h3><span className="friend-card-icon"><Icon name={icons[section]} size={17} /></span>{title}</h3>
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
  const period = formatDate(`${snapshot.month}-01T00:00:00Z`, PERIOD_OPTIONS);
  const date = snapshot.asOf ? formatDate(`${snapshot.asOf}T00:00:00Z`, DAY_OPTIONS) : '';
  const currentDate = date && tr('As of {date}', { date });
  const days = new Date(Date.UTC(Number(snapshot.month.slice(0, 4)), Number(snapshot.month.slice(5)), 0)).getUTCDate();
  const weeks = values.flow?.slice(0, Math.ceil(days / 7));
  const peak = Math.max(1, ...(weeks || []).map(Math.abs));
  const metrics = metricKeys.filter(key => values[key] !== undefined);
  return <div className="friend-dashboard">
    <header className="friend-summary-period">
      <div><Icon name="calendar" size={17} /><h3>{period}</h3></div>
      {currentDate && <small>{currentDate}</small>}
    </header>
    {metrics.length > 0 && <div className="card friend-metrics" data-count={metrics.length}>
      {metrics.map(key => <div className={`friend-metric friend-section-${key}`} key={key}>
        <h4><span className="friend-card-icon"><Icon name={icons[key]} size={16} /></span>{sectionLabels[key]}</h4>
        <strong className="friend-amount" dir="auto">{format(values[key])}</strong>
        {key === 'savings' && <small>{tr('Current values')}</small>}
      </div>)}
    </div>}
    <div className="friend-summary-grid">
      {weeks && <Section title={sectionLabels.flow} section="flow">
        <div className="friend-flow-summary"><strong className="friend-amount" dir="auto">{format(weeks.reduce((sum, item) => sum + item, 0))}</strong><span>{tr('Weekly net cash flow')}</span></div>
        <ul className="friend-flow" aria-label={tr('Weekly net cash flow')}>
          {weeks.map((value, index) => {
            const start = index * 7 + 1;
            const end = Math.min(start + 6, days);
            const range = start === end ? String(start) : `${start}–${end}`;
            return <li key={start}>
              <span>{range}</span><div className="friend-flow-track" aria-hidden="true">
                <i className={value < 0 ? 'negative' : 'positive'} style={{ '--flow-length': `${Math.abs(value) / peak * 50}%` }} />
              </div><b dir="auto">{format(value)}</b>
            </li>;
          })}
        </ul>
      </Section>}
      {values.spending && <Section section="spending" title={sectionLabels.spending}>
        {values.spending.length === 0 ? <p className="friends-note">{tr('No expenses in this period.')}</p> : <ul className="friend-spending" aria-label={tr('Spending categories')}>
          {[...values.spending].sort((a, b) => b.percent - a.percent).map(({ key, percent }) => <li key={key}>
            <span>{tr(key)}</span><b>{percent}%</b>
            <span className="friend-spending-track" aria-hidden="true"><i style={{ width: `${percent}%` }} /></span>
          </li>)}
        </ul>}
      </Section>}
      {values.planning && <Section section="planning" title={sectionLabels.planning}>
        <Rows items={[[tr('Bills due'), format(values.planning.bills)], [tr('Loans & debts'), format(values.planning.debt)], [tr('Owed to you'), format(values.planning.owed)]]} />
      </Section>}
      {values.budgets && <Section section="budgets" title={sectionLabels.budgets}>
        <Rows items={[[tr('Budgets on track'), `${values.budgets.onTrack} / ${values.budgets.budgets}`], [tr('Active plans'), values.budgets.plans], [tr('Plan progress'), `${values.budgets.progress}%`]]} />
      </Section>}
    </div>
    {snapshot.note && <div className="card friend-note"><h3>{tr('How I track my money')}</h3><p dir="auto">{snapshot.note}</p></div>}
  </div>;
}

function ShareSettings({ c, finance, friend, own, busy, run, onClose, error }) {
  const currentMonth = monthKey(new Date());
  const months = Array.from(new Set([currentMonth, ...finance.months, ...(own?.month ? [own.month] : [])]));
  const [month, setMonth] = useState(own?.month || currentMonth);
  const [note, setNote] = useState(own?.note || '');
  const [selected, setSelected] = useState(() => SUMMARY_SECTIONS.filter(key => key in summarySections(own)));
  const [preview, setPreview] = useState(null);
  const step = useRef(null);
  const moveFocus = useRef(false);
  useEffect(() => {
    if (!moveFocus.current || !step.current) return;
    moveFocus.current = false;
    step.current.closest('[role=dialog]')?.scrollTo?.({ top: 0 });
    step.current.focus({ preventScroll: true });
  }, [preview]);
  const planning = usePlanning(c);
  const sectionLabels = labels();
  const available = buildFriendSummary({ c, finance, planning, month, note, selected: SUMMARY_SECTIONS });
  const currentSections = ['savings', 'planning', 'budgets'];
  const incomplete = selected.some(key => !(key in available.sections));
  const update = (setter, value) => { setter(value); setPreview(null); };
  function review(event) {
    event.preventDefault();
    if (!incomplete && (note.trim() || selected.length)) {
      moveFocus.current = true;
      setPreview(buildFriendSummary({ c, finance, planning, month, note, selected }));
    }
  }
  return <Sheet title={preview ? tr('Preview summary') : tr('Share your summary')} label={tr('Share your summary')} className="friends-sheet friend-share-sheet" onClose={onClose}>
    <div className="friend-share-recipient" tabIndex={-1} ref={step}>
      <Icon name="lock" size={16} /><p>{tr('Only {name} can view this snapshot through MOVO.', { name: friend.name })}</p>
    </div>
    {error && <p className="friends-note friends-error" role="alert">{error}</p>}
    {preview ? <div className="friends-content friend-preview">
      <FriendSummaryCards snapshot={preview} />
      <div className="friend-share-footer">
        <button type="button" className="friends-secondary" disabled={busy} onClick={() => { moveFocus.current = true; setPreview(null); }}>{tr('Edit selections')}</button>
        <button type="button" className="primary-button" disabled={busy} onClick={() => run('share_summary', { summary: preview }, 'share')}>{tr('Approve and share')}</button>
      </div>
    </div> : <form className="friends-form friend-sharing" onSubmit={review}>
      <label className="friends-field"><span>{tr('Month')}</span><select value={month} onChange={event => update(setMonth, event.target.value)}>
        {months.map(item => <option key={item} value={item}>{formatDate(`${item}-01T00:00:00Z`, PERIOD_OPTIONS)}</option>)}
      </select></label>
      <fieldset><legend>{tr('Sections to share')}</legend>
        <div className="friend-share-options">{SUMMARY_SECTIONS.map(key => <label className="friends-option" key={key}>
          <span className="friend-card-icon"><Icon name={icons[key]} size={15} /></span>
          <span>{sectionLabels[key]}{currentSections.includes(key) && <small>{tr('Current values')}</small>}</span>
          <input type="checkbox" aria-label={sectionLabels[key]} checked={selected.includes(key)} disabled={busy || (!(key in available.sections) && !selected.includes(key))}
            onChange={event => update(setSelected, event.target.checked ? [...selected, key] : selected.filter(item => item !== key))} />
        </label>)}</div>
      </fieldset>
      {incomplete && <p className="friends-note" role="status">{tr('Some selected sections are unavailable. Try again or clear their selection.')}</p>}
      <label className="friends-field"><span>{tr('How I track my money')}</span>
        <textarea rows={2} maxLength={500} value={note} onChange={event => update(setNote, event.target.value)} />
      </label>
      <p className="friends-note">{tr('Keep account numbers and other private details out of your note.')}</p>
      <div className="friend-share-footer"><button type="submit" className="primary-button" disabled={busy || incomplete || !(note.trim() || selected.length)}>{tr('Preview summary')}</button></div>
    </form>}
  </Sheet>;
}

export default function FriendFinanceSummary({ friend, session, finance, c, onClose }) {
  const [shared, setShared] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(null);
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
      if (action === 'share_summary') setEditing(null);
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
        <div className="friend-summary-person"><h2 dir="auto">{friend.name}</h2></div>
        {shared && <button type="button" className="friends-secondary friend-share-trigger" aria-label={tr('Share your summary')}
          disabled={busy} onClick={() => { setStatus(''); setError(''); setEditing({ own: shared.yourSummary }); }}><Icon name="send" size={16} /><span>{tr('Share')}</span></button>}
      </header>
      {error && !editing && <div className="card friend-note"><p role="alert">{error}</p><button type="button" className="friends-secondary" onClick={() => setRevision(value => value + 1)}>{tr('Try again')}</button></div>}
      {!shared && !error && <p className="friends-note" role="status">{tr('Loading…')}</p>}
      {shared?.sharedWithYou ? <FriendSummaryCards snapshot={shared.sharedWithYou} /> : shared && <p className="card friend-note">{tr('Your friend has not shared a summary with you.')}</p>}
      {shared?.yourShare && <button type="button" className="friends-secondary friend-revoke" disabled={busy}
        onClick={() => run('revoke_summary', {}, 'revoke')}>{tr('Revoke summary access')}</button>}
      {shared && <div className="friends-actions friends-safety">
        {shared.sharedWithYou && <button type="button" className="friends-secondary" disabled={busy} onClick={() => safety('report')}>{tr('Report to MOVO')}</button>}
        <button type="button" className="friends-secondary" disabled={busy} onClick={() => safety('block')}>{tr('Block user')}</button>
      </div>}
      {status && <p className="friends-note" role="status">{status}</p>}
      {editing && <ShareSettings c={c} finance={finance} friend={friend} own={editing.own} busy={busy} run={run} error={error}
        onClose={() => { setEditing(null); setError(''); }} />}
    </div>
  </>;
}
