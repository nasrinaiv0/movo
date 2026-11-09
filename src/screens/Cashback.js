import React, { useMemo, useState } from 'react';
import Icon from '../components/Icon';
import { RootHeader, SectionTitle, Sheet } from '../components/ui';
import { money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';
import { deleteRecord, useConfirm } from '../components/ConfirmDialog';
import { cashbackTotals, estimateCashback } from '../lib/cashback';
import { visibleLoyaltyCards, estimateLoyaltyRewards, estimatedLoyaltyTotals, safeLoyaltyPoints, normalizeLoyaltyCard } from '../lib/loyaltyCards';
import RewardsPresetDirectory from '../components/RewardsPresetDirectory';
import { cashbackRuleFromPreset, loyaltyRuleFromPreset } from '../lib/phRewardsPresets';

const today = () => new Date().toLocaleDateString('en-CA');
const round = n => Math.round((Number(n) || 0) * 100) / 100;

export default function Cashback({ c }) {
  const { prefs = {}, setPref, accountsView = [], txs = [], show } = c;
  const rules = prefs.cashbackRules || {};
  const manual = prefs.cashbackEntries || [];
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const confirm = useConfirm();
  const [expandedRuleGroups, setExpandedRuleGroups] = useState({});
  const [expandedAccounts, setExpandedAccounts] = useState({});
  const wallets = accountsView.filter(a => !a.is_archived && ['e_wallet', 'bank'].includes(a.account_type));
  const cashbackAccounts = accountsView.filter(a => !a.is_archived && ['bank','card','e_wallet'].includes(a.account_type));
  const auto = useMemo(() => estimateCashback(txs, accountsView, rules), [txs, accountsView, rules]);
  const totals = cashbackTotals(manual.filter(x => x.status !== 'Redeemed'));
  const estimatedTotals = cashbackTotals(auto);
  const loyaltyCards = visibleLoyaltyCards(prefs);
  const loyaltyRules = prefs.loyaltyRewardRules || {};
  const eligiblePaymentAccounts = accountsView.filter(a => !a.is_archived && ['bank', 'card', 'e_wallet', 'cash'].includes(a.account_type));
  const rewardEstimates = useMemo(() => estimateLoyaltyRewards(txs, accountsView, loyaltyCards, loyaltyRules), [txs, accountsView, prefs.membershipCards, loyaltyRules]);
  const rewardTotals = estimatedLoyaltyTotals(rewardEstimates);
  const updateRewardRule = (cardId, patch) => setPref('loyaltyRewardRules', { ...loyaltyRules, [cardId]: { ...(loyaltyRules[cardId] || {}), ...patch } });

  const expand = id => setExpandedAccounts(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleGroup = id => setExpandedRuleGroups(prev => ({ ...prev, [id]: !prev[id] }));
  const applyPreset = (preset, accountId) => {
    if (preset.kind === 'cashback') {
      const account = cashbackAccounts.find(item => item.id === accountId);
      if (!account) throw new Error(tr('Choose an existing eligible bank, card or e-wallet account.'));
      const old = (prefs.cashbackRules || {})[account.id] || {};
      setPref('cashbackRules', { ...rules, [account.id]: cashbackRuleFromPreset(preset, old) });
      setExpandedRuleGroups(prev => ({ ...prev, cashback:true }));
      setExpandedAccounts(prev => ({ ...prev, ['cash-'+account.id]:true }));
      return 'Preset attached to '+(account.name || account.institution_name)+'. Your existing edits were preserved. Review the rules below before enabling.';
    }
    const cards = visibleLoyaltyCards(prefs);
    const matched = cards.find(card => card.name.trim().toLocaleLowerCase() === preset.name.trim().toLocaleLowerCase());
    const id = matched?.id || (typeof window !== 'undefined' && window.crypto?.randomUUID?.())
      || 'reward-'+Date.now().toString(36);
    const type = preset.kind === 'miles' ? 'rewards'
      : preset.kind === 'stamps' ? 'tokens'
      : preset.kind === 'membership' ? 'membership'
      : preset.kind === 'offers' ? 'membership' : 'loyalty';
    const card = matched || normalizeLoyaltyCard({
      id, type, name:preset.name, program:preset.name,
      points:'0', pointsUnit:preset.pointUnit || (preset.kind === 'miles' ? 'miles'
        : preset.kind === 'stamps' ? 'stamps' : 'points'),
      noExpiry:true,
    });
    if (!matched) setPref('membershipCards', [...cards,card]);
    setPref('loyaltyRewardRules', {
      ...loyaltyRules, [id]:loyaltyRuleFromPreset(preset,loyaltyRules[id] || {}),
    });
    setExpandedRuleGroups(prev => ({ ...prev, points:true }));
    setExpandedAccounts(prev => ({ ...prev, ['points-'+id]:true }));
    return matched ? 'Existing '+preset.name+' card found. Your custom points settings were preserved.'
      : preset.name+' added to Wallet with an inactive, editable reference earning rule.';
  };

  const formatTotals = values => Object.entries(values);
  const cash = (value, currency = 'PHP') => shown(show, money(value, currency));
  const saveRules = next => setPref('cashbackRules', next);
  const saveManual = event => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e12) {
      setError(tr('Enter a valid cashback amount.'));
      return;
    }
    const account = wallets.find(a => a.id === form.accountId);
    const entry = {
      id: window.crypto?.randomUUID?.() || String(Date.now()),
      amount: round(amount),
      currency: account?.currency || form.currency || 'PHP',
      date: form.date || today(),
      source: String(form.source || '').trim().slice(0, 100) || 'Manual cashback',
      account: account ? (account.institution_name || account.name) : '',
      accountId: account?.id || '',
      status: form.status || 'Received',
    };
    setPref('cashbackEntries', [entry, ...manual].slice(0, 500));
    setSheet(null);
    setError('');
  };
  const updateEntry = (id, patch) => setPref('cashbackEntries', manual.map(entry => entry.id === id ? { ...entry, ...patch } : entry));
  const removeEntry = id => {
    const row = manual.find(entry => entry.id === id);
    if (!row) return Promise.resolve(false);
    return confirm({
      ...deleteRecord(row.source || tr('Manual cashback'), { impact: tr('Your cashback totals update straight away.'), permanent: true }),
      action: () => setPref('cashbackEntries', (c.prefs?.cashbackEntries || []).filter(entry => entry.id !== id)),
    });
  };

  return <>
    <RootHeader title={tr('Cashback')} onBack={() => c.go('Menu')} onSearch={c.openSearch} onBell={() => c.go('Notifications')} onSettings={() => c.go('Settings')} unread={c.unread} />
    <section className="card total-card cashback-total">
      <small>{tr('Cashback tracked')}</small>
      {formatTotals(totals).length ? formatTotals(totals).map(([currency, amount]) => <div className="balance-amount" key={currency}>{cash(amount, currency)}</div>) : <div className="balance-amount">{cash(0, c.base || 'PHP')}</div>}
      <p className="form-note">{tr('Received and pending rewards you have manually recorded.')}</p>
      {formatTotals(estimatedTotals).map(([currency, amount]) => <p className="form-note" key={currency}>{tr('Estimated')}: {cash(amount, currency)}</p>)}
    </section>

    <SectionTitle action={tr('Add cashback')} onAction={() => { setForm({ amount: '', date: today(), status: 'Received' }); setError(''); setSheet({ kind: 'manual' }); }}>{tr('Manual cashback')}</SectionTitle>
    <div className="card list-card">
      {manual.length ? manual.map(entry => <div className="fp-row" key={entry.id}>
        <span className="stat-icon tone-green"><Icon name="gift" size={17} /></span>
        <span className="fp-main"><strong>{entry.source || tr('Manual cashback')}</strong><small>{entry.date} · {entry.account || tr('No account selected')} · {tr(entry.status || 'Received')}</small></span>
        <span className="fp-amount"><b>{cash(entry.amount, entry.currency)}</b><small><button type="button" className="link-button" onClick={() => updateEntry(entry.id, { status: entry.status === 'Redeemed' ? 'Received' : 'Redeemed' })}>{tr(entry.status === 'Redeemed' ? 'Mark received' : 'Mark redeemed')}</button> · <button type="button" className="link-button" onClick={() => removeEntry(entry.id)}>{tr('Delete')}</button></small></span>
      </div>) : <p className="form-note">{tr('No manual cashback entries yet.')}</p>}
    </div>

    <RewardsPresetDirectory paymentAccounts={cashbackAccounts} onApply={applyPreset} />

    <div className="reward-rule-group-heading">
      <button type="button" className="reward-rule-group-toggle" aria-expanded={!!expandedRuleGroups.cashback}
        onClick={() => toggleGroup('cashback')}>
        <span>{tr('Automatic cashback rules')} <small>{cashbackAccounts.length}</small></span>
        <Icon name={expandedRuleGroups.cashback ? 'chevron-up':'chevron-down'} size={17}/>
      </button>
    </div>
    {expandedRuleGroups.cashback && <>

    <p className="form-note cashback-intro">{tr('Set a cashback rate for each bank or e-wallet. MOVO estimates rewards from matching expense transactions; confirm actual rewards with your provider.')}</p>
    <div className="cashback-rule-list">
    {cashbackAccounts.map(account => {
      const rule = rules[account.id] || {};
      return <article className="card fp-goal cashback-rule" key={account.id}>
        <div className="fp-goal-head">
          <span className="stat-icon tone-green"><Icon name={account.account_type === 'e_wallet' ? 'wallet' : 'bank'} size={17} /></span>
          <span className="fp-main"><strong>{account.institution_name || account.name}</strong><small>{tr(account.account_type === 'e_wallet' ? 'Digital wallet' : 'Bank account')}</small></span>
          <button type="button" className="reward-account-expand" aria-expanded={!!expandedAccounts['cash-'+account.id]}
            onClick={() => expand('cash-'+account.id)} aria-label={'Edit cashback rule for '+(account.name || account.institution_name)}>
            <Icon name={expandedAccounts['cash-'+account.id]?'chevron-up':'chevron-down'} size={17}/>
          </button>
          <label className="legal-disclosure-check"><input type="checkbox" checked={!!rule.enabled}
            disabled={!!rule.manualOnly || (!!rule.presetId && !rule.verified)}
            onChange={event => saveRules({ ...rules, [account.id]: { ...rule, enabled: event.target.checked } })} /><span>{tr('Auto')}</span></label>
        </div>
        {expandedAccounts['cash-'+account.id] && <>
        {!!rule.presetId && <div className="reward-rule-reference">
          <small>{rule.conditions || tr('Provider terms apply')}</small>
          <label><input type="checkbox" checked={!!rule.verified} onChange={event => saveRules({
            ...rules, [account.id]: { ...rule, verified:event.target.checked, enabled:false },
          })}/>{tr("I verified my card's current conditions")}</label>
          {!!rule.manualOnly && <small>This promotion needs store/device proof not present in transaction logs. Automatic estimation remains unavailable.</small>}
        </div>}
        <div className="cashback-rule-fields">
          <label className="cashback-field"><span>{tr('Cashback rate (%)')}</span><input className="cashback-input" type="number" inputMode="decimal" min="0" max="100" step="0.01" placeholder="e.g. 1.5" aria-label={tr('Cashback rate (%)')} value={rule.rate ?? ''} onChange={event => saveRules({ ...rules, [account.id]: { ...rule, rate: event.target.value } })} /></label>
          <label className="cashback-field"><span>{tr('Maximum per transaction')}</span><input className="cashback-input" type="number" inputMode="decimal" min="0" step="0.01" placeholder="" aria-label={tr('Maximum per transaction')} value={rule.cap ?? ''} onChange={event => saveRules({ ...rules, [account.id]: { ...rule, cap: event.target.value } })} /></label>
        </div>
        <div className="cashback-rule-fields">
          <label className="cashback-field"><span>Eligible category</span><input className="cashback-input" placeholder={tr("e.g. Groceries")} value={rule.scopeCategory || ''} maxLength={70} onChange={e=>saveRules({ ...rules,[account.id]:{...rule,scopeCategory:e.target.value,enabled:false} })}/></label>
          <label className="cashback-field"><span>Merchant contains</span><input className="cashback-input" placeholder="Optional" value={rule.merchantContains || ''} maxLength={100} onChange={e=>saveRules({ ...rules,[account.id]:{...rule,merchantContains:e.target.value,enabled:false} })}/></label>
          <label className="cashback-field"><span>Monthly cap (₱)</span><input className="cashback-input" type="number" min="0" max="100000000" step="0.01" value={rule.monthlyCap ?? ''} onChange={e=>saveRules({ ...rules,[account.id]:{...rule,monthlyCap:e.target.value} })}/></label>
          <label className="cashback-field"><span>Min receipt (₱)</span><input className="cashback-input" type="number" min="0" max="100000000" step="0.01" value={rule.minSpend ?? ''} onChange={e=>saveRules({ ...rules,[account.id]:{...rule,minSpend:e.target.value} })}/></label>
          <label className="cashback-field"><span>Whole receipt step (₱)</span><input className="cashback-input" type="number" min="0" max="1000000" step="0.01" value={rule.fullSpendStep ?? ''} onChange={e=>saveRules({ ...rules,[account.id]:{...rule,fullSpendStep:e.target.value} })}/></label>
        </div>
        <small className="form-note cashback-hint">{tr('Estimate only · based on logged purchases')}</small>
        </>}
      </article>;
    })}
    </div>

    </>}
    <div className="reward-rule-group-heading">
      <button type="button" className="reward-rule-group-toggle" aria-expanded={!!expandedRuleGroups.points}
        onClick={() => toggleGroup('points')}>
        <span>{tr('Automatic membership points & rewards')} <small>{loyaltyCards.length}</small></span>
        <Icon name={expandedRuleGroups.points ? 'chevron-up':'chevron-down'} size={17}/>
      </button>
    </div>
    {expandedRuleGroups.points && <>

    <p className="form-note cashback-intro">{tr('Match purchases by payment account and merchant to estimate points. These are estimates only: actual rewards must be confirmed with the provider. No money moves.')}</p>
    <div className="cashback-rule-list">
      {loyaltyCards.length ? loyaltyCards.map(card => {
        const rule = loyaltyRules[card.id] || {};
        const selected = eligiblePaymentAccounts.find(account => account.id === rule.accountId);
        const unit = card.pointsUnit || (card.type === 'tokens' ? 'tokens' : 'points');
        return <article className="card fp-goal cashback-rule" key={card.id}>
          <div className="fp-goal-head">
            <span className="stat-icon tone-green"><Icon name={card.type === 'tokens' ? 'star' : 'gift'} size={17} /></span>
            <span className="fp-main"><strong>{card.name}</strong><small>{safeLoyaltyPoints(card.points).toLocaleString()} {unit} · {tr('Recorded balance')} {rewardTotals[card.id] ? ' · +' + rewardTotals[card.id].toLocaleString() + ' ' + tr('estimated') : ''}</small></span>
            <button type="button" className="reward-account-expand" aria-expanded={!!expandedAccounts['points-'+card.id]}
              onClick={() => expand('points-'+card.id)} aria-label={'Edit points rule for '+card.name}>
              <Icon name={expandedAccounts['points-'+card.id]?'chevron-up':'chevron-down'} size={17}/>
            </button>
            <label className="legal-disclosure-check"><input type="checkbox" aria-label={tr('Automatically estimate rewards for {name}', { name: card.name })}
              checked={!!rule.enabled} disabled={!!rule.manualOnly || (!!rule.presetId && !rule.verified)}
              onChange={event => updateRewardRule(card.id, { enabled: event.target.checked, merchantContains: rule.merchantContains ?? card.name })} /><span>{tr('Auto')}</span></label>
          </div>
          {expandedAccounts['points-'+card.id] && <>
          {!!rule.presetId && <div className="reward-rule-reference">
            <small>{rule.conditions || tr('Provider eligibility varies')}</small>
            <label><input type="checkbox" checked={!!rule.verified} onChange={e=>updateRewardRule(card.id,{verified:e.target.checked,enabled:false})}/>{tr('I verified current earning terms')}</label>
            {!!rule.manualOnly && <button type="button" className="reward-manual-override" onClick={()=>updateRewardRule(card.id,{manualOnly:false,rateMode:'per100',enabled:false})}>Use custom spend-based rule instead</button>}
          </div>}
          <div className="cashback-rule-fields">
            <label className="cashback-field"><span>{tr('Payment account')}</span><select className="cashback-input" aria-label={tr('Payment account for {name}', { name: card.name })} value={rule.accountId || ''} onChange={event => {
              const account = eligiblePaymentAccounts.find(item => item.id === event.target.value);
              updateRewardRule(card.id, { accountId: event.target.value, currency: account?.currency || '' });
            }}><option value="">{tr('Select payment account')}</option>{eligiblePaymentAccounts.map(account => <option key={account.id} value={account.id}>{account.institution_name || account.name}</option>)}</select></label>
            <label className="cashback-field"><span>{tr('Merchant name contains')}</span><input className="cashback-input" aria-label={tr('Merchant name contains for {name}', { name: card.name })} maxLength={100} placeholder={card.name} value={rule.merchantContains ?? card.name} onChange={event => updateRewardRule(card.id, { merchantContains: event.target.value })} /></label>
          </div>
          <div className="cashback-rule-fields">
            <label className="cashback-field"><span>Calculation</span>
              <select className="cashback-input" value={rule.rateMode==='perBlock'?'perBlock':'per100'}
                onChange={e=>updateRewardRule(card.id,{rateMode:e.target.value,manualOnly:false,enabled:false})}>
                <option value="perBlock">Points per spending threshold</option>
                <option value="per100">Points per ₱100</option>
              </select>
            </label>
            {rule.rateMode==='perBlock' && <label className="cashback-field"><span>Spend for one block (₱)</span><input className="cashback-input" type="number" min="0.01" step="0.01" value={rule.spendUnit??''} onChange={e=>updateRewardRule(card.id,{spendUnit:e.target.value})}/></label>}
            {rule.rateMode==='perBlock' && <label className="cashback-field"><span>Points per block</span><input className="cashback-input" type="number" min="0.01" step="0.01" value={rule.pointsPerBlock??''} onChange={e=>updateRewardRule(card.id,{pointsPerBlock:e.target.value})}/></label>}
          </div>
          {rule.rateMode!=='perBlock' && <div className="cashback-rule-fields">
            <label className="cashback-field"><span>{tr('Rewards per 100 spent')}</span><input className="cashback-input" aria-label={tr('Rewards per 100 spent for {name}', { name: card.name })} type="number" inputMode="decimal" min="0" max="100000" step="0.01" placeholder="1" value={rule.pointsPer100 ?? ''} onChange={event => updateRewardRule(card.id, { pointsPer100: event.target.value })} /></label>
            <label className="cashback-field"><span>{tr('Transaction currency')}</span><input className="cashback-input" value={selected?.currency || ''} readOnly aria-label={tr('Transaction currency')} /></label>
          </div>}
          <small className="form-note cashback-hint">{tr('Only matching logged expenses earn estimated rewards. Deleting an expense reverses its estimate automatically.')}</small>
          </>}
        </article>;
      }) : <p className="form-note">{tr('Add a membership or rewards card in Wallet to configure automatic points.')}</p>}
    </div>
    </>}
    <SectionTitle>{tr('Estimated automatic reward points')}</SectionTitle>
    <div className="card list-card">
      {rewardEstimates.length ? rewardEstimates.map(entry => <div className="fp-row" key={entry.id}>
        <span className="stat-icon tone-green"><Icon name="star" size={17} /></span>
        <span className="fp-main"><strong>{entry.merchant}</strong><small>{entry.date} · {loyaltyCards.find(card => card.id === entry.cardId)?.name || ''} · {tr('Estimated')}</small></span>
        <span className="fp-amount"><b>+{entry.points.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b><small>{entry.unit}</small></span>
      </div>) : <p className="form-note">{tr('No matching purchases have earned estimated reward points yet.')}</p>}
    </div>

    <SectionTitle>{tr('Estimated automatic cashback')}</SectionTitle>
    <div className="card list-card">
      {auto.length ? auto.map(entry => <div className="fp-row" key={entry.id}>
        <span className="stat-icon tone-blue"><Icon name="sparkles" size={17} /></span>
        <span className="fp-main"><strong>{entry.source}</strong><small>{entry.date} · {entry.account} · {entry.rate}% · {tr('Estimated')}</small></span>
        <span className="fp-amount"><b>{cash(entry.amount, entry.currency)}</b></span>
      </div>) : <p className="form-note">{tr('No automatic cashback estimates. Enable a rule and log purchases from that account.')}</p>}
    </div>

    {sheet?.kind === 'manual' && <Sheet title={tr('Add cashback')} onClose={() => setSheet(null)} label={tr('Add cashback')}>
      <form className="sheet-form" onSubmit={saveManual}>
        {error && <p className="app-alert" role="alert">{error}</p>}
        <label>{tr('Amount received')}<input required type="number" min="0.01" max="999999999999" step="0.01" value={form.amount || ''} onChange={event => setForm({ ...form, amount: event.target.value })} /></label>
        <label>{tr('Source / promotion')}<input maxLength="100" value={form.source || ''} onChange={event => setForm({ ...form, source: event.target.value })} /></label>
        <label>{tr('Bank or e-wallet')}<select value={form.accountId || ''} onChange={event => setForm({ ...form, accountId: event.target.value })}><option value="">{tr('Choose account (optional)')}</option>{wallets.map(account => <option key={account.id} value={account.id}>{account.institution_name || account.name}</option>)}</select></label>
        <label>{tr('Date received')}<input type="date" value={form.date || today()} onChange={event => setForm({ ...form, date: event.target.value })} /></label>
        <label>{tr('Status')}<select value={form.status || 'Received'} onChange={event => setForm({ ...form, status: event.target.value })}><option>Received</option><option>Pending</option><option>Redeemed</option></select></label>
        <button className="primary-button">{tr('Save cashback')}</button>
      </form>
    </Sheet>}
  </>;
}
