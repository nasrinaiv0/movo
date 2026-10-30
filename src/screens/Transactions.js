import React, { useMemo } from 'react';
import Icon from '../components/Icon';
import { RootHeader, Chips, SectionTitle, Bars, Donut, Legend, TransactionRow, Money, Trend } from '../components/ui';
import { money, shown, monthRange, monthLabel, dayKey, monthKey, relativeDay, longDate } from '../lib/format';
import { t as tr } from '../lib/i18n';

const FILTERS = ['All', 'Income', 'Expenses', 'Transfers'];
const SORTS = { Expenses: ['Date', 'Amount', 'Category', 'Merchant'], Transfers: ['Date', 'Amount', 'From/To', 'Account'], Income: ['Date', 'Amount', 'Account'], All: ['Date', 'Amount', 'Category', 'Merchant'] };

export function sortList(list, sort) {
  const copy = list.slice();
  if (sort === 'Amount') return copy.sort((a, b) => b.amount - a.amount);
  if (sort === 'Category') return copy.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
  if (sort === 'From/To') return copy.sort((a, b) => `${a.accountName || ''} ${a.transferToAccountName || ''}`.localeCompare(`${b.accountName || ''} ${b.transferToAccountName || ''}`));
  if (sort === 'Merchant') return copy.sort((a, b) => a.merchant.localeCompare(b.merchant));
  if (sort === 'Account') return copy.sort((a, b) => (a.accountName || '').localeCompare(b.accountName || ''));
  return copy;
}
const net = (list) => list.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : t.amount), 0);

export default function Transactions({ c }) {
  const { show, setShow, txFilter, setTxFilter, month, setMonth, months, sortKey, setSortKey, monthTxs, monthStats, breakdown, refDate, expanded, setExpanded, deltas } = c;
  /* Month-over-month indicators describe the current month only; older months show their totals alone. */
  const isCurrent = month === monthKey(refDate);
  const sorts = SORTS[txFilter];
  const sort = sorts.includes(sortKey) ? sortKey : 'Date';
  const sorted = useMemo(() => sortList(monthTxs, sort), [monthTxs, sort]);
  const groups = useMemo(() => {
    if (sort !== 'Date') return [{ key: 'all', label: '', total: null, items: sorted }];
    const map = new Map();
    sorted.forEach(t => { const k = dayKey(t.date); if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    return Array.from(map, ([k, items]) => ({ key: k, label: relativeDay(items[0].date, refDate), date: longDate(items[0].date), total: net(items), items }));
  }, [sorted, sort, refDate]);
  const limit = txFilter === 'All' && !expanded ? 4 : Infinity;
  let remaining = limit;
  const visibleGroups = groups.map(g => { const items = g.items.slice(0, Math.max(remaining, 0)); remaining -= items.length; return { ...g, items }; }).filter(g => g.items.length);
  const dateRange = (
    <label className="month-pill">
      <Icon name="calendar" size={18} /><span>{monthRange(month)}</span><Icon name="down" size={16} />
      <select aria-label={tr('Select month')} value={month} onChange={e => setMonth(e.target.value)}>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
    </label>
  );
  const sliders = <span className="chip-tools">
    <button type="button" className="round-button flat" aria-label={tr('Quick actions')} title={tr('Quick actions')} onClick={() => c.setSheet({ name: 'actions' })}><Icon name="sliders" size={20} /></button>
    <button type="button" className="round-button accent" aria-label={tr('Add transaction')} title={tr('Add transaction')} onClick={() => c.openForm('expense')}><Icon name="plus" size={20} strokeWidth={2.2} /></button>
  </span>;

  return <>
    <RootHeader title={tr('Transactions')} onSearch={c.openSearch} onBell={() => c.go('Notifications')} onSettings={() => c.go('Settings')} unread={c.unread} />
    <div className="chip-bar"><Chips label={tr('Filter transactions by type')} items={FILTERS} value={txFilter} onChange={setTxFilter} />{sliders}</div>
    {txFilter !== 'All' && dateRange}
    {c.search && <p className="search-note">{tr('Showing results for “{query}”', { query: c.search })} <button type="button" className="link-button" onClick={() => c.setSearch('')}>{tr('Clear')}</button></p>}

    {txFilter === 'All' && <>
      <section className="card total-card" aria-label={tr('Total spent')}>
        <div><div className="balance-label">{tr('Total Spent')} <button type="button" className="plain-icon" aria-label={show ? tr('Hide balances') : tr('Show balances')} onClick={() => setShow(!show)}><Icon name="eye" size={17} /></button></div>
          <div className="balance-amount md"><Money value={monthStats.expenses} show={show} /></div>
          {isCurrent && <Trend value={deltas.spent} chip />}</div>
        <Bars values={monthStats.bars} startLabel={monthLabel(month).split(' ')[0]} endLabel={`${monthLabel(month).split(' ')[0]} ${monthStats.days}`} />
      </section>
      <section className="stat-grid" aria-label={tr('Income, expenses and transfers')}>
        {[['Income', 'arrowDown', 'green', monthStats.income, deltas.income], ['Expenses', 'arrowUp', 'red', monthStats.expenses, deltas.expenses], ['Transfers', 'transfer', 'blue', monthStats.transfers, deltas.transfers]].map(([label, icon, tone, value, d]) =>
          <article className={`card stat-card tint-${tone}`} key={label}><div className="stat-head"><span className={`stat-icon tone-${tone}`}><Icon name={icon} size={15} strokeWidth={2.2} /></span><span>{tr(label)}</span></div>
            <strong><Money value={value} show={show} digits={0} /></strong>{isCurrent && <Trend value={d} />}</article>)}
      </section>
    </>}

    {txFilter === 'Expenses' && <section className="card breakdown-card" aria-label={tr('Expenses breakdown')}>
      <div className="breakdown-head"><h2>{tr('Expenses Breakdown')}</h2></div>
      {breakdown.data.length ? <div className="breakdown-body"><Donut data={breakdown.data} total={breakdown.total} caption={tr('Total Spent')} show={show} size={124} /><Legend data={breakdown.data} /></div> : <p className="empty">{tr('No expenses in this month.')}</p>}
    </section>}

    {txFilter === 'Transfers' && <section className="card transfer-card" aria-label={tr('Total transfers')}>
      <span className="tile tone-blue big"><Icon name="transfer" size={26} /></span>
      <div><small>{tr('Total Transfers')}</small><div className="balance-amount md">{shown(show, money(monthStats.transfers))}</div><small>{monthStats.transferCount} transactions</small></div>
      <Bars values={monthStats.bars.slice(-6)} />
    </section>}

    {txFilter === 'Income' && <section className="card transfer-card income" aria-label={tr('Total income')}>
      <span className="tile tone-green big"><Icon name="arrowDown" size={26} /></span>
      <div><small>{tr('Total Income')}</small><div className="balance-amount md">{shown(show, money(monthStats.income))}</div><small>{monthStats.incomeCount} transactions</small></div>
    </section>}

    {txFilter !== 'All' && <Chips label={tr('Sort transactions')} items={sorts} value={sort} onChange={setSortKey} />}
    {txFilter === 'All' ? <SectionTitle action={expanded ? tr('Show less') : tr('See All')} onAction={() => setExpanded(!expanded)}>{tr('Recent Transactions')}</SectionTitle>
      : sort === 'Date' && <div className="month-total"><span>{monthLabel(month)}</span><b>{shown(show, (txFilter === 'Expenses' ? '−' : '') + money(txFilter === 'Expenses' ? monthStats.expenses : txFilter === 'Income' ? monthStats.income : monthStats.transfers))}</b></div>}

    <div className="tx-groups">
      {visibleGroups.map(g => <section key={g.key}>
        {g.label && <div className="group-head"><span><b>{g.label}</b>{g.label !== g.date && <> · {g.date}</>}</span><span>{shown(show, `${txFilter === 'Transfers' ? '' : g.total < 0 ? '−' : '+'}${money(Math.abs(g.total))}`)}</span></div>}
        <div className="card list-card">{g.items.map(t => <TransactionRow key={t.id} t={t} show={show} refDate={refDate} chip timeOnly={sort === 'Date'} accountLabel={txFilter === 'Transfers' ? `${t.accountName} → ${t.transferToAccountName || 'Unknown account'}` : undefined} onOpen={c.openTx} />)}</div>
      </section>)}
      {!monthTxs.length && <div className="card empty-card"><Icon name="list" size={28} /><h3>{tr('No transactions')}</h3><p>{tr('Nothing matches this view. Try another month or filter, or add a record.')}</p><button type="button" className="primary-button" onClick={() => c.setSheet({ name: 'transaction' })}><Icon name="plus" size={16} /> {tr('Add transaction')}</button></div>}
    </div>
  </>;
}
