import React, { useRef, useState } from 'react';
import Icon from '../components/Icon';
import CardArt from '../components/CardArt';
import CardStyleSheet from '../components/CardStyleSheet';
import { RootHeader, Chips, SectionTitle, Sparkline, MiniBars, Tile, TransactionRow, Sheet, Money, Trend } from '../components/ui';
import AccountTile, { styleFor } from '../components/AccountTile';
import EditableBoxes from '../components/EditableBoxes';
import { money, shown } from '../lib/format';
import { t as tr } from '../lib/i18n';

const FILTERS = ['All', 'Cards', 'Bank Accounts', 'E-Wallets', 'Cash & Other'];
const typeOf = { Cards: ['card'], 'Bank Accounts': ['bank'], 'E-Wallets': ['e_wallet'], 'Cash & Other': ['cash', 'investment', 'other'] };
const ADD_TYPE = { Cards: 'card', 'Bank Accounts': 'bank', 'E-Wallets': 'e_wallet', 'Cash & Other': 'cash' };
const ADD_CHOICES = [['card', 'card', 'Card', 'Credit or debit card'], ['bank', 'bank', 'Bank account', 'Savings or checking'], ['e_wallet', 'wallet', 'E-wallet', 'GCash, Maya and others'], ['cash', 'coin', 'Cash & other', 'Cash, investments and more']];
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
    <span className="account-main"><strong>{a.name}</strong><small>{tr(subtitle(a))} {mask(a)}</small></span>
    <b>{shown(show, money(a.balance, a.currency))}</b>
  </button>;
}

const BALANCE_STYLES = [['line', 'Line'], ['bars', 'Bars'], ['off', 'Off']];

export default function Wallet({ c }) {
  const { prefs, setPref, show, setShow, stats, accountsByType, walletFilter, setWalletFilter, accountsView, refDate, selectedCard, setSelectedCardId, txs, go, openForm, sheet, setSheet } = c;
  const scroller = useRef(null);
  const [editing, setEditing] = useState(false);
  const [addAmount, setAddAmount] = useState(null);
  const [addPick, setAddPick] = useState(false);
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
  const displayModeOf = (a) => prefs.cardDisplayModes?.[a?.id] || 'details';
  const fieldsOf = (a) => ({ accountName: true, cardNumber: true, holderName: true, balance: true, ...(prefs.cardDisplayFields?.[a?.id] || {}) });
  const updateCardPreference = (key, value) => { if (!selectedCard) return; setPref(key, { ...(prefs[key] || {}), [selectedCard.id]: value }); };
  const holder = c.user?.name;
  const pickStyle = (id) => { if (!selectedCard) return; const next = { ...(prefs.cardStyles || {}) }; if (id) next[selectedCard.id] = id; else delete next[selectedCard.id]; setPref('cardStyles', next); };
  const groups = [['Cards', accountsByType.card, 'card'], ['Bank Accounts', accountsByType.bank, 'bank'], ['E-Wallets', accountsByType.e_wallet, 'wallet']];
  // Selecting an account/card should reveal the card display first. Details and editing are explicit follow-up actions.
  const openAccount = (a) => { setSelectedCardId(a.id); if (a.account_type === 'card') { setSheet(null); setWalletFilter('Cards'); return; } setSheet({ name: 'cardDetails', id: a.id }); };
  // Keyed by style so a new look eases in when the card is edited.
  const cardVisual = (a) => (wv.cardFormat === 'tile' ? <AccountTile key={`${a.id}:${styleFor(a, prefs.accountStyles).color}:${styleFor(a, prefs.accountStyles).icon}`} a={a} show={show} style={styleFor(a, prefs.accountStyles)} size="preview" /> : <CardArt key={`${a.id}:${styleOf(a)}:${displayModeOf(a)}`} a={a} show={show} styleId={styleOf(a)} holder={holder} displayMode={displayModeOf(a)} visibleFields={fieldsOf(a)} cardNetwork={prefs.cardNetworks?.[a.id] || a.cardNetwork || ''} />);
  const renderAccounts = (items) => (wv.view === 'list'
    ? <section className="account-list">{items.map(a => <AccountRow key={a.id} a={a} show={show} onClick={() => openAccount(a)} />)}</section>
    : <section className={`account-tiles at-${wv.view}`}>{items.map(a => <AccountTile key={a.id} a={a} show={show} style={styleFor(a, prefs.accountStyles)} size={wv.view === 'grid' ? 'grid' : 'tile'} onClick={() => openAccount(a)} />)}</section>);
  const actions = [['plus', 'Add Transaction', () => openForm('expense')], ['transfer', 'Record Transfer', () => openForm('transfer')], ['card', 'Add Card', () => setSheet({ name: 'account', type: 'card' })], c.openScanner ? ['scan', 'Scan Receipt', c.openScanner] : ['bank', 'Add Account', () => setSheet({ name: 'account', type: 'bank' })]];

  const boxes = [
    { id: 'balance', label: tr('Total balance'), styles: BALANCE_STYLES, node: ({ size, style }) => <section className={`card balance-card compact size-${size}`} aria-label={tr('Total balance')}>
      <div className="balance-label">{tr('Total Balance')} <button type="button" className="plain-icon" aria-label={show ? tr('Hide balances') : tr('Show balances')} onClick={() => setShow(!show)}><Icon name="eye" size={16} /></button></div>
      <div className="balance-amount"><Money value={stats.balance} show={show} /></div>
      <Trend value={c.deltas.balance} chip />
      {style !== 'off' && <div className="balance-art">{style === 'bars' ? <MiniBars values={stats.trend} width={200} height={90} /> : <Sparkline values={stats.trend} width={200} height={90} />}</div>}
    </section> },
    { id: 'actions', sizes: ['M'], label: tr('Quick actions'), node: <section aria-label={tr('Quick actions')}>
      <SectionTitle action={tr('More')} onAction={() => setSheet({ name: 'actions' })}>{tr('Quick Actions')}</SectionTitle>
      <div className="qa-grid">{actions.map(([icon, label, fn]) => <button type="button" key={label} className="qa-button" onClick={fn}><span className="qa-icon"><Icon name={icon} size={20} strokeWidth={2} /></span>{tr(label)}</button>)}</div>
    </section> },
    { id: 'types', sizes: ['M'], label: tr('Balance by type'), node: <section className="mini-grid" aria-label={tr('Balance by account type')}>
      {groups.map(([label, items, icon]) => {
        const sum = items.reduce((s, a) => s + (c.toBase ? c.toBase(a.balance, a.currency) : a.balance), 0);
        return <button type="button" key={label} className="card mini-card" onClick={() => setWalletFilter(label)}>
          <span className="mini-head"><span className={`tile tone-${icon === 'card' ? 'green' : icon === 'bank' ? 'blue' : 'teal'} small`}><Icon name={icon} size={14} /></span><small>{tr(label === 'Bank Accounts' ? tr('Banks') : label)}</small></span>
          <strong className={sum < 0 ? 'neg' : ''}><Money value={sum} show={show} digits={0} /></strong>
          {sum > 0 && total > 0 && <em className="pct">{Math.round((sum / total) * 100)}%</em>}{sum < 0 && <em className="pct owed">{tr('Owed')}</em>}
        </button>;
      })}
    </section> },
    { id: 'cards', sizes: ['M'], label: tr('My cards'), node: cards.length > 0 && <section aria-label={tr('My cards')}>
      <SectionTitle action={tr('See All')} onAction={() => setWalletFilter('Cards')}>{tr('My Cards')}</SectionTitle>
      <div className="card-scroller mini" aria-label={tr('Your cards')}>
        {cards.map(a => <button type="button" className="card-slide" key={a.id} aria-label={tr('Open {name} card', { name: a.name })} onClick={() => { setSelectedCardId(a.id); setWalletFilter('Cards'); }}>{cardVisual(a)}</button>)}
      </div>
    </section> },
    { id: 'accounts', sizes: ['M'], label: tr('Accounts'), node: <section aria-label={tr('Accounts')}>
      <SectionTitle>{tr('Accounts')}</SectionTitle>
      {list.filter(a => a.account_type !== 'card').length ? renderAccounts(list.filter(a => a.account_type !== 'card')) : <p className="empty">{tr('No bank, e-wallet or cash accounts yet.')}</p>}
    </section> },
    { id: 'recent', label: tr('Recent activity'), node: ({ size }) => <section aria-label={tr('Recent activity')}>
      <SectionTitle action={tr('See All')} onAction={() => go('Transactions')}>{tr('Recent Activity')}</SectionTitle>
      <div className="card list-card">{(size === 'M' ? recent : txs.slice(0, size === 'S' ? 2 : 8)).map(t => <TransactionRow key={t.id} t={t} show={show} refDate={refDate} onOpen={c.openTx} />)}</div>
    </section> },
  ];

  return <>
    <RootHeader title={tr('Wallet')} subtitle={tr('Your accounts, cards and balances.')} onSearch={c.openSearch} onBell={() => go('Notifications')} onSettings={() => go('Settings')} unread={c.unread} />
    <Chips label={tr('Filter wallet accounts')} items={FILTERS.map(key => ({ key, label: tr(key) }))} value={walletFilter} onChange={setWalletFilter} />
    <div className="wallet-tools" role="toolbar" aria-label={tr('Wallet view')}>
      <button type="button" className="tool-pill" onClick={() => setSheet({ name: 'walletView' })} aria-label={tr('Sort and view options')}><Icon name="sort" size={15} />{tr(SORTS.find(x => x[0] === wv.sort)?.[1] || '')}</button>
      <div className="tool-seg" role="group" aria-label={tr('Layout')}>{VIEWS.map(([key, icon, label]) => <button type="button" key={key} aria-pressed={wv.view === key} aria-label={tr('{name} view', { name: tr(label) })} onClick={() => setWv({ view: key })}><Icon name={icon} size={16} /></button>)}</div>
      {walletFilter === 'All' && <button type="button" className="tool-pill icon" onClick={() => setEditing(v => !v)} aria-pressed={editing} aria-label={tr('Customize wallet')}><Icon name="edit" size={15} /></button>}
      <button type="button" className="tool-pill icon" onClick={() => (ADD_TYPE[walletFilter] ? setSheet({ name: 'account', type: ADD_TYPE[walletFilter] }) : setAddPick(true))} aria-label={tr('New account')} title={tr('New account')}><Icon name="plus" size={16} /></button>
    </div>

    {walletFilter === 'All' && <EditableBoxes title={tr('Wallet')} boxes={boxes} layout={prefs.layouts?.wallet} editing={editing} onEdit={() => setEditing(true)} onDone={() => setEditing(false)} onChange={(l) => setPref('layouts', { ...(prefs.layouts || {}), wallet: l })} />}

    {walletFilter === 'Cards' && (cards.length ? <>
      <div className="card-scroller" ref={scroller} onScroll={onScroll} aria-label={tr('Your cards')}>
        {cards.map(a => <div className="card-slide" key={a.id}>{cardVisual(a)}</div>)}
      </div>
      <div className="dots" aria-hidden="true">{cards.map(a => <i key={a.id} className={a.id === selectedCard?.id ? 'on' : ''} />)}</div>
      <button type="button" className="style-button" onClick={() => { if (wv.cardFormat !== 'card') setWv({ cardFormat: 'card' }); setSheet({ name: 'cardStyle' }); }}><Icon name="palette" size={18} /> {tr('Card style')}</button>
      <section className="card action-strip">
        {[['info', 'View Details', () => setSheet({ name: 'cardDetails' })], ['plus', 'Add amount', () => setAddAmount(selectedCard)], ['sliders', 'Limits', () => c.openBudgets?.('budgets')], ['more', 'More', () => setSheet({ name: 'actions' })]].map(([icon, label, fn]) =>
          <button type="button" key={label} onClick={fn}><Icon name={icon} size={20} />{tr(label)}</button>)}
      </section>
      <button type="button" className="card balance-row" onClick={() => setSheet({ name: 'cards' })} aria-label={tr('Switch card')}>
        <span><small>{tr('Available Balance')}</small><strong>{shown(show, money(selectedCard?.balance, selectedCard?.currency))}</strong></span><Icon name="chevron" size={18} />
      </button>
      <SectionTitle action={tr('See All')} onAction={() => go('Transactions')}>{tr('Recent Transactions')}</SectionTitle>
      <section className="card list-card">{cardTx.map(t => <TransactionRow key={t.id} t={t} show={show} refDate={refDate} onOpen={c.openTx} />)}{!cardTx.length && <p className="empty">{tr('No transactions for this card yet.')}</p>}</section>
    </> : <div className="card empty-card"><div className="empty-preview"><CardArt preview show a={{ id: 'sample-card', name: 'Your Bank', institution_name: 'Visa', mask: '1234', balance: 0, currency: 'PHP' }} holder={holder} /></div><h3>{tr('No cards yet')}</h3><p>{tr('Add a card, then dress it with any of 270+ stickers.')}</p><button type="button" className="primary-button" onClick={() => setSheet({ name: 'account', type: 'card' })}>{tr('Add card')}</button></div>)}

    {(walletFilter === 'Bank Accounts' || walletFilter === 'E-Wallets' || walletFilter === 'Cash & Other') && <>
      <SectionTitle>{walletFilter}</SectionTitle>
      {list.length > 0 && renderAccounts(list)}
      {!list.length && <div className="card empty-card"><Icon name={walletFilter === 'Bank Accounts' ? 'bank' : 'wallet'} size={28} /><h3>{tr(`No ${walletFilter.toLowerCase()} yet`)}</h3><p>{tr('Add an account to start organizing your finances.')}</p><button type="button" className="primary-button" onClick={() => setSheet({ name: 'account', type: walletFilter === 'Bank Accounts' ? 'bank' : walletFilter === 'E-Wallets' ? 'e_wallet' : 'cash' })}>{tr('Add account')}</button></div>}
    </>}

    {sheet?.name === 'walletView' && <Sheet title={tr('Sort & view')} subtitle={tr('Choose how accounts and cards appear in your wallet.')} onClose={() => setSheet(null)} label={tr('Sort and view')}>
      <p className="mini-title">{tr('Sort accounts by')}</p>
      <div className="sheet-list">{SORTS.map(([key, label]) => <button type="button" key={key} className={`sheet-card${wv.sort === key ? ' selected' : ''}`} aria-pressed={wv.sort === key} onClick={() => setWv({ sort: key })}><span className="account-main"><strong>{tr(label)}</strong></span>{wv.sort === key && <Icon name="check" size={18} />}</button>)}</div>
      <p className="mini-title">{tr('Layout')}</p>
      <div className="seg-control">{VIEWS.map(([key, , label]) => <button type="button" key={key} className={wv.view === key ? 'selected' : ''} aria-pressed={wv.view === key} onClick={() => setWv({ view: key })}>{tr(label)}</button>)}</div>
      <p className="mini-title">{tr('Card format')}</p>
      <div className="format-pick">{FORMATS.map(([key, label]) => <button type="button" key={key} className={wv.cardFormat === key ? 'selected' : ''} aria-pressed={wv.cardFormat === key} onClick={() => setWv({ cardFormat: key })}>
        {key === 'card' ? <CardArt a={{ id: 'fmt', name: 'Your Bank', institution_name: 'Visa', mask: '1234', balance: 12500, currency: 'PHP' }} show={show} styleId="" /> : <AccountTile a={{ name: 'Your Bank', account_type: 'card', balance: 12500, currency: 'PHP' }} show={show} size="preview" />}<span>{label}</span></button>)}</div>
    </Sheet>}

    {sheet?.name === 'cardStyle' && selectedCard && <CardStyleSheet account={selectedCard} show={show} holder={holder} current={styleOf(selectedCard)} onPick={pickStyle} onClose={() => setSheet(null)} />}

    {sheet?.name === 'cards' && <Sheet title={tr('Your Cards')} onClose={() => setSheet(null)}>
      <div className="sheet-list">{cards.map(a => <button type="button" key={a.id} className={`sheet-card${a.id === selectedCard?.id ? ' selected' : ''}`} onClick={() => { setSelectedCardId(a.id); setSheet(null); }}>
        <Tile name={a.name} size={46} radius={13} /><span className="account-main"><strong>{a.name}</strong><small>{mask(a)}</small></span><b>{shown(show, money(a.balance, a.currency))}</b>{a.id === selectedCard?.id && <Icon name="check" size={18} />}
      </button>)}</div>
      <button type="button" className="manage-button" onClick={() => setSheet({ name: 'account', type: 'card' })}><Icon name="card" size={18} /> {tr('Manage Cards')}</button>
    </Sheet>}
    {addAmount && <Sheet title={tr('Add amount')} subtitle={tr('Record money coming into {name}.', { name: addAmount.name })} onClose={() => setAddAmount(null)} label={tr('Add amount')}>
      <div className="sheet-list">
        <button type="button" className="sheet-card" onClick={() => { const id = addAmount.id; setAddAmount(null); c.openTransferTo(id); }}><Tile icon="transfer" tone="blue" size={42} radius={13} /><span className="account-main"><strong>{tr('Transfer')}</strong><small>{tr('Moved in from another of your accounts')}</small></span><Icon name="chevron" size={16} /></button>
        <button type="button" className="sheet-card" onClick={() => { const id = addAmount.id; setAddAmount(null); openForm('income', id); }}><Tile icon="edit" tone="green" size={42} radius={13} /><span className="account-main"><strong>{tr('Manual')}</strong><small>{tr('Cash deposit, salary, refund or any top-up')}</small></span><Icon name="chevron" size={16} /></button>
      </div>
      <p className="fineprint">{tr('MOVO records the amount; it does not move real money.')}</p>
    </Sheet>}
    {addPick && <Sheet title={tr('New account')} onClose={() => setAddPick(false)} label={tr('New account')}>
      <div className="sheet-list">{ADD_CHOICES.map(([type, icon, title, sub]) => <button type="button" key={type} className="sheet-card" onClick={() => { setAddPick(false); setSheet({ name: 'account', type }); }}><Tile icon={icon} tone="blue" size={42} radius={13} /><span className="account-main"><strong>{tr(title)}</strong><small>{tr(sub)}</small></span><Icon name="chevron" size={16} /></button>)}</div>
    </Sheet>}
  </>;
}
