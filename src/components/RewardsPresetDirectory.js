import React, { useMemo, useState } from 'react';
import Icon from './Icon';
import { t as tr } from '../lib/i18n';
import { PH_REWARD_GROUPS, PH_REWARD_PRESETS } from '../lib/phRewardsPresets';
import './RewardsPresetDirectory.css';

const FILTERS = [
  { id:'all', label:'All' },
  { id:'points', label:'Points' },
  { id:'cashback', label:'Cashback' },
  { id:'miles', label:'Miles' },
  { id:'offers', label:'Offers' },
];
const matchesType = (p, value) => value === 'all'
  || (value === 'points' && ['points','stamps'].includes(p.kind))
  || (value === p.kind)
  || (value === 'offers' && ['offers','membership'].includes(p.kind));

export default function RewardsPresetDirectory({ paymentAccounts = [], onApply }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const [target, setTarget] = useState({});
  const [notice, setNotice] = useState('');
  const listed = useMemo(() => PH_REWARD_PRESETS.filter(p => matchesType(p,filter)
    && (!query.trim() || [p.name,p.earning,p.redemption,p.group].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))), [filter,query]);
  const allOpen = PH_REWARD_GROUPS.every(group => !listed.some(p => p.group === group.id) || !!expanded[group.id]);

  const apply = (preset) => {
    const targetAccount = target[preset.id] || '';
    if (preset.kind === 'cashback' && !targetAccount) {
      setNotice(tr('Choose the card or account before applying a cashback preset.'));
      return;
    }
    try {
      const result = onApply(preset, targetAccount);
      setNotice(result || tr('Preset added. Review its conditions and customize the earning rule below.'));
    } catch (err) {
      setNotice(err?.message || tr('Preset could not be applied.'));
    }
  };

  return <section className="rewards-directory" aria-label={tr("Philippine rewards preset directory")}>
    <div className="rewards-directory-heading">
      <span><strong>{tr("Philippine reward presets")}</strong><small>{PH_REWARD_PRESETS.length} reference programs · editable values · not live rates</small></span>
      <button type="button" className="rewards-expand-all" onClick={() => setExpanded(Object.fromEntries(PH_REWARD_GROUPS.map(g => [g.id,!allOpen])))}>{tr(allOpen ? 'Collapse all' : 'Expand all')}</button>
    </div>
    <div className="rewards-preset-filter" aria-label={tr("Filter reward presets")}>
      {FILTERS.map(item => <button type="button" key={item.id} aria-pressed={filter===item.id}
        className={'rewards-filter-chip'+(filter===item.id?' selected':'')} onClick={() => setFilter(item.id)}>{tr(item.label)}</button>)}
    </div>
    <label className="rewards-preset-search"><Icon name="search" size={17}/>
      <input value={query} onChange={event=>setQuery(event.target.value)} placeholder={tr("Find a merchant or card")} aria-label={tr("Search reward programs")} maxLength={90}/>
    </label>
    {notice && <p className="rewards-directory-notice" role="status">{notice}</p>}
    <div className="rewards-groups">
    {PH_REWARD_GROUPS.map(group=>{
      const items = listed.filter(p=>p.group===group.id);
      if (!items.length) return null;
      const open = !!expanded[group.id];
      return <section className="rewards-group" key={group.id} aria-label={group.name}>
        <button type="button" aria-expanded={open} aria-controls={'reward-group-'+group.id}
          className="rewards-group-toggle" onClick={()=>setExpanded(old=>({...old,[group.id]:!old[group.id]}))}>
          <span><strong>{group.name}</strong><small>{items.length} programs</small></span>
          <Icon name={open?'chevron-up':'chevron-down'} size={18}/>
        </button>
        {open && <div id={'reward-group-'+group.id} className="rewards-preset-list">
          {items.map(preset=><article className="rewards-preset-row" key={preset.id} data-preset={preset.id}>
            <div className="rewards-preset-name">
              <span><strong>{preset.name}</strong><small>{preset.kind} · directory p. {preset.page}</small></span>
            </div>
            <p>{preset.earning}</p>
            <small className="rewards-preset-redemption">{preset.redemption}</small>
            {preset.kind === 'cashback' && <label className="rewards-preset-account">
              <span>Apply to</span>
              <select aria-label={tr('Payment account for {name}',{name:preset.name})} value={target[preset.id]||''}
                onChange={e=>setTarget(old=>({...old,[preset.id]:e.target.value}))}>
                <option value="">Choose card / account</option>
                {paymentAccounts.map(a=><option value={a.id} key={a.id}>{a.institution_name || a.name} · {a.currency||'PHP'}</option>)}
              </select>
            </label>}
            <div className="rewards-preset-actions">
              <span>{tr(preset.manualOnly ? 'Manual verification required' : 'Starts inactive · verify terms first')}</span>
              <button type="button" onClick={()=>apply(preset)}>{tr(preset.kind==='cashback'?'Use cashback':'Add to Wallet')}</button>
            </div>
          </article>)}
        </div>}
      </section>;
    })}
    {!listed.length && <p className="form-note">{tr("No programs match your filter.")}</p>}
    </div>
    <p className="rewards-preset-disclaimer">Rates are reference figures from the supplied Philippine rewards directory, not verified live merchant policies. The original merchant controls eligibility, limits, expiry and posting. No estimated amount increases spendable balances or confirmed points.</p>
  </section>;
}
