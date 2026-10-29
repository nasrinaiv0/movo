import React, { useRef, useState } from 'react';
import Icon from '../components/Icon';
import CardArt from '../components/CardArt';
import CardStyleSheet from '../components/CardStyleSheet';
import { RootHeader, Chips, SectionTitle, Sparkline, Tile, TransactionRow, Sheet, Money } from '../components/ui';
import AccountTile, { styleFor } from '../components/AccountTile';
import EditableBoxes from '../components/EditableBoxes';
import { money, shown } from '../lib/format';

const FILTERS = ['All', 'Cards', 'Bank Accounts', 'E-Wallets', 'Cash & Other'];
const typeOf = { Cards: ['card'], 'Bank Accounts': ['bank'], 'E-Wallets': ['e_wallet'], 'Cash & Other': ['cash', 'investment', 'other'] };
const SORTS = [['balance-desc', 'Highest balance'], ['balance-asc', 'Lowest balance'], ['name', 'Name (A–Z)'], ['type', 'Account type']];
const VIEWS = [['list', 'rows', 'List'], ['tiles', 'card', 'Tiles'], ['grid', 'grid', 'Grid']];
const FORMATS = [['card', 'Bank card'], ['tile', 'Account tile']];
export const WALLET_VIEW = { view: 'tiles', sort: 'balance-desc', cardFormat: 'card' };
const sorters = { 'balance-desc': (a, b) => b.balance - a.balance, 'balance-asc': (a, b) => a.balance - b.balance, name: (a, b) => a.name.localeCompare(b.name), type: (a, b) => a.account_type.localeCompare(b.account_type) || a.name.localeCompare(b.name) };
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
  const [editing, setEditing] = useState(false);
  const wv = { ...WALLET_VIEW, ...(prefs.walletView || {}) };
  const setWv = (patch) => setPref('walletView', { ...wv, ...patch });
  const live = accountsView.filter(a => !a.is_archived);
  const sorted = [...live].sort(sorters[wv.sort] || sorters['balance-desc']);
  const list = walletFilter === 'All' ? sorted : sorted.filter(a => (typeOf[walletFilter] || []).includes(a.account_type));
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
  const openAccount = (a) => { setSelectedCardId(a.id); setSheet({ name: 'cardDetails', id: a.id }); };
  const cardVisual = (a) => (wv.cardFormat === 'tile' ? <AccountTile a={a} show={show} style={styleFor(a, prefs.accountStyles)} size="preview" /> : <CardArt a={a} show={show} styleId={styleOf(a)} holder={holder} />);
  const renderAccounts = (items) => (wv.view === 'list'
    ? <section className="account-list">{items.map(a => <AccountRow key={a.id} a={a} show={show} onClick={() => openAccount(a)} />)}</section>
    : <section className={`account-tiles at-${wv.view}`}>{items.map(a => <AccountTile key={a.id} a={a} show={show} style={styleFor(a, prefs.accountStyles)} size={wv.view === 'grid' ? 'grid' : 'tile'} onClick={() => openAccount(a)} />)}</section>);
  const actions = [['plus', 'Add Transaction', () => openForm('expense')], ['transfer', 'Record Transfer', () => openForm('transfer')], ['card', 'Add Card', () => setSheet({ name: 'account', type: 'card' })], c.openScanner ? ['scan', 'Scan Receipt', c.openScanner] : ['bank', 'Add Account', () => setSheet({ name: 'account', type: 'bank' })]];

  const boxes = [
    { id: 'balance', label: 'Total balance', node: <section className="card balance-card compact" aria-label="Total balance">
      <div className="balance-label">Total Balance <button type="button" className="plain-icon" aria-label={show ? 'Hide balances' : 'Show balances'} onClick={() => setShow(!show)}><Icon name="eye" size={16} /></button></div>
      <div className="balance-amount"><Money value={stats.balance} show={show} /></div>
      {c.deltas.balance != null && <span className="chip-good"><Icon name="arrowUp" size={12} /> +{c.deltas.balance}% vs last month</span>}
      <div className="balance-art"><Sparkline values={stats.trend} width={200} height={90} /></div>
    </section> },
    { id: 'actions', label: 'Quick actions', node: <section aria-label="Quick actions">
      <SectionTitle action="More" onAction={() => setSheet({ name: 'actions' })}>Quick Actions</SectionTitle>
      <div className="qa-grid">{actions.map(([icon, label, fn]) => <button type="button" key={label} className="qa-button" onClick={fn}><span className="qa-icon"><Icon name={icon} size={20} strokeWidth={2} /></span>{label}</button>)}</div>
    </section> },
    { id: 'types', label: 'Balance by type', node: <section className="mini-grid" aria-label="Balance by account type">
      {groups.map(([label, items, icon]) => {
        const sum = items.reduce((s, a) => s + (c.toBase ? c.toBase(a.balance, a.currency) : a.balance), 0);
        return <button type="button" key={label} className="card mini-card" onClick={() => setWalletFilter(label)}>
          <span className="mini-head"><span className={`tile tone-${icon === 'card' ? 'green' : icon === 'bank' ? 'blue' : 'teal'} small`}><Icon name={icon} size={14} /></span><small>{label}</small></span>
          <strong className={sum < 0 ? 'neg' : ''}><Money value={sum} show={show} digits={0} /></strong>
          {sum > 0 && total > 0 && <em className="pct">{Math.round((sum / total) * 100)}%</em>}{sum < 0 && <em className="pct owed">Owed</em>}
        </button>;
      })}
    </section> },
    { id: 'cards', label: 'My cards', node: cards.length > 0 && <section aria-label="My cards">
      <SectionTitle action="See All" onAction={() => setWalletFilter('Cards')}>My Cards</SectionTitle>
      <div className="card-scroller mini" aria-label="Your cards">
        {cards.map(a => <button type="button" className="card-slide" key={a.id} aria-label={`Open ${a.name} card`} onClick={() => { setSelectedCardId(a.id); setWalletFilter('Cards'); }}>{cardVisual(a)}</button>)}
      </div>
    </section> },
    { id: 'accounts', label: 'Accounts', node: <section aria-label="Accounts">
      <SectionTitle>Accounts</SectionTitle>
      {list.filter(a => a.account_type !== 'card').length ? renderAccounts(list.filter(a => a.account_type !== 'card')) : <p className="empty">No bank, e-wallet or cash accounts yet.</p>}
    </section> },
    { id: 'recent', label: 'Recent activity', node: <section aria-label="Recent activity">
      <SectionTitle action="See All" onAction={() => go('Transactions')}>Recent Activity</SectionTitle>
      <div className="card list-card">{recent.map(t => <TransactionRow key={t.id} t={t} show={show} refDate={refDate} onOpen={c.openTx} />)}</div>
    </section> },
  ];

  return <>
    <RootHeader title="Wallet" subtitle="Your accounts, cards and balances." onSearch={c.openSearch} onBell={() => go('Notifications')} onSettings={() => go('Settings')} unread={c.unread} />
    <Chips label="Filter wallet accounts" items={FILTERS} value={walletFilter} onChange={setWalletFilter} />
    <div className="wallet-tools" role="toolbar" aria-label="Wallet view">
      <button type="button" className="tool-pill" onClick={() => setSheet({ name: 'walletView' })} aria-label="Sort and view options"><Icon name="sort" size={15} />{SORTS.find(x => x[0] === wv.sort)?.[1]}</button>
      <div className="tool-seg" role="group" aria-label="Layout">{VIEWS.map(([key, icon, label]) => <button type="button" key={key} aria-pressed={wv.view === key} aria-label={`${label} view`} onClick={() => setWv({ view: key })}><Icon name={icon} size={16} /></button>)}</div>
      {walletFilter === 'All' && <button type="button" className="tool-pill icon" onClick={() => setEditing(v => !v)} aria-pressed={editing} aria-label="Customize wallet"><Icon name="edit" size={15} /></button>}
    </div>

    {walletFilter === 'All' && <EditableBoxes title="Wallet" boxes={boxes} layout={prefs.layouts?.wallet} editing={editing} onDone={() => setEditing(false)} onChange={(l) => setPref('layouts', { ...(prefs.layouts || {}), wallet: l })} />}

    {walletFilter === 'Cards' && (cards.length ? <>
      <div className="card-scroller" ref={scroller} onScroll={onScroll} aria-label="Your cards">
        {cards.map(a => <div className="card-slide" key={a.id}>{cardVisual(a)}</div>)}
      </div>
      <div className="dots" aria-hidden="true">{cards.map(a => <i key={a.id} className={a.id === selectedCard?.id ? 'on' : ''} />)}</div>
      {wv.cardFormat === 'card' ? <button type="button" className="style-button" onClick={() => setSheet({ name: 'cardStyle' })}><Icon name="palette" size={18} /> Card style</button> : <button type="button" className="style-button" onClick={() => c.openEditAccount?.(selectedCard)}><Icon name="palette" size={18} /> Account style</button>}
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

    {(walletFilter === 'Bank Accounts' || walletFilter === 'E-Wallets' || walletFilter === 'Cash & Other') && <>
      <SectionTitle>{walletFilter}</SectionTitle>
      {list.length > 0 && renderAccounts(list)}
      {!list.length && <div className="card empty-card"><Icon name={walletFilter === 'Bank Accounts' ? 'bank' : 'wallet'} size={28} /><h3>No {walletFilter.toLowerCase()} yet</h3><p>Add an account to start organizing your finances.</p><button type="button" className="primary-button" onClick={() => setSheet({ name: 'account', type: walletFilter === 'Bank Accounts' ? 'bank' : walletFilter === 'E-Wallets' ? 'e_wallet' : 'cash' })}>Add account</button></div>}
    </>}

    {sheet?.name === 'walletView' && <Sheet title="Sort & view" subtitle="Choose how accounts and cards appear in your wallet." onClose={() => setSheet(null)} label="Sort and view">
      <p className="mini-title">Sort accounts by</p>
      <div className="sheet-list">{SORTS.map(([key, label]) => <button type="button" key={key} className={`sheet-card${wv.sort === key ? ' selected' : ''}`} aria-pressed={wv.sort === key} onClick={() => setWv({ sort: key })}><span className="account-main"><strong>{label}</strong></span>{wv.sort === key && <Icon name="check" size={18} />}</button>)}</div>
      <p className="mini-title">Layout</p>
      <div className="seg-control">{VIEWS.map(([key, , label]) => <button type="button" key={key} className={wv.view === key ? 'selected' : ''} aria-pressed={wv.view === key} onClick={() => setWv({ view: key })}>{label}</button>)}</div>
      <p className="mini-title">Card format</p>
      <div className="format-pick">{FORMATS.map(([key, label]) => <button type="button" key={key} className={wv.cardFormat === key ? 'selected' : ''} aria-pressed={wv.cardFormat === key} onClick={() => setWv({ cardFormat: key })}>
        {key === 'card' ? <CardArt a={{ id: 'fmt', name: 'Your Bank', institution_name: 'Visa', mask: '1234', balance: 12500, currency: 'PHP' }} show={show} styleId="" /> : <AccountTile a={{ name: 'Your Bank', account_type: 'card', balance: 12500, currency: 'PHP' }} show={show} size="preview" />}<span>{label}</span></button>)}</div>
    </Sheet>}

    {sheet?.name === 'cardStyle' && selectedCard && <CardStyleSheet account={selectedCard} show={show} holder={holder} current={styleOf(selectedCard)} onPick={pickStyle} onClose={() => setSheet(null)} />}

    {sheet?.name === 'cards' && <Sheet title="Your Cards" onClose={() => setSheet(null)}>
      <div className="sheet-list">{cards.map(a => <button type="button" key={a.id} className={`sheet-card${a.id === selectedCard?.id ? ' selected' : ''}`} onClick={() => { setSelectedCardId(a.id); setSheet(null); }}>
        <Tile name={a.name} size={46} radius={13} /><span className="account-main"><strong>{a.name}</strong><small>{mask(a)}</small></span><b>{shown(show, money(a.balance, a.currency))}</b>{a.id === selectedCard?.id && <Icon name="check" size={18} />}
      </button>)}</div>
      <button type="button" className="manage-button" onClick={() => setSheet({ name: 'account', type: 'card' })}><Icon name="card" size={18} /> Manage Cards</button>
    </Sheet>}
  </>;
}
