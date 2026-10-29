import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import AuthPanel from './components/AuthPanel';
import Icon, { NasrinMark } from './components/Icon';
import { Sheet, Toggle } from './components/ui';
import Home from './screens/Home';
import Wallet from './screens/Wallet';
import Transactions from './screens/Transactions';
import Profile, { EditProfile } from './screens/Profile';
import Settings, { Appearance, NotificationSettings, ThemeSheet } from './screens/Settings';
import Notifications, { NotificationDetail, buildNotifications } from './screens/Notifications';
import { supabase, supabaseConfigured } from './lib/supabaseClient';
import { getCurrentSession, listAccounts, listTransactions, createAccount, createTransaction, deleteTransaction, signOut } from './lib/financeRepository';
import { demoAccounts, demoTransactions, demoDeltas, demoNotifications } from './lib/demoData';
import { money, shown, dayKey, monthKey, monthLabel, longDate, timeLabel, BUCKETS, bucketOf } from './lib/format';
import { ACCENTS } from './screens/Settings';
import NasrinAIChat from './components/NasrinAIChat';
import { TermsOfService, PrivacyPolicy } from './screens/Legal';
import { buildCsv } from './lib/csvExport';

const PREF = 'movo.preferences.v3';
const OLD_PREF = 'movo.preferences.v2';
const categories = ['Groceries', 'Food & drinks', 'Transport', 'Shopping', 'Bills', 'Subscriptions', 'Health', 'Education', 'Entertainment', 'Other'];
const accountTypes = [{ value: 'bank', label: 'Bank account' }, { value: 'card', label: 'Credit / debit card' }, { value: 'e_wallet', label: 'E-wallet' }, { value: 'cash', label: 'Cash' }, { value: 'investment', label: 'Investment' }, { value: 'other', label: 'Other' }];
const DEFAULTS = {
  theme: 'system', accent: 'blue', customColor: '#2f6bff', showBalance: true, compact: false, categoryColors: true,
  notifications: true, push: true, email: true, inapp: true, catTransactions: true, catAccount: true, catAi: true, catPromo: false, catReports: true,
  biometrics: true, cloudSync: true, localStorage: false, autocat: true, profileName: '', phone: '', location: '', readIds: [],
};
const ROOT_FOR = { Home: 'Home', Notifications: 'Home', NotificationDetail: 'Home', NotificationSettings: 'Home', Wallet: 'Wallet', Transactions: 'Transactions', NasrinAI: 'NasrinAI', Profile: 'Profile', Settings: 'Profile', Appearance: 'Profile', EditProfile: 'Profile', TermsOfService: 'Profile', PrivacyPolicy: 'Profile' };
const NAV = [['Home', 'home', 'Home'], ['Wallet', 'wallet', 'Wallet'], ['NasrinAI', 'spark', 'NasrinAI'], ['Transactions', 'list', 'Transactions'], ['Profile', 'user', 'Profile']];
const today = () => new Date().toLocaleDateString('en-CA');

function readPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(PREF));
    if (stored) return { ...DEFAULTS, ...stored };
    const old = JSON.parse(localStorage.getItem(OLD_PREF)) || {};
    return { ...DEFAULTS, theme: old.dark ? 'dark' : DEFAULTS.theme, accent: old.accent === 'mono' ? 'slate' : (old.accent || DEFAULTS.accent), showBalance: old.showBalance !== false };
  } catch { return { ...DEFAULTS }; }
}
const hexToRgb = (hex) => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : '47,107,255'; };
const monthsBack = (key, n) => { const [y, m] = key.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 - n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const pctChange = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
const normalize = (t, accounts) => {
  const account = accounts.find(a => a.id === t.account_id);
  const transferTarget = accounts.find(a => a.id === t.transfer_to_account_id);
  return {
    ...t,
    type: t.transaction_type || t.type,
    date: t.occurred_at || t.date,
    amount: Number(t.amount),
    accountName: account?.name || t.account || 'Manual entry',
    transferToAccountName: transferTarget?.name || (t.transfer_to_account_id ? 'Unknown account' : ''),
  };
};

function useSystemDark() {
  const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const [dark, setDark] = useState(!!query?.matches);
  useEffect(() => {
    if (!query?.addEventListener) return undefined;
    const fn = (e) => setDark(e.matches); query.addEventListener('change', fn); return () => query.removeEventListener('change', fn);
  }, [query]);
  return dark;
}

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [cloudMode, setCloudMode] = useState(false);
  const [view, setView] = useState('Home');
  const [legalReturnView, setLegalReturnView] = useState('Profile');
  const [prefs, setPrefs] = useState(readPrefs);
  const [cloudAccounts, setCloudAccounts] = useState([]);
  const [rawTxs, setRawTxs] = useState(demoTransactions);
  const [samplesOn, setSamplesOn] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [txFilter, setTxFilter] = useState('All');
  const [sortKey, setSortKey] = useState('Date');
  const [expanded, setExpanded] = useState(false);
  const [month, setMonth] = useState('');
  const [walletFilter, setWalletFilter] = useState('All');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [nFilter, setNFilter] = useState('All');
  const [activeNotificationId, setActiveNotificationId] = useState('');
  const [sheet, setSheet] = useState(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [accountForm, setAccountForm] = useState({ name: '', account_type: 'bank', institution_name: '', opening_balance: '0' });
  const [form, setForm] = useState({ merchant: '', amount: '', transaction_type: 'expense', category: 'Groceries', account_id: '', transfer_to_account_id: '', occurred_at: today(), note: '' });
  const systemDark = useSystemDark();

  const setPref = useCallback((key, value) => setPrefs(cur => ({ ...cur, [key]: value })), []);
  const show = prefs.showBalance !== false;
  const setShow = useCallback((v) => setPref('showBalance', !!v), [setPref]);
  useEffect(() => { try { localStorage.setItem(PREF, JSON.stringify(prefs)); } catch { /* storage unavailable */ } }, [prefs]);
  const notify = useCallback((msg) => { setToast(msg); window.clearTimeout(window.__movoToast); window.__movoToast = window.setTimeout(() => setToast(''), 2800); }, []);

  const refreshCloud = useCallback(async (user) => {
    if (!user) return;
    setBusy(true); setError('');
    try {
      const [a, t] = await Promise.all([listAccounts(), listTransactions()]);
      setCloudAccounts(a || []); setRawTxs(t || []); setCloudMode(true);
    } catch { setError('Could not load cloud records. Check your connection and try again.'); setCloudMode(false); }
    finally { setBusy(false); setAuthReady(true); }
  }, []);
  useEffect(() => {
    if (sheet?.name === 'account' && sheet.type) setAccountForm(current => current.account_type === sheet.type ? current : { ...current, account_type: sheet.type });
  }, [sheet?.name, sheet?.type]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search);
    const oauthError = hashParams.get('error') || hashParams.get('error_code')
      || searchParams.get('error') || searchParams.get('error_code');
    if (!oauthError) return;
    setView('Sign in');
    setError('Google sign-in could not be completed. Check the Google provider and redirect URL settings, then try again.');
    const url = new URL(window.location.href);
    ['error', 'error_code', 'error_description'].forEach((key) => url.searchParams.delete(key));
    url.hash = '';
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!supabaseConfigured || !supabase) { setAuthReady(true); return undefined; }
    getCurrentSession().then(s => { if (!mounted) return; setSession(s); setAuthReady(true); if (s?.user) refreshCloud(s.user); }).catch(() => { if (mounted) setAuthReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return; setSession(s);
      if (s?.user) refreshCloud(s.user); else { setCloudMode(false); setCloudAccounts([]); setRawTxs(samplesOn ? demoTransactions : []); }
    });
    return () => { mounted = false; data?.subscription?.unsubscribe(); };
  }, [refreshCloud]);

  /* ---------- derived data ---------- */
  const baseAccounts = cloudMode ? cloudAccounts : (samplesOn ? demoAccounts : []);
  const txs = useMemo(() => rawTxs.map(t => normalize(t, baseAccounts)).filter(t => Number.isFinite(new Date(t.date).getTime())).sort((a, b) => new Date(b.date) - new Date(a.date)), [rawTxs, baseAccounts]);
  const accountsView = useMemo(() => baseAccounts.map(a => {
    const delta = txs.reduce((s, t) => {
      if (!cloudMode && t.source === 'Sample') return s;
      if (t.account_id === a.id) return s + (t.type === 'income' ? t.amount : -t.amount);
      if (t.type === 'transfer' && t.transfer_to_account_id === a.id) return s + t.amount;
      return s;
    }, 0);
    return { ...a, mask: a.mask || '', brand: a.brand || 'blue', balance: (cloudMode ? Number(a.opening_balance || 0) : Number(a.balance)) + delta, currency: a.currency || 'PHP' };
  }), [baseAccounts, txs, cloudMode]);
  const accountsByType = useMemo(() => ({ card: accountsView.filter(a => a.account_type === 'card'), bank: accountsView.filter(a => a.account_type === 'bank'), e_wallet: accountsView.filter(a => a.account_type === 'e_wallet') }), [accountsView]);
  const refDate = useMemo(() => (cloudMode || !txs.length ? new Date() : new Date(txs[0].date)), [cloudMode, txs]);
  const refMonth = monthKey(refDate);
  const activeMonth = month || refMonth;
  const months = useMemo(() => Array.from(new Set([refMonth, ...txs.map(t => monthKey(t.date))])).sort().reverse(), [txs, refMonth]);

  const statsFor = useCallback((key) => {
    const list = txs.filter(t => monthKey(t.date) === key);
    const sum = (type) => list.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
    const [y, m] = key.split('-').map(Number); const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const buckets = Array(12).fill(0);
    list.filter(t => t.type === 'expense').forEach(t => { const d = Number(dayKey(t.date).slice(8, 10)); buckets[Math.min(11, Math.floor(((d - 1) / days) * 12))] += t.amount; });
    const income = sum('income'); const expenses = sum('expense');
    return { income, expenses, transfers: sum('transfer'), transferCount: list.filter(t => t.type === 'transfer').length, incomeCount: list.filter(t => t.type === 'income').length, net: income - expenses, days, bars: buckets, count: list.length, list };
  }, [txs]);
  const breakdownFor = useCallback((key) => {
    const totals = {}; statsFor(key).list.filter(t => t.type === 'expense').forEach(t => { const b = bucketOf(t.category); totals[b] = (totals[b] || 0) + t.amount; });
    const total = Object.values(totals).reduce((s, v) => s + v, 0);
    return { total, data: BUCKETS.filter(b => totals[b.key]).map(b => ({ ...b, amount: totals[b.key], percent: Math.round((totals[b.key] / total) * 100) })) };
  }, [statsFor]);
  const homeMonth = useMemo(() => statsFor(refMonth), [statsFor, refMonth]);
  const monthStats = useMemo(() => statsFor(activeMonth), [statsFor, activeMonth]);
  const stats = useMemo(() => {
    const balance = accountsView.length ? accountsView.reduce((s, a) => s + a.balance, 0) : txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
    let running = balance - homeMonth.net; const daily = new Map();
    homeMonth.list.slice().reverse().forEach(t => { if (t.type !== 'transfer') { running += t.type === 'income' ? t.amount : -t.amount; daily.set(dayKey(t.date), running); } });
    let points = [balance - homeMonth.net, ...daily.values()];
    for (let pass = 0; pass < 3; pass += 1) points = points.map((v, i) => { const w = points.slice(Math.max(0, i - 1), i + 2); return w.reduce((s, x) => s + x, 0) / w.length; });
    return { balance, income: homeMonth.income, expenses: homeMonth.expenses, savings: homeMonth.net, trend: points.length > 1 ? points : [balance, balance] };
  }, [accountsView, txs, homeMonth]);
  const deltas = useMemo(() => {
    if (!cloudMode) return demoDeltas;
    const prev = statsFor(monthsBack(refMonth, 1));
    return { balance: pctChange(stats.balance, stats.balance - homeMonth.net), income: pctChange(homeMonth.income, prev.income), expenses: pctChange(homeMonth.expenses, prev.expenses), savings: pctChange(homeMonth.net, prev.net), spent: pctChange(homeMonth.expenses, prev.expenses), transfers: pctChange(homeMonth.transfers, prev.transfers) };
  }, [cloudMode, statsFor, refMonth, stats.balance, homeMonth]);
  const homeBreakdown = useMemo(() => breakdownFor(refMonth), [breakdownFor, refMonth]);
  const txBreakdown = useMemo(() => breakdownFor(activeMonth), [breakdownFor, activeMonth]);
  const monthTxs = useMemo(() => {
    const type = { Income: 'income', Expenses: 'expense', Transfers: 'transfer' }[txFilter];
    const q = search.trim().toLowerCase();
    return monthStats.list.filter(t => (!type || t.type === type) && (!q || [t.merchant, t.category, t.accountName, t.type].join(' ').toLowerCase().includes(q)));
  }, [monthStats, txFilter, search]);
  const recent = useMemo(() => txs.filter(t => t.type !== 'transfer').slice(0, 4), [txs]);
  const selectedCard = accountsByType.card.find(a => a.id === selectedCardId) || accountsByType.card[0];

  const allNotifications = useMemo(() => buildNotifications(txs, cloudMode || !samplesOn ? [] : demoNotifications), [txs, cloudMode, samplesOn]);
  const notifications = useMemo(() => {
    if (!prefs.notifications || !prefs.inapp) return [];
    return allNotifications.filter(n => {
      if (n.kind === 'Transactions') return prefs.catTransactions;
      if (n.kind === 'Account') return prefs.catAccount;
      if (n.kind === 'System' && /nasrinai/i.test(n.title)) return prefs.catAi;
      if (n.kind === 'System' && /offer|promotion/i.test(n.title)) return prefs.catPromo;
      if (n.kind === 'System' && /summary|report/i.test(n.title)) return prefs.catReports;
      return true;
    });
  }, [allNotifications, prefs.notifications, prefs.inapp, prefs.catTransactions, prefs.catAccount, prefs.catAi, prefs.catPromo, prefs.catReports]);
  const unread = notifications.some(n => !prefs.readIds.includes(n.id));
  const activeNotification = notifications.find(n => n.id === activeNotificationId);
  const markAllRead = () => setPref('readIds', Array.from(new Set([...prefs.readIds, ...allNotifications.map(n => n.id)])));

  const metaName = session?.user?.user_metadata?.full_name;
  const email = session?.user?.email || (samplesOn ? 'nasrin@nasrinai.com' : 'Local-only session');
  const name = prefs.profileName.trim() || metaName || (session?.user?.email ? session.user.email.split('@')[0] : 'Nasrin Abubakar');
  const user = { name, email, firstName: name.split(' ')[0], initial: name.slice(0, 1).toUpperCase() };

  /* ---------- actions ---------- */
  const go = useCallback((next, params = {}) => {
    if (params.filter) setTxFilter(params.filter);
    setSheet(null); setError(''); setView(next);
    if (next !== 'Settings') setQuery('');
    try { window.scrollTo?.(0, 0); } catch { /* jsdom */ }
  }, []);
  const openLegal = useCallback((next) => {
    if (!['TermsOfService', 'PrivacyPolicy'].includes(view)) setLegalReturnView(view);
    go(next);
  }, [view, go]);
  const openNotification = (n) => { setActiveNotificationId(n.id); setPref('readIds', Array.from(new Set([...prefs.readIds, n.id]))); go('NotificationDetail'); };
  const openTx = (t) => setSheet({ name: 'tx', id: t.id });
  const openForm = (type = 'expense', accountId = '') => { setError(''); setForm(f => ({ ...f, transaction_type: type, account_id: accountId || f.account_id })); setSheet({ name: 'transaction' }); };

  const saveTransaction = async (e) => {
    e.preventDefault(); setError('');
    const amount = Number(form.amount); const type = form.transaction_type;
    if (!form.merchant.trim() || !Number.isFinite(amount) || amount <= 0 || amount >= 1e17) { setError('Enter a description and a valid positive amount.'); return; }
    if (cloudMode && !form.account_id) { setError('Create or select an account before saving a cloud transaction.'); return; }
    if (type === 'transfer' && accountsView.length && (!form.transfer_to_account_id || form.transfer_to_account_id === form.account_id)) { setError('Choose two different accounts for a transfer.'); return; }
    const category = type === 'income' ? 'Income' : type === 'transfer' ? 'Transfer' : form.category;
    const occurred_at = new Date(`${form.occurred_at}T12:00:00`).toISOString();
    setBusy(true);
    try {
      if (cloudMode) {
        const row = await createTransaction({ merchant: form.merchant.trim(), amount, transaction_type: type, category, account_id: form.account_id, transfer_to_account_id: type === 'transfer' ? form.transfer_to_account_id : undefined, occurred_at, note: form.note }, session.user.id);
        setRawTxs(cur => [row, ...cur]); notify('Transaction saved securely to your account.');
      } else {
        const row = { id: window.crypto?.randomUUID?.() || String(Date.now()), merchant: form.merchant.trim().slice(0, 160), amount: Math.round(amount * 100) / 100, transaction_type: type, category, account_id: form.account_id || 'local', transfer_to_account_id: type === 'transfer' ? form.transfer_to_account_id : undefined, occurred_at, note: form.note.slice(0, 1000), source: 'Manual' };
        setRawTxs(cur => [row, ...cur]); notify('Saved on this device only.');
      }
      setForm({ ...form, merchant: '', amount: '', note: '' }); setSheet(null);
    } catch { setError('Could not save this transaction. Check the selected account and try again.'); }
    finally { setBusy(false); }
  };
  const saveAccount = async (e) => {
    e.preventDefault(); setError('');
    if (!accountForm.name.trim()) { setError('Enter an account name.'); return; }
    if (!cloudMode || !session?.user) { setError('Sign in to create a cloud account.'); return; }
    setBusy(true);
    try { const a = await createAccount(accountForm, session.user.id); setCloudAccounts(cur => [...cur, a]); setAccountForm({ name: '', account_type: 'bank', institution_name: '', opening_balance: '0' }); setSheet(null); notify('Account added.'); }
    catch { setError('Could not add account. Please review the details and try again.'); } finally { setBusy(false); }
  };
  const removeTransaction = async (t) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    try { if (cloudMode) await deleteTransaction(t.id); setRawTxs(cur => cur.filter(x => x.id !== t.id)); setSheet(null); notify('Transaction deleted.'); }
    catch { notify('Could not delete this transaction.'); }
  };
  const exportCsv = () => {
    const rows = [['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency', 'Account'], ...txs.map(t => [t.date, t.merchant, t.category, t.type, t.amount, t.currency || 'PHP', t.accountName])];
    const csv = buildCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'movo-transactions.csv'; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSheet(null); notify('CSV export prepared.');
  };
  const clearSamples = () => { setRawTxs(cur => cur.filter(t => t.source !== 'Sample')); setSamplesOn(false); setSheet(null); notify('Sample records removed.'); };
  const clearLocal = () => { try { localStorage.removeItem(PREF); localStorage.removeItem(OLD_PREF); } catch { /* ignore */ } setPrefs({ ...DEFAULTS }); setRawTxs(cloudMode ? rawTxs : []); setSamplesOn(false); setSheet(null); notify('Local data cleared.'); };
  const signOutNow = async () => { try { await signOut(); setSession(null); setCloudMode(false); setCloudAccounts([]); setRawTxs(samplesOn ? demoTransactions : []); go('Home'); notify('Signed out securely.'); } catch { notify('Could not sign out. Please try again.'); } };

  const c = {
    show, setShow, prefs, setPref, stats, deltas, txs, accountsView, accountsByType, refDate, user, unread, go, session, cloudMode, supabaseConfigured,
    breakdown: homeBreakdown, recent, openTx, notify, sheet, setSheet, signOutNow, exportCsv, openLegal, legalReturnView, notificationsEnabled: prefs.notifications && prefs.inapp, demoAlertsAvailable: !cloudMode && samplesOn,
    walletFilter, setWalletFilter, selectedCard, setSelectedCardId, openForm,
    txFilter, setTxFilter, month: activeMonth, setMonth, months, sortKey, setSortKey, monthTxs, monthStats, expanded, setExpanded, search, setSearch,
    notifications, readIds: prefs.readIds, nFilter, setNFilter, markAllRead, openNotification, activeNotification, query, setQuery,
  };
  c.txBreakdown = txBreakdown;
  const txScreen = { ...c, breakdown: txBreakdown };

  /* ---------- theme ---------- */
  const resolved = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme === 'dark' ? 'dark' : 'light';
  const tint = ['blue', 'purple', 'orange'].includes(prefs.theme) ? prefs.theme : '';
  const accentName = prefs.accent === 'custom' ? 'custom' : prefs.accent;
  const rootStyle = accentName === 'custom' ? { '--accent': prefs.customColor, '--accent-rgb': hexToRgb(prefs.customColor) } : undefined;
  const rootClass = `movo-app theme-${resolved}${tint ? ` tint-${tint}` : ''} accent-${accentName}${prefs.compact ? ' compact' : ''}${prefs.categoryColors ? '' : ' no-category-colors'}`;
  const activeTab = ROOT_FOR[view];

  if (!authReady) return <div className={rootClass} style={rootStyle}><div className="loading-screen"><span className="brand-mark">m</span><p>Preparing your secure MOVO space…</p></div></div>;
  const detailTx = sheet?.name === 'tx' ? txs.find(t => t.id === sheet.id) : null;
  const formAccounts = accountsView.filter(a => !a.is_archived);
  const accountChoice = sheet?.name === 'cardDetails' ? accountsView.find(a => a.id === sheet.id) || selectedCard : null;

  const screen = (() => {
    switch (view) {
      case 'Wallet': return <Wallet c={c} />;
      case 'Transactions': return <Transactions c={txScreen} />;
      case 'Profile': return <Profile c={c} />;
      case 'EditProfile': return <EditProfile c={c} />;
      case 'Settings': return <Settings c={c} />;
      case 'Appearance': return <Appearance c={c} />;
      case 'Notifications': return <Notifications c={c} />;
      case 'NotificationDetail': return <NotificationDetail c={c} />;
      case 'NotificationSettings': return <NotificationSettings c={c} />;
      case 'TermsOfService': return <TermsOfService c={c} />;
      case 'PrivacyPolicy': return <PrivacyPolicy c={c} />;
      case 'NasrinAI': return <NasrinAIChat session={session} cloudMode={cloudMode} onOpenLegal={openLegal} onSignIn={() => go('Sign in')} />;
      case 'Sign in': return <AuthPanel onOpenLegal={openLegal} onAuthenticated={u => { setSession({ user: u }); go('Home'); refreshCloud(u); }} onContinueLocally={() => { go('Home'); notify('Continuing in local-only mode.'); }} />;
      default: return <Home c={c} />;
    }
  })();

  return <div className={rootClass} style={rootStyle}>
    <div className="app-shell">
      <main className="screen" key={view}>
        {error && !sheet && <div className="app-alert" role="alert">{error}<button type="button" aria-label="Dismiss error" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}
        {screen}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV.map(([label, icon, target]) => {
          const active = activeTab === target; const center = target === 'NasrinAI';
          return <button type="button" key={label} className={`nav-item${center ? ' nav-center' : ''}${active ? ' nav-active' : ''}`} onClick={() => go(target)} aria-current={active ? 'page' : undefined}>
            <span className="nav-icon">{center ? <span className="orb"><NasrinMark size={34} /></span> : <Icon name={icon} size={23} filled={active} strokeWidth={active ? 1.6 : 1.7} />}</span>
            <span className="nav-label">{label}</span>{active && !center && <i className="nav-dot" />}
          </button>;
        })}
      </nav>

      {sheet?.name === 'transaction' && <Sheet title="Add transaction" subtitle={cloudMode ? 'Saved to your signed-in MOVO account.' : 'Saved only in this browser; sign in to use cloud storage.'} onClose={() => { setSheet(null); setError(''); }} label="Add transaction">
        <form className="sheet-form" onSubmit={saveTransaction}>
          <div className="seg-control" role="group" aria-label="Transaction type">{['expense', 'income', 'transfer'].map(t => <button type="button" key={t} className={form.transaction_type === t ? 'selected' : ''} aria-pressed={form.transaction_type === t} onClick={() => setForm({ ...form, transaction_type: t })}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>
          <label>Description<input autoFocus required maxLength={160} value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} placeholder="e.g. Grocery shopping" /></label>
          <div className="form-grid"><label>Amount (PHP)<input required type="number" min="0.01" max="999999999999" step="0.01" inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></label>
            <label>Date<input required type="date" value={form.occurred_at} onChange={e => setForm({ ...form, occurred_at: e.target.value })} /></label></div>
          {form.transaction_type === 'expense' && <label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.map(x => <option key={x}>{x}</option>)}</select></label>}
          {(cloudMode || formAccounts.length > 0) && <label>{form.transaction_type === 'transfer' ? 'From account' : 'Account'}<select required={cloudMode} value={form.account_id} onChange={e => setForm({ ...form, account_id: e.target.value })}><option value="">Choose account</option>{formAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          {form.transaction_type === 'transfer' && formAccounts.length > 0 && <label>To account<select value={form.transfer_to_account_id} onChange={e => setForm({ ...form, transfer_to_account_id: e.target.value })}><option value="">Choose account</option>{formAccounts.filter(a => a.id !== form.account_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
          <label>Note (optional)<textarea rows="2" maxLength="1000" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Add a note" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { setSheet(null); setError(''); }}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save transaction'}</button></div>
        </form>
      </Sheet>}

      {sheet?.name === 'account' && <Sheet title="Add account" subtitle="Track a card, bank account or e-wallet." onClose={() => { setSheet(null); setError(''); }} label="Add account">
        <form className="sheet-form" onSubmit={saveAccount}>
          <label>Account name<input required maxLength="100" value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="e.g. Everyday account" /></label>
          <label>Account type<select value={accountForm.account_type} onChange={e => setAccountForm({ ...accountForm, account_type: e.target.value })}>{accountTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
          <label>Bank / institution (optional)<input maxLength="100" value={accountForm.institution_name} onChange={e => setAccountForm({ ...accountForm, institution_name: e.target.value })} placeholder="Institution name" /></label>
          <label>Opening balance (PHP)<input type="number" step="0.01" max="999999999999" value={accountForm.opening_balance} onChange={e => setAccountForm({ ...accountForm, opening_balance: e.target.value })} /></label>
          {!cloudMode && <p className="form-note">Sign in to create cloud accounts.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { setSheet(null); setError(''); }}>Cancel</button><button className="primary-button" type="submit" disabled={busy || !cloudMode}>{busy ? 'Saving…' : 'Add account'}</button></div>
        </form>
      </Sheet>}

      {sheet?.name === 'actions' && <Sheet title="Quick actions" onClose={() => setSheet(null)}>
        <div className="sheet-menu">
          <button type="button" onClick={() => openForm('expense')}><Icon name="plus" size={20} />Add transaction</button>
          <button type="button" onClick={() => setSheet({ name: 'account', type: 'bank' })}><Icon name="wallet" size={20} />Add account</button>
          <button type="button" onClick={exportCsv}><Icon name="download" size={20} />Export CSV</button>
          <button type="button" onClick={() => setSheet({ name: 'themes' })}><Icon name="palette" size={20} />Choose theme</button>
          {!cloudMode && samplesOn && <button type="button" onClick={clearSamples}><Icon name="trash" size={20} />Remove sample data</button>}
        </div>
      </Sheet>}

      {sheet?.name === 'themes' && <ThemeSheet c={c} />}

      {sheet?.name === 'search' && <Sheet title="Search transactions" onClose={() => setSheet(null)}>
        <label className="search-field"><Icon name="search" size={18} /><input autoFocus aria-label="Filter transactions" placeholder="Search description, category, account" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => setSearch('')}>Clear</button><button type="button" className="primary-button" onClick={() => go('Transactions')}>Show results</button></div>
      </Sheet>}

      {sheet?.name === 'clear' && <Sheet title="Clear local data?" subtitle="This clears browser preferences and local/demo financial records for this session. Cloud records are not affected." onClose={() => setSheet(null)}>
        <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => setSheet(null)}>Cancel</button><button type="button" className="danger-button" onClick={clearLocal}>Clear data</button></div>
      </Sheet>}

      {accountChoice && <Sheet title={accountChoice.name} subtitle={accountTypes.find(t => t.value === accountChoice.account_type)?.label} onClose={() => setSheet(null)} label="Account details">
        <dl className="detail-list"><div><dt>Institution</dt><dd>{accountChoice.institution_name || 'Personal account'}</dd></div><div><dt>Number</dt><dd>{accountChoice.mask ? `•••• ${accountChoice.mask}` : '—'}</dd></div><div><dt>Balance</dt><dd>{shown(show, money(accountChoice.balance, accountChoice.currency))}</dd></div></dl>
        <div className="sheet-actions"><button type="button" className="primary-button" onClick={() => openForm('expense', accountChoice.id)}>Add transaction</button></div>
      </Sheet>}

      {detailTx && <Sheet title={detailTx.merchant} subtitle={`${longDate(detailTx.date)}, ${timeLabel(detailTx.date)}`} onClose={() => setSheet(null)} label="Transaction details">
        <dl className="detail-list"><div><dt>Amount</dt><dd>{shown(show, money(detailTx.amount, detailTx.currency))}</dd></div><div><dt>Type</dt><dd>{detailTx.type}</dd></div><div><dt>Category</dt><dd>{detailTx.category || 'Other'}</dd></div><div><dt>Account</dt><dd>{detailTx.accountName}</dd></div>{detailTx.note && <div><dt>Note</dt><dd>{detailTx.note}</dd></div>}{detailTx.source === 'Sample' && <div><dt>Source</dt><dd>Sample record</dd></div>}</dl>
        <div className="sheet-actions"><button type="button" className="danger-button" aria-label={`Delete ${detailTx.merchant}`} onClick={() => removeTransaction(detailTx)}><Icon name="trash" size={16} /> Delete</button></div>
      </Sheet>}

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
      {busy && <div className="sync-indicator" role="status"><span className="spinner" /> Syncing securely…</div>}
    </div>
  </div>;
}
export default App;
