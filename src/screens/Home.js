import React from 'react';
import Icon from '../components/Icon';
import { IconButton, SectionTitle, Sparkline, Donut, Legend, TransactionRow, Money } from '../components/ui';
import { greeting } from '../lib/format';

const Delta = ({ value, invert }) => {
  if (value == null) return null;
  const up = value >= 0; const good = invert ? !up : up;
  return <span className={`delta ${good ? 'good' : 'bad'}`}>{up ? '+' : '−'}{Math.abs(value)}%</span>;
};

export default function Home({ c }) {
  const { show, setShow, stats, deltas, breakdown, recent, refDate, user, unread, go } = c;
  const tiles = [
    { label: 'Income', icon: 'arrowDown', tone: 'green', value: stats.income, delta: deltas.income },
    { label: 'Expenses', icon: 'arrowUp', tone: 'red', value: stats.expenses, delta: deltas.expenses, invert: true },
    { label: 'Savings', icon: 'bank', tone: 'slate', value: stats.savings, delta: deltas.savings },
  ];
  const flowValid = Number.isFinite(stats.income) && Number.isFinite(stats.expenses) && Number.isFinite(stats.savings);
  const flowBase = flowValid ? Math.max(stats.income, stats.expenses, 0) : 0;
  const expenseShare = flowValid && flowBase > 0 ? Math.min(100, (stats.expenses / flowBase) * 100) : 0;
  const savingsShare = flowValid && flowBase > 0 ? Math.min(100, (Math.max(0, stats.savings) / flowBase) * 100) : 0;
  const overspent = flowValid && stats.savings < 0;
  return <>
    <header className="screen-header home-header">
      <button type="button" className="avatar" aria-label="Open profile" onClick={() => go('Profile')}>{user.initial}</button>
      <div className="hello"><small>{greeting(refDate)}</small><h1>{user.firstName} <span aria-hidden="true">☀️</span></h1></div>
      <div className="header-actions">
        <IconButton icon="search" label="Search" onClick={c.openSearch} />
        <IconButton icon="bell" label="Notifications" onClick={() => go('Notifications')} dot={unread} />
        <IconButton icon="gear" label="Settings" onClick={() => go('Settings')} />
      </div>
    </header>

    <section className="card balance-card" aria-label="Total balance">
      <div className="balance-label">Total Balance <span className="currency-scope">· {stats.currency}</span>
        <button type="button" className="plain-icon" aria-label={show ? 'Hide balances' : 'Show balances'} onClick={() => setShow(!show)}><Icon name="eye" size={18} /></button>
      </div>
      <div className="balance-amount"><Money value={stats.balance} show={show} currency={stats.currency} /></div>
      {deltas.balance != null && <span className="chip-good"><Icon name="arrowUp" size={13} /> {deltas.balance >= 0 ? '+' : '−'}{Math.abs(deltas.balance)}% vs last month</span>}
      <div className="balance-art"><Sparkline values={stats.trend} width={260} height={110} /></div>
      <button type="button" className="round-button balance-go" aria-label="Open wallet" onClick={() => go('Wallet')}><Icon name="chevron" size={20} /></button>
    </section>

    <section className="stat-grid" aria-label="Financial summary">
      {tiles.map(t => <article className={`card stat-card tint-${t.tone}`} key={t.label}>
        <div className="stat-head"><span className={`stat-icon tone-${t.tone}`}><Icon name={t.icon} size={15} strokeWidth={2.2} /></span><span>{t.label}</span></div>
        <strong><Money value={t.value} show={show} digits={0} currency={stats.currency} /></strong>
        <Delta value={t.delta} invert={t.invert} />
      </article>)}
    </section>

    <SectionTitle>Money Flow</SectionTitle>
    <section className="card money-flow-card" aria-label="Money flow for the current month">
      <div className="money-flow-heading">
        <div><span className="eyebrow">THIS MONTH</span><h2>{!flowValid ? 'Review invalid amounts' : overspent ? 'Spending is above income' : 'Where your money goes'}</h2></div>
        <span className={`flow-status ${!flowValid ? '' : overspent ? 'flow-status-over' : 'flow-status-ok'}`}>{!flowValid ? 'Needs review' : overspent ? 'Over income' : 'On track'}</span>
      </div>
      <div className="flow-total-row">
        <div className="flow-total flow-income"><span><i aria-hidden="true" />Income</span><strong><Money value={stats.income} show={show} digits={0} currency={stats.currency} /></strong></div>
        <div className="flow-total flow-expenses"><span><i aria-hidden="true" />Expenses</span><strong><Money value={stats.expenses} show={show} digits={0} currency={stats.currency} /></strong></div>
      </div>
      <div className="flow-track" role="img" aria-label={!flowValid
        ? 'Money flow summary unavailable because invalid financial amounts were detected.'
        : show
          ? `Of ${stats.currency} ${stats.income} income, ${stats.currency} ${stats.expenses} went to expenses and net savings are ${stats.currency} ${stats.savings}.`
          : 'Money flow amounts are hidden by your privacy setting.'}>
        <span className="flow-track-expense" style={{ width: `${expenseShare}%` }} />
        {!overspent && <span className="flow-track-savings" style={{ width: `${savingsShare}%` }} />}
      </div>
      <div className="flow-track-legend">{flowValid
        ? <><span><i className="flow-dot-expense" aria-hidden="true" />Spent {flowBase ? Math.round(expenseShare) : 0}%</span><span><i className="flow-dot-savings" aria-hidden="true" />Retained {overspent ? '0' : (flowBase ? Math.round(savingsShare) : 0)}%</span></>
        : <span>Percentages unavailable until amounts are corrected.</span>}</div>
      <div className={`flow-net ${overspent ? 'flow-net-negative' : ''}`}>
        <div><span>{overspent ? 'Amount over income' : 'Net savings'}</span><strong><Money value={Math.abs(stats.savings)} show={show} digits={0} currency={stats.currency} /></strong></div>
        <button type="button" className="flow-link" onClick={() => go('Transactions')}>View transactions <Icon name="chevron" size={15} /></button>
      </div>
      {stats.transfers > 0 && <p className="flow-note"><Icon name="transfer" size={14} /> <Money value={stats.transfers} show={show} digits={0} currency={stats.currency} /> in internal transfers, excluded from income and expenses.</p>}
      {overspent && <p className="flow-warning" role="status">Expenses exceed this month’s income. Review transactions to see what changed.</p>}
    </section>

    <SectionTitle action="See All" onAction={() => go('Transactions', { filter: 'Expenses' })}>Spending This Month</SectionTitle>
    <section className="card spending-card" aria-label="Spending overview">
      {breakdown.data.length ? <>
        <Donut data={breakdown.data} total={breakdown.total} caption="Spent" show={show} currency={stats.currency} />
        <Legend data={breakdown.data} />
      </> : <p className="empty">Add expenses to see your category breakdown.</p>}
    </section>

    <SectionTitle action="See All" onAction={() => go('Transactions')}>Recent Transactions</SectionTitle>
    <section className="card list-card">
      {recent.map(t => <TransactionRow key={t.id} t={t} show={show} refDate={refDate} onOpen={c.openTx} />)}
      {!recent.length && <p className="empty">No transactions yet. Add your first record from the Transactions tab.</p>}
    </section>
  </>;
}
