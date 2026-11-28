import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDate, getFormatLocale, money, monthKey, number } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { friendsRequest } from '../lib/friends';
import { buildFriendSummary, SUMMARY_SECTIONS, summarySections } from '../lib/friendSummary';
import usePlanning from '../lib/usePlanning';
import Icon from './Icon';
import { Sheet, SubHeader } from './ui';
import { useConfirm } from './ConfirmDialog';
import { friendErrorMessage } from './FriendsController';

const PERIOD_OPTIONS = { month: 'long', year: 'numeric', timeZone: 'UTC' };
const DAY_OPTIONS = { dateStyle: 'medium', timeZone: 'UTC' };
const metricKeys = ['income', 'expenses', 'savings'];
const labels = () => ({ income: tr('Income'), expenses: tr('Expenses'), savings: tr('Savings'),
  flow: tr('Money Flow'), planning: tr('Financial planning'), budgets: tr('Budgets & plans'), spending: tr('Spending categories') });
const icons = { income: 'arrowDown', expenses: 'arrowUp', savings: 'bank', flow: 'chart', planning: 'receipt', budgets: 'target', spending: 'dollar' };

function Section({ title, section, asOf, children }) {
  return <section className={`card friend-section friend-section-${section}`} aria-label={title}>
    <header className="friend-section-heading">
      <span className="friend-card-icon"><Icon name={icons[section]} size={18} /></span>
      <div><h3>{title}</h3>{asOf && <small>{asOf}</small>}</div>
    </header>
    {children}
  </section>;
}

function Rows({ items }) {
  return <dl className="friend-summary-rows">{items.map(([label, value]) =>
    <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>
  )}</dl>;
}

function MoneyFlow({ month, values, format, title }) {
  const [year, monthNumber] = month.split('-').map(Number);
  const monthLength = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const weeks = values.slice(0, Math.ceil(monthLength / 7));
  const peak = Math.max(1, ...weeks.map(Math.abs));
  const caption = tr('Weekly net cash flow');
  const net = weeks.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;
  return <Section title={title} section="flow">
    <div className="friend-flow-summary"><span>{tr('Net')}</span><strong className="friend-amount" dir="auto">{format(net)}</strong></div>
    <ul className="friend-flow" aria-label={caption}>
      {weeks.map((value, index) => {
        const start = index * 7 + 1;
        const end = Math.min(start + 6, monthLength);
        const range = start === end ? number(start) : `${number(start)}–${number(end)}`;
        return <li key={start}>
          <span>{tr('Days')} <bdi>{range}</bdi></span>
          <span className="friend-flow-track" aria-hidden="true">
            {value !== 0 && <i className={value < 0 ? 'negative' : 'positive'} style={{ '--flow-length': `${Math.abs(value) / peak * 50}%` }} />}
          </span>
          <b dir="auto">{format(value)}</b>
        </li>;
      })}
    </ul>
  </Section>;
}

export function FriendSummaryCards({ snapshot, preview = false }) {
  const values = summarySections(snapshot);
  const sectionLabels = labels();
  const currency = snapshot.currency || snapshot.totals?.currency;
  const format = value => money(value, currency);
  const period = formatDate(`${snapshot.month}-01T00:00:00Z`, PERIOD_OPTIONS);
  const asOf = snapshot.asOf && tr('As of {date}', {
    date: formatDate(`${snapshot.asOf}T00:00:00Z`, DAY_OPTIONS),
  });
  const metrics = metricKeys.filter(key => values[key] !== undefined);
  const hasDetails = values.flow || values.spending || values.planning || values.budgets;
  const percentFormat = new Intl.NumberFormat(getFormatLocale(), { style: 'percent' });
  const percentage = value => percentFormat.format(value / 100);
  return <div className={`friend-dashboard${preview ? ' is-preview' : ''}`}>
    <div className={`friend-summary-overview${metrics.length ? ' has-metrics' : ''}`}>
      <div className="friend-summary-period">
        <span className="friend-card-icon"><Icon name="calendar" size={17} /></span>
        <time dateTime={snapshot.month}>{period}</time>
      </div>
      {metrics.length > 0 && <dl className="friend-metrics" data-count={metrics.length} aria-label={tr('Financial summary')}>
        {metrics.map(key => <div className={`friend-metric friend-section-${key}`} key={key}>
          <dt><Icon name={icons[key]} size={16} />{sectionLabels[key]}</dt>
          <dd><bdi className="friend-amount">{format(values[key])}</bdi>
            {key === 'savings' && <small>{asOf || tr('Current values')}</small>}
          </dd>
        </div>)}
      </dl>}
    </div>
    {snapshot.note && <section className="card friend-note" aria-label={tr('How I track my money')}>
      <header className="friend-section-heading">
        <span className="friend-card-icon"><Icon name="message" size={17} /></span><h3>{tr('How I track my money')}</h3>
      </header>
      <p dir="auto">{snapshot.note}</p>
    </section>}
    {hasDetails && <div className="friend-summary-grid">
      {values.flow && <MoneyFlow month={snapshot.month} values={values.flow} format={format} title={sectionLabels.flow} />}
      {values.spending && <Section section="spending" title={sectionLabels.spending}>
        {values.spending.length === 0 ? <p className="friends-note">{tr('No expenses in this period.')}</p> : <ul className="friend-spending" aria-label={tr('Spending categories')}>
          {[...values.spending].sort((a, b) => b.percent - a.percent).map(({ key, percent }) => <li key={key}>
            <span>{tr(key)}</span><b dir="auto">{percentage(percent)}</b>
            <span className="friend-spending-track" aria-hidden="true"><i style={{ width: `${percent}%` }} /></span>
          </li>)}
        </ul>}
      </Section>}
      {values.planning && <Section section="planning" title={sectionLabels.planning} asOf={asOf}>
        <Rows items={[[tr('Bills due'), format(values.planning.bills)], [tr('Loans & debts'), format(values.planning.debt)], [tr('Owed to you'), format(values.planning.owed)]]} />
      </Section>}
      {values.budgets && <Section section="budgets" title={sectionLabels.budgets} asOf={asOf}>
        <Rows items={[[tr('Budgets on track'), `${number(values.budgets.onTrack)} / ${number(values.budgets.budgets)}`], [tr('Active plans'), number(values.budgets.plans)]]} />
        <div className="friend-plan-progress">
          <div><span>{tr('Plan progress')}</span><b dir="auto">{percentage(values.budgets.progress)}</b></div>
          <span className="friend-spending-track" aria-hidden="true"><i style={{ width: `${values.budgets.progress}%` }} /></span>
        </div>
      </Section>}
    </div>}
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
  return <Sheet title={preview ? tr('Preview summary') : tr('Share your summary')} className="friends-sheet friend-share-sheet" onClose={onClose}>
    <div className="friend-share-recipient" tabIndex={-1} ref={step}>
      <Icon name="lock" size={16} /><p>{tr('Only {name} can view this snapshot through MOVO.', { name: friend.name })}</p>
    </div>
    {error && <p className="friends-note friends-error" role="alert">{error}</p>}
    {preview ? <div className="friend-preview">
      <FriendSummaryCards snapshot={preview} preview />
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

export default function FriendFinanceSummary({ friend, session, finance, c, onClose, onConnectionRemoved }) {
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
  const page = useRef(null);
  const lifecycle = useRef(null);
  const scopeKey = `${session.user?.id || ''}:${accessToken}:${connectionId}`;
  if (lifecycle.current?.key !== scopeKey) {
    lifecycle.current?.controller.abort();
    lifecycle.current = { key: scopeKey, controller: new AbortController() };
  }
  const scope = lifecycle.current;
  const current = () => lifecycle.current === scope && !scope.controller.signal.aborted;
  useEffect(() => {
    if (scope.controller.signal.aborted) scope.controller = new AbortController();
    locked.current = false; setBusy(false); setEditing(null);
    return () => scope.controller.abort();
  }, [scope]);

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
    if (locked.current || !current()) return;
    locked.current = true;
    setBusy(true); setError(''); setStatus('');
    try {
      await friendsRequest(session, action, { ...payload, connectionId }, scope.controller.signal);
      if (!current()) return;
      if (action === 'block') { onConnectionRemoved?.(connectionId); onClose(); return; }
      if (action === 'share_summary') setEditing(null);
      if (action !== 'report') setRevision(value => value + 1);
      setStatus(success === 'share' ? tr('Summary shared.') : success === 'revoke' ? tr('Summary access revoked.') : tr('Report sent.'));
    } catch (cause) { if (current()) setError(friendErrorMessage(cause)); }
    finally { if (current()) { locked.current = false; setBusy(false); } }
  }

  async function safety(action) {
    const blocking = action === 'block';
    const title = blocking ? tr('Block user') : tr('Report to MOVO');
    if (await confirm({ title, message: blocking ? tr('Blocking removes the connection and stops future friend requests.') : tr('Send this connection to MOVO support for review?'), confirmLabel: title, danger: blocking })) run(action, {}, 'report');
  }

  return <>
    <SubHeader title={tr('Summary')} onBack={onClose} />
    <div className="friends-page friend-summary-page" ref={page}>
      <header className="friend-summary-profile">
        <span className="friends-initial" aria-hidden="true">{Array.from(friend.name)[0]?.toLocaleUpperCase()}</span>
        <div className="friend-summary-person"><h2 dir="auto">{friend.name}</h2></div>
        {shared && <button type="button" className="friends-secondary friend-share-trigger" aria-haspopup="dialog" aria-label={tr('Share your summary')}
          disabled={busy} onClick={() => { setStatus(''); setError(''); setEditing({ own: shared.yourSummary }); }}>
          <Icon name="send" size={17} /><span>{tr('Share')}</span>
        </button>}
      </header>
      <div className="friend-summary-status" role="status">
        {status || (!shared && !error && tr('Loading…')) || null}
      </div>
      {error && !editing && <div className="card friend-summary-state">
        <span className="friend-card-icon"><Icon name="info" size={20} /></span>
        <p role="alert">{error}</p>
        <button type="button" className="friends-secondary" onClick={() => setRevision(value => value + 1)}>{tr('Try again')}</button>
      </div>}
      {shared?.sharedWithYou ? <FriendSummaryCards snapshot={shared.sharedWithYou} /> : shared && !error && <div className="card friend-summary-state">
        <span className="friend-card-icon"><Icon name="lock" size={20} /></span>
        <p>{tr('Your friend has not shared a summary with you.')}</p>
      </div>}
      {shared && <footer className="friend-summary-actions">
        {shared.yourShare && <button type="button" className="friends-secondary friend-revoke" disabled={busy}
          onClick={() => run('revoke_summary', {}, 'revoke')}><Icon name="lock" size={15} />{tr('Revoke summary access')}</button>}
        <div className="friends-actions friends-safety" data-count={shared.sharedWithYou ? 2 : 1}>
          {shared.sharedWithYou && <button type="button" className="friends-secondary" disabled={busy} onClick={() => safety('report')}>{tr('Report to MOVO')}</button>}
          <button type="button" className="friends-secondary" disabled={busy} onClick={() => safety('block')}>{tr('Block user')}</button>
        </div>
      </footer>}
    </div>
    {editing && createPortal(
      <ShareSettings c={c} finance={finance} friend={friend} own={editing.own} busy={busy} run={run} error={error}
        onClose={() => { setEditing(null); setError(''); }} />,
      page.current?.closest('.movo-app') || document.body,
    )}
  </>;
}
