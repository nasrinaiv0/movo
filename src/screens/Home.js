import React, { useRef, useState } from 'react';
import Icon from '../components/Icon';
import { IconButton, SectionTitle, Sparkline, MiniBars, Donut, Legend, TransactionRow, Money, Sheet, Trend } from '../components/ui';
import EditableBoxes from '../components/EditableBoxes';
import { UpcomingList } from './Subscriptions';
import { toDay } from '../lib/subscriptions';
import MoneyFlow from '../components/MoneyFlow';
import { BudgetsCard } from '../components/Budgets';
import { dayKey, money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';

const BALANCE_STYLES = [['line', 'Line'], ['bars', 'Bars'], ['off', 'Off']];
const FLOW_STYLES = [['bars', 'Bars'], ['lines', 'Lines'], ['net', 'Net']];
const SPENDING_STYLES = [['ring', 'Ring'], ['bars', 'Bars']];

/** Spending per category as horizontal bars, longest first, scaled to the biggest category. */
function CategoryBars({ data, show }) {
  const top = Math.max(1, ...data.map(d => d.amount));
  return <ul className="cat-bars">{data.map((d, i) => <li key={d.key} style={{ '--i': i }}>
    <span className="cat-bars-head"><span><i style={{ background: d.color }} />{tr(d.key)}</span><b><Money value={d.amount} show={show} digits={0} /> · {d.percent}%</b></span>
    <span className="cat-bars-track"><i style={{ width: `${(d.amount / top) * 100}%`, background: d.color }} /></span>
  </li>)}</ul>;
}

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
  const { show, setShow, stats, deltas, breakdown, recent, refDate, homeRefDate, homeMonthKey, setHomeMonthKey, homeYears = [], homeMonthStats, user, unread, go, prefs, setPref, txs, budgetList = [], plans = [] } = c;
  const [editing, setEditing] = useState(false);
  const startEditing = () => { setEditing(true); try { window.scrollTo?.({ top: 0, behavior: 'smooth' }); } catch { /* jsdom */ } };
  const [mascotSheet, setMascotSheet] = useState(false);
  const [mascotError, setMascotError] = useState('');
  const file = useRef(null);
  const selectedYear = Number((homeMonthKey || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).slice(0, 4));
  const selectedMonth = Number((homeMonthKey || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).slice(5, 7));
  const monthName = (key) => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(`${key}-15T12:00:00`));
  const chooseMonth = (value) => setHomeMonthKey(`${selectedYear}-${String(value).padStart(2, '0')}`);
  const openMonthTransactions = (filter) => { c.setMonth?.(homeMonthKey); go('Transactions', { filter }); };
  const tiles = [
    { label: tr('Income'), icon: 'arrowDown', tone: 'green', value: stats.income, delta: deltas.income, open: () => openMonthTransactions('Income') },
    { label: tr('Expenses'), icon: 'arrowUp', tone: 'red', value: stats.expenses, delta: deltas.expenses, open: () => openMonthTransactions('Expenses') },
    { label: tr('Savings'), icon: 'bank', tone: 'slate', value: stats.savings, delta: deltas.savings, open: () => go('Wallet') },
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

  const byAmount = [...breakdown.data].sort((a, b) => b.amount - a.amount);
  const recentFor = (size) => (size === 'M' ? recent : (homeMonthStats?.list || txs).filter(t => t.type !== 'transfer').slice(0, size === 'S' ? 2 : 8));
  const boxes = [
    { id: 'balance', label: tr('Total balance'), styles: BALANCE_STYLES, node: ({ size, style }) => <section className={`card balance-card size-${size}`} aria-label={tr('Total balance')}>
      <div className="balance-label">{tr('Total Balance')}
        <button type="button" className="plain-icon" aria-label={show ? tr('Hide balances') : tr('Show balances')} onClick={() => setShow(!show)}><Icon name="eye" size={18} /></button>
      </div>
      <div className="balance-amount"><Money value={stats.balance} show={show} /></div>
      <Trend value={deltas.balance} chip size={13} />
      {style !== 'off' && <div className="balance-art">{style === 'bars' ? <MiniBars values={stats.trend} width={260} height={110} /> : <Sparkline values={stats.trend} width={260} height={110} />}</div>}
      <button type="button" className="round-button balance-go" aria-label={tr('Open wallet')} onClick={() => go('Wallet')}><Icon name="chevron" size={20} /></button>
    </section> },
    { id: 'summary', label: tr('Income, expenses & savings'), sizes: ['S', 'M'], node: ({ size }) => <section className={`stat-grid size-${size}`} aria-label={tr('Financial summary')}>
      {tiles.map(t => <button type="button" className={`card stat-card is-link tint-${t.tone}`} key={t.label} onClick={t.open} aria-label={tr('Open {label}', { label: t.label })}>
        <div className="stat-head"><span className={`stat-icon tone-${t.tone}`}><Icon name={t.icon} size={15} strokeWidth={2.2} /></span><span>{tr(t.label)}</span></div>
        <strong><Money value={t.value} show={show} digits={0} /></strong>
        {size !== 'S' && <Trend value={t.delta} />}
      </button>)}
    </section> },
    { id: 'flow', label: tr('Money flow'), styles: FLOW_STYLES, node: ({ style }) => <MoneyFlow txs={txs} refDate={homeRefDate || refDate} show={show} variant={style} /> },
    { id: 'budgets', label: tr('Budgets & plans'), node: ({ size }) => <BudgetsCard progress={budgetList} plans={plans} show={show} onOpen={c.openBudgets} size={size} /> },
    { id: 'subscriptions', label: tr('Upcoming renewals'), node: ({ size }) => <section aria-label={tr('Upcoming renewals')}>
      <SectionTitle action={c.subSummary?.activeCount ? tr('See All') : tr('Add')} onAction={() => go('Subscriptions')}>{tr('Upcoming Renewals')}</SectionTitle>
      {c.subSummary?.activeCount ? <UpcomingList upcoming={c.subSummary.upcoming} show={show} today={toDay(new Date())} onOpen={() => go('Subscriptions')} limit={{ S: 1, M: 3, L: 6 }[size]} />
        : <button type="button" className="budget-empty" onClick={() => go('Subscriptions')}><Icon name="refresh" size={20} /><span><strong>{tr('Track your subscriptions')}</strong><small>{tr('See every renewal before it charges.')}</small></span></button>}
    </section> },
    { id: 'spending', label: tr('Spending this month'), styles: SPENDING_STYLES, node: ({ size, style }) => <section aria-label={tr('Spending overview')}>
      <SectionTitle action={tr('See All')} onAction={() => go('Transactions', { filter: 'Expenses' })}>{tr('Spending')} This Month · {monthName(homeMonthKey)}</SectionTitle>
      <div className={`card spending-card is-${style}`}>
        {!breakdown.data.length ? <p className="empty">{tr('Add expenses to see your category breakdown.')}</p>
          : style === 'bars' ? <CategoryBars data={size === 'S' ? byAmount.slice(0, 3) : byAmount} show={show} />
            : <>
              <Donut data={breakdown.data} total={breakdown.total} caption={tr('Spent')} show={show} size={{ S: 104, M: 132, L: 168 }[size]} />
              <Legend data={size === 'S' ? byAmount.slice(0, 3) : breakdown.data} />
            </>}
      </div>
    </section> },
    { id: 'recent', label: tr('Recent transactions'), node: ({ size }) => { const list = recentFor(size); return <section aria-label={tr('Recent transactions')}>
      <SectionTitle action={tr('See All')} onAction={() => go('Transactions')}>{tr('Recent Transactions')}</SectionTitle>
      <div className="card list-card">
        {list.map(t => <TransactionRow key={t.id} t={t} show={show} refDate={refDate} onOpen={c.openTx} />)}
        {!list.length && <p className="empty">{tr('No transactions yet. Add your first record from the Transactions tab.')}</p>}
      </div>
    </section>; } },
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

    <div className="home-period-wrap">
      <div className="home-period-filter" role="group" aria-label={tr('Filter Home by month and year')}>
        <span className="home-period-icon"><Icon name="calendar" size={18} /></span>
        <label className="home-period-select month-select"><span>{tr('Month')}</span><select aria-label={tr('Select Home month')} value={selectedMonth} onChange={e => chooseMonth(e.target.value)}>{Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2024, m - 1, 1))}</option>)}</select></label>
        <span className="home-period-divider" aria-hidden="true" />
        <label className="home-period-select year-select"><span>{tr('Year')}</span><select aria-label={tr('Select Home year')} value={selectedYear} onChange={e => setHomeMonthKey(`${e.target.value}-${String(selectedMonth).padStart(2, '0')}`)}>{Array.from(new Set([...homeYears, selectedYear])).sort((a, b) => b - a).map(y => <option key={y} value={y}>{y}</option>)}</select></label>
        <span className="home-period-current" aria-live="polite">{monthName(homeMonthKey)}</span>
      </div>
    </div>

    <EditableBoxes title={tr('Home')} boxes={boxes} layout={prefs.layouts?.home} editing={editing} onEdit={startEditing} onDone={() => setEditing(false)} onChange={(l) => setPref('layouts', { ...(prefs.layouts || {}), home: l })} />
    {!editing && <button type="button" className="customize-button" onClick={startEditing}><Icon name="edit" size={16} /> {tr('Customize Home')}</button>}

    {mascotSheet && <Sheet title={tr('Your mascot')} subtitle={tr('Use your own photo as the Home mascot. It greets you and stays on this device.')} onClose={() => setMascotSheet(false)} label={tr('Mascot photo')}>
      <div className="mascot-preview"><span className="mascot big">{prefs.mascot ? <img src={prefs.mascot} alt={tr('Current mascot')} /> : <span>{user.initial}</span>}</span><div className="hello bubble"><small>{tr(timeGreeting())},</small><h1>{user.firstName}</h1></div></div>
      {mascotError && <p className="form-error" role="alert">{mascotError}</p>}
      <input ref={file} type="file" accept="image/*" hidden onChange={pickMascot} aria-label={tr('Choose a mascot photo')} />
      <div className="sheet-actions">{prefs.mascot && <button type="button" className="secondary-button" onClick={() => { setPref('mascot', ''); setMascotSheet(false); }}>{tr('Remove')}</button>}<button type="button" className="primary-button" onClick={() => file.current?.click()}><Icon name="camera" size={18} /> {prefs.mascot ? tr('Change photo') : tr('Choose photo')}</button></div>
    </Sheet>}
  </>;
}
