import React, { useEffect, useId, useMemo, useState } from 'react';
import Icon from './Icon';
import { Toggle } from './ui';
import { useConfirm } from './ConfirmDialog';
import { BUCKETS, money, getFormatLocale } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { friendsRequest } from '../lib/friends';

/*
 * Friend money summary (owner request 2026-11-16: clearer sharing). Each friend sees only the snapshot the other person
 * chose to share: a month, and any of an optional note, spending percentages by category, a savings rate, or exact
 * income and expense totals. Nothing is shared until the person taps the share button under a live preview of exactly
 * what their friend will see. Sharing again replaces the earlier snapshot; Stop sharing deletes it.
 */
export const NOTE_LIMIT = 500;
const COLORS = Object.fromEntries(BUCKETS.map(({ key, color }) => [key, color]));

/** "2026-11" → "November 2026" in the person's language; anything else is shown as it is. */
export function monthLabel(key) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key || '')) return key || '';
  const [year, month] = key.split('-').map(Number);
  try { return new Date(year, month - 1, 15).toLocaleDateString(getFormatLocale(), { month: 'long', year: 'numeric' }); }
  catch { return key; }
}

const sharedOn = (value) => {
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return '';
  try { return new Date(at).toLocaleDateString(getFormatLocale(), { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
};

/** Percent of income kept (negative when spending passed income), whole numbers from -100 to 100. Null without income. */
export function savingsRate(income, expenses) {
  if (!(income > 0) || !Number.isFinite(expenses)) return null;
  return Math.max(-100, Math.min(100, Math.round(((income - expenses) / income) * 100)));
}

/**
 * The exact snapshot that would be shared, built only from what the person switched on. Pure, so it is unit-tested.
 * Returns null when nothing is chosen.
 */
export function buildFriendSummary({ month, note = '', include = {} }, finance) {
  const value = { month };
  const text = note.trim();
  if (text) value.note = text;
  if (include.categories) {
    const categories = (finance.breakdownFor(month)?.data || [])
      .filter(({ key, percent }) => COLORS[key] && Number.isInteger(percent) && percent >= 0 && percent <= 100)
      .sort((a, b) => b.percent - a.percent)
      .map(({ key, percent }) => ({ key, percent }));
    if (categories.length) value.categories = categories;
  }
  const { income = 0, expenses = 0 } = (include.savings || include.totals) ? finance.statsFor(month) : {};
  if (include.savings) {
    const rate = savingsRate(income, expenses);
    if (rate !== null) value.savingsRate = rate;
  }
  if (include.totals) value.totals = { income: Math.round(income * 100) / 100, expenses: Math.round(expenses * 100) / 100, currency: finance.currency };
  return value.note || value.categories || value.totals || value.savingsRate !== undefined ? value : null;
}

/** A ring that fills to the savings rate (red when spending passed income). Decorative: the rate is also written out. */
function SavingsRing({ rate }) {
  const r = 22; const c = 2 * Math.PI * r; const share = Math.min(100, Math.abs(rate)) / 100;
  return <svg className="fs-ring" viewBox="0 0 56 56" aria-hidden="true">
    <circle cx="28" cy="28" r={r} className="fs-ring-track" />
    <circle cx="28" cy="28" r={r} className="fs-ring-fill" strokeDasharray={`${share * c} ${c}`} transform="rotate(-90 28 28)" />
    <text x="28" y="32" textAnchor="middle">{rate}%</text>
  </svg>;
}

/** The shared category percentages as a donut. Decorative: each share is also listed with its percent. */
function CategoryDonut({ categories }) {
  const r = 40; const c = 2 * Math.PI * r;
  let offset = 0;
  return <svg className="fs-donut" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r={r} className="fs-ring-track" />
    {categories.map(({ key, percent }) => {
      const length = (percent / 100) * c;
      const seg = <circle key={key} cx="50" cy="50" r={r} stroke={COLORS[key] || 'var(--accent)'} strokeDasharray={`${Math.max(0, length - 1.2)} ${c}`}
        strokeDashoffset={-offset} transform="rotate(-90 50 50)" />;
      offset += length;
      return seg;
    })}
  </svg>;
}

/** One shared snapshot, as the friend sees it. `rich` adds a savings ring and a category donut (the friend's page). */
export function Snapshot({ value, label, rich = false }) {
  const net = value.totals ? Math.round((value.totals.income - value.totals.expenses) * 100) / 100 : null;
  const when = sharedOn(value.sharedAt);
  return <article className={`fs-card${rich ? ' is-rich' : ''}`} aria-label={label}>
    <header className="fs-card-head">
      <strong>{monthLabel(value.month)}</strong>
      {when && <small>{tr('Shared {date}', { date: when })}</small>}
    </header>
    {value.totals && <dl className="fs-totals">
      <div><dt>{tr('Income')}</dt><dd>{money(value.totals.income, value.totals.currency)}</dd></div>
      <div><dt>{tr('Expenses')}</dt><dd>{money(value.totals.expenses, value.totals.currency)}</dd></div>
      <div><dt>{tr('Net')}</dt><dd className={net < 0 ? 'is-negative' : 'is-positive'}>{money(net, value.totals.currency)}</dd></div>
    </dl>}
    {Number.isInteger(value.savingsRate) && <div className={`fs-rate-row${value.savingsRate < 0 ? ' is-negative' : ''}`}>
      {rich && <SavingsRing rate={value.savingsRate} />}
      <p className={`fs-rate${value.savingsRate < 0 ? ' is-negative' : ''}`}>
        <Icon name={value.savingsRate < 0 ? 'arrowDown' : 'arrowUp'} size={15} />
        {value.savingsRate >= 0 ? tr('Saved {n}% of income', { n: value.savingsRate }) : tr('Spent {n}% more than income', { n: -value.savingsRate })}
      </p>
    </div>}
    {value.categories?.length > 0 && <div className={`fs-cats${rich ? ' is-rich' : ''}`}>
      <span className="fs-label">{tr('Spending by category')}</span>
      {rich && <CategoryDonut categories={value.categories} />}
      <ul>{value.categories.map(({ key, percent }) => <li key={key}>
        <span className="fs-cat-name"><i aria-hidden="true" style={{ background: COLORS[key] || 'var(--muted)' }} />{tr(key)}</span>
        <span className="fs-bar" aria-hidden="true"><i style={{ width: `${percent}%`, background: COLORS[key] || 'var(--accent)' }} /></span>
        <b>{percent}%</b>
      </li>)}</ul>
    </div>}
    {value.note && <blockquote className="fs-note" dir="auto">{value.note}</blockquote>}
  </article>;
}

/*
 * The friend's page (screens/FriendProfile, owner request 2026-11-16) shows this with `page`: a profile header with
 * who shares what, everything the friend shared as a full card with charts, then what you share and the safety actions.
 * In the Friends sheet (no `page`) it keeps its compact header with a back button.
 */
export default function FriendFinanceSummary({ friend, session, finance, run, busy, onClose, onSafety, onRemove, errorMessage, page = false }) {
  const confirm = useConfirm();
  const ids = useId();
  const [month, setMonth] = useState(finance.months[0]);
  const [note, setNote] = useState('');
  const [include, setInclude] = useState({ categories: false, savings: false, totals: false });
  const [shared, setShared] = useState(null);
  const [readError, setReadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState('');
  const connectionId = friend.id;
  const accessToken = session.access_token;
  const name = friend.name;

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

  const preview = useMemo(() => buildFriendSummary({ month, note, include }, finance), [month, note, include, finance]);
  const stats = useMemo(() => finance.statsFor(month), [finance, month]);
  const hasSpending = (finance.breakdownFor(month)?.data || []).length > 0;
  const hasIncome = stats.income > 0;
  const yourShare = Boolean(shared?.yourShare);
  const change = (key, value) => { setInclude(current => ({ ...current, [key]: value })); setStatus(''); };

  function share() {
    if (!preview || busy) return;
    run('share_summary', { connectionId, summary: preview }, () => {
      setStatus(yourShare ? tr('Summary updated for {name}.', { name }) : tr('Summary shared with {name}.', { name }));
      setShared(current => ({ ...(current || {}), yourShare: true }));
      setRevision(value => value + 1);
    });
  }
  async function stopSharing() {
    if (busy || !(await confirm({ title: tr('Stop sharing?'), message: tr('{name} will no longer see your summary.', { name }),
      confirmLabel: tr('Stop sharing'), icon: 'eye' }))) return;
    run('revoke_summary', { connectionId }, () => {
      setStatus(tr('{name} can no longer see your summary.', { name }));
      setShared(current => ({ ...(current || {}), yourShare: false }));
      setRevision(value => value + 1);
    });
  }

  const options = [
    { key: 'categories', title: tr('Spending by category'), sub: hasSpending ? tr('Percentages only, no amounts') : tr('No spending recorded this month'), off: !hasSpending },
    { key: 'savings', title: tr('Savings rate'), sub: hasIncome ? tr('How much of your income you kept') : tr('No income recorded this month'), off: !hasIncome },
    { key: 'totals', title: tr('Income and expense totals'), sub: tr('Shows exact amounts'), off: false },
  ];

  const initial = Array.from(name)[0]?.toLocaleUpperCase();
  const theyShare = Boolean(shared?.sharedWithYou);
  return <div className={`friends-content fs${page ? ' fs-page' : ''}`}>
    {page ? <header className="fp-hero">
      <span aria-hidden="true" className="fp-avatar">{initial}</span>
      <h2 dir="auto">{name}</h2>
      <small>{tr('Friend on MOVO')}</small>
      <ul className="fp-status" aria-label={tr('Sharing')}>
        <li className={theyShare ? 'is-on' : ''}><Icon name={theyShare ? 'check' : 'eye'} size={14} />{shared === null ? tr('Loading…') : theyShare ? tr('Shares a summary with you') : tr('Not sharing with you yet')}</li>
        <li className={yourShare ? 'is-on' : ''}><Icon name={yourShare ? 'check' : 'lock'} size={14} />{yourShare ? tr('You share a summary') : tr('You are not sharing')}</li>
      </ul>
    </header> : <header className="fs-head">
      <button type="button" className="fs-back" onClick={onClose} aria-label={tr('Back to friends')}><Icon name="back" size={18} /></button>
      <span aria-hidden="true" className="friends-initial">{initial}</span>
      <div className="fs-head-text"><h3 dir="auto">{name}</h3><small>{tr('Money summary')}</small></div>
    </header>}

    <section className="fs-section" aria-labelledby={`${ids}-in`}>
      <h4 id={`${ids}-in`}>{tr('Shared with you')}</h4>
      {readError ? <div className="fs-empty"><p role="alert">{readError}</p>
        <button type="button" className="friends-secondary" onClick={() => setRevision(value => value + 1)}>{tr('Try again')}</button></div>
        : shared === null ? <p className="friends-note" role="status">{tr('Loading…')}</p>
        : shared.sharedWithYou ? <Snapshot value={shared.sharedWithYou} rich={page} label={tr('Summary from {name}', { name })} />
        : <div className="fs-empty"><Icon name="doc" size={22} /><p>{tr('{name} hasn’t shared a summary with you yet.', { name })}</p></div>}
    </section>

    <section className="fs-section" aria-labelledby={`${ids}-out`}>
      <div className="fs-section-head">
        <h4 id={`${ids}-out`}>{tr('Your summary for {name}', { name })}</h4>
        <span className={`fs-chip${yourShare ? ' is-on' : ''}`}>{yourShare ? tr('Sharing') : tr('Not shared')}</span>
      </div>
      <label className="friends-field"><span>{tr('Month')}</span>
        <select value={month} onChange={event => { setMonth(event.target.value); setStatus(''); }}>
          {finance.months.map(item => <option key={item} value={item}>{monthLabel(item)}</option>)}
        </select>
      </label>
      <div className="fs-options" role="group" aria-label={tr('Choose what to share')}>
        {options.map(option => <div className={`fs-option${option.off ? ' is-off' : ''}`} key={option.key}>
          <span id={`${ids}-${option.key}`}><strong>{option.title}</strong><small>{option.sub}</small></span>
          <Toggle checked={include[option.key] && !option.off} disabled={option.off} reason={option.sub} label={option.title}
            describedBy={`${ids}-${option.key}`} onChange={value => change(option.key, value)} />
        </div>)}
      </div>
      <label className="friends-field"><span>{tr('Add a note (optional)')}</span>
        <textarea rows={3} maxLength={NOTE_LIMIT} value={note} placeholder={tr('For example: I review my spending every Sunday.')}
          onChange={event => { setNote(event.target.value); setStatus(''); }} aria-describedby={`${ids}-count`} />
        <small className="fs-count" id={`${ids}-count`}>{tr('{n} of {total}', { n: Array.from(note).length, total: NOTE_LIMIT })} · {tr('Keep account numbers and other private details out of your note.')}</small>
      </label>

      <div className="fs-preview">
        <span className="fs-label">{tr('What {name} will see', { name })}</span>
        {preview ? <Snapshot value={preview} label={tr('Preview for {name}', { name })} />
          : <p className="friends-note">{tr('Turn on at least one item or add a note.')}</p>}
      </div>
      <button type="button" className="primary-button" disabled={busy || !preview} onClick={share}>
        {busy ? tr('Saving…') : yourShare ? tr('Update summary for {name}', { name }) : tr('Share with {name}', { name })}
      </button>
      <p className="friends-note">{yourShare ? tr('Sharing again replaces what {name} sees now.', { name }) : tr('Only {name} can view this snapshot through MOVO.', { name })}</p>
      {yourShare && <button type="button" className="friends-secondary" disabled={busy} onClick={stopSharing}>{tr('Stop sharing')}</button>}
      {status && <p className="friends-note friends-success" role="status">{status}</p>}
    </section>

    <div className="fs-safety">
      {onRemove && <button type="button" className="link-button" disabled={busy} onClick={onRemove}>{tr('Remove friend')}</button>}
      <button type="button" className="link-button" disabled={busy} onClick={() => onSafety('report', { connectionId })}>{tr('Report to MOVO')}</button>
      <button type="button" className="link-button is-danger" disabled={busy} onClick={() => onSafety('block', { connectionId })}>{tr('Block user')}</button>
    </div>
  </div>;
}
