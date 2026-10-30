import React, { useMemo } from 'react';
import Icon from '../components/Icon';
import { RootHeader, Chips, SectionTitle, Bars, Donut, Legend, TransactionRow, Money } from '../components/ui';
import { money, shown, monthRange, monthLabel, dayKey, relativeDay, longDate } from '../lib/format';

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
const net = (list, includeTransfers = false) => list.reduce((sum, transaction) => {
  if (transaction.type === 'income') return sum + transaction.amount;
  if (transaction.type === 'expense') return sum - transaction.amount;
  return includeTransfers && transaction.type === 'transfer' ? sum + transaction.amount : sum;
}, 0);

export default function Transactions({ c }) {
  const { show, setShow, txFilter, setTxFilter, month, setMonth, months, sortKey, setSortKey, monthTxs, monthStats, breakdown, refDate, expanded, setExpanded, deltas } = c;
  const sorts = SORTS[txFilter];
  const sort = sorts.includes(sortKey) ? sortKey : 'Date';
  const sorted = useMemo(() => sortList(monthTxs, sort), [monthTxs, sort]);
  const groups = useMemo(() => {
    if (sort !== 'Date') return [{ key: 'all', label: '', total: null, items: sorted }];
    const map = new Map();
    sorted.forEach(t => { const k = dayKey(t.date); if (!map.has(k)) map.set(k, []); map.get(k).push(t); });
    return Array.from(map, ([k, items]) => ({ key: k, label: relativeDay(items[0].date, refDate), date: longDate(items[0].date), total: net(items, txFilter === 'Transfers'), items }));
  }, [sorted, sort, refDate, txFilter]);
  const limit = txFilter === 'All' && !expanded ? 4 : Infinity;
  let remaining = limit;
  const visibleGroups = groups.map(g => { const items = g.items.slice(0, Math.max(remaining, 0)); remaining -= items.length; return { ...g, items }; }).filter(g => g.items.length);
  const dateRange = (
    <label className="month-pill">
      <Icon name="calendar" size={18} /><span>{monthRange(month)}</span><Icon name="down" size={16} />
      <select aria-label="Select month" value={month} onChange={e => setMonth(e.target.value)}>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
    </label>
  );
  const sliders = <button type="button" className="round-button flat" aria-label="Quick actions" title="Quick actions" onClick={() => c.setSheet({ name: 'actions' })}><Icon name="sliders" size={20} /></button>;

  return <>
    <RootHeader title="Transactions" onSearch={c.openSearch} onBell={() => c.go('Notifications')} onSettings={() => c.go('Settings')} unread={c.unread} />
    <Chips label="Filter transactions by type" items={FILTERS} value={txFilter} onChange={setTxFilter} trailing={sliders} />
    <p className="currency-scope">Showing {monthStats.currency} transactions and totals only. Change Display Currency in Settings → Appearance to review another currency. No currency conversion is performed.</p>
    {txFilter !== 'All' && dateRange}
    {c.search && <p className="search-note">Showing results for “{c.search}” <button type="button" className="link-button" onClick={() => c.setSearch('')}>Clear</button></p>}

    {txFilter === 'All' && <>
      <section className="card total-card" aria-label="Total spent">
        <div><div className="balance-label">Total Spent <button type="button" className="plain-icon" aria-label={show ? 'Hide balances' : 'Show balances'} onClick={() => setShow(!show)}><Icon name="eye" size={17} /></button></div>
          <div className="balance-amount md"><Money value={monthStats.expenses} show={show} currency={monthStats.currency} /></div>
          {deltas.spent != null && <span className="chip-bad"><Icon name="arrowUp" size={12} /> {deltas.spent}% vs last month</span>}</div>
        <Bars values={monthStats.bars} startLabel={monthLabel(month).split(' ')[0]} endLabel={`${monthLabel(month).split(' ')[0]} ${monthStats.days}`} />
      </section>
      <section className="stat-grid" aria-label="Income, expenses and transfers">
        {[['Income', 'arrowDown', 'green', monthStats.income, deltas.income], ['Expenses', 'arrowUp', 'red', monthStats.expenses, deltas.expenses], ['Transfers', 'transfer', 'blue', monthStats.transfers, deltas.transfers]].map(([label, icon, tone, value, d]) =>
          <article className={`card stat-card tint-${tone}`} key={label}><div className="stat-head"><span className={`stat-icon tone-${tone}`}><Icon name={icon} size={15} strokeWidth={2.2} /></span><span>{label}</span></div>
            <strong><Money value={value} show={show} digits={0} currency={monthStats.currency} /></strong>{d != null && <span className={`delta ${(label === 'Expenses' ? d >= 0 : d < 0) ? 'bad' : 'good'}`}>{d >= 0 ? '+' : '−'}{Math.abs(d)}%</span>}</article>)}
      </section>
    </>}

    {txFilter === 'Expenses' && <section className="card breakdown-card" aria-label="Expenses breakdown">
      <div className="breakdown-head"><h2>Expenses Breakdown</h2></div>
      {breakdown.data.length ? <div className="breakdown-body"><Donut data={breakdown.data} total={breakdown.total} caption="Total Spent" show={show} size={124} currency={monthStats.currency} /><Legend data={breakdown.data} /></div> : <p className="empty">No expenses in this month.</p>}
    </section>}

    {txFilter === 'Transfers' && <section className="card transfer-card" aria-label="Total transfers">
      <span className="tile tone-blue big"><Icon name="transfer" size={26} /></span>
      <div><small>Total Transfers</small><div className="balance-amount md">{shown(show, money(monthStats.transfers, monthStats.currency), monthStats.currency)}</div><small>{monthStats.transferCount} transactions</small></div>
      <Bars values={monthStats.bars.slice(-6)} />
    </section>}

    {txFilter === 'Income' && <section className="card transfer-card income" aria-label="Total income">
      <span className="tile tone-green big"><Icon name="arrowDown" size={26} /></span>
      <div><small>Total Income</small><div className="balance-amount md">{shown(show, money(monthStats.income, monthStats.currency), monthStats.currency)}</div><small>{monthStats.incomeCount} transactions</small></div>
    </section>}

    {txFilter !== 'All' && <Chips label="Sort transactions" items={sorts} value={sort} onChange={setSortKey} />}
    {txFilter === 'All' ? <SectionTitle action={expanded ? 'Show less' : 'See All'} onAction={() => setExpanded(!expanded)}>Recent Transactions</SectionTitle>
      : sort === 'Date' && <div className="month-total"><span>{monthLabel(month)}</span><b>{shown(show, (txFilter === 'Expenses' ? '−' : '') + money(txFilter === 'Expenses' ? monthStats.expenses : txFilter === 'Income' ? monthStats.income : monthStats.transfers, monthStats.currency), monthStats.currency)}</b></div>}

    <div className="tx-groups">
      {visibleGroups.map(g => <section key={g.key}>
        {g.label && <div className="group-head"><span><b>{g.label}</b>{g.label !== g.date && <> · {g.date}</>}</span><span>{shown(show, `${txFilter === 'Transfers' ? '' : g.total < 0 ? '−' : '+'}${money(Math.abs(g.total), monthStats.currency)}`, monthStats.currency)}</span></div>}
        <div className="card list-card">{g.items.map(t => <TransactionRow key={t.id} t={t} show={show} refDate={refDate} chip timeOnly={sort === 'Date'} accountLabel={txFilter === 'Transfers' ? `${t.accountName} → ${t.transferToAccountName || 'Unknown account'}` : undefined} onOpen={c.openTx} />)}</div>
      </section>)}
      {!monthTxs.length && <div className="card empty-card"><Icon name="list" size={28} /><h3>No transactions</h3><p>Nothing matches this view. Try another month or filter, or add a record.</p><button type="button" className="primary-button" onClick={() => c.setSheet({ name: 'transaction' })}><Icon name="plus" size={16} /> Add transaction</button></div>}
    </div>
  </>;
}
