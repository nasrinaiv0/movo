import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const STORAGE = {
  transactions: 'movo.phase1.transactions.v1',
  theme: 'movo.phase1.theme.v1',
  accent: 'movo.phase1.accent.v1',
  balanceVisible: 'movo.phase1.balanceVisible.v1',
};

const seedTransactions = [
  { id: 'demo-1', merchant: 'SM Supermarket', category: 'Groceries', amount: 1250, type: 'expense', account: 'Metrobank Visa', date: '2026-10-28T10:24:00+08:00', source: 'Sample' },
  { id: 'demo-2', merchant: 'Grab', category: 'Transport', amount: 320, type: 'expense', account: 'Apple Pay', date: '2026-10-28T08:12:00+08:00', source: 'Sample' },
  { id: 'demo-3', merchant: 'Salary', category: 'Income', amount: 50000, type: 'income', account: 'Bank transfer', date: '2026-10-26T09:00:00+08:00', source: 'Sample' },
  { id: 'demo-4', merchant: 'Netflix', category: 'Subscriptions', amount: 549, type: 'expense', account: 'Visa •••• 2829', date: '2026-10-25T16:20:00+08:00', source: 'Sample' },
];

const money = (value) => new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(value) || 0);

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function Icon({ name, size = 22, strokeWidth = 1.8, className = '' }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18"/><path d="M16 14h2"/></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"/></>,
    transactions: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    search: <><circle cx="10.8" cy="10.8" r="7"/><path d="m16 16 4.5 4.5"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1 1.8-1.8 3.1-2.1-.5a8 8 0 0 1-1.7 1l-.6 2.1h-3.6l-.6-2.1a8 8 0 0 1-1.7-1l-2.1.5-1.8-3.1 1.1-1.8a8 8 0 0 1 0-2l-1.1-1.8 1.8-3.1 2.1.5a8 8 0 0 1 1.7-1l.6-2.1h3.6l.6 2.1a8 8 0 0 1 1.7 1l2.1-.5 1.8 3.1-1.1 1.8a8 8 0 0 1-.1 2Z" transform="translate(-1 -1) scale(1.08)"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    up: <><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></>,
    down: <><path d="M12 5v14"/><path d="m18 13-6 6-6-6"/></>,
    bank: <><path d="m3 9 9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M2 18h20"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    spark: <><path d="m12 2 2.2 6.1L20 10l-5.8 2.1L12 18l-2.2-5.9L4 10l5.8-1.9L12 2Z"/><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    trash: <><path d="M3 6h18M8 6V4h8v2m-11 0 1 14h12l1-14M10 10v6M14 10v6"/></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>;
}

function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [dark, setDark] = useState(() => readStorage(STORAGE.theme, false));
  const [accent, setAccent] = useState(() => readStorage(STORAGE.accent, 'blue'));
  const [showBalance, setShowBalance] = useState(() => readStorage(STORAGE.balanceVisible, true));
  const [transactions, setTransactions] = useState(() => readStorage(STORAGE.transactions, seedTransactions));
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState('');
  const [period, setPeriod] = useState('This month');
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ merchant: '', amount: '', type: 'expense', category: 'Groceries', account: 'Manual entry', date: new Date().toISOString().slice(0, 10) });

  useEffect(() => { try { window.localStorage.setItem(STORAGE.transactions, JSON.stringify(transactions)); } catch { /* Storage can be disabled; the session still works. */ } }, [transactions]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE.theme, JSON.stringify(dark)); } catch {} }, [dark]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE.accent, JSON.stringify(accent)); } catch {} }, [accent]);
  useEffect(() => { try { window.localStorage.setItem(STORAGE.balanceVisible, JSON.stringify(showBalance)); } catch {} }, [showBalance]);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(''), 2600);
  };

  const filteredTransactions = useMemo(() => transactions
    .filter((t) => [t.merchant, t.category, t.account, t.type].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [transactions, search]);

  const totals = useMemo(() => {
    const now = new Date();
    const selected = transactions.filter((t) => {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) return false;
      if (period === 'This week') {
        const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        return d >= start && d <= now;
      }
      if (period === 'This year') return d.getFullYear() === now.getFullYear();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const income = selected.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = selected.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expenses, savings: income - expenses, totalBalance: transactions.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0), count: selected.length };
  }, [transactions, period]);

  const categories = useMemo(() => {
    const sums = {};
    transactions.filter((t) => t.type === 'expense').forEach((t) => { sums[t.category || 'Other'] = (sums[t.category || 'Other'] || 0) + Number(t.amount); });
    const entries = Object.entries(sums).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = entries.reduce((s, [, amount]) => s + amount, 0) || 1;
    const classes = ['food', 'shopping', 'bills', 'transport', 'other'];
    return entries.map(([name, amount], i) => ({ name, amount, percent: Math.round(amount / total * 100), tone: classes[i] }));
  }, [transactions]);

  const addTransaction = (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.merchant.trim() || !Number.isFinite(amount) || amount <= 0) {
      notify('Enter a merchant and an amount greater than zero.');
      return;
    }
    const next = {
      id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      merchant: form.merchant.trim().slice(0, 80),
      amount: Math.round(amount * 100) / 100,
      type: form.type,
      category: form.type === 'income' ? 'Income' : form.category,
      account: form.account.trim().slice(0, 60) || 'Manual entry',
      date: new Date(form.date + 'T12:00:00').toISOString(),
      source: 'Manual',
    };
    setTransactions((current) => [next, ...current]);
    setForm({ merchant: '', amount: '', type: 'expense', category: 'Groceries', account: 'Manual entry', date: new Date().toISOString().slice(0, 10) });
    setModalOpen(false);
    setActiveTab('Home');
    notify('Transaction saved on this device.');
  };

  const clearSampleData = () => {
    setTransactions((current) => current.filter((t) => t.source !== 'Sample'));
    setMenu('');
    notify('Sample transactions removed. Your manual records were kept.');
  };

  const nav = [
    { label: 'Home', icon: 'home' },
    { label: 'Wallet', icon: 'wallet' },
    { label: 'NasrinAI', icon: 'chat', center: true },
    { label: 'Transactions', icon: 'transactions' },
    { label: 'Profile', icon: 'profile' },
  ];

  return (
    <div className={`movo-app ${dark ? 'theme-dark' : ''} accent-${accent}`}>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-mark" aria-label="MOVO">m</div>
          <div className="topbar-right">
            {searchOpen && <input autoFocus className="top-search" placeholder="Search transactions…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search transactions" />}
            <button type="button" className={`icon-button ${searchOpen ? 'is-active' : ''}`} aria-label={searchOpen ? 'Close search' : 'Search'} onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setSearch(''); setMenu(''); }}><Icon name={searchOpen ? 'close' : 'search'} /></button>
            <div className="menu-wrap">
              <button type="button" className="icon-button notification-button" aria-label="Notifications" aria-expanded={menu === 'notifications'} onClick={() => setMenu(menu === 'notifications' ? '' : 'notifications')}><Icon name="bell" /><span className="notification-dot" /></button>
              {menu === 'notifications' && <div className="popover notification-popover" role="dialog" aria-label="Notifications"><strong>Activity summary</strong><p>{transactions.length ? `You have ${transactions.length} tracked records on this device.` : 'No transaction records yet. Add one to get started.'}</p><button type="button" onClick={() => { setMenu(''); setActiveTab('Transactions'); }}>View transactions <Icon name="arrow" size={16} /></button></div>}
            </div>
            <div className="menu-wrap">
              <button type="button" className="icon-button" aria-label="Settings and appearance" aria-expanded={menu === 'settings'} onClick={() => setMenu(menu === 'settings' ? '' : 'settings')}><Icon name="settings" /></button>
              {menu === 'settings' && <div className="popover theme-popover" role="dialog" aria-label="Quick settings"><strong>Appearance</strong><button type="button" onClick={() => setDark((v) => !v)}><span>{dark ? 'Switch to light mode' : 'Switch to dark mode'}</span><span className="theme-swatch">{dark ? '☼' : '☾'}</span></button><div className="accent-picker"><span>Accent color</span>{['blue', 'purple', 'orange', 'green', 'mono'].map((c) => <button type="button" key={c} className={`accent-dot dot-${c} ${accent === c ? 'selected' : ''}`} aria-label={c + ' accent'} aria-pressed={accent === c} onClick={() => setAccent(c)} />)}</div><button type="button" className="clear-demo-button" onClick={clearSampleData}>Remove sample transactions <Icon name="trash" size={15} /></button></div>}
            </div>
          </div>
        </header>

        <main>
          {activeTab === 'Home' ? <>
            <section className="greeting-row">
              <div><p className="eyebrow">{new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase()}</p><h1>Good morning, Nasrin <span className="sun" aria-hidden="true">☀️</span></h1><p className="subheading">A clearer view of your money.</p></div>
              <button type="button" className="avatar" aria-label="Open profile" onClick={() => setActiveTab('Profile')}>N</button>
            </section>

            <section className="balance-card" aria-label="Balance summary">
              <div className="balance-card-content">
                <div className="balance-label">Net tracked activity <button type="button" className="visibility-toggle" aria-label={showBalance ? 'Hide balances' : 'Show balances'} onClick={() => setShowBalance((v) => !v)}><Icon name="eye" size={18} /></button></div>
                <div className="balance-amount">{showBalance ? money(totals.totalBalance) : '₱ ••••••••'}</div>
                <div className="balance-change"><span className="change-icon"><Icon name="check" size={15} /></span><strong>{transactions.length} records</strong><span>stored on this device</span></div>
              </div>
              <div className="balance-art" aria-hidden="true"><div className="art-orb" /><svg viewBox="0 0 260 140" preserveAspectRatio="none"><path d="M0 112 C25 105 28 80 55 91 S90 63 111 75 S151 40 173 55 S215 16 260 8" /></svg><button type="button" aria-label="View wallet" onClick={() => setActiveTab('Wallet')}><Icon name="arrow" /></button></div>
              <div className="balance-foot"><span><span className="status-pulse" /> Local records only</span><button type="button" onClick={() => setActiveTab('Wallet')}>View wallet <Icon name="chevron" size={15} /></button></div>
            </section>

            <section className="stat-grid" aria-label="Financial summary">
              <article className="stat-card"><div className="stat-top"><span className="stat-icon income-icon"><Icon name="down" size={17} /></span><span className="stat-caption">Income</span></div><strong>{showBalance ? money(totals.income) : '••••••'}</strong><span className="stat-trend positive">Selected period</span></article>
              <article className="stat-card"><div className="stat-top"><span className="stat-icon expense-icon"><Icon name="up" size={17} /></span><span className="stat-caption">Expenses</span></div><strong>{showBalance ? money(totals.expenses) : '••••••'}</strong><span className="stat-trend negative">Selected period</span></article>
              <article className="stat-card"><div className="stat-top"><span className="stat-icon savings-icon"><Icon name="bank" size={17} /></span><span className="stat-caption">Net</span></div><strong>{showBalance ? money(totals.savings) : '••••••'}</strong><span className="stat-trend positive">Income − expenses</span></article>
            </section>

            <section className="section-block spending-section">
              <div className="section-heading"><div><p className="eyebrow">YOUR MONEY, IN FOCUS</p><h2>Spending overview</h2></div><button type="button" className="text-button" onClick={() => setActiveTab('Transactions')}>View records <Icon name="arrow" size={16} /></button></div>
              <div className="spending-card">
                <div className="spending-card-top"><div className="segmented-control" role="group" aria-label="Spending period">{['This week', 'This month', 'This year'].map((p) => <button type="button" key={p} className={period === p ? 'selected' : ''} aria-pressed={period === p} onClick={() => setPeriod(p)}>{p}</button>)}</div><button type="button" className="more-button" aria-label="Add transaction" onClick={() => setModalOpen(true)}><Icon name="plus" /></button></div>
                <div className="spending-content">
                  <div className="donut-wrap"><div className="donut" style={{ background: categories.length ? `conic-gradient(${categories.map((c, i, all) => { const colors = ['#6ca5ff', '#f5b54a', '#ff7788', '#a182ff', '#6ed7bd']; const start = all.slice(0, i).reduce((s, x) => s + x.percent, 0); return `${colors[i]} ${start}% ${start + c.percent}%`; }).join(', ')})` : 'conic-gradient(#c3c8d3 0 100%)' }}><div className="donut-center"><span>Total spent</span><strong>{showBalance ? money(totals.expenses) : '₱ •••••'}</strong><small>{period.toLowerCase()}</small></div></div></div>
                  <div className="category-list">{categories.length ? categories.map((c) => <div className="category-row" key={c.name}><span className={`category-dot ${c.tone}`} /><span className="category-name">{c.name}</span><div className="category-track"><span className={c.tone} style={{ width: `${c.percent}%` }} /></div><strong>{c.percent}%</strong></div>) : <p className="empty-state compact-empty">Add expenses to see categories.</p>}</div>
                </div>
                <div className="spending-footer"><span>{totals.count} records in {period.toLowerCase()}</span><button type="button" onClick={() => setModalOpen(true)}>Add a record <Icon name="chevron" size={15} /></button></div>
              </div>
            </section>

            <section className="section-block transactions-section">
              <div className="section-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent transactions</h2></div><button type="button" className="text-button" onClick={() => setActiveTab('Transactions')}>See all <Icon name="arrow" size={16} /></button></div>
              <div className="transaction-card">
                {filteredTransactions.slice(0, 5).map((t) => <button type="button" className="transaction-row" key={t.id} onClick={() => notify(`${t.merchant} · ${money(t.amount)} · ${t.source === 'Sample' ? 'sample record' : 'saved locally'}`)}>
                  <span className={`merchant-logo ${t.type === 'income' ? 'mint' : ['blue', 'green', 'black'][Math.abs(String(t.merchant).length) % 3]}`}>{t.type === 'income' ? '↗' : t.merchant.slice(0, 1).toUpperCase()}</span><span className="transaction-info"><strong>{t.merchant}</strong><small>{new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(t.date))} · {t.account} · {t.source === 'Sample' ? 'Sample' : 'Saved'}</small></span><span className={`transaction-amount ${t.type === 'income' ? 'amount-positive' : ''}`}>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</span><Icon name="chevron" size={16} /></button>)}
                {!filteredTransactions.length && <div className="empty-state">No records yet. Use “Add transaction” to get started.</div>}
              </div>
            </section>

            <section className="insight-banner"><span className="insight-icon"><Icon name="spark" size={22} /></span><div><strong>Ready to make it yours?</strong><p>Add a transaction to build your personal overview. Current records are saved in this browser only.</p></div><button type="button" aria-label="Add transaction" onClick={() => setModalOpen(true)}><Icon name="plus" /></button></section>
          </> : <section className="coming-panel"><div className="coming-icon"><Icon name={activeTab === 'Wallet' ? 'wallet' : activeTab === 'Transactions' ? 'transactions' : activeTab === 'Profile' ? 'profile' : 'chat'} size={30} /></div><p className="eyebrow">PHASE 1 · HOME MVP</p><h2>{activeTab === 'NasrinAI' ? 'Your financial copilot' : activeTab}</h2><p>{activeTab === 'Wallet' ? 'Wallet and connected account management are planned for the next phase. No bank or Apple Pay connection is active.' : activeTab === 'Transactions' ? 'Your locally saved transaction records are searchable here. Add a record from Home to get started.' : activeTab === 'Profile' ? 'Profile, security, and preferences will be added in a later phase. Your current records stay in this browser.' : 'AI chat and notification-reading integrations are not connected yet.'}</p>{activeTab === 'Transactions' && <><input className="panel-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved transactions" aria-label="Search saved transactions" />{filteredTransactions.map((t) => <div className="panel-transaction" key={t.id}><span>{t.merchant}<small>{t.category} · {t.account}</small></span><strong className={t.type === 'income' ? 'amount-positive' : ''}>{t.type === 'income' ? '+' : '−'}{money(t.amount)}</strong><button type="button" aria-label={`Delete ${t.merchant}`} onClick={() => { setTransactions((current) => current.filter((x) => x.id !== t.id)); notify('Transaction removed from this device.'); }}><Icon name="trash" size={17} /></button></div>)}</>}{activeTab === 'Wallet' && <button type="button" className="primary-button" onClick={() => notify('Bank and card connections will be introduced after the secure backend is ready.')}>Connection status</button>}{activeTab !== 'Transactions' && <button type="button" className="primary-button" onClick={() => setActiveTab('Home')}>Back to Home</button>}<span className="preview-note">No live financial institution connection is active.</span></section>}
        </main>

        <nav className="bottom-nav" aria-label="Main navigation">
          {nav.map((item) => <button type="button" key={item.label} className={`nav-item ${item.center ? 'nav-center' : ''} ${activeTab === item.label ? 'nav-active' : ''}`} onClick={() => { setActiveTab(item.label); setMenu(''); }} aria-current={activeTab === item.label ? 'page' : undefined}>
            <span className="nav-icon">{item.center ? <span className="nasrinai-orb"><Icon name="spark" size={25} strokeWidth={1.7} /></span> : <Icon name={item.icon} size={22} />}</span><span className="nav-label">{item.label}</span>{activeTab === item.label && !item.center && <span className="nav-indicator" />}
          </button>)}
        </nav>

        {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}><section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title"><div className="modal-heading"><div><p className="eyebrow">LOCAL RECORD</p><h2 id="transaction-modal-title">Add transaction</h2></div><button type="button" className="icon-button" aria-label="Close transaction form" onClick={() => setModalOpen(false)}><Icon name="close" /></button></div><p className="modal-note">This record is stored in this browser only. It will not contact your bank.</p><form onSubmit={addTransaction}><label>Merchant or description<input autoFocus required maxLength={80} value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} placeholder="e.g. Grocery shopping" /></label><div className="form-grid"><label>Amount (PHP)<input required type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></label><label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="expense">Expense</option><option value="income">Income</option></select></label></div><div className="form-grid"><label>Category<select disabled={form.type === 'income'} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{['Groceries', 'Food & drinks', 'Transport', 'Shopping', 'Bills', 'Subscriptions', 'Health', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></label><label>Date<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label></div><label>Account or payment method<input maxLength={60} value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="e.g. Cash, bank, card" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="primary-button">Save transaction</button></div></form></section></div>}
        {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
      </div>
    </div>
  );
}

export default App;
