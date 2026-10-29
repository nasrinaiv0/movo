import React, { useRef } from 'react';
import Icon from '../components/Icon';
import CardArt from '../components/CardArt';
import CardStyleSheet from '../components/CardStyleSheet';
import { RootHeader, Chips, SectionTitle, Sparkline, Tile, TransactionRow, Sheet, Money } from '../components/ui';
import { money, shown } from '../lib/format';

const FILTERS = ['All', 'Cards', 'Bank Accounts', 'E-Wallets'];
const typeOf = { Cards: 'card', 'Bank Accounts': 'bank', 'E-Wallets': 'e_wallet' };
const mask = (a) => (a.mask ? `•••• ${a.mask}` : '');
const subtitle = (a) => (a.account_type === 'bank' ? 'Savings' : a.account_type === 'e_wallet' ? 'Balance' : a.institution_name || 'Account');

function AccountRow({ a, show, onClick }) {
  return <button type="button" className="account-row" onClick={onClick}>
    <Tile name={a.name} size={46} radius={14} />
    <span className="account-main"><strong>{a.name}</strong><small>{subtitle(a)} {mask(a)}</small></span>
    <b>{shown(show, money(a.balance, a.currency))}</b>
  </button>;
}

export default function Wallet({ c }) {
  const { prefs, setPref, show, setShow, stats, accountsByType, walletFilter, setWalletFilter, accountsView, refDate, selectedCard, setSelectedCardId, txs, go, openForm, sheet, setSheet } = c;
  const scroller = useRef(null);
  const list = walletFilter === 'All' ? accountsView : accountsView.filter(a => a.account_type === typeOf[walletFilter]);
  const total = stats.balance || 1;
  const cards = accountsByType.card;
  const cardTx = selectedCard ? txs.filter(t => t.account_id === selectedCard.id || t.transfer_to_account_id === selectedCard.id).slice(0, 4) : [];
  const recent = txs.slice(0, 3);
  const onScroll = () => {
    const el = scroller.current; if (!el || !cards.length) return;
    const idx = Math.round(el.scrollLeft / (el.firstChild?.offsetWidth || 1));
    const next = cards[Math.min(Math.max(idx, 0), cards.length - 1)];
    if (next && next.id !== selectedCard?.id) setSelectedCardId(next.id);
  };
  const styleOf = (a) => prefs.cardStyles?.[a?.id] || '';
  const holder = c.user?.name;
  const pickStyle = (id) => { if (!selectedCard) return; const next = { ...(prefs.cardStyles || {}) }; if (id) next[selectedCard.id] = id; else delete next[selectedCard.id]; setPref('cardStyles', next); };
  const groups = [['Cards', accountsByType.card, 'card'], ['Bank Accounts', accountsByType.bank, 'bank'], ['E-Wallets', accountsByType.e_wallet, 'wallet']];

  return <>
    <RootHeader title="Wallet" subtitle="Your accounts, cards and balances." onSearch={() => c.setSheet({ name: 'search' })} onBell={() => go('Notifications')} onSettings={() => go('Settings')} unread={c.unread} />
    <Chips label="Filter wallet accounts" items={FILTERS} value={walletFilter} onChange={setWalletFilter} />

    {walletFilter === 'All' && <>
      <section className="card balance-card compact" aria-label="Total balance">
        <div className="balance-label">Total Balance <button type="button" className="plain-icon" aria-label={show ? 'Hide balances' : 'Show balances'} onClick={() => setShow(!show)}><Icon name="eye" size={16} /></button></div>
        <div className="balance-amount"><Money value={stats.balance} show={show} /></div>
        {c.deltas.balance != null && <span className="chip-good"><Icon name="arrowUp" size={12} /> +{c.deltas.balance}% vs last month</span>}
        <div className="balance-art"><Sparkline values={stats.trend} width={200} height={90} /></div>
      </section>
      <section className="mini-grid" aria-label="Balance by account type">
        {groups.map(([label, items, icon]) => {
          const sum = items.reduce((s, a) => s + a.balance, 0);
          return <button type="button" key={label} className="card mini-card" onClick={() => setWalletFilter(label)}>
            <span className={`tile tone-${icon === 'card' ? 'green' : icon === 'bank' ? 'blue' : 'teal'} small`}><Icon name={icon} size={17} /></span>
            <small>{label === 'Bank Accounts' ? 'Bank Accounts' : label}</small>
            <strong><Money value={sum} show={show} digits={0} /></strong>
            <em className="pct">{Math.round((sum / total) * 100)}%</em>
          </button>;
        })}
      </section>
      {cards.length > 0 && <>
        <SectionTitle action="See All" onAction={() => setWalletFilter('Cards')}>My Cards</SectionTitle>
        <div className="card-scroller mini" aria-label="Your cards">
          {cards.map(a => <button type="button" className="card-slide" key={a.id} aria-label={`Open ${a.name} card`} onClick={() => { setSelectedCardId(a.id); setWalletFilter('Cards'); }}><CardArt a={a} show={show} styleId={styleOf(a)} holder={holder} /></button>)}
        </div>
      </>}
      <SectionTitle>Quick Actions</SectionTitle>
      <section className="quick-actions">
        {[['card', 'Add Card', () => setSheet({ name: 'account', type: 'card' })], ['send', 'Record Transfer', () => openForm('transfer')], ['plus', 'Add Transaction', () => openForm('expense')], ['more', 'More', () => setSheet({ name: 'actions' })]].map(([icon, label, fn]) =>
          <button type="button" key={label} onClick={fn}><span><Icon name={icon} size={20} /></span>{label}</button>)}
      </section>
      <SectionTitle action="See All" onAction={() => go('Transactions')}>Recent Activity</SectionTitle>
      <section className="card list-card">{recent.map(t => <TransactionRow key={t.id} t={t} show={show} refDate={refDate} onOpen={c.openTx} />)}</section>
    </>}

    {walletFilter === 'Cards' && (cards.length ? <>
      <div className="card-scroller" ref={scroller} onScroll={onScroll} aria-label="Your cards">
        {cards.map(a => <div className="card-slide" key={a.id}><CardArt a={a} show={show} styleId={styleOf(a)} holder={holder} /></div>)}
      </div>
      <div className="dots" aria-hidden="true">{cards.map(a => <i key={a.id} className={a.id === selectedCard?.id ? 'on' : ''} />)}</div>
      <button type="button" className="style-button" onClick={() => setSheet({ name: 'cardStyle' })}><Icon name="palette" size={18} /> Card style</button>
      <section className="card action-strip">
        {[['info', 'View Details', () => setSheet({ name: 'cardDetails' })], ['lock', 'Block Card (Unavailable)', () => {}], ['sliders', 'Limits (Unavailable)', () => {}], ['more', 'More', () => setSheet({ name: 'actions' })]].map(([icon, label, fn]) => {
          const unavailable = label.includes('(Unavailable)');
          return <button type="button" key={label} onClick={fn} disabled={unavailable} aria-describedby={unavailable ? 'card-control-limitations' : undefined} title={unavailable ? 'MOVO records card activity but cannot control your actual card or issuer limits.' : undefined}><Icon name={icon} size={20} />{label}</button>;
        })}
      </section>
      <p id="card-control-limitations" className="fineprint">MOVO cannot block an actual card or change issuer limits. Use your bank or card issuer's app for those actions.</p>
      <button type="button" className="card balance-row" onClick={() => setSheet({ name: 'cards' })} aria-label="Switch card">
        <span><small>Available Balance</small><strong>{shown(show, money(selectedCard?.balance, selectedCard?.currency))}</strong></span><Icon name="chevron" size={18} />
      </button>
      <SectionTitle action="See All" onAction={() => go('Transactions')}>Recent Transactions</SectionTitle>
      <section className="card list-card">{cardTx.map(t => <TransactionRow key={t.id} t={t} show={show} refDate={refDate} onOpen={c.openTx} />)}{!cardTx.length && <p className="empty">No transactions for this card yet.</p>}</section>
    </> : <div className="card empty-card"><div className="empty-preview"><CardArt preview show a={{ id: 'sample-card', name: 'Your Bank', institution_name: 'Visa', mask: '1234', balance: 0, currency: 'PHP' }} holder={holder} /></div><h3>No cards yet</h3><p>Add a card, then dress it with any of 270+ stickers.</p><button type="button" className="primary-button" onClick={() => setSheet({ name: 'account', type: 'card' })}>Add card</button></div>)}

    {(walletFilter === 'Bank Accounts' || walletFilter === 'E-Wallets') && <>
      <SectionTitle>{walletFilter}</SectionTitle>
      <section className="account-list">{list.map(a => <AccountRow key={a.id} a={a} show={show} onClick={() => { setSelectedCardId(a.id); setSheet({ name: 'cardDetails', id: a.id }); }} />)}</section>
      {!list.length && <div className="card empty-card"><Icon name={walletFilter === 'Bank Accounts' ? 'bank' : 'wallet'} size={28} /><h3>No {walletFilter.toLowerCase()} yet</h3><p>Add an account to start organizing your finances.</p><button type="button" className="primary-button" onClick={() => setSheet({ name: 'account', type: walletFilter === 'Bank Accounts' ? 'bank' : 'e_wallet' })}>Add account</button></div>}
    </>}

    {sheet?.name === 'cardStyle' && selectedCard && <CardStyleSheet account={selectedCard} show={show} holder={holder} current={styleOf(selectedCard)} onPick={pickStyle} onClose={() => setSheet(null)} />}

    {sheet?.name === 'cards' && <Sheet title="Your Cards" onClose={() => setSheet(null)}>
      <div className="sheet-list">{cards.map(a => <button type="button" key={a.id} className={`sheet-card${a.id === selectedCard?.id ? ' selected' : ''}`} onClick={() => { setSelectedCardId(a.id); setSheet(null); }}>
        <Tile name={a.name} size={46} radius={13} /><span className="account-main"><strong>{a.name}</strong><small>{mask(a)}</small></span><b>{shown(show, money(a.balance, a.currency))}</b>{a.id === selectedCard?.id && <Icon name="check" size={18} />}
      </button>)}</div>
      <button type="button" className="manage-button" onClick={() => setSheet({ name: 'account', type: 'card' })}><Icon name="card" size={18} /> Manage Cards</button>
    </Sheet>}
  </>;
}
