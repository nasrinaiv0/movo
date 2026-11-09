import React from 'react';
import Icon from './Icon';
import { Money, SectionTitle } from './ui';
import { formatDate } from '../lib/format';
import { t as tr } from '../lib/i18n';
import usePlanning from '../lib/usePlanning';

/* Home: summary report from Financial planning (net worth, debts, money owed to you, bills, goals). */
export default function PlanningCard({ c, size = 'M' }) {
  const { summary, cloud } = usePlanning(c);
  const { show, base = 'PHP' } = c;
  const open = (tab) => c.go('FinancialPlanning', { tab });
  const b = summary.bills;
  const tiles = [
    { key: 'bills', icon: 'receipt', tone: 'orange', label: 'Bills due', value: b.dueThisMonth, sub: b.overdueCount ? tr('{n} overdue', { n: b.overdueCount }) : b.next ? tr('Next due {date}', { date: formatDate(b.next.due_date) }) : tr('This month'), alert: b.overdueCount > 0 },
    { key: 'loans', icon: 'bank', tone: 'red', label: 'Loans & debts', value: summary.loans.total, sub: tr('{n} active', { n: summary.loans.count }) },
    { key: 'owed', icon: 'user', tone: 'green', label: 'Owed to you', value: summary.receivables.total, sub: tr('{n} active', { n: summary.receivables.count }) },
    { key: 'goals', icon: 'target', tone: 'blue', label: 'Goals & Plans', value: summary.goals.saved, sub: summary.goals.count ? tr('{n}% saved', { n: Math.round(summary.goals.percent) }) : tr('No goals or plans yet.') },
  ];
  return <section aria-label={tr('Financial planning')}>
    <SectionTitle action={tr('See All')} onAction={() => open()}>{tr('Financial planning')}</SectionTitle>
    <div className={`card fp-home size-${size}`}>
      <button type="button" className="fp-home-top" onClick={() => open()} aria-label={tr('Open {label}', { label: tr('Net worth') })}>
        <span><small>{tr('Net worth')}</small><strong><Money value={summary.position.netWorth} show={show} currency={base} /></strong></span>
        <span className="fp-home-split">
          <span><small>{tr('Assets')}</small><b><Money value={summary.position.assets} show={show} currency={base} /></b></span>
          <span><small>{tr('Liabilities')}</small><b><Money value={summary.position.liabilities} show={show} currency={base} /></b></span>
        </span>
      </button>
      {cloud ? size !== 'S' && <div className="fp-home-grid">{tiles.map(t => <button type="button" key={t.key} className="fp-home-tile" onClick={() => open(t.key)}>
        <span className="stat-head"><span className={`stat-icon tone-${t.tone}`}><Icon name={t.icon} size={14} strokeWidth={2.2} /></span><span>{tr(t.label)}</span></span>
        <b><Money value={t.value} show={show} currency={base} /></b>
        <small className={t.alert ? 'is-alert' : ''}>{t.sub}</small>
      </button>)}</div>
        : <p className="form-note fp-home-note">{tr('Sign in to track bills, loans, money owed to you and goals here.')}</p>}
    </div>
  </section>;
}
