import React, { useMemo } from 'react';
import Icon from '../components/Icon';
import { RootHeader, SubHeader, Chips, Tile } from '../components/ui';
import { money, shown, timeLabel, longDate, chipLabel, chipTone, dayKey, relativeDay } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { BriefingNote } from '../components/Briefing';

const FILTERS = [{ key: 'All', label: 'All' }, { key: 'Unread', label: 'Unread', dot: true }, { key: 'Transactions', label: 'Transactions' }, { key: 'Account', label: 'Account' }, { key: 'System', label: 'System' }];

const noteBody = (n) => tr(n.body, n.vars);

/** Build the notification feed from real transactions plus any sample system notices. */
export function buildNotifications(txs, extras, show = true) {
  const fromTx = txs.slice(0, 5).map(t => {
    const isIn = t.type === 'income'; const isTransfer = t.type === 'transfer';
    return {
      id: `tx-${t.id}`, kind: 'Transactions', txId: t.id, at: t.date, tone: isIn ? 'green' : 'blue', icon: isIn ? 'arrowDown' : isTransfer ? 'transfer' : 'card',
      title: isIn ? 'Income Recorded' : isTransfer ? 'Transfer Recorded' : 'Expense Recorded',
      body: isIn ? '{amount} income recorded · {merchant}' : isTransfer ? '{amount} transfer recorded · {merchant}' : '{amount} expense recorded · {merchant}',
      vars: { amount: money(t.amount), merchant: t.merchant },
    };
  });
  return [...fromTx, ...extras].sort((a, b) => new Date(b.at) - new Date(a.at));
}

export default function Notifications({ c }) {
  const { notifications, readIds, nFilter, setNFilter, refDate, go, markAllRead, openNotification, show, notificationsEnabled } = c;
  const list = useMemo(() => notifications.filter(n => nFilter === 'All' || (nFilter === 'Unread' ? !readIds.includes(n.id) : n.kind === nFilter)), [notifications, readIds, nFilter]);
  const groups = [];
  list.forEach(n => { const label = relativeDay(n.at, refDate); let g = groups.find(x => x.label === label); if (!g) { g = { label, items: [] }; groups.push(g); } g.items.push(n); });
  return <>
    <RootHeader title={tr('Notifications')} onSearch={c.openSearch} onSettings={() => go('NotificationSettings')} unread={false} hideBell />
    <Chips label={tr('Filter notifications')} items={FILTERS.map(f => ({ ...f, label: tr(f.label) }))} value={nFilter} onChange={setNFilter} />
    {c.briefing && (nFilter === 'All' || nFilter === 'System') && <BriefingNote briefing={c.briefing} show={show} onOpen={c.openBriefing} />}
    {groups.map((g, i) => <section key={g.label}>
      <div className="section-title"><h2>{g.label}</h2>{i === 0 && <button type="button" className="link-button" onClick={markAllRead}>{tr('Mark all as read')}</button>}</div>
      <div className="card list-card">{g.items.map(n => <button type="button" key={n.id} className="note-row" onClick={() => openNotification(n)}>
        <span className="note-icon">{n.txId ? <Tile name={c.txs.find(t => t.id === n.txId)?.merchant || ''} size={46} icon={n.icon} tone={n.tone} radius={14} /> : <Tile size={46} icon={n.icon} tone={n.tone} radius={14} />}{!readIds.includes(n.id) && <i className="red-dot" aria-label={tr('Unread')} />}</span>
        <span className="note-main"><span className="note-top"><strong>{tr(n.title)}</strong><small>{dayKey(n.at) === dayKey(refDate) ? timeLabel(n.at) : longDate(n.at).replace(/, \d{4}/, '')}</small></span><small>{show ? noteBody(n) : noteBody(n).replace(/[^\s\d]{0,4}\d[\d,.]*/g, '••••••')}</small></span>
        <Icon name="chevron" size={16} />
      </button>)}</div>
    </section>)}
    {!groups.length && <div className="card empty-card"><Icon name="bell" size={28} /><h3>{notificationsEnabled === false ? tr('In-app alerts are turned off') : tr('You’re all caught up')}</h3><p>{notificationsEnabled === false ? tr('Turn them back on to see transaction and account alerts here.') : tr('New alerts about your money will show up here.')}</p>{notificationsEnabled === false && <button type="button" className="primary-button" onClick={() => go('NotificationSettings')}>{tr('Manage notification settings')}</button>}</div>}
  </>;
}

export function NotificationDetail({ c }) {
  const { activeNotification: n, txs, accountsView, show, go, setTxFilter } = c;
  if (!n) return <><SubHeader title={tr('Notification')} onBack={() => go('Notifications')} /><p className="empty">{tr('This notification is no longer available.')}</p></>;
  const t = n.txId ? txs.find(x => x.id === n.txId) : null;
  const account = t ? accountsView.find(a => a.id === t.account_id) : null;
  return <>
    <SubHeader title="" onBack={() => go('Notifications')} right={<button type="button" className="round-button flat" aria-label={tr('More')} onClick={() => c.setSheet({ name: 'actions' })}><Icon name="more" size={20} /></button>} />
    <section className="card detail-hero"><span className={`hero-badge tone-${t ? 'green' : n.tone}`}><Icon name={t ? 'check' : n.icon} size={34} strokeWidth={2.6} /></span>
      <h2>{t ? (t.type === 'income' ? tr('Income Recorded') : t.type === 'transfer' ? tr('Transfer Recorded') : tr('Expense Recorded')) : tr(n.title)}</h2>
      <p>{t ? (show ? noteBody(n) : noteBody(n).replace(/[^\s\d]{0,4}\d[\d,.]*/g, '••••••')) : noteBody(n)}</p><small>{longDate(n.at)} · {timeLabel(n.at)}</small></section>
    {t && <section className="card detail-card">
      <div className="detail-row"><Tile name={t.merchant} size={42} radius={13} /><span><small>{tr('Merchant')}</small><strong>{t.merchant}</strong></span></div>
      <div className="detail-row"><span className="menu-icon bare"><Icon name="coin" size={22} /></span><span><small>{tr('Amount')}</small><strong>{shown(show, money(t.amount, t.currency))}</strong></span></div>
      <div className="detail-row"><span className="menu-icon bare"><Icon name="calendar" size={22} /></span><span><small>{tr('Date & Time')}</small><strong>{longDate(t.date)}, {timeLabel(t.date)}</strong></span></div>
      <div className="detail-row"><span className="menu-icon bare"><Icon name="card" size={22} /></span><span><small>{tr('Account')}</small><strong>{account ? `${account.name}${account.mask ? ` •••• ${account.mask}` : ''}` : t.accountName}</strong></span></div>
      <div className="detail-row"><span className="menu-icon bare"><Icon name="cart" size={22} /></span><span><small>{tr('Category')}</small><strong>{t.category}</strong></span><em className={`pill tone-${chipTone(t)}`}>{chipLabel(t)}</em></div>
    </section>}
    {t && <button type="button" className="wide-button" onClick={() => { setTxFilter('All'); c.setSearch(t.merchant); go('Transactions'); }}><Icon name="list" size={18} /> {tr('View in Transactions')}</button>}
  </>;
}
