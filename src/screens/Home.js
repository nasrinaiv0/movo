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
  return <>
    <header className="screen-header home-header">
      <button type="button" className="avatar" aria-label="Open profile" onClick={() => go('Profile')}>{user.initial}</button>
      <div className="hello"><small>{greeting(refDate)}</small><h1>{user.firstName} <span aria-hidden="true">☀️</span></h1></div>
      <div className="header-actions">
        <IconButton icon="search" label="Search" onClick={() => c.setSheet({ name: 'search' })} />
        <IconButton icon="bell" label="Notifications" onClick={() => go('Notifications')} dot={unread} />
        <IconButton icon="gear" label="Settings" onClick={() => go('Settings')} />
      </div>
    </header>

    <section className="card balance-card" aria-label="Total balance">
      <div className="balance-label">Total Balance
        <button type="button" className="plain-icon" aria-label={show ? 'Hide balances' : 'Show balances'} onClick={() => setShow(!show)}><Icon name="eye" size={18} /></button>
      </div>
      <div className="balance-amount"><Money value={stats.balance} show={show} /></div>
      {deltas.balance != null && <span className="chip-good"><Icon name="arrowUp" size={13} /> {deltas.balance >= 0 ? '+' : '−'}{Math.abs(deltas.balance)}% vs last month</span>}
      <div className="balance-art"><Sparkline values={stats.trend} width={260} height={110} /></div>
      <button type="button" className="round-button balance-go" aria-label="Open wallet" onClick={() => go('Wallet')}><Icon name="chevron" size={20} /></button>
    </section>

    <section className="stat-grid" aria-label="Financial summary">
      {tiles.map(t => <article className={`card stat-card tint-${t.tone}`} key={t.label}>
        <div className="stat-head"><span className={`stat-icon tone-${t.tone}`}><Icon name={t.icon} size={15} strokeWidth={2.2} /></span><span>{t.label}</span></div>
        <strong><Money value={t.value} show={show} digits={0} /></strong>
        <Delta value={t.delta} invert={t.invert} />
      </article>)}
    </section>

    <SectionTitle action="See All" onAction={() => go('Transactions', { filter: 'Expenses' })}>Spending This Month</SectionTitle>
    <section className="card spending-card" aria-label="Spending overview">
      {breakdown.data.length ? <>
        <Donut data={breakdown.data} total={breakdown.total} caption="Spent" show={show} />
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
