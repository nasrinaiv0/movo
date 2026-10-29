import React, { useRef, useState } from 'react';
import Icon from '../components/Icon';
import { IconButton, SectionTitle, Sparkline, Donut, Legend, TransactionRow, Money, Sheet } from '../components/ui';
import EditableBoxes from '../components/EditableBoxes';
import MoneyFlow from '../components/MoneyFlow';
import { BudgetsCard } from '../components/Budgets';
import { dayKey, money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';

const Delta = ({ value, invert }) => {
  if (value == null) return null;
  const up = value >= 0; const good = invert ? !up : up;
  return <span className={`delta ${good ? 'good' : 'bad'}`}>{up ? '+' : '−'}{Math.abs(value)}%</span>;
};

export function timeGreeting(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  if (h >= 18 && h < 22) return 'Good evening';
  return 'Hello';
}

/** Crops a chosen photo to a 256px square JPEG so it fits comfortably in local preferences. */
function toMascot(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error(tr('Choose a photo.'))); return; }
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const size = 256; const c = document.createElement('canvas'); c.width = size; c.height = size;
      const s = Math.min(img.width, img.height); const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2.6, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(tr('Could not read that photo.'))); };
    img.src = url;
  });
}

export default function Home({ c }) {
  const { show, setShow, stats, deltas, breakdown, recent, refDate, user, unread, go, prefs, setPref, txs, budgetList = [], plans = [] } = c;
  const [editing, setEditing] = useState(false);
  const [mascotSheet, setMascotSheet] = useState(false);
  const [mascotError, setMascotError] = useState('');
  const file = useRef(null);
  const tiles = [
    { label: tr('Income'), icon: 'arrowDown', tone: 'green', value: stats.income, delta: deltas.income },
    { label: tr('Expenses'), icon: 'arrowUp', tone: 'red', value: stats.expenses, delta: deltas.expenses, invert: true },
    { label: tr('Savings'), icon: 'bank', tone: 'slate', value: stats.savings, delta: deltas.savings },
  ];
  const todayKey = dayKey(new Date());
  const spentToday = txs.filter(t => t.type === 'expense' && dayKey(t.date) === todayKey).reduce((s, t) => s + t.amount, 0);
  const over = budgetList.find(b => b.level === 'over');
  const subline = over ? tr('Heads up: your {category} budget is over its limit.', { category: tr(over.category) })
    : spentToday ? tr("You've spent {amount} today.", { amount: shown(show, money(spentToday)) }) : tr('Ready to log today’s first expense?');
  const pickMascot = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    setMascotError('');
    try { setPref('mascot', await toMascot(f)); setMascotSheet(false); } catch (err) { setMascotError(err.message); }
  };

  const boxes = [
    { id: 'balance', label: tr('Total balance'), node: <section className="card balance-card" aria-label={tr('Total balance')}>
      <div className="balance-label">{tr('Total Balance')}
        <button type="button" className="plain-icon" aria-label={show ? tr('Hide balances') : tr('Show balances')} onClick={() => setShow(!show)}><Icon name="eye" size={18} /></button>
      </div>
      <div className="balance-amount"><Money value={stats.balance} show={show} /></div>
      {deltas.balance != null && <span className="chip-good"><Icon name="arrowUp" size={13} /> {deltas.balance >= 0 ? '+' : '−'}{Math.abs(deltas.balance)}% {tr('vs last month')}</span>}
      <div className="balance-art"><Sparkline values={stats.trend} width={260} height={110} /></div>
      <button type="button" className="round-button balance-go" aria-label={tr('Open wallet')} onClick={() => go('Wallet')}><Icon name="chevron" size={20} /></button>
    </section> },
    { id: 'summary', label: tr('Income, expenses & savings'), node: <section className="stat-grid" aria-label={tr('Financial summary')}>
      {tiles.map(t => <article className={`card stat-card tint-${t.tone}`} key={t.label}>
        <div className="stat-head"><span className={`stat-icon tone-${t.tone}`}><Icon name={t.icon} size={15} strokeWidth={2.2} /></span><span>{tr(t.label)}</span></div>
        <strong><Money value={t.value} show={show} digits={0} /></strong>
        <Delta value={t.delta} invert={t.invert} />
      </article>)}
    </section> },
    { id: 'flow', label: tr('Money flow'), node: <MoneyFlow txs={txs} refDate={refDate} show={show} /> },
    { id: 'budgets', label: tr('Budgets & plans'), node: <BudgetsCard progress={budgetList} plans={plans} show={show} onOpen={c.openBudgets} /> },
    { id: 'spending', label: tr('Spending this month'), node: <section aria-label={tr('Spending overview')}>
      <SectionTitle action={tr('See All')} onAction={() => go('Transactions', { filter: 'Expenses' })}>{tr('Spending This Month')}</SectionTitle>
      <div className="card spending-card">
        {breakdown.data.length ? <>
          <Donut data={breakdown.data} total={breakdown.total} caption={tr('Spent')} show={show} />
          <Legend data={breakdown.data} />
        </> : <p className="empty">{tr('Add expenses to see your category breakdown.')}</p>}
      </div>
    </section> },
    { id: 'recent', label: tr('Recent transactions'), node: <section aria-label={tr('Recent transactions')}>
      <SectionTitle action={tr('See All')} onAction={() => go('Transactions')}>{tr('Recent Transactions')}</SectionTitle>
      <div className="card list-card">
        {recent.map(t => <TransactionRow key={t.id} t={t} show={show} refDate={refDate} onOpen={c.openTx} />)}
        {!recent.length && <p className="empty">{tr('No transactions yet. Add your first record from the Transactions tab.')}</p>}
      </div>
    </section> },
  ];

  return <>
    <header className="screen-header home-header">
      <button type="button" className={`mascot${prefs.mascot ? ' has-photo' : ''}`} aria-label={prefs.mascot ? tr('Change your mascot photo') : tr('Add a mascot photo')} onClick={() => setMascotSheet(true)}>
        {prefs.mascot ? <img src={prefs.mascot} alt="" /> : <span>{user.initial}</span>}
      </button>
      <div className="hello bubble" aria-live="polite"><small>{tr(timeGreeting())},</small><h1>{user.firstName}</h1><p>{subline}</p></div>
      <div className="header-actions">
        <IconButton icon="search" label={tr('Search')} onClick={c.openSearch} />
        <IconButton icon="bell" label={tr('Notifications')} onClick={() => go('Notifications')} dot={unread} />
        <IconButton icon="gear" label={tr('Settings')} onClick={() => go('Settings')} />
      </div>
    </header>

    <EditableBoxes title={tr('Home')} boxes={boxes} layout={prefs.layouts?.home} editing={editing} onDone={() => setEditing(false)} onChange={(l) => setPref('layouts', { ...(prefs.layouts || {}), home: l })} />
    {!editing && <button type="button" className="customize-button" onClick={() => { setEditing(true); try { window.scrollTo?.({ top: 0, behavior: 'smooth' }); } catch { /* jsdom */ } }}><Icon name="edit" size={16} /> {tr('Customize Home')}</button>}

    {mascotSheet && <Sheet title={tr('Your mascot')} subtitle={tr('Use your own photo as the Home mascot. It greets you and stays on this device.')} onClose={() => setMascotSheet(false)} label={tr('Mascot photo')}>
      <div className="mascot-preview"><span className="mascot big">{prefs.mascot ? <img src={prefs.mascot} alt={tr('Current mascot')} /> : <span>{user.initial}</span>}</span><div className="hello bubble"><small>{tr(timeGreeting())},</small><h1>{user.firstName}</h1></div></div>
      {mascotError && <p className="form-error" role="alert">{mascotError}</p>}
      <input ref={file} type="file" accept="image/*" hidden onChange={pickMascot} aria-label={tr('Choose a mascot photo')} />
      <div className="sheet-actions">{prefs.mascot && <button type="button" className="secondary-button" onClick={() => { setPref('mascot', ''); setMascotSheet(false); }}>{tr('Remove')}</button>}<button type="button" className="primary-button" onClick={() => file.current?.click()}><Icon name="camera" size={18} /> {prefs.mascot ? tr('Change photo') : tr('Choose photo')}</button></div>
    </Sheet>}
  </>;
}
