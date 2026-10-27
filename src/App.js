import React, { useMemo, useState } from 'react';
import './App.css';

const Icon = ({ name, size = 22, strokeWidth = 1.8, fill = 'none' }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill, stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18"/><path d="M16 14h2"/></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="m9 12 2 2 4-4"/></>,
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
    dots: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    filter: <><path d="M4 7h16M7 12h10M10 17h4"/></>,
  };
  return <svg {...common}>{paths[name] || paths.spark}</svg>;
};

const transactions = [
  { id: 1, merchant: 'SM Supermarket', detail: 'Today, 10:24 AM · Metrobank Visa', category: 'Groceries', amount: -1250, symbol: 'SM', tone: 'blue' },
  { id: 2, merchant: 'Grab', detail: 'Today, 8:12 AM · Apple Pay', category: 'Transport', amount: -320, symbol: 'G', tone: 'green' },
  { id: 3, merchant: 'Salary', detail: 'Oct 26 · Bank transfer', category: 'Income', amount: 50000, symbol: '↗', tone: 'mint' },
  { id: 4, merchant: 'Netflix', detail: 'Oct 25 · Visa •••• 2829', category: 'Subscriptions', amount: -549, symbol: 'N', tone: 'black' },
];

const money = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value);

function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [dark, setDark] = useState(false);
  const [accent, setAccent] = useState('blue');
  const [showBalance, setShowBalance] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState('');
  const [period, setPeriod] = useState('This month');
  const [toast, setToast] = useState('');
  const filteredTransactions = useMemo(() => transactions.filter((t) => (t.merchant + ' ' + t.category + ' ' + t.detail).toLowerCase().includes(search.toLowerCase())), [search]);

  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2400); };
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
          <div className="brand-mark" aria-label="MOVO"><span>m</span></div>
          <div className="topbar-right">
            {searchOpen && <input autoFocus className="top-search" placeholder="Search transactions…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search transactions" />}
            <button className={`icon-button ${searchOpen ? 'is-active' : ''}`} aria-label="Search" onClick={() => { setSearchOpen(!searchOpen); setMenu(''); }}><Icon name="search" /></button>
            <div className="menu-wrap">
              <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setMenu(menu === 'notifications' ? '' : 'notifications')}><Icon name="bell" /><span className="notification-dot" /></button>
              {menu === 'notifications' && <div className="popover notification-popover"><strong>You’re all caught up</strong><p>Your latest transaction activity will appear here.</p><button onClick={() => { setMenu(''); setActiveTab('Transactions'); }}>View transactions <Icon name="arrow" size={16} /></button></div>}
            </div>
            <div className="menu-wrap">
              <button className="icon-button" aria-label="Settings and appearance" onClick={() => setMenu(menu === 'settings' ? '' : 'settings')}><Icon name="settings" /></button>
              {menu === 'settings' && <div className="popover theme-popover"><strong>Quick appearance</strong><button onClick={() => setDark(!dark)}><span>{dark ? 'Switch to light mode' : 'Switch to dark mode'}</span><span className="theme-swatch">{dark ? '☼' : '☾'}</span></button><div className="accent-picker"><span>Accent color</span>{['blue', 'purple', 'orange', 'green', 'mono'].map((c) => <button key={c} className={`accent-dot dot-${c} ${accent === c ? 'selected' : ''}`} aria-label={c + ' accent'} onClick={() => setAccent(c)} />)}</div></div>}
            </div>
          </div>
        </header>

        <main>
          <section className="greeting-row">
            <div>
              <p className="eyebrow">TUESDAY, OCTOBER 27</p>
              <h1>Good morning, Nasrin <span className="sun">☀️</span></h1>
              <p className="subheading">Here’s your financial overview.</p>
            </div>
            <button className="avatar" aria-label="Open profile" onClick={() => setActiveTab('Profile')}>N</button>
          </section>

          {activeTab === 'Home' ? (
            <>
              <section className="balance-card">
                <div className="balance-card-content">
                  <div className="balance-label">Total balance <button className="visibility-toggle" aria-label={showBalance ? 'Hide balance' : 'Show balance'} onClick={() => setShowBalance(!showBalance)}><Icon name="eye" size={18} /></button></div>
                  <div className="balance-amount">{showBalance ? money(128450) : '₱ ••••••••'}</div>
                  <div className="balance-change"><span className="change-icon"><Icon name="up" size={15} /></span><strong>12.8%</strong><span>vs. last month</span></div>
                </div>
                <div className="balance-art" aria-hidden="true"><div className="art-orb" /><svg viewBox="0 0 260 140" preserveAspectRatio="none"><path d="M0 112 C25 105 28 80 55 91 S90 63 111 75 S151 40 173 55 S215 16 260 8" /></svg><button aria-label="View wallet" onClick={() => setActiveTab('Wallet')}><Icon name="arrow" /></button></div>
                <div className="balance-foot"><span><span className="status-pulse" /> Across your tracked accounts</span><button onClick={() => setActiveTab('Wallet')}>View wallet <Icon name="chevron" size={15} /></button></div>
              </section>

              <section className="stat-grid" aria-label="Financial summary">
                <article className="stat-card income-card"><div className="stat-top"><span className="stat-icon income-icon"><Icon name="down" size={17} /></span><span className="stat-caption">Income</span></div><strong>{showBalance ? '₱85,000' : '••••••'}</strong><span className="stat-trend positive">↗ 8.2%</span></article>
                <article className="stat-card expense-card"><div className="stat-top"><span className="stat-icon expense-icon"><Icon name="up" size={17} /></span><span className="stat-caption">Expenses</span></div><strong>{showBalance ? '₱42,350' : '••••••'}</strong><span className="stat-trend negative">↗ 5.1%</span></article>
                <article className="stat-card savings-card"><div className="stat-top"><span className="stat-icon savings-icon"><Icon name="bank" size={17} /></span><span className="stat-caption">Savings</span></div><strong>{showBalance ? '₱36,200' : '••••••'}</strong><span className="stat-trend positive">↗ 12.0%</span></article>
              </section>

              <section className="section-block spending-section">
                <div className="section-heading"><div><p className="eyebrow">YOUR MONEY, IN FOCUS</p><h2>Spending overview</h2></div><button className="text-button" onClick={() => setActiveTab('Transactions')}>View report <Icon name="arrow" size={16} /></button></div>
                <div className="spending-card">
                  <div className="spending-card-top"><div className="segmented-control">{['This week', 'This month', 'This year'].map((p) => <button key={p} className={period === p ? 'selected' : ''} onClick={() => setPeriod(p)}>{p}</button>)}</div><button className="more-button" aria-label="Spending options" onClick={() => notify('More spending options coming soon')}><Icon name="dots" /></button></div>
                  <div className="spending-content">
                    <div className="donut-wrap"><div className="donut"><div className="donut-center"><span>Total spent</span><strong>{showBalance ? '₱42,350' : '₱ •••••'}</strong><small>in {period.toLowerCase()}</small></div></div></div>
                    <div className="category-list">
                      {[['Food & drinks','28%','food'],['Shopping','18%','shopping'],['Bills','16%','bills'],['Transport','12%','transport'],['Other','26%','other']].map(([name, percent, type]) => <div className="category-row" key={name}><span className={`category-dot ${type}`} /><span className="category-name">{name}</span><div className="category-track"><span className={type} style={{ width: percent }} /></div><strong>{percent}</strong></div>)}
                    </div>
                  </div>
                  <div className="spending-footer"><span><span className="mini-trend">↗</span> You spent 5.1% more than last month</span><button onClick={() => setActiveTab('Transactions')}>Explore spending <Icon name="chevron" size={15} /></button></div>
                </div>
              </section>

              <section className="section-block transactions-section">
                <div className="section-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent transactions</h2></div><button className="text-button" onClick={() => setActiveTab('Transactions')}>See all <Icon name="arrow" size={16} /></button></div>
                <div className="transaction-card">
                  {filteredTransactions.map((t) => <button className="transaction-row" key={t.id} onClick={() => notify(`${t.merchant} · ${money(Math.abs(t.amount))} · demo transaction`)}>
                    <span className={`merchant-logo ${t.tone}`}>{t.symbol}</span><span className="transaction-info"><strong>{t.merchant}</strong><small>{t.detail}</small></span><span className={`transaction-amount ${t.amount > 0 ? 'amount-positive' : ''}`}>{t.amount > 0 ? '+' : '−'}{money(Math.abs(t.amount)).replace('PHP', '₱').replace('₱ ', '₱')}</span><Icon name="chevron" size={16} />
                  </button>)}
                  {filteredTransactions.length === 0 && <div className="empty-state">No transactions match “{search}”.</div>}
                </div>
              </section>

              <section className="insight-banner"><span className="insight-icon"><Icon name="spark" size={22} /></span><div><strong>A little insight, just for you</strong><p>Your food and drink spending is your largest category this month. Want to explore it with NasrinAI?</p></div><button aria-label="Ask NasrinAI" onClick={() => setActiveTab('NasrinAI')}><Icon name="arrow" /></button></section>
            </>
          ) : (
            <section className="coming-panel"><div className="coming-icon"><Icon name={activeTab === 'Wallet' ? 'wallet' : activeTab === 'Transactions' ? 'transactions' : activeTab === 'Profile' ? 'profile' : 'chat'} size={30} /></div><p className="eyebrow">MOVO PREVIEW</p><h2>{activeTab === 'NasrinAI' ? 'Your financial copilot' : activeTab}</h2><p>{activeTab === 'Wallet' ? 'Your cards, bank accounts, and e-wallets will live here.' : activeTab === 'Transactions' ? 'Search, filter, and manage every transaction in one place.' : activeTab === 'Profile' ? 'Your account, preferences, privacy, and connected services.' : 'Ask questions about your spending and create transaction records with AI assistance.'}</p><button className="primary-button" onClick={() => { setActiveTab('Home'); notify('You’re back on Home'); }}>Back to Home</button><span className="preview-note">Home dashboard is the first interactive MVP screen.</span></section>
          )}
        </main>

        <nav className="bottom-nav" aria-label="Main navigation">
          {nav.map((item) => <button key={item.label} className={`nav-item ${item.center ? 'nav-center' : ''} ${activeTab === item.label ? 'nav-active' : ''}`} onClick={() => { setActiveTab(item.label); setMenu(''); }} aria-current={activeTab === item.label ? 'page' : undefined}>
            <span className="nav-icon">{item.center ? <span className="nasrinai-orb"><Icon name="spark" size={25} strokeWidth={1.7} /></span> : <Icon name={item.icon} size={22} />}</span><span className="nav-label">{item.label}</span>{activeTab === item.label && !item.center && <span className="nav-indicator" />}
          </button>)}
        </nav>
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </div>
  );
}

export default App;
