import React from 'react';
import Icon from '../components/Icon';
import { RootHeader } from '../components/ui';
import { money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { BADGES, nextBadge } from '../lib/streak';

/** The fifth tab: profile, subscriptions, savings plans and spending limits in one place. */
export default function Menu({ c }) {
  const { user, go, show, subSummary, plans = [], budgetList = [], prefs } = c;
  const streak = prefs?.streak || { count: 0, best: 0 };
  const next = nextBadge(streak);
  const over = budgetList.filter(b => b.level === 'over').length;
  const items = [
    { icon: 'user', tone: 'blue', title: 'Profile', sub: user.email || tr('Your details, accounts and settings'), onClick: () => go('Profile') },
    { icon: 'refresh', tone: 'teal', title: 'Subscriptions', sub: subSummary.activeCount ? tr('{n} active · {amount}/month', { n: subSummary.activeCount, amount: shown(show, money(subSummary.monthly, undefined, 0)) }) : tr('Track renewals before they charge'), badge: c.subsBadge || null, onClick: () => go('Subscriptions') },
    { icon: 'target', tone: 'green', title: 'Plans', sub: plans.length ? tr('{n} savings goal(s)', { n: plans.length }) : tr('Savings goals with a target date'), onClick: () => c.openBudgets('plans') },
    { icon: 'sliders', tone: 'orange', title: 'Limits', sub: budgetList.length ? (over ? tr('{n} over the limit', { n: over }) : tr('{n} monthly limit(s), all on track', { n: budgetList.length })) : tr('Monthly spending limits per category'), onClick: () => c.openBudgets('budgets') },
  ];
  return <>
    <RootHeader title={tr('Menu')} onSearch={c.openSearch} onBell={() => go('Notifications')} onSettings={() => go('Settings')} unread={c.unread} />
    <button type="button" className="card menu-hero" onClick={() => go('Profile')}>
      <span className="avatar">{user.initial}</span>
      <span className="menu-main"><strong>{user.name}</strong><small>{tr('View profile')}</small></span>
      {streak.count > 1 && <span className="streak-chip" aria-label={tr('{n}-day streak', { n: streak.count })}><Icon name="spark" size={13} strokeWidth={2.2} />{streak.count}</span>}
      <Icon name="chevron" size={16} />
    </button>
    <section className="menu-grid" aria-label={tr('Menu')}>
      {items.map(it => <button type="button" key={it.title} className="card menu-tile" onClick={it.onClick}>
        <span className={`menu-tile-icon tone-${it.tone}`}><Icon name={it.icon} size={18} strokeWidth={2.1} />{it.badge ? <i>{it.badge}</i> : null}</span>
        <strong>{tr(it.title)}</strong><small>{it.sub}</small>
      </button>)}
    </section>
    <section className="card streak-card" aria-label={tr('Streak and badges')}>
      <div className="streak-head">
        <span><strong>{tr('{n}-day streak', { n: streak.count || 0 })}</strong><small>{next ? tr('{n} more day(s) to unlock {name}', { n: next.days - (streak.count || 0), name: tr(next.name) }) : tr('Every badge unlocked. Keep going!')}</small></span>
        <small className="streak-best">{tr('Best: {n}', { n: streak.best || 0 })}</small>
      </div>
      <ul className="streak-badges">
        {BADGES.map(b => { const earned = (streak.best || 0) >= b.days; return <li key={b.id} title={tr(b.name)}>
          <span className={`streak-badge${earned ? ' earned' : ''}`} style={{ '--badge': b.color }} aria-hidden="true"><Icon name={b.icon} size={18} strokeWidth={2} /></span>
          <small>{tr('{n}d', { n: b.days })}</small>
          <span className="sr-only">{tr(b.name)}: {earned ? tr('Earned') : tr('Locked')}</span>
        </li>; })}
      </ul>
      <p className="streak-note">{tr('A day counts when you open Movo. Badges stay earned even if a streak resets.')}</p>
    </section>
  </>;
}
