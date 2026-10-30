import React from 'react';
import Icon, { NasrinMark } from './Icon';
import { Sheet } from './ui';
import { money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';

/** Fills a briefing line's template: money is formatted (and hidden when balances are hidden), categories translated. */
export function lineText(line, show) {
  const vars = { ...(line.vars || {}) };
  Object.entries(line.money || {}).forEach(([k, v]) => { vars[k] = shown(show, money(v, undefined, 0)); });
  if (line.category) vars.category = tr(line.category);
  return tr(line.key, vars);
}

const Lines = ({ items, show }) => <ul className="brief-lines">{items.map((l, i) => <li key={l.key + i} style={{ '--i': i }}>
  <span className={`brief-icon tone-${l.tone}`}><Icon name={l.icon} size={14} strokeWidth={2.2} /></span><span>{lineText(l, show)}</span>
</li>)}</ul>;

/** Pinned at the top of Notifications: the latest briefing, opened with a tap. */
export function BriefingNote({ briefing, show, onOpen }) {
  const first = briefing.items[0] || briefing.tips[0];
  return <button type="button" className="card brief-note" onClick={onOpen} aria-label={tr('Your daily briefing')}>
    <span className="brief-mark"><NasrinMark size={18} /></span>
    <span className="note-main"><span className="note-top"><strong>{tr('Your daily briefing')}</strong><small>{tr('Today')}</small></span><small>{first ? lineText(first, show) : tr('Add a few transactions and NasrinAI will summarise your month here.')}</small></span>
    <Icon name="chevron" size={16} />
  </button>;
}

/** Shown once a day when the app opens. */
export function BriefingSheet({ briefing, show, name, onClose, onAsk }) {
  return <Sheet title={tr('Your daily briefing')} subtitle={tr('Hi {name}, here is where your money stands today.', { name })} onClose={onClose} label={tr('Your daily briefing')} center>
    <div className="brief-sheet">
      <span className="brief-orb" aria-hidden="true"><NasrinMark size={30} /></span>
      {briefing.hasData ? <Lines items={briefing.items} show={show} /> : <p className="empty">{tr('Add a few transactions and NasrinAI will summarise your month here.')}</p>}
      <h3>{tr('Tips for you')}</h3>
      <ul className="brief-tips">{briefing.tips.map((t, i) => <li key={t.key}><span>{i + 1}</span>{lineText(t, show)}</li>)}</ul>
      <p className="form-note">{tr('Prepared on this device from your records. Not professional financial advice.')}</p>
      <div className="sheet-actions"><button type="button" className="secondary-button" onClick={onAsk}>{tr('Ask NasrinAI')}</button><button type="button" className="primary-button" onClick={onClose} autoFocus>{tr('Got it')}</button></div>
    </div>
  </Sheet>;
}
