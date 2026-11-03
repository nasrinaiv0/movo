import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { SubHeader } from '../components/ui';
import { formatDate, money, shown } from '../lib/format';
import { ARCHIVE_DAYS, ARCHIVE_KINDS, daysLeft, purgeArchive } from '../lib/archive';
import { t as tr } from '../lib/i18n';

/*
 * Archive: removed transactions, subscriptions, limits and plans, and failed phone automations the person archived.
 * Everything stays for 90 days with Restore and Delete; after that it is deleted for good.
 */
const ORDER = ['transaction', 'automation', 'subscription', 'budget', 'plan'];

function describe(entry, show) {
  const it = entry.item || {};
  if (entry.kind === 'transaction') {
    const type = it.transaction_type || it.type;
    const sign = type === 'income' ? '+' : type === 'transfer' ? '' : '−';
    return { title: it.merchant || tr('Transaction'), amount: `${sign}${shown(show, money(Math.abs(Number(it.amount) || 0), it.currency || undefined))}` };
  }
  if (entry.kind === 'automation') return { title: it.merchant || it.spoken_text || tr('Payment'), amount: it.amount ? shown(show, money(Number(it.amount), it.currency || undefined)) : '' };
  if (entry.kind === 'subscription') return { title: it.name || tr('Subscription'), amount: it.amount ? shown(show, money(Number(it.amount), it.currency || undefined)) : '' };
  if (entry.kind === 'budget') return { title: it.category || tr('Limit'), amount: it.monthly_limit ? shown(show, money(Number(it.monthly_limit), it.currency || undefined)) : '' };
  return { title: it.name || it.title || tr('Plan'), amount: it.target ? shown(show, money(Number(it.target), it.currency || undefined)) : '' };
}

export default function Archive({ c }) {
  const { archive = [], archivedAutomations = [], loadArchivedAutomations, restoreArchived, deleteArchived, emptyArchive, show } = c;
  const [busy, setBusy] = useState('');
  useEffect(() => { loadArchivedAutomations?.(); }, [loadArchivedAutomations]);
  const entries = useMemo(() => [
    ...purgeArchive(archive),
    ...archivedAutomations.map(a => ({ id: `automation:${a.id}`, kind: 'automation', archivedAt: a.resolved_at || a.created_at, item: a })),
  ], [archive, archivedAutomations]);
  const groups = ORDER.map(kind => ({ kind, items: entries.filter(e => e.kind === kind).sort((a, b) => Date.parse(b.archivedAt) - Date.parse(a.archivedAt)) })).filter(g => g.items.length);
  const act = async (id, fn) => { setBusy(id); try { await fn(); } finally { setBusy(''); } };

  return <>
    <SubHeader title={tr('Archive')} onBack={() => c.go('Menu')} />
    <p className="archive-intro">{tr('Things you remove stay here for {n} days, so you can restore them. After that they are deleted for good.', { n: ARCHIVE_DAYS })}</p>
    {!groups.length && <div className="card archive-empty"><Icon name="archive" size={26} /><strong>{tr('Archive is empty')}</strong><small>{tr('Deleted transactions, subscriptions, limits, plans and archived automations appear here.')}</small></div>}
    {groups.map(g => <section key={g.kind} className="archive-group" aria-label={tr(ARCHIVE_KINDS[g.kind].label)}>
      <h3 className="archive-head"><Icon name={ARCHIVE_KINDS[g.kind].icon} size={16} />{tr(ARCHIVE_KINDS[g.kind].label)}<small>{g.items.length}</small></h3>
      <ul className="card archive-list">{g.items.map(entry => {
        const d = describe(entry, show); const left = daysLeft(entry.archivedAt);
        return <li key={entry.id} className="archive-row">
          <span className="archive-main"><strong>{d.title}</strong><small><span>{tr('Archived {date}', { date: formatDate(entry.archivedAt) })}</span> · <span>{left === 1 ? tr('1 day left') : tr('{n} days left', { n: left })}</span></small></span>
          {d.amount && <b className="archive-amount">{d.amount}</b>}
          <span className="archive-actions">
            <button type="button" className="archive-restore" disabled={busy === entry.id} onClick={() => act(entry.id, () => restoreArchived(entry))}>{tr('Restore')}</button>
            <button type="button" className="archive-delete" aria-label={tr('Delete {name} for good', { name: d.title })} disabled={busy === entry.id} onClick={() => { if (window.confirm(tr('Delete this for good? It cannot be restored.'))) act(entry.id, () => deleteArchived(entry)); }}><Icon name="trash" size={16} /></button>
          </span>
        </li>;
      })}</ul>
    </section>)}
    {groups.length > 0 && <button type="button" className="secondary-button archive-empty-all" onClick={() => { if (window.confirm(tr('Delete everything in the Archive for good?'))) act('all', emptyArchive); }}>{tr('Empty archive')}</button>}
  </>;
}
